import { io, type Socket } from 'socket.io-client';
import type { ConnectionState, LanguageCode, Translation, TranslationStatus } from '../types';
import { auth } from './firebase';
import { serviceConfig } from './config';
import { deviceSession } from './deviceSession';

/** Why a call could not be started or joined, with a message to show. */
export class CallError extends Error {
  constructor(readonly code: string) {
    super(
      {
        not_found: 'No call with this code is active. Check the code with the person who shared it.',
        full: 'This call already has two people in it.',
        invalid_room_code: 'Room codes look like BOLO-4829.',
        invalid_language: 'Choose a supported language (English, Hindi, Telugu or Tamil) and try again.',
        media_denied: 'BoloAI needs your microphone (and camera for video). Allow access in your browser, then try again.',
        unauthorized: 'BoloAI couldn’t confirm your sign-in with the server. Log out, log in again, then retry.',
        session_replaced: 'This account is signed in on another device (the app or another browser), so it was signed out here. Sign in again to use BoloAI on this device.',
        session_inactive: 'This browser lost its sign-in session. Sign in again to make calls.',
        session_required: 'Your sign-in expired. Sign in again to make calls.',
        unreachable: 'Can’t reach the BoloAI server. It may be waking up; try again in a minute.',
      }[code] ?? `Something went wrong setting up the call (${code}).`,
    );
  }
}

/** The other person in the call, as the call server describes them. */
export interface CallPeer {
  uid: string;
  name: string;
  language: LanguageCode;
}

export interface ChatMessage {
  mine: boolean;
  name: string;
  text: string;
  at: number;
}

type Ack = Record<string, unknown>;

const peerFrom = (m: Record<string, unknown>): CallPeer => ({
  uid: String(m.uid),
  name: String(m.name ?? 'BoloAI user'),
  language: String(m.language ?? 'en') as LanguageCode,
});

const AUDIO_CONSTRAINTS: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
const VIDEO_CONSTRAINTS: MediaTrackConstraints = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };

/** Camera + mic, falling back to mic only when there is no usable camera. */
async function openMedia(): Promise<{ stream: MediaStream; cameraProblem: string | null }> {
  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: VIDEO_CONSTRAINTS }), cameraProblem: null };
  } catch (e) {
    const cameraProblem = describeCameraError(e);
    try {
      return { stream: await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: false }), cameraProblem };
    } catch {
      throw new CallError('media_denied');
    }
  }
}

function describeCameraError(e: unknown): string {
  const name = (e as { name?: string }).name ?? '';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'Your camera is being used by another app or browser tab. Close it there, then turn the camera on.';
  if (name === 'NotAllowedError') return 'Camera access is blocked. Allow it in your browser, then turn the camera on.';
  if (name === 'NotFoundError') return 'No camera found, so you’re in the call with audio only.';
  return 'Your camera couldn’t start, so you’re in the call with audio only.';
}

function stopStream(s: MediaStream | null | undefined) {
  s?.getTracks().forEach((t) => t.stop());
}

