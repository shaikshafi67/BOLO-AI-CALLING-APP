import 'dart:async';
import 'dart:typed_data';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/api_config.dart';
import '../core/app_state.dart';
import '../models/translation_entry.dart';
import '../models/video_filter.dart';
import 'device_session.dart';
import 'web_media.dart';

enum ConnectionStateKind { waiting, connecting, connected, reconnecting, unstable, ended }

/// Why a call could not be started or joined.
class CallException implements Exception {
  final String code;
  const CallException(this.code);

  String get message => switch (code) {
    'not_found' => 'No call with this code is active. Check the code with the person who shared it.',
    'full' => 'This call already has two people in it.',
    'invalid_room_code' => 'Room codes look like BOLO-4829.',
    'invalid_language' => 'Choose a supported language and try again.',
    'media_denied' => 'BoloAI needs your microphone (and camera for video). Allow access in your browser or app settings, then try again.',
    'unauthorized' || 'session_replaced' || 'session_inactive' || 'session_required' => 'Your sign-in expired. Sign in again to make calls.',
    'unreachable' => 'Can’t reach the BoloAI server. Check your internet connection and try again.',
    _ => 'Something went wrong setting up the call ($code).',
  };

  @override
  String toString() => 'CallException($code)';
}

/// The other person in the call, as the signaling server describes them.
class CallPeer {
  final String uid;
  final String name;
  final String language;
  const CallPeer({required this.uid, required this.name, required this.language});

  factory CallPeer.fromMap(Map m) => CallPeer(uid: '${m['uid']}', name: '${m['name'] ?? 'BoloAI user'}', language: '${m['language'] ?? 'en'}');

  CallPeer withLanguage(String language) => CallPeer(uid: uid, name: name, language: language);
}

/// One line of in-call chat.
class ChatMessage {
  final bool mine;
  final String name;
  final String text;
  final DateTime at;
  const ChatMessage({required this.mine, required this.name, required this.text, required this.at});
}

/// Camera + microphone, shared between the pre-call preview and the call so
/// the device is opened once (two opens of one camera fail on Android).
class LocalMedia {
  LocalMedia._();

  static MediaStream? _preview;

  /// True while a pre-call preview is on screen.
  static bool previewShown = false;

  static const _constraints = {
    'audio': {'echoCancellation': true, 'noiseSuppression': true, 'autoGainControl': true},
    'video': {
      'facingMode': 'user',
      'width': {'ideal': 1280},
      'height': {'ideal': 720},
    },
  };

  /// Why the camera could not start on the last [open], or null if it did.
  static String? cameraProblem;

  /// Opens camera + mic, falling back to mic only when there is no usable camera.
  static Future<MediaStream> open() async {
    cameraProblem = null;
    try {
      return await navigator.mediaDevices.getUserMedia(_constraints);
    } catch (e) {
      debugPrint('[call] camera+mic unavailable, trying mic only: $e');
      cameraProblem = describeCameraError(e);
    }
    try {
      return await navigator.mediaDevices.getUserMedia({'audio': _constraints['audio'], 'video': false});
    } catch (e) {
      debugPrint('[call] microphone unavailable: $e');
      throw const CallException('media_denied');
    }
  }

  /// Opens just the camera, e.g. to turn it on mid-call after it failed at the start.
  static Future<MediaStream> openCamera() => navigator.mediaDevices.getUserMedia({'audio': false, 'video': _constraints['video']});

  /// A message the user can act on for a failed camera start.
  static String describeCameraError(Object e) {
    final s = e.toString();
    if (s.contains('NotReadable') || s.contains('TrackStart') || s.contains('Could not start')) {
      return 'Your camera is being used by another app or browser. Close it there, then tap the camera button.';
    }
    if (s.contains('NotAllowed') || s.contains('Permission') || s.contains('denied')) {
      return 'Camera access is blocked. Allow it in your browser or app settings, then tap the camera button.';
    }
    if (s.contains('NotFound') || s.contains('DevicesNotFound') || s.contains('Requested device not found')) {
      return 'No camera found, so you\u2019re in the call with audio only.';
    }
    return 'Your camera couldn\u2019t start, so you\u2019re in the call with audio only.';
  }

  /// The stream shown by the pre-call preview (opened on first use).
  static Future<MediaStream> preview() async => _preview ??= await open();

  /// Hands the preview stream over to a call, so closing the preview keeps it running.
  static MediaStream? claim() {
    final s = _preview;
    _preview = null;
    return s;
  }

