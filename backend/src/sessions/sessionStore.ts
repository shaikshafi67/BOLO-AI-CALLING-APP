/// Tracks the one device each account is allowed to be signed in on.
///
/// The app generates a random session id per device and claims it right after
/// signing in. Claiming replaces whatever session the account had before, so
/// the previous device is signed out (REST calls get 401 `session_replaced`
/// and its socket receives `session:revoked`).
export interface SessionStore {
  /// Makes [sessionId] the account's active session. Returns the session it
  /// replaced, or null if there was none.
  claim(uid: string, sessionId: string, device?: string): Promise<string | null>;
  /// The account's active session id, or null if it has none.
  current(uid: string): Promise<string | null>;
  /// Ends [sessionId] if it is still the active one (sign out).
  release(uid: string, sessionId: string): Promise<void>;
  /// Saves the push token of [sessionId]'s device (null to stop pushes).
  /// Returns false if [sessionId] is no longer the account's active session.
  setPushToken(uid: string, sessionId: string, token: string | null): Promise<boolean>;
  /// Push token of the account's signed-in device, or null.
  pushToken(uid: string): Promise<string | null>;
}

export type SessionStatus = 'active' | 'replaced' | 'inactive';

/// `replaced`: another device has signed in since — sign this one out.
/// `inactive`: nobody holds the account (e.g. after sign-out) — claim again.
export async function sessionStatus(store: SessionStore, uid: string, sessionId: string): Promise<SessionStatus> {
  const active = await store.current(uid);
  if (active === null) return 'inactive';
  return active === sessionId ? 'active' : 'replaced';
}

export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/// In-memory store for tests.
export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, string>();
  private readonly tokens = new Map<string, string>();

  async claim(uid: string, sessionId: string): Promise<string | null> {
    const previous = this.sessions.get(uid) ?? null;
    this.sessions.set(uid, sessionId);
    if (previous !== sessionId) this.tokens.delete(uid);
    return previous;
  }

  async current(uid: string): Promise<string | null> {
    return this.sessions.get(uid) ?? null;
  }

  async release(uid: string, sessionId: string): Promise<void> {
    if (this.sessions.get(uid) === sessionId) {
      this.sessions.delete(uid);
      this.tokens.delete(uid);
    }
  }

  async setPushToken(uid: string, sessionId: string, token: string | null): Promise<boolean> {
    if (this.sessions.get(uid) !== sessionId) return false;
    if (token) this.tokens.set(uid, token);
    else this.tokens.delete(uid);
    return true;
  }

  async pushToken(uid: string): Promise<string | null> {
    return this.tokens.get(uid) ?? null;
  }
}
