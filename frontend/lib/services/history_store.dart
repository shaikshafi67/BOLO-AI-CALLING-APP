import 'package:flutter/foundation.dart';
import '../config/supported_languages.dart';
import '../models/call_history_entry.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'session.dart';

/// One figure on the dashboard, e.g. "Total calls 12, +3 this week".
class DashboardStat {
  final String label;
  final String value;
  final String change;
  final int trend; // 1 up, 0 flat, -1 down
  const DashboardStat(this.label, this.value, this.change, this.trend);
}

/// The signed-in user's call history (GET /api/calls), shared by the
/// dashboard, history, contacts and start-call screens.
///
/// Calls are recorded by the backend's signaling server when both people
/// are in a room, so they appear here for both participants.
class HistoryStore extends ChangeNotifier {
  HistoryStore._();
  static final HistoryStore instance = HistoryStore._();

  List<CallHistoryEntry> _calls = const [];
  List<CallHistoryEntry> get calls => _calls;

  bool _loading = false;
  bool get loading => _loading;

  /// Set when the last load failed; the previous list is kept.
  String? _error;
  String? get error => _error;

  bool _loadedOnce = false;
  bool get loadedOnce => _loadedOnce;

  /// People found through search, remembered so screens opened with
  /// `?contact=<id>` can show their name.
  final _known = <String, AppUser>{};

  Future<void> load() async {
    if (_loading) return;
    _loading = true;
    notifyListeners();
    try {
      final rows = await ApiClient.get('/api/calls') as List;
      _calls = [for (final r in rows) _fromJson(Map<String, dynamic>.from(r as Map))];
      _error = null;
      _loadedOnce = true;
    } on ApiException catch (e) {
      // No profile yet means no calls yet.
      if (e.notFound) {
        _calls = const [];
        _error = null;
        _loadedOnce = true;
      } else {
        _error = e.code == 'unreachable' ? 'Can’t reach the BoloAI server.' : 'Couldn’t load your calls (${e.code}).';
      }
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Reloads once the server has had a moment to record a call that just ended.
  void refreshSoon() => Future.delayed(const Duration(seconds: 1), load);

  void clear() {
    _calls = const [];
    _loadedOnce = false;
    _error = null;
    _known.clear();
    notifyListeners();
  }

  void remember(AppUser user) => _known[user.id] = user;

  /// Everyone you've had a call with, most recent first.
  List<AppUser> get people {
    final seen = <String, AppUser>{};
    for (final c in _calls) {
      seen.putIfAbsent(
        c.contactId,
        () => AppUser(id: c.contactId, name: c.participantName, email: '', preferredLanguage: c.targetLanguage, lastCallAt: c.timestamp),
      );
    }
    return seen.values.toList();
  }

  AppUser? personById(String? id) {
    if (id == null || id.isEmpty) return null;
    for (final p in people) {
      if (p.id == id) return p;
    }
    return _known[id];
  }

  /// Call minutes per day for the dashboard chart, with day labels.
  ({List<String> labels, List<int> minutes}) get weeklyMinutes {
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final today = DateTime.now();
    return (
      labels: [for (var i = 6; i >= 0; i--) i == 0 ? 'Today' : names[today.subtract(Duration(days: i)).weekday - 1]],
      minutes: minutesLast7Days,
    );
  }

  /// The four dashboard figures.
  List<DashboardStat> get stats {
    final weekAgo = DateTime.now().subtract(const Duration(days: 7));
    final thisWeek = _calls.where((c) => c.timestamp.isAfter(weekAgo)).toList();
    int minutesOf(Iterable<CallHistoryEntry> calls) => calls.fold(0, (sum, c) => sum + (c.duration.inSeconds / 60).round());

    final languageCounts = <String, int>{};
    for (final c in _calls) {
      for (final l in {c.sourceLanguage, c.targetLanguage}) {
        languageCounts[l] = (languageCounts[l] ?? 0) + 1;
      }
    }
    final topLanguage = languageCounts.isEmpty
        ? null
        : (languageCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).first.key;
    final newPeople = people.where((p) => !_calls.any((c) => c.contactId == p.id && !c.timestamp.isAfter(weekAgo))).length;

    return [
      DashboardStat('Total calls', '${_calls.length}', '+${thisWeek.length} this week', thisWeek.isEmpty ? 0 : 1),
      DashboardStat('Call minutes', '${minutesOf(_calls)}', '+${minutesOf(thisWeek)} this week', minutesOf(thisWeek) > 0 ? 1 : 0),
      DashboardStat('Languages used', '${languageCounts.length}',
          topLanguage == null ? 'No calls yet' : '${languageFor(topLanguage).label} most used', 0),
      DashboardStat('People talked to', '${people.length}', '+$newPeople this week', newPeople > 0 ? 1 : 0),
    ];
  }

  /// Minutes talked on each of the last 7 days, oldest first (today last).
  List<int> get minutesLast7Days {
    final today = DateTime.now();
    final start = DateTime(today.year, today.month, today.day).subtract(const Duration(days: 6));
    final minutes = List<int>.filled(7, 0);
    for (final c in _calls) {
      final day = DateTime(c.timestamp.year, c.timestamp.month, c.timestamp.day);
      final i = day.difference(start).inDays;
      if (i >= 0 && i < 7) minutes[i] += (c.duration.inSeconds / 60).round();
    }
    return minutes;
  }

  static CallHistoryEntry _fromJson(Map<String, dynamic> j) {
    final outgoing = j['direction'] == 'outgoing';
    final started = DateTime.tryParse('${j['startedAt']}')?.toLocal() ?? DateTime.now();
    final ended = j['endedAt'] == null ? null : DateTime.tryParse('${j['endedAt']}')?.toLocal();
    final callerLang = j['callerLanguage'] as String?;
    final receiverLang = j['receiverLanguage'] as String?;
    final mine = (outgoing ? callerLang : receiverLang) ?? Session.instance.user?.preferredLanguage ?? 'en';
    final theirs = (outgoing ? receiverLang : callerLang) ?? mine;
    return CallHistoryEntry(
      id: '${j['id']}',
      roomCode: (j['roomCode'] as String?) ?? '—',
      contactId: '${j['participantId'] ?? ''}',
      participantName: '${j['participantName'] ?? 'BoloAI user'}',
      direction: outgoing ? CallDirection.outgoing : CallDirection.incoming,
      outcome: switch (j['status']) {
        'missed' => CallOutcome.missed,
        'rejected' => CallOutcome.declined,
        'ringing' => CallOutcome.failed,
        _ => CallOutcome.completed,
      },
      sourceLanguage: mine,
      targetLanguage: theirs,
      timestamp: started,
      duration: ended == null || ended.isBefore(started) ? Duration.zero : ended.difference(started),
    );
  }
}
