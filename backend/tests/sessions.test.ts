import http from 'http';
import type { AddressInfo } from 'net';
import express, { NextFunction, Response } from 'express';
import { io as connect, Socket } from 'socket.io-client';
import { attachSignaling, TokenVerifier } from '../src/websocket/signaling';
import { MemorySessionStore } from '../src/sessions/sessionStore';
import { createSessionRouter } from '../src/routes/session.routes';
import { activeSessionGuard } from '../src/middleware/session.middleware';
import type { AuthenticatedRequest } from '../src/middleware/auth.middleware';

// Stand-ins for Firebase Admin: tokens look like "valid:<uid>:<name>".
const fakeVerifier: TokenVerifier = async (token) => {
  const [kind, uid, name] = token.split(':');
  if (kind !== 'valid') throw new Error('bad token');
  return { uid, name };
};
const fakeAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    req.firebaseUid = (await fakeVerifier(req.header('authorization')?.replace('Bearer ', '') ?? '')).uid;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
};

const PHONE = 'phone-session-0001';
const LAPTOP = 'laptop-session-0002';

let server: http.Server;
let url: string;
let store: MemorySessionStore;
let closeIo: () => void;
const clients: Socket[] = [];

beforeEach(async () => {
  store = new MemorySessionStore();
  const app = express();
  app.use(express.json());
  app.use('/api/sessions', createSessionRouter(store, fakeAuth, (uid, sid) => void signaling.kickOtherSessions(uid, sid)));
  app.get('/api/users/me', fakeAuth, activeSessionGuard(store), (_req, res) => {
    res.json({ ok: true });
  });
  server = http.createServer(app);
  const signaling = attachSignaling(server, { verifyToken: fakeVerifier, sessions: store });
  closeIo = () => signaling.io.close();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  clients.splice(0).forEach((c) => c.disconnect());
  closeIo();
  await new Promise((resolve) => server.close(resolve));
});

async function api(method: string, path: string, opts: { token?: string; sessionId?: string; body?: unknown } = {}) {
  const res = await fetch(url + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.sessionId ? { 'x-session-id': opts.sessionId } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return { status: res.status, body: (res.status === 204 ? null : await res.json()) as any };
}

function client(token: string, sessionId: string): Promise<Socket> {
  const socket = connect(url, { auth: { token, sessionId }, transports: ['websocket'], reconnection: false });
  clients.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

const signIn = (sessionId: string) =>
  api('POST', '/api/sessions', { token: 'valid:u1:Shafi', body: { sessionId, device: 'test' } });

describe('one signed-in device per account', () => {
  test('signing in on a second device signs the first one out of the API', async () => {
    expect((await signIn(PHONE)).body).toEqual({ ok: true, signedOutOtherDevice: false });
    expect((await api('GET', '/api/users/me', { token: 'valid:u1:Shafi', sessionId: PHONE })).status).toBe(200);

    expect((await signIn(LAPTOP)).body).toEqual({ ok: true, signedOutOtherDevice: true });

    const phone = await api('GET', '/api/users/me', { token: 'valid:u1:Shafi', sessionId: PHONE });
    expect(phone).toEqual({ status: 401, body: expect.objectContaining({ error: 'session_replaced' }) });
    expect((await api('GET', '/api/users/me', { token: 'valid:u1:Shafi', sessionId: LAPTOP })).status).toBe(200);
  });

  test('the first device is told immediately through its socket', async () => {
    await signIn(PHONE);
    const phone = await client('valid:u1:Shafi', PHONE);
    const revoked = new Promise((resolve) => phone.once('session:revoked', resolve));
    const disconnected = new Promise((resolve) => phone.once('disconnect', resolve));

    await signIn(LAPTOP);
    expect(await revoked).toEqual({ reason: 'signed_in_elsewhere' });
    expect(await disconnected).toBe('io server disconnect');

    // The new device stays connected; the old one cannot reconnect.
    await expect(client('valid:u1:Shafi', LAPTOP)).resolves.toBeDefined();
    await expect(client('valid:u1:Shafi', PHONE)).rejects.toThrow('session_replaced');
  });

  test('a call in progress on the old device ends for the other person', async () => {
    await signIn(PHONE);
    await api('POST', '/api/sessions', { token: 'valid:u2:Marcus', body: { sessionId: 'marcus-session-0003' } });
    const phone = await client('valid:u1:Shafi', PHONE);
    const marcus = await client('valid:u2:Marcus', 'marcus-session-0003');

    const { roomCode } = await new Promise<any>((r) => phone.emit('room:create', { language: 'hi' }, r));
    await new Promise((r) => marcus.emit('room:join', { roomCode, language: 'en' }, r));

    const peerLeft = new Promise((resolve) => marcus.once('peer:left', resolve));
    await signIn(LAPTOP);
    expect(await peerLeft).toEqual({ uid: 'u1' });
  });

  test('other accounts are not affected', async () => {
    await api('POST', '/api/sessions', { token: 'valid:u2:Marcus', body: { sessionId: 'marcus-session-0003' } });
    const marcus = await client('valid:u2:Marcus', 'marcus-session-0003');
    let revoked = false;
    marcus.on('session:revoked', () => (revoked = true));

    await signIn(PHONE);
    await signIn(LAPTOP);
    await new Promise((r) => setTimeout(r, 100));
    expect(revoked).toBe(false);
    expect(marcus.connected).toBe(true);
  });

  test('signing out frees the account; sockets need a session', async () => {
    await signIn(PHONE);
    expect((await api('DELETE', '/api/sessions', { token: 'valid:u1:Shafi', sessionId: PHONE })).status).toBe(204);
    expect((await api('GET', '/api/users/me', { token: 'valid:u1:Shafi', sessionId: PHONE })).body.error).toBe('session_inactive');
    await expect(client('valid:u1:Shafi', PHONE)).rejects.toThrow('session_inactive');
    await expect(client('valid:u1:Shafi', '')).rejects.toThrow('session_required');
  });

  test('rejects malformed session ids and missing headers', async () => {
    expect((await signIn('short')).status).toBe(400);
    expect((await api('GET', '/api/users/me', { token: 'valid:u1:Shafi' })).body.error).toBe('session_required');
  });
});
