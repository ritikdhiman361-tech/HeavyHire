"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getTokens, setTokens, type Tokens } from "./api";
import type { Me } from "./types";

// Keeps track of who is logged in, for every page.
//   const { user, loading, signIn, signOut, reload } = useAuth();

interface AuthState {
  user: Me | null;
  loading: boolean;
  signIn: (tokens: Tokens, user: Me) => void;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!getTokens()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.get<Me>("/me"));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // Another tab logged in/out, or the token refresh failed.
    const onChange = () => {
      if (!getTokens()) setUser(null);
    };
    window.addEventListener("hh-auth-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("hh-auth-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [reload]);

  const signIn = useCallback((tokens: Tokens, me: Me) => {
    setTokens(tokens);
    setUser(me);
  }, []);

  const signOut = useCallback(async () => {
    const tokens = getTokens();
    if (tokens) await api.post("/auth/logout", { refreshToken: tokens.refreshToken }).catch(() => undefined);
    setTokens(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, reload }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
