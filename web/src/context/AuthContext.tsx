import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { authService, type RegisterInput } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    setUser(await authService.login(email, password, remember));
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setUser(await authService.loginWithGoogle());
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setUser(await authService.register(input));
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback((next: User) => {
    authService.updateSession(next);
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, login, loginWithGoogle, register, logout, updateUser }),
    [user, login, loginWithGoogle, register, logout, updateUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