/** A socket just for this call, authenticated like the device's session socket. */
async function connectSocket(): Promise<Socket> {
  const user = auth.currentUser;
  if (!user) throw new CallError('unauthorized');
  const socket = io(serviceConfig.signalingUrl, {
    transports: ['websocket'],
    forceNew: true,
    autoConnect: false,
    auth: (cb) => {
      user
        .getIdToken()
        .then((token) => cb({ token, sessionId: deviceSession.sessionId }))
        .catch(() => cb({ sessionId: deviceSession.sessionId }));
    },
  });
  await new Promise<void>((resolve, reject) => {
    // The free server can take ~50 s to wake up.
    const timer = setTimeout(() => reject(new CallError('unreachable')), 60_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.on('connect_error', (err) => {
      // Known refusals are final; anything else is network trouble that Socket.IO retries.
      if (['unauthorized', 'session_replaced', 'session_inactive', 'session_required'].includes(err.message)) {
        clearTimeout(timer);
        reject(new CallError(err.message));
      }
    });
    socket.connect();
  }).catch((e) => {
    socket.disconnect();
    throw e;
  });
  return socket;
}

async function request(socket: Socket, event: string, payload?: unknown): Promise<Ack> {
  try {
    const res = payload === undefined ? await socket.timeout(10_000).emitWithAck(event) : await socket.timeout(10_000).emitWithAck(event, payload);
    return res && typeof res === 'object' ? (res as Ack) : { ok: false, error: 'bad_reply' };
  } catch {
    return { ok: false, error: 'unreachable' };
  }
}

/**
 * One live call: the call socket, the WebRTC peer connection and the
 * local/remote media. It speaks the same protocol as the Flutter app
 * (docs/signaling.md), so web and Flutter users can call each other.
 *
 * Whoever is already in the room sends the offer when the other person
 * joins (`peer:joined`). Video and the original audio then flow
 * peer-to-peer; the server only relays SDP and ICE candidates.
 */
export class CallSession {
  /** The call in progress (one at a time), handed from Start/Join to the call screen. */
  static active: CallSession | null = null;

  /**
   * Creates a room and waits in it for the other person. [translateTo] is
   * "Translate my speech to"; without it the listener's own language is used.
   */
  static start(language: LanguageCode, translateTo?: LanguageCode) {
    return CallSession.open('room:create', { language, translateTo });
  }

  /** Joins someone else's room. */
  static join(roomCode: string, language: LanguageCode, translateTo?: LanguageCode) {
    return CallSession.open('room:join', { roomCode, language, translateTo });
  }

  private static async open(event: string, payload: Record<string, unknown>): Promise<CallSession> {
    await CallSession.active?.leave();
    const { stream, cameraProblem } = await openMedia();
    let socket: Socket | null = null;
    try {
      try {
        socket = await connectSocket();
      } catch (e) {
        // Nobody holds the account (the claim after sign-in didn't get through): claim it and retry.
        if (e instanceof CallError && e.code === 'session_inactive' && (await deviceSession.claimIfInactive())) socket = await connectSocket();
        // A stale sign-in token: get a fresh one and retry once.
        else if (e instanceof CallError && e.code === 'unauthorized' && (await auth.currentUser?.getIdToken(true).then(() => true, () => false))) socket = await connectSocket();
        else {
          // Another device signed in to this account since: sign out here.
          if (e instanceof CallError && e.code === 'session_replaced') deviceSession.signedInElsewhere();
          throw e;
        }
      }
      const reply = await request(socket, event, payload);
      if (reply.ok !== true) throw new CallError(String(reply.error ?? 'unknown'));
      const session = new CallSession(socket, String(reply.roomCode), payload.language as LanguageCode, (reply.iceServers as RTCIceServer[]) ?? [], stream, auth.currentUser!.uid);
      session.translateTo = payload.translateTo as LanguageCode | undefined;
      session.cameraProblem = cameraProblem;
      const peers = (reply.peers as Record<string, unknown>[] | undefined) ?? [];
      session.init(peers.length ? peerFrom(peers[0]) : null);
      CallSession.active = session;
      return session;
    } catch (e) {
      socket?.disconnect();
      stopStream(stream);
      throw e instanceof CallError ? e : new CallError('unreachable');
    }
  }

  // ---- State the call screen reads (see useCallSession) ----

  state: ConnectionState = 'connecting';
  /** "Translate my speech to", when chosen. */
  translateTo: LanguageCode | undefined;
  /** Nobody else is in the room yet. */
  waiting = true;
  peer: CallPeer | null = null;
  remoteStream: MediaStream | null = null;
  micOn = true;
  cameraOn = true;
  speakerOn = true;
  sharing = false;
  peerMicOn = true;
  peerCameraOn = true;
  peerSharing = false;
  /** Why this call has no camera (shown once when the call screen opens). */
  cameraProblem: string | null = null;
  /** The browser blocked their voice until the user clicks. */
  audioBlocked = false;
  /** Their original voice is turned down while a translated sentence plays. */
  remoteVolume = 1;
  /** The contact being rung (call:invite) until they answer or not. */
  ringingName: string | null = null;
  messages: ChatMessage[] = [];

  // Live translation
  serverTranslation = false;
  translationProblem = false;
  translationEnabled = true;
  voiceTranslation = true;
  transcript: Translation[] = [];
  caption: Translation | undefined;
  captionInterim = false;

  get hasLocalVideo() {
    return this.localStream.getVideoTracks().length > 0;
  }

  get translationStatus(): TranslationStatus {
    if (this.translationProblem || !this.serverTranslation) return 'unavailable';
    if (!this.translationEnabled) return 'idle';
    return this.captionInterim ? 'processing' : this.caption ? 'completed' : 'idle';
  }

  private pc: RTCPeerConnection | null = null;
  private videoSender: RTCRtpSender | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  private isOfferer = false;
  private closed = false;
  private screen: MediaStream | null = null;
  private mic: MicStreamer | null = null;
  private sendingAudio = false;
  private listeners = new Set<() => void>();
  private noticeListeners = new Set<(message: string) => void>();
  private version = 0;

  private constructor(
    private readonly socket: Socket,
    readonly roomCode: string,
    readonly language: LanguageCode,
    private readonly iceServers: RTCIceServer[],
    readonly localStream: MediaStream,
    readonly myUid: string,
  ) {}

  // ---- Subscriptions (useSyncExternalStore) ----

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = () => this.version;

  /** One-off messages for the call screen ("Priya left the call"). */
  onNotice(listener: (message: string) => void): () => void {
    this.noticeListeners.add(listener);
    return () => {
      this.noticeListeners.delete(listener);
    };
  }

  private changed() {
    this.version++;
    for (const l of [...this.listeners]) l();
  }

  private notice(message: string) {
    for (const l of [...this.noticeListeners]) l(message);
  }

  private init(existingPeer: CallPeer | null) {
    const s = this.socket;
    s.on('peer:joined', (d: Record<string, unknown>) => void this.onPeerJoined(peerFrom(d)));
    s.on('signal', (d: Record<string, unknown>) => void this.onSignal(d));
    s.on('peer:language', (d: Record<string, unknown>) => {
      if (this.peer && d.uid === this.peer.uid) {
        this.peer = { ...this.peer, language: String(d.language) as LanguageCode };
        this.changed();
      }
    });
    s.on('peer:left', () => this.onPeerLeft());
    s.on('call:declined', () => void this.inviteEnded(`${this.ringingName ?? 'They'} declined the call.`));
    s.on('call:unanswered', () => void this.inviteEnded(`${this.ringingName ?? 'They'} didn’t answer.`));
    s.on('caption', (d: Record<string, unknown>) => this.onCaption(d));
    s.on('translation:audio', (d: { audio?: ArrayBuffer }) => this.onTranslatedVoice(d.audio));
    s.on('translation:status', (d: { available?: boolean }) => {
      if (d.available === false && !this.closed) {
        this.translationProblem = true;
        this.changed();
      }
    });
    s.on('message', (d: Record<string, unknown>) => this.onMessage(d));
    s.on('disconnect', () => {
      if (!this.closed) this.setState('reconnecting');
    });
    // Already connected here, so any later connect is a reconnect.
    s.on('connect', () => void this.rejoin());

    if (existingPeer) {
      // We joined someone's room: they send the offer.
      this.peer = existingPeer;
      this.waiting = false;
      this.setState('connecting');
    }
    void this.startTranslation();
  }

  // ---- Signaling ----

  private async onPeerJoined(peer: CallPeer) {
    if (this.closed) return;
    this.peer = peer;
    this.waiting = false;
    this.ringingName = null;
    this.setState('connecting');
    // We were here first, so we make the offer.
    await this.resetPeerConnection();
    this.isOfferer = true;
    const pc = this.ensurePeerConnection();
    if (!this.videoSender) {
      // No camera yet: still offer a video slot so it can be filled later.
      this.videoSender = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;
      await this.updateVideoSender();
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.send('offer', { sdp: offer.sdp, type: offer.type });
  }

  private async onSignal(msg: Record<string, unknown>) {
    if (this.closed) return;
    const data = msg.data as Record<string, unknown> | undefined;
    if (!data) return;
    try {
      if (msg.type === 'offer') {
        // A fresh offer means a new negotiation; an ICE restart reuses the connection.
        const restart = this.pc !== null && this.remoteDescriptionSet && this.state !== 'connecting';
        if (!restart) await this.resetPeerConnection();
        this.isOfferer = false;
        const pc = this.ensurePeerConnection();
        await pc.setRemoteDescription({ type: data.type as RTCSdpType, sdp: data.sdp as string });
        await this.remoteDescriptionReady();
        if (!this.videoSender) {
          this.claimVideoSlot(pc);
          await this.updateVideoSender();
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.send('answer', { sdp: answer.sdp, type: answer.type });
      } else if (msg.type === 'answer') {
        if (!this.pc) return;
        await this.pc.setRemoteDescription({ type: data.type as RTCSdpType, sdp: data.sdp as string });
        await this.remoteDescriptionReady();
      } else if (msg.type === 'ice-candidate') {
        const candidate: RTCIceCandidateInit = {
          candidate: data.candidate as string,
          sdpMid: (data.sdpMid as string | null) ?? null,
          sdpMLineIndex: (data.sdpMLineIndex as number | null) ?? null,
        };
        if (this.pc && this.remoteDescriptionSet) await this.pc.addIceCandidate(candidate);
        else this.pendingCandidates.push(candidate);
      }
    } catch (e) {
      console.warn(`[call] signal ${String(msg.type)} failed`, e);
    }
  }

  private async remoteDescriptionReady() {
    this.remoteDescriptionSet = true;
    for (const c of this.pendingCandidates.splice(0)) await this.pc?.addIceCandidate(c);
  }

  private send(type: string, data: Record<string, unknown>) {
    if (!this.closed) this.socket.emit('signal', { type, data }, () => undefined);
  }

  private onPeerLeft() {
    if (this.closed) return;
    const name = this.peer?.name ?? 'The other person';
    this.peer = null;
    this.waiting = true;
    this.peerMicOn = this.peerCameraOn = true;
    this.peerSharing = false;
    void this.resetPeerConnection();
    this.notice(`${name} left the call.`);
    this.setState('connecting');
  }

  /** The call link dropped: the server removed us from the room, so rejoin. */
  private async rejoin() {
    if (this.closed) return;
    const reply = await request(this.socket, 'room:join', { roomCode: this.roomCode, language: this.language, translateTo: this.translateTo });
    if (this.closed) return;
    if (reply.ok !== true) {
      this.notice('The connection was lost and the call has ended.');
      await this.leave();
      return;
    }
    await this.resetPeerConnection();
    const peers = (reply.peers as Record<string, unknown>[] | undefined) ?? [];
    this.peer = peers.length ? peerFrom(peers[0]) : null;
    this.waiting = !this.peer;
    this.setState('connecting');
  }

  // ---- WebRTC ----

  private ensurePeerConnection(): RTCPeerConnection {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: this.iceServers.length ? this.iceServers : [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc = pc;

    for (const track of this.localStream.getTracks()) {
      const sender = pc.addTrack(track, this.localStream);
      if (track.kind === 'video') this.videoSender = sender;
    }
    void this.updateVideoSender();

    pc.onicecandidate = (e) => {
      if (e.candidate) this.send('ice-candidate', e.candidate.toJSON() as Record<string, unknown>);
    };

    pc.ontrack = (e) => {
      if (this.pc !== pc) return;
      // Re-render when their video starts or stops sending frames.
      e.track.onmute = e.track.onunmute = () => this.changed();
      if (e.streams[0]) {
        const stream = e.streams[0];
        // Carry over tracks that arrived without a stream (see below).
        for (const t of this.remoteStream?.getTracks() ?? []) {
          if (this.remoteStream !== stream && !stream.getTracks().includes(t)) stream.addTrack(t);
        }
        this.remoteStream = stream;
      } else {
        // Video sent from a slot that had no camera at the start carries no stream id.
        this.remoteStream ??= new MediaStream();
        this.remoteStream.addTrack(e.track);
      }
      this.changed();
    };

    pc.oniceconnectionstatechange = () => {
      if (this.closed || this.pc !== pc) return;
      switch (pc.iceConnectionState) {
        case 'connected':
        case 'completed':
          if (this.state !== 'connected') this.sendState();
          this.setState('connected');
          break;
        case 'disconnected':
          // Usually a brief network blip; WebRTC recovers by itself.
          if (this.state === 'connected') this.setState('unstable');
          break;
        case 'failed':
          this.setState('reconnecting');
          if (this.isOfferer) void this.restartIce(pc);
          break;
      }
    };
    return pc;
  }

  /** Renegotiates network paths after the connection failed (e.g. Wi-Fi → mobile data). */
  private async restartIce(pc: RTCPeerConnection) {
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      this.send('offer', { sdp: offer.sdp, type: offer.type });
    } catch (e) {
      console.warn('[call] ICE restart failed', e);
    }
  }

  /** Answering without a camera: take over the offer's video slot so video can be sent later. */
  private claimVideoSlot(pc: RTCPeerConnection) {
    for (const t of pc.getTransceivers()) {
      if (t.receiver.track?.kind === 'video') {
        t.direction = 'sendrecv';
        this.videoSender = t.sender;
        return;
      }
    }
  }

  /** The screen while sharing, else the camera, or nothing while the camera is off. */
  private async updateVideoSender() {
    const sender = this.videoSender;
    if (!sender) return;
    const camera = this.localStream.getVideoTracks()[0] ?? null;
    const track = this.screen?.getVideoTracks()[0] ?? (this.cameraOn ? camera : null);
    try {
      await sender.replaceTrack(track);
    } catch (e) {
      console.warn('[call] video sender', e);
    }
  }

  private async resetPeerConnection() {
    const pc = this.pc;
    this.pc = null;
    this.videoSender = null;
    this.remoteDescriptionSet = false;
    this.pendingCandidates = [];
    this.remoteStream = null;
    pc?.close();
    this.changed();
  }

  // ---- Live translation ----

  /** Asks the server whether translation is available, then streams the mic (16 kHz PCM). */
  private async startTranslation() {
    const reply = await request(this.socket, 'translation:start');
    if (this.closed) return;
    this.serverTranslation = reply.available === true;
    this.changed();
    const microphone = this.localStream.getAudioTracks()[0];
    if (!this.serverTranslation || !microphone) return;
    try {
      const mic = await MicStreamer.start(microphone, (pcm) => this.onPcm(pcm));
      if (this.closed) await mic.stop();
      else this.mic = mic;
    } catch (e) {
      console.warn('[call] microphone capture for translation failed', e);
    }
  }

  private get shouldSendAudio() {
    return !this.closed && this.serverTranslation && this.translationEnabled && this.micOn && this.peer !== null && this.state === 'connected';
  }

  private onPcm(pcm: ArrayBuffer) {
    if (this.shouldSendAudio) {
      this.socket.emit('audio', pcm);
      this.sendingAudio = true;
    } else if (this.sendingAudio) {
      // Muted, paused or alone: close the recognition stream (saves cost).
      this.sendingAudio = false;
      this.socket.emit('translation:stop');
    }
  }

  private onCaption(m: Record<string, unknown>) {
    if (this.closed) return;
    const isLocal = m.speakerUid === this.myUid;
    const original = String(m.original ?? '');
    const translated = typeof m.translated === 'string' ? m.translated : null;
    const done = m.final === true;
    const entry: Translation = {
      id: String(m.id),
      speakerId: String(m.speakerUid),
      speakerName: isLocal ? 'You' : String(m.speakerName ?? this.peer?.name ?? 'Them'),
      isLocal,
      sourceLanguage: String(m.sourceLanguage ?? this.language) as LanguageCode,
      targetLanguage: String(m.targetLanguage ?? this.language) as LanguageCode,
      originalText: original,
      translatedText: translated ?? undefined,
      timestamp: new Date().toISOString(),
      status: done ? 'completed' : 'processing',
    };
    this.caption = entry;
    this.captionInterim = !done;
    if (done) {
      const i = this.transcript.findIndex((e) => e.id === entry.id);
      if (i >= 0) this.transcript[i] = entry;
      else this.transcript = [...this.transcript, entry];
      if (translated !== null) this.translationProblem = false;
    }
    this.changed();
  }

  private translationQueue: Promise<void> = Promise.resolve();

  /** Their sentence, spoken in our language, one after another. */
  private onTranslatedVoice(audio: ArrayBuffer | undefined) {
    if (this.closed || !audio || !this.translationEnabled || !this.speakerOn || !this.voiceTranslation) return;
    this.translationQueue = this.translationQueue.then(() => this.play(audio)).catch(() => undefined);
  }

  private async play(audio: ArrayBuffer) {
    const url = URL.createObjectURL(new Blob([audio], { type: 'audio/mpeg' }));
    const voice = new Audio(url);
    this.remoteVolume = 0.2;
    this.changed();
    try {
      await voice.play();
      await new Promise<void>((resolve) => {
        voice.onended = voice.onerror = () => resolve();
        setTimeout(resolve, 30_000);
      });
    } catch (e) {
      console.warn('[call] translated voice did not play', e);
    } finally {
      URL.revokeObjectURL(url);
      this.remoteVolume = 1;
      this.changed();
    }
  }

  setTranslationEnabled(on: boolean) {
    this.translationEnabled = on;
    this.changed();
  }

  // ---- Ringing a contact ----

  /** Rings [userId] (a users.id) into this room. Returns null when it's ringing, else a message. */
  async invite(userId: string, name: string): Promise<string | null> {
    const reply = await request(this.socket, 'call:invite', { userId });
    if (reply.ok === true) {
      this.ringingName = name;
      this.changed();
      return null;
    }
    return (
      {
        offline: `${name} isn’t online and can’t get call notifications. Share the room code to call them.`,
        busy: `${name} is on another call. Try again soon.`,
        not_found: 'This person isn’t on BoloAI any more.',
      }[String(reply.error)] ?? `Couldn’t ring ${name}. Share the room code instead.`
    );
  }

  private async inviteEnded(message: string) {
    if (this.closed || this.ringingName === null) return;
    this.ringingName = null;
    this.notice(message);
    await this.leave();
  }

  // ---- In-call messages ----

  private onMessage(m: Record<string, unknown>) {
    if (this.closed) return;
    if (m.kind === 'chat') {
      const name = String(m.name ?? this.peer?.name ?? 'Them');
      this.messages = [...this.messages, { mine: false, name, text: String(m.text), at: Date.now() }];
      this.notice(`${name}: ${String(m.text)}`);
    } else if (m.kind === 'state' && m.state && typeof m.state === 'object') {
      const s = m.state as Record<string, unknown>;
      this.peerMicOn = s.mic === true;
      this.peerCameraOn = s.camera === true;
      this.peerSharing = s.sharing === true;
    }
    this.changed();
  }

  sendChat(text: string) {
    const t = text.trim();
    if (!t || this.closed) return;
    this.messages = [...this.messages, { mine: true, name: 'You', text: t, at: Date.now() }];
    this.socket.emit('message', { kind: 'chat', text: t }, () => undefined);
    this.changed();
  }

  /** Tells the other side our mic/camera/sharing state for their screen. */
  private sendState() {
    if (this.closed || !this.peer) return;
    this.socket.emit('message', { kind: 'state', state: { mic: this.micOn, camera: this.cameraOn && this.hasLocalVideo, sharing: this.sharing } }, () => undefined);
  }

  // ---- Controls ----

  setMic(on: boolean) {
    this.micOn = on;
    this.localStream.getAudioTracks().forEach((t) => (t.enabled = on));
    this.sendState();
    this.changed();
  }

  async setCamera(on: boolean) {
    if (on && !this.hasLocalVideo) return this.startCamera();
    this.cameraOn = on;
    this.localStream.getVideoTracks().forEach((t) => (t.enabled = on));
    // Stop sending video while off, so the other side shows our avatar instead of black.
    await this.updateVideoSender();
    this.sendState();
    this.changed();
  }

  /** Tries the camera again (it was busy, blocked or missing when the call started). */
  private async startCamera() {
    try {
      const camera = await navigator.mediaDevices.getUserMedia({ audio: false, video: VIDEO_CONSTRAINTS });
      const track = camera.getVideoTracks()[0];
      if (this.closed) return track.stop();
      this.localStream.addTrack(track);
      this.cameraProblem = null;
      this.cameraOn = true;
      await this.updateVideoSender();
      this.sendState();
    } catch (e) {
      this.cameraOn = false;
      this.notice(describeCameraError(e));
    }
    this.changed();
  }

  setSpeaker(on: boolean) {
    this.speakerOn = on;
    this.changed();
  }

  async toggleScreenShare() {
    if (this.screen) return this.stopSharing();
    if (!this.peer || !this.videoSender) {
      this.notice('Screen sharing can start once someone has joined the call.');
      return;
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      // The browser's own "Stop sharing" button ends the track.
      screen.getVideoTracks()[0].onended = () => void this.stopSharing();
      this.screen = screen;
      this.sharing = true;
      await this.updateVideoSender();
      this.sendState();
    } catch {
      this.notice('Screen sharing didn’t start.');
    }
    this.changed();
  }

  private async stopSharing() {
    const screen = this.screen;
    if (!screen) return;
    this.screen = null;
    this.sharing = false;
    await this.updateVideoSender();
    stopStream(screen);
    this.sendState();
    this.changed();
  }

  /** The remote <video> reports whether the browser let it play with sound. */
  setAudioBlocked(blocked: boolean) {
    if (blocked === this.audioBlocked) return;
    this.audioBlocked = blocked;
    this.changed();
  }

  /** Call from a click: browsers allow sound after a user gesture. */
  async unlockAudio() {
    await this.mic?.resume();
    this.setAudioBlocked(false);
  }

  private setState(s: ConnectionState) {
    if (this.closed && s !== 'ended') return;
    this.state = s;
    this.changed();
  }

  /** Hangs up: tells the other side, then releases the camera, mic and socket. */
  async leave() {
    if (this.closed) return;
    this.closed = true;
    if (CallSession.active === this) CallSession.active = null;
    this.state = 'ended';
    this.changed();
    await this.mic?.stop();
    this.mic = null;
    if (this.socket.connected) await request(this.socket, 'room:leave');
    this.socket.disconnect();
    await this.resetPeerConnection();
    stopStream(this.screen);
    this.screen = null;
    stopStream(this.localStream);
  }
}

// ---- Microphone capture for live translation ----

/**
 * Runs in the browser's audio thread: averages the mic signal down to
 * 16 kHz mono 16-bit PCM (what Speech-to-Text expects) and posts ~100 ms
 * chunks. Same processor as the Flutter web app.
 */
const PCM_WORKLET = `
class PcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / 16000;
    this.pos = 0; this.sum = 0; this.count = 0;
    this.out = new Int16Array(1600); this.n = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      this.sum += input[i]; this.count++; this.pos++;
      if (this.pos >= this.step) {
        this.pos -= this.step;
        const v = Math.max(-1, Math.min(1, this.sum / this.count));
        this.out[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        this.sum = 0; this.count = 0;
        if (this.n === this.out.length) {
          this.port.postMessage(this.out.buffer, [this.out.buffer]);
          this.out = new Int16Array(1600); this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('pcm-downsampler', PcmDownsampler);
`;

class MicStreamer {
  private constructor(
    private readonly context: AudioContext,
    private readonly source: MediaStreamAudioSourceNode,
    private readonly node: AudioWorkletNode,
  ) {}

  static async start(microphone: MediaStreamTrack, onChunk: (pcm: ArrayBuffer) => void): Promise<MicStreamer> {
    const context = new AudioContext();
    const url = URL.createObjectURL(new Blob([PCM_WORKLET], { type: 'application/javascript' }));
    try {
      await context.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const source = context.createMediaStreamSource(new MediaStream([microphone]));
    const node = new AudioWorkletNode(context, 'pcm-downsampler');
    node.port.onmessage = (e: MessageEvent) => {
      if (e.data instanceof ArrayBuffer) onChunk(e.data);
    };
    source.connect(node);
    // Browsers only run nodes connected to the output; a silent gain keeps it
    // running without playing your own voice back to you.
    const silent = context.createGain();
    silent.gain.value = 0;
    node.connect(silent);
    silent.connect(context.destination);
    const streamer = new MicStreamer(context, source, node);
    await streamer.resume();
    return streamer;
  }

  async resume() {
    if (this.context.state === 'suspended') await this.context.resume().catch(() => undefined);
  }

  async stop() {
    this.node.port.onmessage = null;
    this.source.disconnect();
    this.node.disconnect();
    await this.context.close().catch(() => undefined);
  }
}
