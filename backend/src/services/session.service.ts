import { pool } from '../config/db';
import type { SessionStore } from '../sessions/sessionStore';

/// PostgreSQL-backed session store (table user_sessions, migration 002).
export const pgSessionStore: SessionStore = {
  async claim(uid, sessionId, device) {
    // The CTE reads the old row before the upsert replaces it.
    const result = await pool.query(
      `WITH previous AS (SELECT session_id FROM user_sessions WHERE firebase_uid = $1)
       INSERT INTO user_sessions (firebase_uid, session_id, device, claimed_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (firebase_uid)
       DO UPDATE SET session_id = EXCLUDED.session_id, device = EXCLUDED.device, claimed_at = now()
       RETURNING (SELECT session_id FROM previous) AS previous`,
      [uid, sessionId, device ?? null],
    );
    return result.rows[0]?.previous ?? null;
  },

  async current(uid) {
    const result = await pool.query('SELECT session_id FROM user_sessions WHERE firebase_uid = $1', [uid]);
    return result.rows[0]?.session_id ?? null;
  },

  async release(uid, sessionId) {
    await pool.query('DELETE FROM user_sessions WHERE firebase_uid = $1 AND session_id = $2', [uid, sessionId]);
  },
};
