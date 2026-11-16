/// A notification for a phone whose app is closed (Firebase Cloud Messaging).
export interface PushMessage {
  title: string;
  body: string;
  /// Delivered to the app with the notification.
  data: Record<string, string>;
  /// A later push with the same tag replaces this one (e.g. "Missed call"
  /// replaces "Incoming call" for the same room).
  tag?: string;
  /// Drop the push if it can't be delivered in time (a ring is useless late).
  ttlSeconds?: number;
}

/// Kept behind an interface so the signaling server can be tested without Firebase.
export interface PushSender {
  /// Pushes to [uid]'s signed-in device. Resolves false when that device has
  /// no push token (never opened the app on a phone, or turned pushes off).
  send(uid: string, message: PushMessage): Promise<boolean>;
}
