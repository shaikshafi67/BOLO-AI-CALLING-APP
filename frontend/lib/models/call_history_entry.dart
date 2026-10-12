enum CallDirection { incoming, outgoing }

enum CallOutcome { completed, missed, declined, failed }

/// One row of call history. Matches the backend's calls table plus the
/// language pair used during the call.
class CallHistoryEntry {
  final String id;
  final String roomCode;
  final String contactId;
  final String participantName;
  final CallDirection direction;
  final CallOutcome outcome;
  final String sourceLanguage;
  final String targetLanguage;
  final DateTime timestamp;
  final Duration duration;
  final int translatedLines;

  const CallHistoryEntry({
    required this.id,
    required this.roomCode,
    required this.contactId,
    required this.participantName,
    required this.direction,
    required this.outcome,
    required this.sourceLanguage,
    required this.targetLanguage,
    required this.timestamp,
    required this.duration,
    this.translatedLines = 0,
  });
}
