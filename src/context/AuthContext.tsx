"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiLogin, apiRegister, apiGetBalance, type AuthUser, type WalletBalance } from "@/lib/custodialApi";

const TOKEN_KEY = "viden-auth-token";
const USER_KEY  = "viden-auth-user";

type AuthContextValue = {
  user:       AuthUser | null;
  token:      string | null;
  balance:    WalletBalance | null;
  isLoggedIn: boolean;
  isAdmin:    boolean;
  isLoading:  boolean;
  login:      (email: string, password: string) => Promise<void>;
  register:   (email: string, password: string, username: string, referralCode?: string) => Promise<{ welcomeVdn: number }>;
  logout:     () => void;
  refreshBalance: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null, token: null, balance: null, isLoggedIn: false, isAdmin: false, isLoading: true,
  login: async () => {}, register: async () => ({ welcomeVdn: 0 }),
  logout: () => {}, refreshBalance: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session from localStorage ────────────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser  = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch { /* ignore bad data */ }
    }
    setIsLoading(false);
  }, []);

  // ── Refresh balance whenever token changes ────────────────────────────────────
  const refreshBalance = useCallback(async () => {
    const t = token ?? localStorage.getItem(TOKEN_KEY);
    if (!t) return;
    try {
      const bal = await apiGetBalance(t);
      setBalance(bal);
      // Also keep user balance fields in sync
      setUser(prev => prev ? { ...prev, balance_usd: bal.balance_usd, balance_vdn: bal.balance_vdn } : prev);
    } catch { /* network error — keep stale data */ }
  }, [token]);

  useEffect(() => {
    if (token) refreshBalance();
  }, [token, refreshBalance]);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────────
  const register = useCallback(async (email: string, password: string, username: string, referralCode?: string) => {
    const res = await apiRegister(email, password, username, referralCode);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return { welcomeVdn: res.user.balance_vdn };
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setBalance(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, balance, isLoggedIn: !!token, isAdmin: !!(user?.is_admin), isLoading,
      login, register, logout, refreshBalance,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
