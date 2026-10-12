import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { isSupportedLanguageCode } from '../config/supportedLanguages';
import { Participant, ROOM_CODE_PATTERN, RoomManager } from './roomManager';
import { SessionStore, sessionStatus } from '../sessions/sessionStore';

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
    corsOrigin?: string | string[];
  },
) {
  const verifyToken = options.verifyToken;
  const rooms = options.rooms ?? new RoomManager();

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
      ack({ ok: true, roomCode, peers: result.peers.map(publicView) });
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
