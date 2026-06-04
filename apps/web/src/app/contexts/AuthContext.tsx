import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredUser, setStoredUser } from '../lib/api';

export type UserRole = 'patient' | 'clinic' | 'professional' | 'attendant';

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  username?: string;
  role: UserRole;
  clinicId?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginAttendant: (clinicId: string, username: string, password: string) => Promise<AuthUser>;
  register: (data: { name: string; email: string; password: string; role?: UserRole }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  updateUser: (partial: Partial<AuthUser>) => void;
}

const defaultContext: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  loading: false,
  login: async () => { throw new Error('No AuthProvider'); },
  loginAttendant: async () => { throw new Error('No AuthProvider'); },
  register: async () => { throw new Error('No AuthProvider'); },
  logout: async () => {},
  refresh: async () => null,
  updateUser: () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser<AuthUser>());
  // Há sessão? O token é um cookie httpOnly invisível ao JS, então usamos o
  // usuário em cache como pista para validar no servidor ao carregar.
  const [loading, setLoading] = useState<boolean>(() => !!getStoredUser());

  const persist = useCallback((newUser: AuthUser | null) => {
    setStoredUser(newUser);
    setUser(newUser);
  }, []);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { data } = await api.get('/profile/me');
      const u = (data?.user ?? data) as AuthUser;
      setStoredUser(u);
      setUser(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  // No mount, valida a sessão (cookie) contra o servidor apenas se havia um
  // usuário em cache — evita disparar /profile/me (e o redirect de 401) para
  // visitantes anônimos em páginas públicas.
  useEffect(() => {
    if (getStoredUser()) {
      refresh().finally(() => setLoading(false));
    }
  }, [refresh]);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      setStoredUser(next);
      return next;
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const u = (data?.user ?? data?.profile) as AuthUser;
    if (!u) throw new Error('Resposta de login inválida');
    persist(u);
    return u;
  }, [persist]);

  const loginAttendant = useCallback(async (clinicId: string, username: string, password: string) => {
    const { data } = await api.post('/auth/login/attendant', { clinicId, username, password });
    const u = (data?.user ?? data?.profile) as AuthUser;
    if (!u) throw new Error('Resposta de login inválida');
    persist(u);
    return u;
  }, [persist]);

  const register = useCallback(async (payload: { name: string; email: string; password: string; role?: UserRole }) => {
    const { data } = await api.post('/auth/signup', { role: 'patient', ...payload });
    const u = (data?.user ?? data?.profile) as AuthUser;
    if (u) persist(u);
    return u;
  }, [persist]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* logout best-effort: limpa a sessão local mesmo se a API falhar */ }
    persist(null);
  }, [persist]);

  const value = useMemo<AuthContextValue>(() => ({
    user, isAuthenticated: !!user, loading,
    login, loginAttendant, register, logout, refresh, updateUser,
  }), [user, loading, login, loginAttendant, register, logout, refresh, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
