import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { isSupportedLanguageCode } from '../config/supportedLanguages';
import { Participant, ROOM_CODE_PATTERN, RoomManager } from './roomManager';

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
  options: { verifyToken: TokenVerifier; rooms?: RoomManager; corsOrigin?: string | string[] },
) {
  const verifyToken = options.verifyToken;
  const rooms = options.rooms ?? new RoomManager();

  const io = new Server(httpServer, { cors: { origin: options.corsOrigin ?? '*' } });

  // Every socket must present a valid Firebase ID token:
  //   io(url, { auth: { token: await user.getIdToken() } })
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) return next(new Error('unauthorized'));
    try {
      socket.data.user = await verifyToken(token);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as VerifiedUser;
    const displayName = user.name ?? user.email?.split('@')[0] ?? 'BoloAI user';

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

  return { io, rooms };
}
