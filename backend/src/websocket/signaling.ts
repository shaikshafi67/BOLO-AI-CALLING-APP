import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { isSupportedLanguageCode } from '../config/supportedLanguages';
import { Participant, ROOM_CODE_PATTERN, RoomManager } from './roomManager';
import { SessionStore, sessionStatus } from '../sessions/sessionStore';
import { IceServer, iceServersFromEnv } from './iceServers';
import { CallRecorder } from './callRecorder';
import { TranslationEngine } from '../translation/engine';
import { LivePipeline } from '../translation/livePipeline';

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
    /// Finds who to ring for `call:invite` (a users.id from the database).
    /// Without it, the id is taken to be the Firebase uid (tests).
    resolveUser?: (userId: string) => Promise<{ uid: string } | null>;
    /// How long an invite rings before it counts as missed.
    inviteTimeoutMs?: number;
    /// Speech-to-text, translation and text-to-speech for live translation.
    translation?: TranslationEngine;
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

  // ---- Live translation ----

  const pipeline = options.translation
    ? new LivePipeline(options.translation, {
        toRoom: (roomCode, event, payload) => io.to(roomCode).emit(event, payload),
        toOthers: (socketId, roomCode, event, payload) => io.to(roomCode).except(socketId).emit(event, payload),
        toSocket: (socketId, event, payload) => io.to(socketId).emit(event, payload),
        // Text only, linked to the call record (privacy: no audio is stored).
        translated: (line) => {
          const entry = roomCalls.get(line.roomCode);
          const recorder = options.calls;
          if (!entry || !recorder?.translation) return;
          enqueue(entry, 'save translation', (id) => recorder.translation!(id, line));
        },
      })
    : null;

  /// Largest audio chunk accepted (100 ms of 16 kHz PCM is 3.2 KB).
  const MAX_AUDIO_CHUNK = 64 * 1024;

  // ---- Ringing a contact (call:invite) ----

  /// A ringing invite per room: the caller is waiting in the room for the callee.
  interface Invite {
    roomCode: string;
    callerUid: string;
    callerLanguage: string;
    calleeUid: string;
    timer: NodeJS.Timeout;
  }
  const invites = new Map<string, Invite>();
  const inviteTimeoutMs = options.inviteTimeoutMs ?? 45_000;

  /// Stops ringing. Unanswered invites are recorded as missed or declined,
  /// and the callee's devices are told to stop ringing.
  function endInvite(roomCode: string, outcome: 'answered' | 'missed' | 'rejected') {
    const invite = invites.get(roomCode);
    if (!invite) return;
    clearTimeout(invite.timer);
    invites.delete(roomCode);
    if (outcome === 'answered') return;
    io.to(userRoom(invite.calleeUid)).emit('call:cancelled', { roomCode });
    options.calls
      ?.unanswered?.({
        roomCode,
        callerUid: invite.callerUid,
        callerLanguage: invite.callerLanguage,
        receiverUid: invite.calleeUid,
        status: outcome,
      })
      .catch(logError('record unanswered call'));
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
      if (result.peers.length > 0) {
        // Whoever joins ends the ringing (the callee answered, or someone used the code).
        const invite = invites.get(roomCode);
        if (invite) endInvite(roomCode, invite.calleeUid === user.uid ? 'answered' : 'missed');
        callConnected(roomCode);
      }
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

    // Ring someone into this room: their signed-in devices get `call:incoming`.
    socket.on('call:invite', async (payload: { userId?: unknown } = {}, ack?: Ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      const roomCode = rooms.roomOf(socket.id);
      const me = rooms.participant(socket.id);
      if (!roomCode || !me) return reply({ ok: false, error: 'not_in_room' });
      if (rooms.participants(roomCode).length > 1) return reply({ ok: false, error: 'already_connected' });
      if (invites.has(roomCode)) return reply({ ok: false, error: 'already_ringing' });
      const userId = typeof payload?.userId === 'string' ? payload.userId.trim() : '';
      if (!userId) return reply({ ok: false, error: 'invalid_user' });

      let target: { uid: string } | null;
      try {
        target = options.resolveUser ? await options.resolveUser(userId) : { uid: userId };
      } catch {
        return reply({ ok: false, error: 'server_error' });
      }
      if (!target) return reply({ ok: false, error: 'not_found' });
      if (target.uid === user.uid) return reply({ ok: false, error: 'self' });
      if ((await io.in(userRoom(target.uid)).fetchSockets()).length === 0) return reply({ ok: false, error: 'offline' });
      if (rooms.hasUser(target.uid)) return reply({ ok: false, error: 'busy' });
      // The caller may have hung up while we looked the callee up.
      if (rooms.roomOf(socket.id) !== roomCode) return reply({ ok: false, error: 'not_in_room' });

      const timer = setTimeout(() => {
        io.to(roomCode).emit('call:unanswered', { uid: target!.uid });
        endInvite(roomCode, 'missed');
      }, inviteTimeoutMs);
      invites.set(roomCode, { roomCode, callerUid: user.uid, callerLanguage: me.language, calleeUid: target.uid, timer });
      io.to(userRoom(target.uid)).emit('call:incoming', {
        roomCode,
        from: { uid: user.uid, name: displayName },
        language: me.language,
      });
      reply({ ok: true });
    });

    // The callee said no: the caller hears `call:declined`.
    socket.on('call:decline', (payload: { roomCode?: unknown } = {}, ack?: Ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      const roomCode = typeof payload?.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : '';
      const invite = invites.get(roomCode);
      if (!invite || invite.calleeUid !== user.uid) return reply({ ok: false, error: 'not_found' });
      io.to(roomCode).emit('call:declined', { uid: user.uid, name: displayName });
      endInvite(roomCode, 'rejected');
      reply({ ok: true });
    });

    // Live translation. The app asks first, then streams its microphone as
    // 16 kHz PCM chunks while the call is connected and the mic is on.
    socket.on('translation:start', (ack?: Ack) => {
      if (typeof ack === 'function') ack({ ok: true, available: options.translation?.available() ?? false });
    });
    socket.on('audio', (chunk: unknown) => {
      if (!pipeline || !options.translation?.available()) return;
      if (!Buffer.isBuffer(chunk) || chunk.length === 0 || chunk.length > MAX_AUDIO_CHUNK) return;
      const me = rooms.participant(socket.id);
      const listener = rooms.peersOf(socket.id)[0];
      if (!me || !listener) return; // nobody to translate for
      const roomCode = rooms.roomOf(socket.id)!;
      pipeline.audio({ socketId: socket.id, uid: me.uid, name: me.name, language: me.language, roomCode }, listener.language, chunk);
    });
    socket.on('translation:stop', () => pipeline?.stop(socket.id));

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
      pipeline?.stop(socket.id);
      const left = rooms.leave(socket.id);
      if (!left) return;
      socket.leave(left.roomCode);
      socket.to(left.roomCode).emit('peer:left', { uid: left.participant.uid });
      // The caller hung up before anyone answered.
      if (invites.get(left.roomCode)?.callerUid === left.participant.uid) endInvite(left.roomCode, 'missed');
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
