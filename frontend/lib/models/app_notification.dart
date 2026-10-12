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
