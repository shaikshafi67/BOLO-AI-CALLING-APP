import { Account, createEmailVerification, MemoryCodeStore } from '../src/verification/emailVerification';
import type { Mailer } from '../src/services/mailer';

const SINCE = new Date('2026-11-18T00:00:00Z');

function setup(accounts: Record<string, Account>, enabled = true) {
  let clock = new Date('2026-11-20T10:00:00Z').getTime();
  let next = 0;
  const codes = ['111111', '222222', '333333'];
  const sent: { to: string; code: string }[] = [];
  const mailer: Mailer = {
    configured: () => true,
    sendVerificationCode: async (to, code) => {
      sent.push({ to, code });
    },
  };
  const store = new MemoryCodeStore();
  const verification = createEmailVerification({
    store,
    mailer,
    requiredSince: SINCE,
    enabled: () => enabled,
    now: () => clock,
    generateCode: () => codes[next++],
    accounts: {
      get: async (uid) => accounts[uid] ?? null,
      markVerified: async (uid) => {
        accounts[uid].emailVerified = true;
      },
    },
  });
  return { verification, sent, store, advance: (ms: number) => (clock += ms) };
}

const newPasswordAccount = (): Account => ({ email: 'priya@example.com', emailVerified: false, providers: ['password'], createdAt: new Date('2026-11-20T09:59:00Z') });

describe('email verification after sign-up', () => {
  test('nobody is asked while email sending is not set up', async () => {
    const { verification, sent } = setup({ u1: newPasswordAccount() }, false);
    expect(await verification.status('u1')).toMatchObject({ required: false });
    expect(await verification.send('u1')).toMatchObject({ ok: true, required: false });
    expect(sent).toEqual([]);
  });

  test('a new email/password account verifies once with the emailed code', async () => {
    const { verification, sent, store } = setup({ u1: newPasswordAccount() });
    expect(await verification.status('u1')).toEqual({ ok: true, verified: false, required: true });

    expect(await verification.send('u1')).toMatchObject({ ok: true, required: true, resendInSeconds: 60 });
    expect(sent).toEqual([{ to: 'priya@example.com', code: '111111' }]);
    // Only a hash is stored, never the code itself.
    expect(JSON.stringify([...store.codes.values()])).not.toContain('111111');

    expect(await verification.verify('u1', '111111')).toEqual({ ok: true, verified: true, required: false });
    expect(await verification.status('u1')).toEqual({ ok: true, verified: true, required: false });
    expect(store.codes.size).toBe(0);
  });

  test('wrong codes count down, and too many attempts lock the code', async () => {
    const { verification } = setup({ u1: newPasswordAccount() });
    await verification.send('u1');
    expect(await verification.verify('u1', '999999')).toMatchObject({ ok: false, error: 'wrong_code', attemptsLeft: 4 });
    expect(await verification.verify('u1', 'abc')).toMatchObject({ ok: false, error: 'wrong_code', attemptsLeft: 3 });
    for (let i = 0; i < 3; i++) await verification.verify('u1', '000000');
    expect(await verification.verify('u1', '111111')).toMatchObject({ ok: false, status: 429, error: 'too_many_attempts' });
  });

  test('codes expire after 10 minutes; a new code can be sent after a minute', async () => {
    const { verification, sent, advance } = setup({ u1: newPasswordAccount() });
    await verification.send('u1');
    expect(await verification.send('u1')).toMatchObject({ ok: false, status: 429, error: 'too_soon', retryInSeconds: 60 });

    advance(11 * 60_000);
    expect(await verification.verify('u1', '111111')).toMatchObject({ ok: false, status: 410, error: 'code_expired' });
    expect(await verification.send('u1')).toMatchObject({ ok: true });
    expect(sent.map((s) => s.code)).toEqual(['111111', '222222']);
    expect(await verification.verify('u1', '222222')).toMatchObject({ ok: true, verified: true });
  });

  test('Google accounts and accounts created before the feature are never asked', async () => {
    const { verification, sent } = setup({
      google: { email: 'g@example.com', emailVerified: true, providers: ['google.com'], createdAt: new Date('2026-11-20T00:00:00Z') },
      old: { email: 'old@example.com', emailVerified: false, providers: ['password'], createdAt: new Date('2026-10-01T00:00:00Z') },
    });
    expect(await verification.status('google')).toMatchObject({ required: false });
    expect(await verification.status('old')).toMatchObject({ required: false });
    expect(await verification.send('old')).toMatchObject({ ok: true, required: false });
    expect(sent).toEqual([]);
  });
});
