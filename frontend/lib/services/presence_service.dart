import 'package:flutter/foundation.dart';
import '../core/app_state.dart';
import '../models/user.dart';
import 'device_session.dart';
import 'history_store.dart';

/// Who is online right now (docs/signaling.md, `presence:watch`).
///
/// Watches everyone in your contacts (call history) plus whoever a screen
/// asks for with [showAlso] (e.g. search results). The server replies with
/// their status and then sends `presence:update` when it changes.
class PresenceService extends ChangeNotifier {
  PresenceService._();
  static final PresenceService instance = PresenceService._();

  /// Same key as the "Show when I'm online" switch in Settings.
  static const _visibleKey = 'boloai.pref.online';

  final _status = <String, Presence>{};
  Set<String> _watched = {};
  Set<String> _extra = {};

  /// [userId]'s status, or null before the server has told us.
  Presence? of(String userId) => _status[userId];

  /// Whether other people can see this user online.
  static bool get visible => AppState.instance.prefs?.getBool(_visibleKey) ?? true;

  /// Wired up once at start-up (see Session.start).
  void attach() {
    DeviceSession.instance.onEvent('presence:update', _onUpdate);
    // The server forgets what a socket watched when it reconnects.
    DeviceSession.instance.onConnected(_send);
    HistoryStore.instance.addListener(_sync);
  }

  /// Also watch these people (replaces the previous extra list).
  void showAlso(Iterable<String> userIds) {
    _extra = userIds.toSet();
    _sync();
  }

  /// The "Show when I'm online" switch in Settings.
  void setVisible(bool on) {
    AppState.instance.prefs?.setBool(_visibleKey, on);
    DeviceSession.instance.emit('presence:visibility', {'visible': on});
  }

  void clear() {
    _status.clear();
    _watched = {};
    _extra = {};
    notifyListeners();
  }

  void _sync() {
    final ids = {for (final p in HistoryStore.instance.people) p.id, ..._extra}..remove('');
    if (setEquals(ids, _watched)) return;
    _watched = ids;
    _send();
  }

  Future<void> _send() async {
    if (_watched.isEmpty) return;
    final reply = await DeviceSession.instance.request('presence:watch', {'userIds': _watched.toList()});
    final statuses = reply?['statuses'];
    if (reply?['ok'] != true || statuses is! Map) return;
    _status
      ..removeWhere((id, _) => !_watched.contains(id))
      ..addAll({for (final e in statuses.entries) '${e.key}': _parse(e.value)});
    notifyListeners();
  }

  void _onUpdate(dynamic data) {
    if (data is! Map) return;
    final id = '${data['userId']}';
    if (!_watched.contains(id)) return;
    _status[id] = _parse(data['status']);
    notifyListeners();
  }

  static Presence _parse(dynamic s) => switch (s) {
        'online' => Presence.online,
        'busy' => Presence.busy,
        _ => Presence.offline,
      };
}
