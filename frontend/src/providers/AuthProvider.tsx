import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAccessToken } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface AuthCtx {
  user: User | null | undefined; // undefined = loading, null = unauth
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user ?? r.data.me ?? null))
      .catch(() => setUser(null));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    setAccessToken(r.data.accessToken ?? r.data.access_token ?? null);
    setUser(r.data.user ?? r.data.me ?? null);
  };
  const register = async (email: string, password: string, name: string) => {
    const r = await api.post('/auth/register', { email, password, name });
    setAccessToken(r.data.accessToken ?? r.data.access_token ?? null);
    setUser(r.data.user ?? r.data.me ?? null);
  };
  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = (): AuthCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
};
