import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import type { LanguageCode, User } from '../types';
import { auth } from '../services/firebase';
import { authService, type RegisterInput } from '../services/authService';
import { deviceSession } from '../services/deviceSession';
import { userService } from '../services/userService';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** Firebase is still restoring a saved sign-in. */
  initializing: boolean;
  /** Why the user was signed out, shown once on the login screen. */
  signOutNotice: string | null;
  takeSignOutNotice: () => string | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const COUNTRY_KEY = 'boloai.country';

function fromFirebase(fu: FirebaseUser, language: LanguageCode = 'hi'): User {
  const email = fu.email ?? '';
  let country = 'India';
  try {
    country = localStorage.getItem(COUNTRY_KEY) ?? country;
  } catch {
    /* storage blocked */
  }
  return {
    id: fu.uid,
    fullName: fu.displayName?.trim() || (email.includes('@') ? email.split('@')[0] : 'BoloAI user'),
    email,
    preferredLanguage: language,
    country,
    createdAt: fu.metadata.creationTime ? new Date(fu.metadata.creationTime).toISOString() : new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signOutNotice, setSignOutNotice] = useState<string | null>(null);

  useEffect(() => {
    deviceSession.onRevoked = () => {
      setSignOutNotice('Your account was signed in on another device, so you were signed out here.');
      void authService.logout();
    };
    return onAuthStateChanged(auth, (fu) => {
      setInitializing(false);
      if (!fu) {
        deviceSession.stop();
        setUser(null);
        return;
      }
      setUser((prev) => (prev?.email === fu.email ? prev : fromFirebase(fu, authService.peekPendingProfile()?.preferredLanguage)));
      deviceSession.start(fu);
    });
  }, []);

  // Once this browser holds the account: load the backend profile (creating it if needed).
  useEffect(
    () =>
      deviceSession.onReady(async () => {
        const fu = auth.currentUser;
        if (!fu) return;
        try {
          const pending = authService.takePendingProfile();
          const profile = await userService.syncProfile(
            pending?.fullName ?? fu.displayName ?? fu.email?.split('@')[0] ?? 'BoloAI user',
            pending?.preferredLanguage,
          );
          if (profile && auth.currentUser?.uid === fu.uid) {
            setUser((prev) => (prev ? { ...prev, id: profile.id, fullName: profile.name, preferredLanguage: profile.preferredLanguage, createdAt: profile.createdAt } : prev));
          }
        } catch (e) {
          console.warn('[auth] profile sync failed', e);
        }
      }),
    [],
  );

  const login = useCallback((email: string, password: string, remember: boolean) => authService.login(email, password, remember), []);
  const loginWithGoogle = useCallback(() => authService.loginWithGoogle(), []);

  const register = useCallback(async (input: RegisterInput) => {
    await authService.register(input);
    const fu = auth.currentUser;
    if (fu) setUser({ ...fromFirebase(fu, input.preferredLanguage), fullName: input.fullName });
  }, []);

  const logout = useCallback(() => authService.logout(), []);

  const updateUser = useCallback((next: User) => {
    try {
      localStorage.setItem(COUNTRY_KEY, next.country);
    } catch {
      /* storage blocked */
    }
    setUser(next);
  }, []);

  const takeSignOutNotice = useCallback(() => {
    const n = signOutNotice;
    setSignOutNotice(null);
    return n;
  }, [signOutNotice]);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, initializing, signOutNotice, takeSignOutNotice, login, loginWithGoogle, register, logout, updateUser }),
    [user, initializing, signOutNotice, takeSignOutNotice, login, loginWithGoogle, register, logout, updateUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
