import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import '../core/app_state.dart';
import 'api_client.dart';

/// Rings this device when the app is closed (Firebase Cloud Messaging).
///
/// Once the device holds the account, its push token is sent to the backend
/// (PUT /api/sessions/push-token). When someone calls and the app isn't
/// connected, the backend pushes "Shafi is calling"; tapping it opens the app,
/// whose socket then receives the still-ringing `call:incoming`.
///
/// Android works out of the box. The web needs a Web Push key from the
/// Firebase console (Project settings → Cloud Messaging → Web Push
/// certificates), passed as --dart-define=BOLOAI_FCM_VAPID_KEY=...
class PushService {
  PushService._();
  static final PushService instance = PushService._();

  static const _vapidKey = String.fromEnvironment('BOLOAI_FCM_VAPID_KEY');

  /// Same key as the "Incoming calls" switch in Settings.
  static const _enabledKey = 'boloai.pref.nCalls';

  StreamSubscription<String>? _refresh;

  bool get supported => kIsWeb ? _vapidKey.isNotEmpty : defaultTargetPlatform == TargetPlatform.android;

  static bool get enabled => AppState.instance.prefs?.getBool(_enabledKey) ?? true;

  /// Call once this device holds the account (DeviceSession is ready).
  Future<void> register() async {
    if (!supported || !enabled) return;
    try {
      final messaging = FirebaseMessaging.instance;
      final permission = await messaging.requestPermission();
      if (permission.authorizationStatus == AuthorizationStatus.denied) return;
      final token = await messaging.getToken(vapidKey: kIsWeb ? _vapidKey : null);
      if (token != null) await _upload(token);
      _refresh ??= messaging.onTokenRefresh.listen(_upload);
    } catch (e) {
      debugPrint('[push] registration failed: $e');
    }
  }

  /// The "Incoming calls" switch in Settings.
  Future<void> setEnabled(bool on) async {
    AppState.instance.prefs?.setBool(_enabledKey, on);
    if (on) {
      await register();
    } else if (supported) {
      await _upload(null);
    }
  }

  Future<void> _upload(String? token) async {
    try {
      await ApiClient.put('/api/sessions/push-token', {'token': token});
    } catch (e) {
      debugPrint('[push] token not saved: $e');
    }
  }
}
