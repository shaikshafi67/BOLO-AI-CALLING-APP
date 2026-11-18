import { createHash, randomInt, timingSafeEqual } from 'crypto';
import type { Mailer } from '../services/mailer';

/// One-time email verification after sign-up (docs/sessions.md).
///
/// New email/password accounts get a 6-digit code by email and must enter it
/// before using the app. Google accounts are already verified by Google, and
/// accounts created before this feature existed are not asked.

export const CODE_TTL_MS = 10 * 60_000;
export const RESEND_AFTER_MS = 60_000;
export const MAX_ATTEMPTS = 5;

export interface StoredCode {
  uid: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  sentAt: Date;
}

export interface CodeStore {
  get(uid: string): Promise<StoredCode | null>;
  put(code: StoredCode): Promise<void>;
  addAttempt(uid: string): Promise<void>;
  remove(uid: string): Promise<void>;
}

export interface Account {
  email: string | null;
  emailVerified: boolean;
  providers: string[];
  createdAt: Date;
}

/// Firebase Authentication, behind an interface so this can be tested.
export interface AccountDirectory {
  get(uid: string): Promise<Account | null>;
  markVerified(uid: string): Promise<void>;
}

export type VerificationResult =
  | { ok: true; verified: boolean; required: boolean; resendInSeconds?: number }
  | { ok: false; status: number; error: string; retryInSeconds?: number; attemptsLeft?: number };

const hash = (uid: string, code: string) => createHash('sha256').update(`${uid}:${code}`).digest('hex');

export function createEmailVerification(deps: {
  store: CodeStore;
  accounts: AccountDirectory;
  mailer: Mailer;
  /// Accounts created before this date are never asked to verify.
  requiredSince: Date;
  /// Off until codes can actually be sent, so nobody gets stuck waiting for an email.
  enabled?: () => boolean;
  now?: () => number;
  generateCode?: () => string;
}) {
  const now = deps.now ?? Date.now;
  const generateCode = deps.generateCode ?? (() => String(randomInt(100000, 1000000)));

  /// Whether [account] still has to verify its email.
  const enabled = deps.enabled ?? (() => true);
  const mustVerify = (account: Account) =>
    enabled() &&
    !account.emailVerified && account.providers.includes('password') && account.createdAt.getTime() >= deps.requiredSince.getTime();

  async function status(uid: string): Promise<VerificationResult> {
    const account = await deps.accounts.get(uid);
    if (!account) return { ok: false, status: 404, error: 'account_not_found' };
    return { ok: true, verified: account.emailVerified, required: mustVerify(account) };
  }

  /// Emails a fresh code (at most one per minute).
  async function send(uid: string): Promise<VerificationResult> {
    const account = await deps.accounts.get(uid);
    if (!account) return { ok: false, status: 404, error: 'account_not_found' };
    if (!mustVerify(account) || !account.email) return { ok: true, verified: account.emailVerified, required: false };

    const previous = await deps.store.get(uid);
    const wait = previous ? previous.sentAt.getTime() + RESEND_AFTER_MS - now() : 0;
    if (wait > 0) return { ok: false, status: 429, error: 'too_soon', retryInSeconds: Math.ceil(wait / 1000) };

    const code = generateCode();
    try {
      await deps.mailer.sendVerificationCode(account.email, code);
    } catch (err) {
      console.error('[verification] email failed', err);
      return { ok: false, status: 502, error: 'email_failed' };
    }
    await deps.store.put({
      uid,
      email: account.email,
      codeHash: hash(uid, code),
      expiresAt: new Date(now() + CODE_TTL_MS),
      attempts: 0,
      sentAt: new Date(now()),
    });
    return { ok: true, verified: false, required: true, resendInSeconds: RESEND_AFTER_MS / 1000 };
  }

  /// Checks the code; on success the Firebase account is marked verified.
  async function verify(uid: string, code: string): Promise<VerificationResult> {
    const account = await deps.accounts.get(uid);
    if (!account) return { ok: false, status: 404, error: 'account_not_found' };
    if (!mustVerify(account)) return { ok: true, verified: account.emailVerified, required: false };

    const stored = await deps.store.get(uid);
    if (!stored || stored.expiresAt.getTime() < now()) return { ok: false, status: 410, error: 'code_expired' };
    if (stored.attempts >= MAX_ATTEMPTS) return { ok: false, status: 429, error: 'too_many_attempts' };

    const given = Buffer.from(hash(uid, code.trim()));
    const expected = Buffer.from(stored.codeHash);
    if (!/^\d{6}$/.test(code.trim()) || !timingSafeEqual(given, expected)) {
      const used = stored.attempts + 1;
      await deps.store.addAttempt(uid);
      return { ok: false, status: 400, error: 'wrong_code', attemptsLeft: MAX_ATTEMPTS - used };
    }

    await deps.accounts.markVerified(uid);
    await deps.store.remove(uid);
    return { ok: true, verified: true, required: false };
  }

  return { status, send, verify };
}

/// In-memory code store for tests.
export class MemoryCodeStore implements CodeStore {
  readonly codes = new Map<string, StoredCode>();
  async get(uid: string) {
    return this.codes.get(uid) ?? null;
  }
  async put(code: StoredCode) {
    this.codes.set(code.uid, { ...code });
  }
  async addAttempt(uid: string) {
    const c = this.codes.get(uid);
    if (c) c.attempts++;
  }
  async remove(uid: string) {
    this.codes.delete(uid);
  }
}
