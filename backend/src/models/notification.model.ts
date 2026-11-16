export type NotificationKind = 'missed_call' | 'system';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  /// The other person (e.g. who called), for "Call back".
  contactId: string | null;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  message: string;
  contactId?: string | null;
}
