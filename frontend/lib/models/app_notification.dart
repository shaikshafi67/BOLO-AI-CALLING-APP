enum NotificationKind { incomingCall, callEnded, missedCall, system, contactRequest }

class AppNotification {
  final String id;
  final NotificationKind kind;
  final String title;
  final String message;
  final DateTime createdAt;
  final String? contactId;
  final bool read;

  const AppNotification({
    required this.id,
    required this.kind,
    required this.title,
    required this.message,
    required this.createdAt,
    this.contactId,
    this.read = false,
  });

  /// A row from GET /api/notifications.
  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: '${j['id']}',
        kind: switch (j['kind']) {
          'missed_call' => NotificationKind.missedCall,
          _ => NotificationKind.system,
        },
        title: '${j['title'] ?? ''}',
        message: '${j['message'] ?? ''}',
        createdAt: DateTime.tryParse('${j['createdAt']}')?.toLocal() ?? DateTime.now(),
        contactId: j['contactId'] as String?,
        read: j['read'] == true,
      );

  AppNotification markRead() => AppNotification(
        id: id,
        kind: kind,
        title: title,
        message: message,
        createdAt: createdAt,
        contactId: contactId,
        read: true,
      );
}
