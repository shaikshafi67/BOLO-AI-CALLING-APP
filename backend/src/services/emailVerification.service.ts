import { pool } from '../config/db';
import { getFirebaseAuth } from '../config/firebaseAdmin';
import type { AccountDirectory, CodeStore } from '../verification/emailVerification';

/// Verification codes in PostgreSQL (table email_verification_codes, migration 005).
export const pgCodeStore: CodeStore = {
  async get(uid) {
    const r = await pool.query('SELECT * FROM email_verification_codes WHERE firebase_uid = $1', [uid]);
    const row = r.rows[0];
    return row
      ? { uid: row.firebase_uid, email: row.email, codeHash: row.code_hash, expiresAt: row.expires_at, attempts: row.attempts, sentAt: row.sent_at }
      : null;
  },
  async put(c) {
    await pool.query(
      `INSERT INTO email_verification_codes (firebase_uid, email, code_hash, expires_at, attempts, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (firebase_uid) DO UPDATE SET email = EXCLUDED.email, code_hash = EXCLUDED.code_hash,
         expires_at = EXCLUDED.expires_at, attempts = EXCLUDED.attempts, sent_at = EXCLUDED.sent_at`,
      [c.uid, c.email, c.codeHash, c.expiresAt, c.attempts, c.sentAt],
    );
  },
  async addAttempt(uid) {
    await pool.query('UPDATE email_verification_codes SET attempts = attempts + 1 WHERE firebase_uid = $1', [uid]);
  },
  async remove(uid) {
    await pool.query('DELETE FROM email_verification_codes WHERE firebase_uid = $1', [uid]);
  },
};

/// Firebase Authentication accounts (via Firebase Admin).
export const firebaseAccounts: AccountDirectory = {
  async get(uid) {
    try {
      const u = await getFirebaseAuth().getUser(uid);
      return {
        email: u.email ?? null,
        emailVerified: u.emailVerified,
        providers: u.providerData.map((p) => p.providerId),
        createdAt: new Date(u.metadata.creationTime),
      };
    } catch (err) {
      if ((err as { code?: string }).code === 'auth/user-not-found') return null;
      throw err;
    }
  },
  async markVerified(uid) {
    await getFirebaseAuth().updateUser(uid, { emailVerified: true });
  },
};
