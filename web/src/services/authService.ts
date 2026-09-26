import type { LanguageCode, User } from '../types';
import { mockUser } from '../data/users';
import { delay } from './config';

// TODO: Connect Firebase Authentication
// Replace the mock bodies below with firebase/auth calls:
//   login          → signInWithEmailAndPassword
//   loginWithGoogle→ signInWithPopup(auth, new GoogleAuthProvider())
//   register       → createUserWithEmailAndPassword, then POST /api/users
//   logout         → signOut
//   resetPassword  → sendPasswordResetEmail
// The backend already verifies Firebase ID tokens (backend/src/middleware).

const SESSION_KEY = 'boloai-session';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  preferredLanguage: LanguageCode;
}

function persist(user: User, remember: boolean) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(SESSION_KEY, JSON.stringify(user));
}

export const authService = {
  /** Returns the persisted mock session, if any. */
  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },

  /**
   * Prototype mode: any well-formed email + password signs in as a demo user.
   * No credentials are checked or stored.
   */
  async login(email: string, _password: string, remember: boolean): Promise<User> {
    await delay(700);
    const user: User = { ...mockUser, email };
    persist(user, remember);
    return user;
  },

  async loginWithGoogle(): Promise<User> {
    await delay(700);
    persist(mockUser, true);
    return mockUser;
  },

  async register(input: RegisterInput): Promise<User> {
    await delay(900);
    const user: User = {
      ...mockUser,
      fullName: input.fullName,
      email: input.email,
      preferredLanguage: input.preferredLanguage,
      createdAt: new Date().toISOString(),
    };
    persist(user, true);
    return user;
  },

  async resetPassword(_email: string): Promise<void> {
    await delay(600);
  },

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  },

  /** Keeps the stored session in sync after profile edits. */
  updateSession(user: User) {
    if (localStorage.getItem(SESSION_KEY)) persist(user, true);
    else persist(user, false);
  },
};
