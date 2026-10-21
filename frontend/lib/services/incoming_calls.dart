import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../config/router.dart';
import '../core/app_state.dart';
import '../models/app_notification.dart';
import 'call_service.dart';
import 'device_session.dart';
import 'history_store.dart';

/// Someone ringing this user (docs/signaling.md, `call:incoming`).
class IncomingCall {
  final String roomCode;
  final String callerUid;
  final String callerName;
  final String callerLanguage;
  const IncomingCall({required this.roomCode, required this.callerUid, required this.callerName, required this.callerLanguage});
}

/// Rings when a contact calls: shows the incoming-call screen, and handles
/// Accept / Decline and the caller giving up. Events arrive on the device's
/// always-on socket (DeviceSession), so the app rings on any screen.
class IncomingCalls extends ChangeNotifier {
  IncomingCalls._();
  static final IncomingCalls instance = IncomingCalls._();

  IncomingCall? _current;
  IncomingCall? get current => _current;

  Timer? _buzz;

  /// Wired up once at start-up (see Session.start).
  void attach() {
    DeviceSession.instance.onEvent('call:incoming', _onIncoming);
    DeviceSession.instance.onEvent('call:cancelled', _onCancelled);
  }

  void _onIncoming(dynamic data) {
    if (data is! Map) return;
    final from = data['from'] is Map ? data['from'] as Map : const {};
    // Already in a call on this device: the server normally prevents this.
    if (CallService.active != null) return;
    _current = IncomingCall(
      roomCode: '${data['roomCode']}',
      callerUid: '${from['uid'] ?? ''}',
      callerName: '${from['name'] ?? 'Someone'}',
      callerLanguage: '${data['language'] ?? 'en'}',
    );
    _startBuzz();
    notifyListeners();
    appRouter.push('/incoming');
  }

  void _onCancelled(dynamic data) {
    final call = _current;
    if (call == null || data is! Map || data['roomCode'] != call.roomCode) return;
    _finish();
    AppState.instance.notifications.add(AppNotification(
      id: 'missed_${DateTime.now().millisecondsSinceEpoch}',
      kind: NotificationKind.missedCall,
      title: 'Missed call',
      message: 'You missed a call from ${call.callerName}.',
      createdAt: DateTime.now(),
    ));
    HistoryStore.instance.refreshSoon();
  }

  /// Joins the caller's room. Throws [CallException] if that fails.
  Future<String> accept() async {
    final call = _current;
    if (call == null) throw const CallException('not_found');
    _stopBuzz();
    try {
      await CallService.join(call.roomCode, language: AppState.instance.call.myLanguage);
    } finally {
      _finish();
    }
    return call.roomCode;
  }

  void decline() {
    final call = _current;
    if (call == null) return;
    DeviceSession.instance.emit('call:decline', {'roomCode': call.roomCode});
    _finish();
    HistoryStore.instance.refreshSoon();
  }

  void _finish() {
    _stopBuzz();
    _current = null;
    notifyListeners();
  }

  /// Phones vibrate while ringing (browsers can't play a ringtone unprompted).
  void _startBuzz() {
    _stopBuzz();
    if (kIsWeb) return;
    HapticFeedback.vibrate();
    _buzz = Timer.periodic(const Duration(milliseconds: 1500), (_) => HapticFeedback.vibrate());
  }

  void _stopBuzz() {
    _buzz?.cancel();
    _buzz = null;
  }
}
