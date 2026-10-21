import http from 'http';
import type { AddressInfo } from 'net';
import { io as connect, Socket } from 'socket.io-client';
import { attachSignaling, TokenVerifier } from '../src/websocket/signaling';
import type { CallRecorder } from '../src/websocket/callRecorder';
import type { TranslationEngine } from '../src/translation/engine';

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

// Stand-in for Google Cloud: audio chunks are text; "final:..." ends a sentence.
const fakeTranslation: TranslationEngine = {
  available: () => true,
  startRecognition: (_language, onResult) => ({
    write: (chunk) => {
      const text = chunk.toString();
      onResult(text.startsWith('final:') ? { text: text.slice(6), final: true } : { text, final: false });
    },
    end: () => undefined,
  }),
  translate: async (text, _from, to) => `[${to}] ${text}`,
  synthesize: async (text) => Buffer.from(`mp3:${text}`),
};

// Stand-in for the database: remembers what the server recorded.
let recorded: string[] = [];
const fakeRecorder: CallRecorder = {
  async started(c) {
    recorded.push(`started ${c.callerUid}(${c.callerLanguage}) -> ${c.receiverUid}(${c.receiverLanguage})`);
    return 'call-1';
  },
  async resumed(id) {
    recorded.push(`resumed ${id}`);
  },
  async ended(id) {
    recorded.push(`ended ${id}`);
  },
  async unanswered(c) {
    recorded.push(`${c.status} ${c.callerUid} -> ${c.receiverUid}`);
  },
};

beforeEach(async () => {
  server = http.createServer();
  recorded = [];
  const { io } = attachSignaling(server, { verifyToken: fakeVerifier, calls: fakeRecorder, inviteTimeoutMs: 400, translation: fakeTranslation });
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
    expect(joined).toMatchObject({ ok: true, roomCode: created.roomCode, peers: [{ uid: 'u1', name: 'Shafi', language: 'hi' }] });
    expect(joined.iceServers).toEqual(created.iceServers);
    expect(created.iceServers.length).toBeGreaterThan(0);
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

  test('relays chat and media state to the other participant only', async () => {
    const [a, b] = await Promise.all([client('valid:u1:A'), client('valid:u2:B')]);
    const { roomCode } = await emit(a, 'room:create', { language: 'hi' });
    await emit(b, 'room:join', { roomCode, language: 'en' });

    const chat = next(b, 'message');
    expect(await emit(a, 'message', { kind: 'chat', text: '  namaste  ' })).toEqual({ ok: true });
    expect(await chat).toMatchObject({ kind: 'chat', text: 'namaste', from: 'u1', name: 'A' });

    const state = next(a, 'message');
    await emit(b, 'message', { kind: 'state', state: { mic: false, camera: true, sharing: 'yes', extra: 1 } });
    expect(await state).toMatchObject({ kind: 'state', state: { mic: false, camera: true, sharing: false }, from: 'u2' });

    expect(await emit(a, 'message', { kind: 'chat', text: '   ' })).toEqual({ ok: false, error: 'invalid_message' });
  });

  test('records a call when both people are in the room, and continues it after a reconnect', async () => {
    const [a, b] = await Promise.all([client('valid:u1:A'), client('valid:u2:B')]);
    const { roomCode } = await emit(a, 'room:create', { language: 'hi' });
    expect(recorded).toEqual([]);

    await emit(b, 'room:join', { roomCode, language: 'en' });
    await waitFor(() => recorded.length === 1);
    expect(recorded).toEqual(['started u1(hi) -> u2(en)']);

    await emit(b, 'room:leave');
    await waitFor(() => recorded.length === 2);
    await emit(b, 'room:join', { roomCode, language: 'en' });
    await waitFor(() => recorded.length === 3);
    expect(recorded.slice(1)).toEqual(['ended call-1', 'resumed call-1']);
  });
});

