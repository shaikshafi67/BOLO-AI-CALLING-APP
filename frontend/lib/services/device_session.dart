import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/api_config.dart';
import '../core/app_state.dart';

/// Keeps an account signed in on one device at a time (docs/sessions.md).
///
/// Each install has a random session id. After the user signs in, this device
/// claims the account with POST /api/sessions, which signs the previous device
/// out. While signed in, a socket to the backend stays open so this device
/// hears `session:revoked` the moment someone signs in elsewhere.
///
/// If the backend can't be reached the app keeps working; claiming and
/// connecting retry in the background.
class DeviceSession {
  DeviceSession._();
  static final DeviceSession instance = DeviceSession._();

  static const _idKey = 'boloai.sessionId';
  static const _retryDelay = Duration(seconds: 15);

  /// Called when another device signed in to this account.
  VoidCallback? onRevoked;

  /// True once this device holds the account and may call the REST API
  /// (the backend refuses other devices with session_inactive).
  final ready = ValueNotifier<bool>(false);

  /// App-wide socket events (e.g. an incoming call), kept across reconnects.
  final _handlers = <String, void Function(dynamic)>{};

  void onEvent(String event, void Function(dynamic) handler) {
    _handlers[event] = handler;
    _socket?.on(event, handler);
  }

  /// Sends an event on this device's socket (no-op while disconnected).
  void emit(String event, Map<String, dynamic> data) {
    _socket?.emitWithAck(event, data, ack: (_) {});
  }

  String? _sessionId;
  bool _freshSignIn = false;
  User? _user;
  io.Socket? _socket;
  Timer? _retry;
  int _generation = 0;

  /// This install's session id, created once and kept on the device.
  String get sessionId {
    final prefs = AppState.instance.prefs;
    return _sessionId ??= prefs?.getString(_idKey) ?? _createId();
  }

  String _createId() {
    final rnd = Random.secure();
    final id = base64Url.encode(List<int>.generate(24, (_) => rnd.nextInt(256))).replaceAll('=', '');
    AppState.instance.prefs?.setString(_idKey, id);
    return id;
  }

  /// Call before signing in or registering. The next signed-in user claims
  /// the account. Reopening the app with a saved login only checks the
  /// session, so a device signed out elsewhere can't take the account back.
  void expectFreshSignIn() => _freshSignIn = true;
  void cancelFreshSignIn() => _freshSignIn = false;

  /// Starts guarding [user]'s session (on sign-in and on app start).
  void start(User user) {
    if (_user?.uid == user.uid) return;
    stop();
    _user = user;
    final fresh = _freshSignIn;
    _freshSignIn = false;
    if (fresh) {
      _claimThenConnect(_generation);
    } else {
      _connect(_generation);
    }
  }

  /// Stops guarding without telling the backend (the user is already signed out).
  void stop() {
    _generation++;
    _retry?.cancel();
    _socket?.dispose();
    _socket = null;
    _user = null;
    ready.value = false;
  }

  /// Frees the account on the backend before signing out.
  Future<void> release() async {
    final user = _user;
    stop();
    if (user == null) return;
    try {
      await http
          .delete(Uri.parse('$apiBaseUrl/api/sessions'), headers: await _headers(user))
          .timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('[session] release failed: $e');
    }
  }

  /// Headers for authenticated API requests from this device.
  Future<Map<String, String>> _headers(User user) async => {
        'Authorization': 'Bearer ${await user.getIdToken()}',
        'X-Session-Id': sessionId,
        'Content-Type': 'application/json',
      };

  Future<void> _claimThenConnect(int gen) async {
    final user = _user;
    if (user == null || gen != _generation) return;
    try {
      final res = await http
          .post(
            Uri.parse('$apiBaseUrl/api/sessions'),
            headers: await _headers(user),
            body: jsonEncode({'sessionId': sessionId, 'device': _deviceLabel()}),
          )
          .timeout(const Duration(seconds: 10));
      if (res.statusCode != 200) throw Exception('HTTP ${res.statusCode}');
      if (gen == _generation) _connect(gen);
    } catch (e) {
      debugPrint('[session] claim failed, retrying: $e');
      _scheduleRetry(gen, () => _claimThenConnect(gen));
    }
  }

  void _connect(int gen) {
    final user = _user;
    if (user == null || gen != _generation) return;
    _socket?.dispose();

    final socket = io.io(
      apiBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .enableForceNew()
          // A fresh ID token on every (re)connect; Firebase tokens last an hour.
          .setAuthFn((send) async {
            try {
              send({'token': await user.getIdToken(), 'sessionId': sessionId});
            } catch (_) {
              send({'sessionId': sessionId});
            }
          })
          .build(),
    );
    _socket = socket;

    socket.on('session:revoked', (_) => _revoked(gen));
    _handlers.forEach(socket.on);
    socket.onConnect((_) {
      if (gen == _generation) ready.value = true;
    });

    socket.onConnectError((err) {
      if (gen != _generation) return;
      final message = err is Map ? err['message'] : err?.toString();
      switch (message) {
        case 'session_replaced':
          _revoked(gen);
        case 'session_inactive':
          // Nobody holds the account (e.g. the backend's data was reset).
          socket.dispose();
          _claimThenConnect(gen);
        case 'unauthorized':
        case 'server_error':
        case 'session_required':
          _scheduleRetry(gen, () => _connect(gen));
        default:
          // Network trouble: Socket.IO reconnects by itself.
          break;
      }
    });

    socket.onDisconnect((reason) {
      // The server dropped us without the revoked event reaching us:
      // reconnecting tells us why (session_replaced) or restores the link.
      if (reason == 'io server disconnect' && gen == _generation) {
        _scheduleRetry(gen, () => _connect(gen), delay: const Duration(seconds: 2));
      }
    });

    socket.connect();
  }

  void _revoked(int gen) {
    if (gen != _generation) return;
    debugPrint('[session] signed in on another device');
    stop();
    onRevoked?.call();
  }

  void _scheduleRetry(int gen, VoidCallback action, {Duration delay = _retryDelay}) {
    _retry?.cancel();
    _retry = Timer(delay, () {
      if (gen == _generation) action();
    });
  }

  String _deviceLabel() => kIsWeb ? 'web' : defaultTargetPlatform.name;
}