  /// Returns a stream a call claimed but did not use (the call failed to start).
  static Future<void> giveBack(MediaStream s) async {
    if (previewShown && _preview == null) {
      _preview = s;
    } else {
      await stop(s);
    }
  }

  /// Stops the preview stream unless a call claimed it.
  static Future<void> releasePreview() async {
    final s = _preview;
    _preview = null;
    if (s != null) await stop(s);
  }

  static Future<void> stop(MediaStream s) async {
    for (final t in s.getTracks()) {
      await t.stop();
    }
    await s.dispose();
  }
}

/// Starts and joins calls. Only one call runs at a time ([active]).
/// The backend records each connected call for history (see HistoryStore).
class CallService {
  /// The call in progress, handed from Start/Join to the call screen.
  static CallSession? active;

  /// Creates a room on the signaling server and waits in it for the other person.
  static Future<CallSession> start({required String language}) => _open('room:create', {'language': language});

  /// Joins the room [roomCode] that someone else created.
  static Future<CallSession> join(String roomCode, {required String language}) => _open('room:join', {'roomCode': roomCode, 'language': language});

  static Future<CallSession> _open(String event, Map<String, dynamic> payload) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) throw const CallException('unauthorized');
    await active?.leave();

    final claimed = LocalMedia.claim();
    final media = claimed ?? await LocalMedia.open();
    io.Socket? socket;
    try {
      socket = await _connectSocket(user);
      final reply = await _request(socket, event, payload);
      if (reply['ok'] != true) throw CallException('${reply['error'] ?? 'unknown'}');

      final session = CallSession._(
        socket: socket,
        roomCode: '${reply['roomCode']}',
        language: '${payload['language']}',
        myUid: user.uid,
        iceServers: [for (final s in (reply['iceServers'] as List? ?? const [])) Map<String, dynamic>.from(s as Map)],
        localStream: media,
      );
      final peers = reply['peers'] as List? ?? const [];
      await session._init(peers.isEmpty ? null : CallPeer.fromMap(peers.first as Map));
      active = session;
      return session;
    } catch (e) {
      socket?.dispose();
      await (claimed != null ? LocalMedia.giveBack(media) : LocalMedia.stop(media));
      if (e is CallException) rethrow;
      debugPrint('[call] could not open call: $e');
      throw const CallException('unreachable');
    }
  }

  /// A socket just for this call, authenticated like the device session's.
  static Future<io.Socket> _connectSocket(User user) async {
    final socket = io.io(
      apiBaseUrl,
      io.OptionBuilder().setTransports(['websocket']).disableAutoConnect().enableForceNew().setAuthFn((send) async {
        try {
          send({'token': await user.getIdToken(), 'sessionId': DeviceSession.instance.sessionId});
        } catch (_) {
          send({'sessionId': DeviceSession.instance.sessionId});
        }
      }).build(),
    );
    final ready = Completer<void>();
    socket.onConnect((_) {
      if (!ready.isCompleted) ready.complete();
    });
    socket.onConnectError((err) {
      final message = err is Map ? err['message'] : null;
      // Known refusals are final; anything else is network trouble, which
      // Socket.IO keeps retrying until the timeout below.
      if (message is String && !ready.isCompleted) ready.completeError(CallException(message));
    });
    socket.connect();
    try {
      await ready.future.timeout(const Duration(seconds: 10));
    } on TimeoutException {
      socket.dispose();
      throw const CallException('unreachable');
    } catch (_) {
      socket.dispose();
      rethrow;
    }
    return socket;
  }

  static Future<Map<String, dynamic>> _request(io.Socket socket, String event, [Map<String, dynamic>? payload]) {
    final reply = Completer<Map<String, dynamic>>();
    socket.emitWithAck(
      event,
      payload,
      ack: (dynamic res) {
        if (!reply.isCompleted) reply.complete(res is Map ? Map<String, dynamic>.from(res) : {'ok': false, 'error': 'bad_reply'});
      },
    );
    return reply.future.timeout(const Duration(seconds: 10), onTimeout: () => throw const CallException('unreachable'));
  }
}

/// One live call: the signaling socket, the WebRTC peer connection and the
/// local/remote media. Listen to it for state changes.
///
/// Whoever is already in the room sends the offer when the other person
/// joins (`peer:joined`), so both sides never offer at once. Video and the
/// original audio then flow peer-to-peer; the server only relays SDP and ICE.
class CallSession extends ChangeNotifier {
  CallSession._({
    required io.Socket socket,
    required this.roomCode,
    required this.language,
    required List<Map<String, dynamic>> iceServers,
    required MediaStream localStream,
    required this.myUid,
  }) : _socket = socket,
       _iceServers = iceServers,
       _localStream = localStream;

