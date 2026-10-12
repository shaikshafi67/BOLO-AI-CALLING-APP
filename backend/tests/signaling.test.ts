import http from 'http';
import type { AddressInfo } from 'net';
import { io as connect, Socket } from 'socket.io-client';
import { attachSignaling, TokenVerifier } from '../src/websocket/signaling';

// Stand-in for Firebase Admin: tokens look like "valid:<uid>:<name>".
const fakeVerifier: TokenVerifier = async (token) => {
  const [kind, uid, name] = token.split(':');
  if (kind !== 'valid') throw new Error('bad token');
  return { uid, name };
};

let server: http.Server;
let url: string;
let closeIo: () => void;
const clients: Socket[] = [];

beforeEach(async () => {
  server = http.createServer();
  const { io } = attachSignaling(server, { verifyToken: fakeVerifier });
  closeIo = () => io.close();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  clients.splice(0).forEach((c) => c.disconnect());
  closeIo();
  await new Promise((resolve) => server.close(resolve));
});

function client(token: string | undefined): Promise<Socket> {
  const socket = connect(url, { auth: token === undefined ? {} : { token }, transports: ['websocket'], reconnection: false });
  clients.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function emit<T = any>(socket: Socket, event: string, payload?: unknown): Promise<T> {
  return new Promise((resolve) => (payload === undefined ? socket.emit(event, resolve) : socket.emit(event, payload, resolve)));
}

function next<T = any>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

describe('signaling server', () => {
  test('rejects connections without a valid Firebase token', async () => {
    await expect(client(undefined)).rejects.toThrow('unauthorized');
    await expect(client('forged')).rejects.toThrow('unauthorized');
  });

  test('two people create and join a room, then exchange WebRTC signals', async () => {
    const shafi = await client('valid:u1:Shafi');
    const marcus = await client('valid:u2:Marcus');

    const created = await emit(shafi, 'room:create', { language: 'hi' });
    expect(created).toMatchObject({ ok: true, peers: [] });
    expect(created.roomCode).toMatch(/^BOLO-\d{4}$/);

    const joinedNotice = next(shafi, 'peer:joined');
    const joined = await emit(marcus, 'room:join', { roomCode: created.roomCode.toLowerCase(), language: 'en' });
    expect(joined).toEqual({ ok: true, roomCode: created.roomCode, peers: [{ uid: 'u1', name: 'Shafi', language: 'hi' }] });
    expect(await joinedNotice).toEqual({ uid: 'u2', name: 'Marcus', language: 'en' });

    // Offer goes to Marcus, answer comes back to Shafi.
    const offerReceived = next(marcus, 'signal');
    expect(await emit(shafi, 'signal', { type: 'offer', data: { sdp: 'v=0 offer' } })).toEqual({ ok: true });
    expect(await offerReceived).toEqual({ from: 'u1', type: 'offer', data: { sdp: 'v=0 offer' } });

    const answerReceived = next(shafi, 'signal');
    await emit(marcus, 'signal', { type: 'answer', data: { sdp: 'v=0 answer' } });
    expect(await answerReceived).toMatchObject({ from: 'u2', type: 'answer' });

    const candidate = next(marcus, 'signal');
    await emit(shafi, 'signal', { type: 'ice-candidate', data: { candidate: 'candidate:1 1 udp ...' } });
    expect(await candidate).toMatchObject({ type: 'ice-candidate' });
  });

  test('validates room codes, languages and signal types', async () => {
    const a = await client('valid:u1:A');
    expect(await emit(a, 'room:create', { language: 'xx' })).toEqual({ ok: false, error: 'invalid_language' });
    expect(await emit(a, 'room:join', { roomCode: 'ROOM-1', language: 'en' })).toEqual({ ok: false, error: 'invalid_room_code' });
    expect(await emit(a, 'room:join', { roomCode: 'BOLO-0001', language: 'en' })).toEqual({ ok: false, error: 'not_found' });
    expect(await emit(a, 'signal', { type: 'offer', data: {} })).toEqual({ ok: false, error: 'not_in_room' });

    await emit(a, 'room:create', { language: 'en' });
    expect(await emit(a, 'signal', { type: 'hack', data: {} })).toEqual({ ok: false, error: 'invalid_signal' });
  });

  test('a third person cannot join a 1:1 call', async () => {
    const [a, b, c] = await Promise.all([client('valid:u1:A'), client('valid:u2:B'), client('valid:u3:C')]);
    const { roomCode } = await emit(a, 'room:create', { language: 'hi' });
    await emit(b, 'room:join', { roomCode, language: 'en' });
    expect(await emit(c, 'room:join', { roomCode, language: 'te' })).toEqual({ ok: false, error: 'full' });
  });

  test('peers are told about language changes and when someone leaves or disconnects', async () => {
    const [a, b] = await Promise.all([client('valid:u1:A'), client('valid:u2:B')]);
    const { roomCode } = await emit(a, 'room:create', { language: 'hi' });
    await emit(b, 'room:join', { roomCode, language: 'en' });

    const lang = next(a, 'peer:language');
    await emit(b, 'language:update', { language: 'ta' });
    expect(await lang).toEqual({ uid: 'u2', language: 'ta' });

    const left = next(a, 'peer:left');
    b.disconnect();
    expect(await left).toEqual({ uid: 'u2' });
  });
});
