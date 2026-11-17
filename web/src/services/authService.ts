import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { LanguageCode } from '../types';
import { auth } from './firebase';
import { deviceSession } from './deviceSession';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  preferredLanguage: LanguageCode;
}

/** A sign-in problem with a message the user can act on. */
export class AuthError extends Error {}

function describe(e: unknown): AuthError {
  const code = (e as { code?: string }).code ?? '';
  const message =
    {
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/wrong-password': 'Wrong email or password.',
      'auth/user-not-found': 'No account uses this email. Create one instead.',
      'auth/invalid-email': 'Enter a valid email address.',
      'auth/email-already-in-use': 'An account already uses this email. Log in instead.',
      'auth/weak-password': 'Choose a stronger password (at least 6 characters).',
      'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
      'auth/network-request-failed': 'Can’t reach the sign-in service. Check your internet connection.',
      'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
      'auth/cancelled-popup-request': 'Google sign-in was closed before it finished.',
      'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.',
      'auth/operation-not-allowed': 'This sign-in method isn’t switched on for BoloAI.',
    }[code] ?? 'Something went wrong signing in. Please try again.';
  return new AuthError(message);
}

/** Profile details typed on the register screen, used when the backend profile is created. */
let pendingProfile: { fullName: string; preferredLanguage: LanguageCode } | null = null;

/** Firebase Authentication (the same accounts as the Flutter app). */
export const authService = {
  async login(email: string, password: string, remember: boolean): Promise<void> {
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      deviceSession.expectFreshSignIn();
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      throw describe(e);
    }
  },

  async loginWithGoogle(): Promise<void> {
    try {
      await setPersistence(auth, browserLocalPersistence);
      deviceSession.expectFreshSignIn();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (e) {
      throw describe(e);
    }
  },

  async register(input: RegisterInput): Promise<void> {
    try {
      await setPersistence(auth, browserLocalPersistence);
      pendingProfile = { fullName: input.fullName, preferredLanguage: input.preferredLanguage };
      deviceSession.expectFreshSignIn();
      const { user } = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
      await updateProfile(user, { displayName: input.fullName });
      // A fresh token carries the name to the call server.
      await user.getIdToken(true);
    } catch (e) {
      pendingProfile = null;
      throw describe(e);
    }
  },

  peekPendingProfile() {
    return pendingProfile;
  },

  takePendingProfile() {
    const p = pendingProfile;
    pendingProfile = null;
    return p;
  },

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      throw describe(e);
    }
  },

  async logout(): Promise<void> {
    await deviceSession.release();
    await signOut(auth);
  },

  async updateDisplayName(name: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    await updateProfile(user, { displayName: name });
    await user.getIdToken(true);
  },
};
