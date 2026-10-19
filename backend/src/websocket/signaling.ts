import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { isSupportedLanguageCode } from '../config/supportedLanguages';
import { Participant, ROOM_CODE_PATTERN, RoomManager } from './roomManager';
import { SessionStore, sessionStatus } from '../sessions/sessionStore';
import { IceServer, iceServersFromEnv } from './iceServers';
import { CallRecorder } from './callRecorder';

/// Identity extracted from a verified Firebase ID token.
export interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
}

export type TokenVerifier = (idToken: string) => Promise<VerifiedUser>;

const SIGNAL_TYPES = ['offer', 'answer', 'ice-candidate'] as const;
type SignalType = (typeof SIGNAL_TYPES)[number];

type Ack = (response: Record<string, unknown>) => void;

/// Longest chat message relayed during a call.
const MAX_CHAT_LENGTH = 1000;

/// Attaches the WebRTC signaling server to the HTTP server.
///
/// Signaling only introduces the two peers: it relays SDP offers/answers and
/// ICE candidates between the two sockets in a room. Video and the original
/// audio then flow peer-to-peer over WebRTC, never through this server.
/// See docs/signaling.md for the event reference.
export function attachSignaling(
  httpServer: HttpServer,
  options: {
    verifyToken: TokenVerifier;
    /// When set, sockets must also present the device's active session id
    /// (one signed-in device per account, see docs/sessions.md).
    sessions?: SessionStore;
    rooms?: RoomManager;
    /// STUN/TURN servers sent with room:create / room:join replies.
    iceServers?: IceServer[];
    /// Records connected calls for call history.
    calls?: CallRecorder;
    corsOrigin?: string | string[];
  },
) {
  const verifyToken = options.verifyToken;
  const rooms = options.rooms ?? new RoomManager();
  const iceServers = options.iceServers ?? iceServersFromEnv();

  /// The recorded call in each room, kept until the room empties so a
  /// reconnect by the same two people continues the same call.
  /// Database writes for one call run one after another (`queue`), so a quick
  /// hang-up still ends a call whose insert hasn't finished yet.
  const roomCalls = new Map<string, { callId: Promise<string | null>; queue: Promise<unknown>; uids: string[]; live: boolean }>();
  const logError = (what: string) => (err: unknown) => console.error(`[ERROR] ${what}`, err);

  function enqueue(entry: { callId: Promise<string | null>; queue: Promise<unknown> }, what: string, op: (id: string) => Promise<void>) {
    entry.queue = entry.queue.then(async () => {
      const id = await entry.callId;
      if (id) await op(id);
    }).catch(logError(what));
  }

  function callConnected(roomCode: string) {
    const recorder = options.calls;
    const [caller, receiver] = rooms.participants(roomCode);
    if (!recorder || !caller || !receiver) return;
    const existing = roomCalls.get(roomCode);
    if (existing && existing.uids.includes(caller.uid) && existing.uids.includes(receiver.uid)) {
      if (!existing.live) {
        existing.live = true;
        enqueue(existing, 'resume call', (id) => recorder.resumed(id));
      }
      return;
    }
    const callId = recorder
      .started({
        roomCode,
        callerUid: caller.uid,
        callerLanguage: caller.language,
        receiverUid: receiver.uid,
        receiverLanguage: receiver.language,
      })
      .catch((err) => {
        logError('record call')(err);
        return null;
      });
    roomCalls.set(roomCode, { callId, queue: callId, uids: [caller.uid, receiver.uid], live: true });
  }

  function callDisconnected(roomCode: string) {
    const entry = roomCalls.get(roomCode);
    const recorder = options.calls;
    if (entry?.live && recorder) {
      entry.live = false;
      enqueue(entry, 'end call', (id) => recorder.ended(id));
    }
    if (rooms.participants(roomCode).length === 0) roomCalls.delete(roomCode);
  }

  const io = new Server(httpServer, { cors: { origin: options.corsOrigin ?? '*' } });

  // Every socket must present a valid Firebase ID token and, when sessions
  // are enforced, the session id this device claimed after signing in:
  //   io(url, { auth: { token: await user.getIdToken(), sessionId } })
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) return next(new Error('unauthorized'));
    let user: VerifiedUser;
    try {
      user = await verifyToken(token);
    } catch {
      return next(new Error('unauthorized'));
    }
    socket.data.user = user;

    if (options.sessions) {
      const sessionId = socket.handshake.auth?.sessionId;
      if (typeof sessionId !== 'string' || sessionId.length === 0) return next(new Error('session_required'));
      const status = await sessionStatus(options.sessions, user.uid, sessionId).catch(() => null);
      if (status === null) return next(new Error('server_error'));
      // session_replaced: sign this device out. session_inactive: claim again.
      if (status !== 'active') return next(new Error(`session_${status}`));
      socket.data.sessionId = sessionId;
    }
    next();
  });

  /// Signs the account out everywhere except [keepSessionId]: those devices
  /// receive `session:revoked` and are disconnected (leaving any call).
  async function kickOtherSessions(uid: string, keepSessionId: string) {
    const sockets = await io.in(userRoom(uid)).fetchSockets();
    for (const s of sockets) {
      if (s.data.sessionId === keepSessionId) continue;
      s.emit('session:revoked', { reason: 'signed_in_elsewhere' });
      s.disconnect(true);
    }
  }

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as VerifiedUser;
    const displayName = user.name ?? user.email?.split('@')[0] ?? 'BoloAI user';
    socket.join(userRoom(user.uid));

    const publicView = (p: Participant) => ({ uid: p.uid, name: p.name, language: p.language });

    const joinRoom = (roomCode: string, language: string, ack: Ack) => {
      const result = rooms.join(roomCode, { socketId: socket.id, uid: user.uid, name: displayName, language });
      if (!result.ok) return ack({ ok: false, error: result.error });
      socket.join(roomCode);
      socket.to(roomCode).emit('peer:joined', { uid: user.uid, name: displayName, language });
      ack({ ok: true, roomCode, peers: result.peers.map(publicView), iceServers });
      if (result.peers.length > 0) callConnected(roomCode);
    };

    // Create a new room and join it as the first participant.
    socket.on('room:create', (payload: { language?: unknown } = {}, ack?: Ack) => {
      if (typeof ack !== 'function') return;
      const language = typeof payload?.language === 'string' ? payload.language : '';
      if (!isSupportedLanguageCode(language)) return ack({ ok: false, error: 'invalid_language' });
      if (rooms.roomOf(socket.id)) return ack({ ok: false, error: 'already_in_room' });
      joinRoom(rooms.createRoom(), language, ack);
    });

    // Join an existing room by its code.
    socket.on('room:join', (payload: { roomCode?: unknown; language?: unknown } = {}, ack?: Ack) => {
      if (typeof ack !== 'function') return;
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : '';
      const language = typeof payload?.language === 'string' ? payload.language : '';
      if (!ROOM_CODE_PATTERN.test(roomCode)) return ack({ ok: false, error: 'invalid_room_code' });
      if (!isSupportedLanguageCode(language)) return ack({ ok: false, error: 'invalid_language' });
      joinRoom(roomCode, language, ack);
    });

    // Relay WebRTC negotiation to the other participant.
    socket.on('signal', (payload: { type?: unknown; data?: unknown } = {}, ack?: Ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      const roomCode = rooms.roomOf(socket.id);
      if (!roomCode) return reply({ ok: false, error: 'not_in_room' });
      if (!SIGNAL_TYPES.includes(payload?.type as SignalType) || payload?.data === undefined) {
        return reply({ ok: false, error: 'invalid_signal' });
      }
      socket.to(roomCode).emit('signal', { from: user.uid, type: payload.type, data: payload.data });
      reply({ ok: true });
    });

    // In-call messages to the other participant: chat text, or this person's
    // media state (mic/camera/screen sharing) so their screen can show it.
    socket.on('message', (payload: { kind?: unknown; text?: unknown; state?: unknown } = {}, ack?: Ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      const roomCode = rooms.roomOf(socket.id);
      if (!roomCode) return reply({ ok: false, error: 'not_in_room' });
      let message: Record<string, unknown>;
      if (payload?.kind === 'chat' && typeof payload.text === 'string' && payload.text.trim().length > 0) {
        message = { kind: 'chat', text: payload.text.trim().slice(0, MAX_CHAT_LENGTH) };
      } else if (payload?.kind === 'state' && payload.state && typeof payload.state === 'object') {
        const s = payload.state as Record<string, unknown>;
        message = { kind: 'state', state: { mic: s.mic === true, camera: s.camera === true, sharing: s.sharing === true } };
      } else {
        return reply({ ok: false, error: 'invalid_message' });
      }
      socket.to(roomCode).emit('message', { ...message, from: user.uid, name: displayName, at: Date.now() });
      reply({ ok: true });
    });

    // Tell the other side which language this person now speaks.
    socket.on('language:update', (payload: { language?: unknown } = {}, ack?: Ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      const language = typeof payload?.language === 'string' ? payload.language : '';
      if (!isSupportedLanguageCode(language)) return reply({ ok: false, error: 'invalid_language' });
      const p = rooms.updateLanguage(socket.id, language);
      if (!p) return reply({ ok: false, error: 'not_in_room' });
      socket.to(rooms.roomOf(socket.id)!).emit('peer:language', { uid: user.uid, language });
      reply({ ok: true });
    });

    const leave = () => {
      const left = rooms.leave(socket.id);
      if (!left) return;
      socket.leave(left.roomCode);
      socket.to(left.roomCode).emit('peer:left', { uid: left.participant.uid });
      callDisconnected(left.roomCode);
    };

    socket.on('room:leave', (ack?: Ack) => {
      leave();
      if (typeof ack === 'function') ack({ ok: true });
    });
    socket.on('disconnect', leave);
  });

  return { io, rooms, kickOtherSessions };
}

/// Socket.IO room holding every socket of one account (never a call room,
/// whose codes look like BOLO-1234).
const userRoom = (uid: string) => `user:${uid}`;
