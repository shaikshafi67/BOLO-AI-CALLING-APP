import { getMessaging } from 'firebase-admin/messaging';
import { getFirebaseApp } from '../config/firebaseAdmin';
import { pool } from '../config/db';
import type { SessionStore } from '../sessions/sessionStore';
import type { PushSender } from './pushSender';

/// Errors meaning the token will never work again (app uninstalled, data cleared).
const DEAD_TOKEN_CODES = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

/// Sends pushes with Firebase Cloud Messaging, using the same Firebase Admin
/// service account as sign-in checks. Tokens come from the account's active
/// session (PUT /api/sessions/push-token).
export function firebasePush(sessions: SessionStore): PushSender {
  return {
    async send(uid, message) {
      const token = await sessions.pushToken(uid);
      if (!token) return false;
      const ttlMs = (message.ttlSeconds ?? 3600) * 1000;
      try {
        await getMessaging(getFirebaseApp()).send({
          token,
          notification: { title: message.title, body: message.body },
          data: message.data,
          android: {
            priority: 'high',
            ttl: ttlMs,
            // The app creates the "calls" channel (high importance, rings).
            notification: { channelId: 'calls', tag: message.tag },
          },
          webpush: {
            headers: { TTL: String(Math.round(ttlMs / 1000)), Urgency: 'high' },
            notification: { tag: message.tag, renotify: true },
          },
        });
        return true;
      } catch (err) {
        const code = (err as { code?: string }).code ?? '';
        if (DEAD_TOKEN_CODES.includes(code)) {
          await pool.query('UPDATE user_sessions SET push_token = NULL WHERE push_token = $1', [token]);
        } else {
          console.error('[push] send failed', code || err);
        }
        return false;
      }
    },
  };
}