  final String roomCode;
  final String language;
  final io.Socket _socket;
  final List<Map<String, dynamic>> _iceServers;
  final MediaStream _localStream;

  final localRenderer = RTCVideoRenderer();
  final remoteRenderer = RTCVideoRenderer();

  RTCPeerConnection? _pc;
  MediaStream? _remoteStream;
  final _pendingCandidates = <RTCIceCandidate>[];
  bool _remoteDescriptionSet = false;
  bool _isOfferer = false;
  bool _closed = false;

  CallPeer? _peer;
  CallPeer? get peer => _peer;

  ConnectionStateKind _state = ConnectionStateKind.waiting;
  ConnectionStateKind get state => _state;

  bool get hasLocalVideo => _localStream.getVideoTracks().isNotEmpty;

  /// Why this call has no camera (shown once when the call screen opens).
  String? cameraProblem = LocalMedia.cameraProblem;

  /// Sends our video to the other person. Exists even without a camera, so
  /// turning the camera on later needs no renegotiation (replaceTrack).
  RTCRtpSender? _videoSender;
  bool _startingCamera = false;

  /// True when their video is actually arriving: a peer without a camera
  /// still has a (muted, frameless) video track, and shows their avatar.
  bool get hasRemoteVideo => (peerCameraOn || peerSharing) && (_remoteStream?.getVideoTracks().any((t) => t.muted != true) ?? false);

  // What the other person told us about their media (see _sendState).
  bool peerMicOn = true;
  bool peerCameraOn = true;
  bool peerSharing = false;

  /// This user's Firebase uid (to tell our captions from theirs).
  final String myUid;

  // ---- Live translation state ----

  /// The server has the AI services configured.
  bool _serverTranslation = false;
  bool _hadCaption = false;

  /// A service error is stopping translation for now (the call continues).
  bool translationProblem = false;

  bool _translationEnabled = true;
  bool get translationEnabled => _translationEnabled;

  /// Translation is working: the server can do it, or captions are arriving.
  bool get translationReady => !translationProblem && (_serverTranslation || _hadCaption);

  MicStreamer? _mic;
  bool _sendingAudio = false;

  /// Finished sentences, oldest first.
  final transcript = <TranslationEntry>[];

  /// The latest caption; [captionInterim] while the sentence is still being spoken.
  TranslationEntry? caption;
  bool captionInterim = false;

  /// The contact we're ringing (call:invite), until they answer or not.
  String? ringingName;

  /// In-call chat, oldest first.
  final messages = <ChatMessage>[];
  int unreadChat = 0;
  bool _chatVisible = false;

  /// The browser blocked their voice until the user taps the page.
  bool audioBlocked = false;

  /// The raw camera track; with a filter on, the stream carries a filtered copy.
  MediaStreamTrack? _cameraTrack;
  FilteredVideo? _filtered;
  VideoFilter _filter = VideoFilter.none;
  VideoFilter get filter => _filter;
  bool get filtersSupported => videoFiltersSupported && hasLocalVideo;

  MediaStream? _screen;
  bool get sharing => _screen != null;
  bool get canShareScreen => !_isMobile;

  bool _micOn = true;
  bool _cameraOn = true;
  bool _speakerOn = true;
  bool get micOn => _micOn;
  bool get cameraOn => _cameraOn;
  bool get speakerOn => _speakerOn;

  /// One-off messages for the call screen to show ("Marcus left the call").
  final _notices = StreamController<String>.broadcast();
  Stream<String> get notices => _notices.stream;

