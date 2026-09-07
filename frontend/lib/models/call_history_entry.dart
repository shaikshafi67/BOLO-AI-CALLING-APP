enum CallDirection { incoming, outgoing, missed }

class CallHistoryEntry {
  final String id;
  final String participantName;
  final CallDirection direction;
  final DateTime timestamp;
  final Duration duration;

  const CallHistoryEntry({
    required this.id,
    required this.participantName,
    required this.direction,
    required this.timestamp,
    required this.duration,
  });
}
