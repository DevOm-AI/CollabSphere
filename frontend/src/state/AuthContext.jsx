import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("collabsphere_token"));
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("collabsphere_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (payload) => {
    const response = await api.login(payload);
    localStorage.setItem("collabsphere_token", response.access_token);
    setToken(response.access_token);
    const me = await api.me();
    setUser(me);
  }, []);

  const signup = useCallback(async (payload) => {
    await api.signup(payload);
    await login({ email: payload.email, password: payload.password });
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem("collabsphere_token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.me();
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout, refreshUser, setUser }),
    [user, token, loading, login, signup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
