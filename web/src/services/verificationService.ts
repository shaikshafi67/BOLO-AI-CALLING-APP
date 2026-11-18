import { auth } from './firebase';
import { api, ApiError } from './api';

export interface VerificationStatus {
  verified: boolean;
  /// This account must enter the emailed code before using the app.
  required: boolean;
}

/// One-time email verification after sign-up (backend/src/routes/verification.routes.ts).
export const verificationService = {
  status: () => api<VerificationStatus>('GET', '/verification'),

  /// Emails a 6-digit code. Returns seconds until another can be sent.
  async send(): Promise<number> {
    const r = await api<{ resendInSeconds?: number }>('POST', '/verification/send', {});
    return r.resendInSeconds ?? 60;
  },

  /// Checks the code; on success refreshes the sign-in so it carries the verified email.
  async verify(code: string): Promise<void> {
    await api('POST', '/verification/verify', { code });
    await auth.currentUser?.reload();
    await auth.currentUser?.getIdToken(true);
  },

  /// A message the user can act on for a failed request.
  describe(e: unknown): string {
    const code = e instanceof ApiError ? e.code : '';
    const details = e instanceof ApiError ? (e.body as { attemptsLeft?: number }) : undefined;
    switch (code) {
      case 'wrong_code':
        return details?.attemptsLeft !== undefined && details.attemptsLeft > 0
          ? `That code isn’t right. ${details.attemptsLeft} ${details.attemptsLeft === 1 ? 'try' : 'tries'} left.`
          : 'That code isn’t right.';
      case 'code_expired':
        return 'This code has expired. Send a new one.';
      case 'too_many_attempts':
        return 'Too many wrong codes. Send a new one.';
      case 'too_soon':
        return 'Please wait a minute before asking for another code.';
      case 'email_failed':
        return 'We couldn’t send the email. Check the address and try again in a minute.';
      case 'unreachable':
        return 'Can’t reach the BoloAI server. Check your connection and try again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  },
};
