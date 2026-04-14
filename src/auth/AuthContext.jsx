import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as api from "./authApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const u = await api.getSessionUser();
    setUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) setLoading(false);
    })();
    const unsub = api.onAuthChange((u) => {
      setUser(u);
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [refreshUser]);

  const signIn = useCallback(async (payload) => {
    const { user: u } = await api.signIn(payload);
    setUser(u);
    return { user: u };
  }, []);

  const signUp = useCallback(async (payload) => {
    const res = await api.signUp(payload);
    if (res.needsEmailConfirm) {
      setUser(null);
    } else {
      setUser(res.user);
    }
    return res;
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
  }, []);

  const value = { user, loading, signIn, signUp, signOut, refreshUser, authMode: api.authMode };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