describe('live translation', () => {
  test('captions reach both people and the translated voice only the listener', async () => {
    const [a, b] = await Promise.all([client('valid:u1:A'), client('valid:u2:B')]);
    expect(await emit(a, 'translation:start')).toEqual({ ok: true, available: true });
    const { roomCode } = await emit(a, 'room:create', { language: 'hi' });

    // Alone in the room: nothing is sent to the AI services.
    let early = false;
    a.once('caption', () => (early = true));
    a.emit('audio', Buffer.from('final:hello?'));
    await new Promise((r) => setTimeout(r, 100));
    expect(early).toBe(false);

    await emit(b, 'room:join', { roomCode, language: 'te' });
    const captionA = next(a, 'caption');
    const captionB = next(b, 'caption');
    const voice = next(b, 'translation:audio');
    let voiceToSpeaker = false;
    a.once('translation:audio', () => (voiceToSpeaker = true));

    a.emit('audio', Buffer.from('final:namaste'));
    expect(await captionA).toMatchObject({ speakerUid: 'u1', original: 'namaste', translated: '[te] namaste', final: true });
    expect(await captionB).toMatchObject({ speakerUid: 'u1', translated: '[te] namaste' });
    const audio = await voice;
    expect(Buffer.from(audio.audio).toString()).toBe('mp3:[te] namaste');
    await new Promise((r) => setTimeout(r, 50));
    expect(voiceToSpeaker).toBe(false);
  });
});

describe('ringing a contact', () => {
  test('cannot ring someone who is offline or already in a call', async () => {
    const [a, c, d] = await Promise.all([client('valid:u1:A'), client('valid:u3:C'), client('valid:u4:D')]);
    await emit(a, 'room:create', { language: 'hi' });
    expect(await emit(a, 'call:invite', { userId: 'u2' })).toEqual({ ok: false, error: 'offline' });
    expect(await emit(a, 'call:invite', { userId: 'u1' })).toEqual({ ok: false, error: 'self' });

    await emit(c, 'room:create', { language: 'en' });
    expect(await emit(a, 'call:invite', { userId: 'u3' })).toEqual({ ok: false, error: 'busy' });
    expect(await emit(d, 'call:invite', { userId: 'u1' })).toEqual({ ok: false, error: 'not_in_room' });
  });

  test('the callee is rung on their device and can decline', async () => {
    const [a, b] = await Promise.all([client('valid:u1:A'), client('valid:u2:B')]);
    const { roomCode } = await emit(a, 'room:create', { language: 'hi' });

    const incoming = next(b, 'call:incoming');
    expect(await emit(a, 'call:invite', { userId: 'u2' })).toEqual({ ok: true });
    expect(await incoming).toEqual({ roomCode, from: { uid: 'u1', name: 'A' }, language: 'hi' });
    expect(await emit(a, 'call:invite', { userId: 'u2' })).toEqual({ ok: false, error: 'already_ringing' });

    const declined = next(a, 'call:declined');
    expect(await emit(b, 'call:decline', { roomCode })).toEqual({ ok: true });
    expect(await declined).toEqual({ uid: 'u2', name: 'B' });
    await waitFor(() => recorded.includes('rejected u1 -> u2'));
  });

  test('answering by joining the room stops the ringing without a missed call', async () => {
    const [a, b] = await Promise.all([client('valid:u1:A'), client('valid:u2:B')]);
    const { roomCode } = await emit(a, 'room:create', { language: 'hi' });
    await emit(a, 'call:invite', { userId: 'u2' });

    const callee = await client('valid:u2:B');
    expect(await emit(callee, 'room:join', { roomCode, language: 'en' })).toMatchObject({ ok: true });
    await waitFor(() => recorded.length === 1);
    expect(recorded).toEqual(['started u1(hi) -> u2(en)']);
    // Too late to decline once answered.
    expect(await emit(b, 'call:decline', { roomCode })).toEqual({ ok: false, error: 'not_found' });
  });

  test('stops ringing when the caller hangs up, or after the timeout', async () => {
    const [a, b] = await Promise.all([client('valid:u1:A'), client('valid:u2:B')]);
    const first = await emit(a, 'room:create', { language: 'hi' });
    await emit(a, 'call:invite', { userId: 'u2' });
    const cancelled = next(b, 'call:cancelled');
    await emit(a, 'room:leave');
    expect(await cancelled).toEqual({ roomCode: first.roomCode });

    const second = await emit(a, 'room:create', { language: 'hi' });
    await emit(a, 'call:invite', { userId: 'u2' });
    const unanswered = next(a, 'call:unanswered');
    const cancelledAgain = next(b, 'call:cancelled');
    expect(await unanswered).toEqual({ uid: 'u2' });
    expect(await cancelledAgain).toEqual({ roomCode: second.roomCode });
    await waitFor(() => recorded.filter((r) => r === 'missed u1 -> u2').length === 2);
  });
});

async function waitFor(condition: () => boolean) {
  for (let i = 0; i < 100 && !condition(); i++) await new Promise((r) => setTimeout(r, 10));
  expect(condition()).toBe(true);
}
