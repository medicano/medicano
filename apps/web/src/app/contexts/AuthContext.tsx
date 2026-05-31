import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredUser, getToken, setStoredUser, setToken } from '../lib/api';

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
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginAttendant: (clinicId: string, username: string, password: string) => Promise<AuthUser>;
  register: (data: { name: string; email: string; password: string; role?: UserRole }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
}

const defaultContext: AuthContextValue = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  login: async () => { throw new Error('No AuthProvider'); },
  loginAttendant: async () => { throw new Error('No AuthProvider'); },
  register: async () => { throw new Error('No AuthProvider'); },
  logout: async () => {},
  refresh: async () => null,
};

const AuthContext = createContext<AuthContextValue>(defaultContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser<AuthUser>());
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState<boolean>(!!getToken() && !getStoredUser());

  const persist = useCallback((newToken: string | null, newUser: AuthUser | null) => {
    setToken(newToken);
    setStoredUser(newUser);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    if (!getToken()) return null;
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

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    }
  }, [token, user, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const t = data?.accessToken ?? data?.token ?? data?.access_token;
    const u = (data?.user ?? data?.profile) as AuthUser;
    if (!t || !u) throw new Error('Resposta de login inválida');
    persist(t, u);
    return u;
  }, [persist]);

  const loginAttendant = useCallback(async (clinicId: string, username: string, password: string) => {
    const { data } = await api.post('/auth/login/attendant', { clinicId, username, password });
    const t = data?.accessToken ?? data?.token ?? data?.access_token;
    const u = (data?.user ?? data?.profile) as AuthUser;
    if (!t || !u) throw new Error('Resposta de login inválida');
    persist(t, u);
    return u;
  }, [persist]);

  const register = useCallback(async (payload: { name: string; email: string; password: string; role?: UserRole }) => {
    const { data } = await api.post('/auth/signup', { role: 'patient', ...payload });
    const t = data?.accessToken ?? data?.token ?? data?.access_token;
    const u = (data?.user ?? data?.profile) as AuthUser;
    if (t && u) persist(t, u);
    return u;
  }, [persist]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* logout best-effort: limpa a sessão local mesmo se a API falhar */ }
    persist(null, null);
  }, [persist]);

  const value = useMemo<AuthContextValue>(() => ({
    user, token, isAuthenticated: !!token, loading,
    login, loginAttendant, register, logout, refresh,
  }), [user, token, loading, login, loginAttendant, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