  bool get _isMobile => !kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);

  Future<void> _init(CallPeer? existingPeer) async {
    await localRenderer.initialize();
    await remoteRenderer.initialize();
    localRenderer.srcObject = _localStream;

    _cameraTrack = _localStream.getVideoTracks().firstOrNull;
    final prefs = AppState.instance.call;
    setMic(prefs.micOn);
    _cameraOn = prefs.cameraOn && hasLocalVideo;
    for (final t in _localStream.getVideoTracks()) {
      t.enabled = _cameraOn;
    }
    if (_isMobile) {
      // Video calls use the loudspeaker, not the earpiece.
      unawaited(Helper.setSpeakerphoneOn(true).catchError((Object e) => debugPrint('[call] speakerphone: $e')));
    }

    _socket.on('peer:joined', (data) => _onPeerJoined(CallPeer.fromMap(data as Map)));
    _socket.on('signal', (data) => _onSignal(Map<String, dynamic>.from(data as Map)));
    _socket.on('peer:language', (data) {
      final p = _peer;
      if (p != null && data is Map && data['uid'] == p.uid) {
        _peer = p.withLanguage('${data['language']}');
        notifyListeners();
      }
    });
    _socket.on('peer:left', (_) => _onPeerLeft());
    _socket.on('call:declined', (_) => _inviteEnded('${ringingName ?? 'They'} declined the call.'));
    _socket.on('call:unanswered', (_) => _inviteEnded('${ringingName ?? 'They'} didn\u2019t answer.'));
    _socket.on('caption', (data) {
      if (data is Map) _onCaption(Map<String, dynamic>.from(data));
    });
    _socket.on('translation:audio', (data) {
      if (data is Map) _onTranslatedVoice(data['audio']);
    });
    _socket.on('translation:status', (data) {
      if (data is Map && data['available'] == false && !_closed) {
        translationProblem = true;
        notifyListeners();
      }
    });
    _socket.on('message', (data) {
      if (data is Map) _onMessage(Map<String, dynamic>.from(data));
    });
    _socket.onDisconnect((_) => _onSocketLost());
    // The socket is already connected here, so any later connect is a reconnect.
    _socket.onConnect((_) => _rejoin());

    if (existingPeer != null) {
      // We joined someone's room: they send the offer.
      _peer = existingPeer;
      _setState(ConnectionStateKind.connecting);
    }
    unawaited(_startTranslation());
  }

  // ---- Signaling ----

  Future<void> _onPeerJoined(CallPeer peer) async {
    if (_closed) return;
    _peer = peer;
    ringingName = null;
    _setState(ConnectionStateKind.connecting);
    // We were here first, so we make the offer.
    await _resetPeerConnection();
    _isOfferer = true;
    final pc = await _ensurePeerConnection();
    if (_videoSender == null) {
      // No camera yet: still offer a video slot so it can be filled later.
      final t = await pc.addTransceiver(
        kind: RTCRtpMediaType.RTCRtpMediaTypeVideo,
        init: RTCRtpTransceiverInit(direction: TransceiverDirection.SendRecv),
      );
      _videoSender = t.sender;
      await _updateVideoSender();
    }
    final offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    _send('offer', offer.toMap());
  }

  Future<void> _onSignal(Map<String, dynamic> msg) async {
    if (_closed) return;
    final data = msg['data'];
    if (data is! Map) return;
    try {
      switch (msg['type']) {
        case 'offer':
          // A fresh offer means a new negotiation (first connect or the
          // other side reconnected); an ICE restart reuses the connection.
          final restart = _pc != null && _remoteDescriptionSet && _state != ConnectionStateKind.connecting;
          if (!restart) await _resetPeerConnection();
          _isOfferer = false;
          final pc = await _ensurePeerConnection();
          await pc.setRemoteDescription(RTCSessionDescription(data['sdp'] as String?, data['type'] as String?));
          await _remoteDescriptionReady();
          if (_videoSender == null) {
            await _claimVideoSlot(pc);
            await _updateVideoSender();
          }
          final answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          _send('answer', answer.toMap());
        case 'answer':
          final pc = _pc;
          if (pc == null) return;
          await pc.setRemoteDescription(RTCSessionDescription(data['sdp'] as String?, data['type'] as String?));
          await _remoteDescriptionReady();
        case 'ice-candidate':
          final candidate = RTCIceCandidate(data['candidate'] as String?, data['sdpMid'] as String?, (data['sdpMLineIndex'] as num?)?.toInt());
          final pc = _pc;
          if (pc != null && _remoteDescriptionSet) {
            await pc.addCandidate(candidate);
          } else {
            _pendingCandidates.add(candidate);
          }
      }
    } catch (e) {
      debugPrint('[call] signal ${msg['type']} failed: $e');
    }
  }

  Future<void> _remoteDescriptionReady() async {
    _remoteDescriptionSet = true;
    final pc = _pc;
    if (pc == null) return;
    for (final c in List.of(_pendingCandidates)) {
      await pc.addCandidate(c);
    }
    _pendingCandidates.clear();
  }

  void _send(String type, Map<String, dynamic> data) {
    if (_closed) return;
    _socket.emitWithAck('signal', {'type': type, 'data': data}, ack: (_) {});
  }

  void _onPeerLeft() {
    if (_closed) return;
    final name = _peer?.name ?? 'The other person';
    _peer = null;
    peerMicOn = true;
    peerCameraOn = true;
    peerSharing = false;
    unawaited(_resetPeerConnection());
    _notices.add('$name left the call.');
    _setState(ConnectionStateKind.waiting);
  }

  // ---- Live translation ----

  /// Asks the server whether translation is available, then streams the
  /// microphone (16 kHz PCM) while it should be heard (see [_shouldSendAudio]).
  Future<void> _startTranslation() async {
    final reply = await CallService._request(_socket, 'translation:start')
        .catchError((Object _) => <String, dynamic>{'ok': false});
    if (_closed) return;
    _serverTranslation = reply['available'] == true;
    notifyListeners();
    final microphone = _localStream.getAudioTracks().firstOrNull;
    if (!_serverTranslation || !MicStreamer.supported || microphone == null) return;
    try {
      final mic = await MicStreamer.start(microphone, _onPcm);
      if (_closed) {
        await mic.stop();
      } else {
        _mic = mic;
      }
    } catch (e) {
      debugPrint('[call] microphone capture for translation failed: $e');
    }
  }

  bool get _shouldSendAudio =>
      !_closed && _serverTranslation && _translationEnabled && _micOn && _peer != null && _state == ConnectionStateKind.connected;

  void _onPcm(Uint8List pcm) {
    if (_shouldSendAudio) {
      _socket.emit('audio', pcm);
      _sendingAudio = true;
    } else if (_sendingAudio) {
      // Muted, paused or alone: close the recognition stream (saves cost).
      _sendingAudio = false;
      _socket.emit('translation:stop');
    }
  }

  void _onCaption(Map<String, dynamic> m) {
    if (_closed) return;
    final isLocal = m['speakerUid'] == myUid;
    final original = '${m['original'] ?? ''}';
    final translated = m['translated'] as String?;
    final done = m['final'] == true;
    final entry = TranslationEntry(
      id: '${m['id']}',
      isLocal: isLocal,
      speakerName: isLocal ? 'You' : '${m['speakerName'] ?? _peer?.name ?? 'Them'}',
      sourceLanguage: '${m['sourceLanguage'] ?? language}',
      targetLanguage: '${m['targetLanguage'] ?? language}',
      originalText: original,
      translatedText: translated ?? original,
      timestamp: DateTime.now(),
    );
    _hadCaption = true;
    caption = entry;
    captionInterim = !done;
    if (done) {
      final i = transcript.indexWhere((e) => e.id == entry.id);
      if (i >= 0) {
        transcript[i] = entry;
      } else {
        transcript.add(entry);
      }
      if (translated != null) translationProblem = false;
    }
    notifyListeners();
  }

  /// Their sentence, spoken in our language.
  void _onTranslatedVoice(dynamic audio) {
    if (_closed || !_translationEnabled || !_speakerOn || !AppState.instance.call.voiceTranslation) return;
    final Uint8List? bytes = switch (audio) {
      Uint8List b => b,
      ByteBuffer b => b.asUint8List(),
      List b => Uint8List.fromList(b.cast<int>()),
      _ => null,
    };
    if (bytes != null && bytes.isNotEmpty) unawaited(playTranslation(remoteRenderer, bytes));
  }

  /// Pause or resume translation (the call itself is unaffected).
  void setTranslationEnabled(bool on) {
    _translationEnabled = on;
    notifyListeners();
  }

  // ---- Ringing a contact ----

  /// Rings [userId] (a users.id) into this room. Returns null when it's
  /// ringing, else a message to show (offline, busy…); the room stays open
  /// either way so the code can still be shared.
  Future<String?> invite(String userId, String name) async {
    final reply = await CallService._request(_socket, 'call:invite', {'userId': userId})
        .catchError((Object _) => <String, dynamic>{'ok': false, 'error': 'unreachable'});
    if (reply['ok'] == true) {
      ringingName = name;
      notifyListeners();
      return null;
    }
    return switch (reply['error']) {
      'offline' => '$name isn\u2019t online right now. Share the room code to call them.',
      'busy' => '$name is on another call. Try again soon.',
      'not_found' => 'This person isn\u2019t on BoloAI any more.',
      _ => 'Couldn\u2019t ring $name. Share the room code instead.',
    };
  }

  /// They declined, or didn't answer in time: tell the caller and hang up.
  Future<void> _inviteEnded(String message) async {
    if (_closed || ringingName == null) return;
    ringingName = null;
    _notices.add(message);
    await leave();
  }

  // ---- In-call messages ----

  void _onMessage(Map<String, dynamic> m) {
    if (_closed) return;
    switch (m['kind']) {
      case 'chat':
        final name = '${m['name'] ?? _peer?.name ?? 'Them'}';
        messages.add(ChatMessage(mine: false, name: name, text: '${m['text']}', at: DateTime.now()));
        if (!_chatVisible) {
          unreadChat++;
          _notices.add('$name: ${m['text']}');
        }
      case 'state':
        final s = m['state'];
        if (s is Map) {
          peerMicOn = s['mic'] == true;
          peerCameraOn = s['camera'] == true;
          peerSharing = s['sharing'] == true;
        }
    }
    notifyListeners();
  }

  void sendChat(String text) {
    final t = text.trim();
    if (t.isEmpty || _closed) return;
    messages.add(ChatMessage(mine: true, name: 'You', text: t, at: DateTime.now()));
    _socket.emitWithAck('message', {'kind': 'chat', 'text': t}, ack: (_) {});
    notifyListeners();
  }

  /// The chat panel is open: new messages count as read.
  void setChatVisible(bool visible) {
    _chatVisible = visible;
    if (visible && unreadChat > 0) {
      unreadChat = 0;
      notifyListeners();
    }
  }

  /// Tells the other side our mic/camera/sharing state for their screen.
  void _sendState() {
    if (_closed || _peer == null) return;
    _socket.emitWithAck('message', {
      'kind': 'state',
      'state': {'mic': _micOn, 'camera': _cameraOn && hasLocalVideo, 'sharing': sharing},
    }, ack: (_) {});
  }

  /// The signaling link dropped. The peer-to-peer media may still be fine,
  /// but the server removed us from the room, so we rejoin on reconnect.
  void _onSocketLost() {
    if (_closed) return;
    _setState(ConnectionStateKind.reconnecting);
  }

  Future<void> _rejoin() async {
    if (_closed) return;
    final reply = await CallService._request(_socket, 'room:join', {
      'roomCode': roomCode,
      'language': language,
    }).catchError((Object _) => <String, dynamic>{'ok': false, 'error': 'unreachable'});
    if (_closed) return;
    if (reply['ok'] != true) {
      // Everyone left while we were offline, so the room is gone.
      _notices.add('The connection was lost and the call has ended.');
      await leave();
      return;
    }
    final peers = reply['peers'] as List? ?? const [];
    await _resetPeerConnection();
    if (peers.isEmpty) {
      _peer = null;
      _setState(ConnectionStateKind.waiting);
    } else {
      // The other person is still here and will send a fresh offer.
      _peer = CallPeer.fromMap(peers.first as Map);
      _setState(ConnectionStateKind.connecting);
    }
  }

  // ---- WebRTC ----

  Future<RTCPeerConnection> _ensurePeerConnection() async {
    final existing = _pc;
    if (existing != null) return existing;

    final pc = await createPeerConnection({
      'iceServers': _iceServers.isEmpty
          ? [
              {'urls': 'stun:stun.l.google.com:19302'},
            ]
          : _iceServers,
      'sdpSemantics': 'unified-plan',
    });
    _pc = pc;

    for (final track in _localStream.getTracks()) {
      final sender = await pc.addTrack(track, _localStream);
      if (track.kind == 'video') _videoSender = sender;
    }
    await _updateVideoSender();

    pc.onIceCandidate = (c) {
      if (c.candidate == null) return;
      _send('ice-candidate', c.toMap() as Map<String, dynamic>);
    };

    pc.onTrack = (event) async {
      if (_pc != pc) return;
      final track = event.track;
      // Re-render when their video starts or stops sending frames (e.g. their
      // camera started mid-call).
      if (track.kind == 'video') {
        track.onMute = notifyListeners;
        track.onUnMute = notifyListeners;
      }
      if (event.streams.isNotEmpty) {
        final stream = event.streams.first;
        if (_remoteStream != null && _remoteStream!.id != stream.id) {
          // Carry over tracks that arrived without a stream (see below).
          for (final t in _remoteStream!.getTracks()) {
            if (!stream.getTracks().any((s) => s.id == t.id)) await _safeAddTrack(stream, t);
          }
        }
        _remoteStream = stream;
      } else {
        // Video sent from a slot that had no camera at the start carries no
        // stream id: put it with their other tracks.
        final stream = _remoteStream ??= await createLocalMediaStream('remote');
        await _safeAddTrack(stream, track);
      }
      remoteRenderer.srcObject = _remoteStream;
      _applySpeaker();
      if (track.kind == 'audio') await _playRemoteAudio();
      notifyListeners();
    };

    pc.onIceConnectionState = (s) {
      if (_closed || _pc != pc) return;
      switch (s) {
        case RTCIceConnectionState.RTCIceConnectionStateConnected:
        case RTCIceConnectionState.RTCIceConnectionStateCompleted:
          if (_state != ConnectionStateKind.connected) _sendState();
          _setState(ConnectionStateKind.connected);
        case RTCIceConnectionState.RTCIceConnectionStateDisconnected:
          // Usually a brief network blip; WebRTC recovers by itself.
          if (_state == ConnectionStateKind.connected) _setState(ConnectionStateKind.unstable);
        case RTCIceConnectionState.RTCIceConnectionStateFailed:
          _setState(ConnectionStateKind.reconnecting);
          if (_isOfferer) unawaited(_restartIce(pc));
        default:
          break;
      }
    };

    return pc;
  }

  /// Renegotiates network paths after the connection failed (e.g. Wi-Fi → mobile data).
  Future<void> _restartIce(RTCPeerConnection pc) async {
    try {
      final offer = await pc.createOffer({'iceRestart': true});
      await pc.setLocalDescription(offer);
      _send('offer', offer.toMap());
    } catch (e) {
      debugPrint('[call] ICE restart failed: $e');
    }
  }

  Future<void> _playRemoteAudio() async {
    final blocked = !await playRemoteAudio(remoteRenderer);
    if (blocked != audioBlocked) {
      audioBlocked = blocked;
      notifyListeners();
    }
  }

  /// Call from a tap: browsers allow sound to start after a user gesture.
  Future<void> unlockAudio() async {
    await _mic?.resume();
    await _playRemoteAudio();
  }

  /// Puts the right picture on the video sender: the screen while sharing,
  /// else the (possibly filtered) camera, or nothing while the camera is off.
  Future<void> _updateVideoSender() async {
    final sender = _videoSender;
    if (sender == null) return;
    final camera = _localStream.getVideoTracks().firstOrNull;
    final MediaStreamTrack? track = _screen?.getVideoTracks().firstOrNull ?? (_cameraOn ? camera : null);
    try {
      await sender.replaceTrack(track);
    } catch (e) {
      debugPrint('[call] video sender: $e');
    }
  }

  Future<void> _safeAddTrack(MediaStream stream, MediaStreamTrack track) async {
    try {
      await stream.addTrack(track);
    } catch (e) {
      debugPrint('[call] could not attach remote ${track.kind} track: $e');
    }
  }

  /// Answering without a camera: take over the video slot from the offer so
  /// we can send video once the camera starts.
  Future<void> _claimVideoSlot(RTCPeerConnection pc) async {
    if (_videoSender != null) return;
    for (final t in await pc.getTransceivers()) {
      if (t.receiver.track?.kind == 'video') {
        await t.setDirection(TransceiverDirection.SendRecv);
        _videoSender = t.sender;
        return;
      }
    }
  }

  Future<void> _resetPeerConnection() async {
    final pc = _pc;
    _pc = null;
    _videoSender = null;
    _remoteDescriptionSet = false;
    _pendingCandidates.clear();
    _remoteStream = null;
    remoteRenderer.srcObject = null;
    await pc?.close();
  }

  // ---- Controls ----

  void setMic(bool on) {
    _micOn = on;
    for (final t in _localStream.getAudioTracks()) {
      t.enabled = on;
    }
    _sendState();
    notifyListeners();
  }

  void setCamera(bool on) {
    if (on && !hasLocalVideo) {
      _startCamera();
      return;
    }
    _cameraOn = on;
    for (final t in _localStream.getVideoTracks()) {
      t.enabled = on;
    }
    // Stop sending video while off, so the other side shows our avatar
    // instead of a black picture.
    _updateVideoSender();
    _sendState();
    notifyListeners();
  }

  // ---- Filters (browser) ----

  Future<void> setFilter(VideoFilter f) async {
    if (!videoFiltersSupported) {
      _notices.add('Filters are available in the browser version for now.');
      return;
    }
    _filter = f;
    notifyListeners();
    await _applyFilter();
  }

  /// Swaps the stream's video between the raw camera and a filtered copy.
  Future<void> _applyFilter() async {
    final camera = _cameraTrack;
    if (camera == null || _closed) return;
    final MediaStreamTrack next;
    try {
      if (_filter == VideoFilter.none) {
        if (_filtered == null) return;
        next = camera;
      } else if (_filtered != null) {
        _filtered!.filter = _filter;
        return;
      } else {
        // The canvas draws the raw camera, so it must stay enabled.
        camera.enabled = true;
        _filtered = await FilteredVideo.start(camera, _filter);
        next = _filtered!.track;
      }
    } catch (e) {
      debugPrint('[call] filter failed: $e');
      _notices.add('That filter couldn\u2019t start on this device.');
      _filter = VideoFilter.none;
      notifyListeners();
      return;
    }
    for (final t in List.of(_localStream.getVideoTracks())) {
      if (t.id != next.id) await _localStream.removeTrack(t);
    }
    if (!_localStream.getVideoTracks().any((t) => t.id == next.id)) await _localStream.addTrack(next);
    next.enabled = _cameraOn;
    if (_filter == VideoFilter.none) {
      final old = _filtered;
      _filtered = null;
      await old?.dispose();
    }
    localRenderer.srcObject = _localStream;
    await _updateVideoSender();
    notifyListeners();
  }

  // ---- Screen sharing ----

  Future<void> toggleScreenShare() async {
    if (sharing) return _stopSharing();
    if (_isMobile) {
      _notices.add('Screen sharing is available on computers for now.');
      return;
    }
    if (_peer == null || _videoSender == null) {
      _notices.add('Screen sharing can start once someone has joined the call.');
      return;
    }
    try {
      final screen = await navigator.mediaDevices.getDisplayMedia({'video': true, 'audio': false});
      final track = screen.getVideoTracks().first;
      // The browser's own "Stop sharing" button ends the track.
      track.onEnded = () => _stopSharing();
      _screen = screen;
      await _updateVideoSender();
      _sendState();
      notifyListeners();
    } catch (e) {
      debugPrint('[call] screen share: $e');
      _notices.add('Screen sharing didn\u2019t start.');
    }
  }

  Future<void> _stopSharing() async {
    final screen = _screen;
    if (screen == null) return;
    _screen = null;
    await _updateVideoSender();
    await LocalMedia.stop(screen);
    _sendState();
    if (!_closed) notifyListeners();
  }

  /// Tries the camera again (it was busy, blocked or missing when the call
  /// started) and sends it to the other person.
  Future<void> _startCamera() async {
    if (_startingCamera || _closed) return;
    _startingCamera = true;
    try {
      final camera = await LocalMedia.openCamera();
      final track = camera.getVideoTracks().first;
      if (_closed) {
        await track.stop();
        return;
      }
      await _localStream.addTrack(track);
      _cameraTrack = track;
      localRenderer.srcObject = _localStream;
      cameraProblem = null;
      _cameraOn = true;
      if (_filter != VideoFilter.none) await _applyFilter();
      await _updateVideoSender();
      _sendState();
    } catch (e) {
      debugPrint('[call] camera still unavailable: $e');
      _cameraOn = false;
      if (!_closed) _notices.add(LocalMedia.describeCameraError(e));
    } finally {
      _startingCamera = false;
      if (!_closed) notifyListeners();
    }
  }

  /// Mutes or unmutes what you hear from the other person.
  void setSpeaker(bool on) {
    _speakerOn = on;
    _applySpeaker();
    notifyListeners();
  }

  void _applySpeaker() {
    for (final t in _remoteStream?.getAudioTracks() ?? const <MediaStreamTrack>[]) {
      t.enabled = _speakerOn;
    }
  }

  bool get canSwitchCamera => _isMobile && hasLocalVideo;

  Future<void> switchCamera() async {
    final tracks = _localStream.getVideoTracks();
    if (tracks.isEmpty) return;
    await Helper.switchCamera(tracks.first);
  }

  // ---- Lifecycle ----

  void _setState(ConnectionStateKind s) {
    if (_closed && s != ConnectionStateKind.ended) return;
    _state = s;
    notifyListeners();
  }

  /// Hangs up: tells the other side, then releases the camera, mic and socket.
  Future<void> leave() async {
    if (_closed) return;
    _closed = true;
    if (identical(CallService.active, this)) CallService.active = null;
    _state = ConnectionStateKind.ended;
    notifyListeners();

    final mic = _mic;
    _mic = null;
    await mic?.stop();
    if (_socket.connected) {
      await CallService._request(_socket, 'room:leave').catchError((Object _) => <String, dynamic>{});
    }
    _socket.dispose();
    await _resetPeerConnection();
    final screen = _screen;
    _screen = null;
    if (screen != null) await LocalMedia.stop(screen);
    await _filtered?.dispose();
    _filtered = null;
    await _cameraTrack?.stop();
    await LocalMedia.stop(_localStream);
    localRenderer.srcObject = null;
    await localRenderer.dispose();
    await remoteRenderer.dispose();
    await _notices.close();
  }
}
