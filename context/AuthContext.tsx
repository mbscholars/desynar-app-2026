'use client';

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getToken, removeToken, setToken } from '@/services/authStorage';

const GUEST_AUTH_KEY = 'desynar_auth_guest';

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Call with token when your auth flow returns one; omit for placeholder/guest login. */
  login: (token?: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuthenticatedState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // For now: no session check — always show as not authenticated so we can work on the login screen.
  useEffect(() => {
    setAuthenticatedState(false);
    setIsLoading(false);
  }, []);

  const setAuthenticated = useCallback((value: boolean) => {
    setAuthenticatedState(value);
    AsyncStorage.setItem(GUEST_AUTH_KEY, value ? 'true' : 'false').catch(() => {});
  }, []);

  const login = useCallback(async (token?: string) => {
    if (token) await setToken(token);
    setAuthenticatedState(true);
    await AsyncStorage.setItem(GUEST_AUTH_KEY, 'true').catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    setAuthenticatedState(false);
    await AsyncStorage.setItem(GUEST_AUTH_KEY, 'false').catch(() => {});
  }, []);

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    setAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
