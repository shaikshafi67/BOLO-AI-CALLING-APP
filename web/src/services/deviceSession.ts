import { io, type Socket } from 'socket.io-client';
import type { User as FirebaseUser } from 'firebase/auth';
import { serviceConfig } from './config';

const ID_KEY = 'boloai.sessionId';
const RETRY_MS = 15_000;

type Handler = (data: unknown) => void;

function readId(): string {
  try {
    const saved = localStorage.getItem(ID_KEY);
    if (saved) return saved;
  } catch {
    /* storage blocked */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const id = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try {
    localStorage.setItem(ID_KEY, id);
  } catch {
    /* storage blocked */
  }
  return id;
}

/**
 * Keeps an account signed in on one device at a time (docs/sessions.md),
 * the same way the Flutter app's DeviceSession does.
 *
 * Each browser has a random session id. After signing in, it claims the
 * account (POST /api/sessions), which signs the previous device out. While
 * signed in, a socket stays open so this browser hears `session:revoked`,
 * incoming calls and online-status updates.
 */
class DeviceSession {
  readonly sessionId = readId();

  /** Another device signed in to this account. */
  onRevoked?: () => void;

  private user: FirebaseUser | null = null;
  private socket: Socket | null = null;
  private retry?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private freshSignIn = false;
  private readonly handlers = new Map<string, Set<Handler>>();
  private readonly readyListeners = new Set<() => void>();
  private _ready = false;

  /** This browser holds the account and may call the API. */
  get ready() {
    return this._ready;
  }

  /** Call before signing in or registering: the next user claims the account. */
  expectFreshSignIn() {
    this.freshSignIn = true;
  }

  /** Starts guarding [user]'s session (after sign-in and on page load). */
  start(user: FirebaseUser) {
    if (this.user?.uid === user.uid) return;
    this.stop();
    this.user = user;
    const fresh = this.freshSignIn;
    this.freshSignIn = false;
    const gen = this.generation;
    if (fresh) void this.claimThenConnect(gen);
    else this.connect(gen);
  }

  stop() {
    this.generation++;
    clearTimeout(this.retry);
    this.socket?.disconnect();
    this.socket = null;
    this.user = null;
    this.setReady(false);
  }

  /** Frees the account on the backend before signing out. */
  async release() {
    const user = this.user;
    this.stop();
    if (!user) return;
    try {
      await fetch(`${serviceConfig.apiBaseUrl}/sessions`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'X-Session-Id': this.sessionId },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      /* the next sign-in claims the account anyway */
    }
  }

  /** Listens to an app-wide socket event; returns an unsubscribe function. */
  on(event: string, handler: Handler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
      this.socket?.on(event, (data: unknown) => this.dispatch(event, data));
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  /** Runs every time the socket (re)connects; returns an unsubscribe function. */
  onReady(listener: () => void): () => void {
    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  emit(event: string, data: unknown) {
    this.socket?.emit(event, data);
  }

  /** Sends an event and waits for the server's reply; null while offline. */
  async request<T = Record<string, unknown>>(event: string, data: unknown): Promise<T | null> {
    const socket = this.socket;
    if (!socket?.connected) return null;
    try {
      return (await socket.timeout(10_000).emitWithAck(event, data)) as T;
    } catch {
      return null;
    }
  }

  private dispatch(event: string, data: unknown) {
    for (const h of this.handlers.get(event) ?? []) h(data);
  }

  private setReady(ready: boolean) {
    this._ready = ready;
    if (ready) for (const l of [...this.readyListeners]) l();
  }

  private async claimThenConnect(gen: number) {
    const user = this.user;
    if (!user || gen !== this.generation) return;
    try {
      const res = await fetch(`${serviceConfig.apiBaseUrl}/sessions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId, device: 'web' }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (gen === this.generation) this.connect(gen);
    } catch (e) {
      console.warn('[session] claim failed, retrying', e);
      this.scheduleRetry(gen, () => void this.claimThenConnect(gen));
    }
  }

  private connect(gen: number) {
    const user = this.user;
    if (!user || gen !== this.generation) return;
    this.socket?.disconnect();

    const socket = io(serviceConfig.signalingUrl, {
      transports: ['websocket'],
      forceNew: true,
      // A fresh ID token on every (re)connect; Firebase tokens last an hour.
      auth: (cb) => {
        user
          .getIdToken()
          .then((token) => cb({ token, sessionId: this.sessionId, hidden: !presenceVisible() }))
          .catch(() => cb({ sessionId: this.sessionId }));
      },
    });
    this.socket = socket;

    socket.on('session:revoked', () => this.revoked(gen));
    for (const event of this.handlers.keys()) socket.on(event, (data: unknown) => this.dispatch(event, data));
    socket.on('connect', () => {
      if (gen === this.generation) this.setReady(true);
    });
    socket.on('connect_error', (err) => {
      if (gen !== this.generation) return;
      switch (err.message) {
        case 'session_replaced':
          this.revoked(gen);
          break;
        case 'session_inactive':
          // Nobody holds the account (e.g. after signing out elsewhere): claim it.
          socket.disconnect();
          void this.claimThenConnect(gen);
          break;
        case 'unauthorized':
        case 'server_error':
        case 'session_required':
          socket.disconnect();
          this.scheduleRetry(gen, () => this.connect(gen));
          break;
        default:
        // Network trouble: Socket.IO reconnects by itself.
      }
    });
    socket.on('disconnect', (reason) => {
      // The server dropped us: reconnecting tells us why or restores the link.
      if (reason === 'io server disconnect' && gen === this.generation) {
        this.scheduleRetry(gen, () => this.connect(gen), 2000);
      }
    });
  }

  private revoked(gen: number) {
    if (gen !== this.generation) return;
    this.stop();
    this.onRevoked?.();
  }

  private scheduleRetry(gen: number, action: () => void, ms = RETRY_MS) {
    clearTimeout(this.retry);
    this.retry = setTimeout(() => {
      if (gen === this.generation) action();
    }, ms);
  }
}

/** "Show when I'm online" (Settings). */
export function presenceVisible(): boolean {
  try {
    const prefs = JSON.parse(localStorage.getItem('boloai-prefs') ?? '{}') as { showOnline?: boolean };
    return prefs.showOnline !== false;
  } catch {
    return true;
  }
}

export const deviceSession = new DeviceSession();
