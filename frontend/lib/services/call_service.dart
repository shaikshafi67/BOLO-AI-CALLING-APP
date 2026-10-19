import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/api_config.dart';
import '../core/app_state.dart';
import '../core/mock_data.dart';
import '../models/call_history_entry.dart';
import 'device_session.dart';

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

  factory CallPeer.fromMap(Map m) =>
      CallPeer(uid: '${m['uid']}', name: '${m['name'] ?? 'BoloAI user'}', language: '${m['language'] ?? 'en'}');

  CallPeer withLanguage(String language) => CallPeer(uid: uid, name: name, language: language);
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

  /// Opens camera + mic, falling back to mic only when there is no usable camera.
  static Future<MediaStream> open() async {
    try {
      return await navigator.mediaDevices.getUserMedia(_constraints);
    } catch (e) {
      debugPrint('[call] camera+mic unavailable, trying mic only: $e');
    }
    try {
      return await navigator.mediaDevices.getUserMedia({'audio': _constraints['audio'], 'video': false});
    } catch (e) {
      debugPrint('[call] microphone unavailable: $e');
      throw const CallException('media_denied');
    }
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
///
/// TODO: Connect backend database — POST /api/calls, GET /api/calls,
///   PATCH /api/calls/:id/status (routes already exist in backend/).
class CallService {
  /// The call in progress, handed from Start/Join to the call screen.
  static CallSession? active;

  /// Creates a room on the signaling server and waits in it for the other person.
  static Future<CallSession> start({required String language}) =>
      _open('room:create', {'language': language});

  /// Joins the room [roomCode] that someone else created.
  static Future<CallSession> join(String roomCode, {required String language}) =>
      _open('room:join', {'roomCode': roomCode, 'language': language});

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
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .enableForceNew()
          .setAuthFn((send) async {
            try {
              send({'token': await user.getIdToken(), 'sessionId': DeviceSession.instance.sessionId});
            } catch (_) {
              send({'sessionId': DeviceSession.instance.sessionId});
            }
          })
          .build(),
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
    socket.emitWithAck(event, payload, ack: (dynamic res) {
      if (!reply.isCompleted) reply.complete(res is Map ? Map<String, dynamic>.from(res) : {'ok': false, 'error': 'bad_reply'});
    });
    return reply.future.timeout(const Duration(seconds: 10), onTimeout: () => throw const CallException('unreachable'));
  }

  Future<List<CallHistoryEntry>> history() async => mockCallHistory;
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
  })  : _socket = socket,
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
  bool get hasRemoteVideo => _remoteStream?.getVideoTracks().isNotEmpty ?? false;

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

    final prefs = AppState.instance.call;
    setMic(prefs.micOn);
    setCamera(prefs.cameraOn);
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
    _socket.onDisconnect((_) => _onSocketLost());
    // The socket is already connected here, so any later connect is a reconnect.
    _socket.onConnect((_) => _rejoin());

    if (existingPeer != null) {
      // We joined someone's room: they send the offer.
      _peer = existingPeer;
      _setState(ConnectionStateKind.connecting);
    }
  }

  // ---- Signaling ----

  Future<void> _onPeerJoined(CallPeer peer) async {
    if (_closed) return;
    _peer = peer;
    _setState(ConnectionStateKind.connecting);
    // We were here first, so we make the offer.
    await _resetPeerConnection();
    _isOfferer = true;
    final pc = await _ensurePeerConnection();
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
    unawaited(_resetPeerConnection());
    _notices.add('$name left the call.');
    _setState(ConnectionStateKind.waiting);
  }

  /// The signaling link dropped. The peer-to-peer media may still be fine,
  /// but the server removed us from the room, so we rejoin on reconnect.
  void _onSocketLost() {
    if (_closed) return;
    _setState(ConnectionStateKind.reconnecting);
  }

  Future<void> _rejoin() async {
    if (_closed) return;
    final reply = await CallService._request(_socket, 'room:join', {'roomCode': roomCode, 'language': language})
        .catchError((Object _) => <String, dynamic>{'ok': false, 'error': 'unreachable'});
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
      await pc.addTrack(track, _localStream);
    }

    pc.onIceCandidate = (c) {
      if (c.candidate == null) return;
      _send('ice-candidate', c.toMap() as Map<String, dynamic>);
    };

    pc.onTrack = (event) {
      if (event.streams.isEmpty) return;
      _remoteStream = event.streams.first;
      remoteRenderer.srcObject = _remoteStream;
      _applySpeaker();
      notifyListeners();
    };

    pc.onIceConnectionState = (s) {
      if (_closed || _pc != pc) return;
      switch (s) {
        case RTCIceConnectionState.RTCIceConnectionStateConnected:
        case RTCIceConnectionState.RTCIceConnectionStateCompleted:
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

  Future<void> _resetPeerConnection() async {
    final pc = _pc;
    _pc = null;
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
    notifyListeners();
  }

  void setCamera(bool on) {
    _cameraOn = on;
    for (final t in _localStream.getVideoTracks()) {
      t.enabled = on;
    }
    notifyListeners();
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

    if (_socket.connected) {
      await CallService._request(_socket, 'room:leave').catchError((Object _) => <String, dynamic>{});
    }
    _socket.dispose();
    await _resetPeerConnection();
    await LocalMedia.stop(_localStream);
    localRenderer.srcObject = null;
    await localRenderer.dispose();
    await remoteRenderer.dispose();
    await _notices.close();
  }
}
