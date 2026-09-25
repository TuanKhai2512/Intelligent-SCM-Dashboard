import type { AuthUserView } from '@ims/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '../components/ui';
import { setUnauthorizedHandler, tokenStore } from './api';
import { api } from './endpoints';
import { qk } from './query';

interface AuthState {
  user: AuthUserView | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(() => tokenStore.get());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      qc.clear();
    });
    return () => setUnauthorizedHandler(() => {});
  }, [qc]);

  const me = useQuery({ queryKey: qk.me, queryFn: api.me, enabled: token !== null, retry: false, staleTime: Infinity });

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await api.login(email, password);
    tokenStore.set(accessToken);
    setToken(accessToken);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    qc.clear();
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({
      user: token ? (me.data ?? null) : null,
      loading: token !== null && me.isPending,
      login,
      logout,
    }),
    [token, me.data, me.isPending, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}
