import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as authApi from '../api/auth';
import { setAuthToken } from '../api/httpClient';
import {
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
  type StoredAuth,
} from '../storage/authStorage';

export type AuthUser = StoredAuth['user'];

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await loadStoredAuth();
        if (!cancelled && stored) {
          setToken(stored.token);
          setUser(stored.user);
          setAuthToken(stored.token);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (phone: string, password: string) => {
    const data = await authApi.login(phone, password);
    setToken(data.token);
    setUser(data.user);
    setAuthToken(data.token);
    await saveStoredAuth({ token: data.token, user: data.user });
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await clearStoredAuth();
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isLoading,
      signIn,
      signOut,
    }),
    [token, user, isLoading, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
