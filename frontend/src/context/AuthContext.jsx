import { createContext, useContext, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("gw_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("gw_token", res.data.access_token);
    localStorage.setItem("gw_user", JSON.stringify({
      id: res.data.user_id,
      full_name: res.data.full_name,
    }));
    setUser({ id: res.data.user_id, full_name: res.data.full_name });
  };

  const register = async (email, password, full_name) => {
    const res = await api.post("/auth/register", { email, password, full_name });
    localStorage.setItem("gw_token", res.data.access_token);
    localStorage.setItem("gw_user", JSON.stringify({
      id: res.data.user_id,
      full_name: res.data.full_name,
    }));
    setUser({ id: res.data.user_id, full_name: res.data.full_name });
  };

  const logout = () => {
    localStorage.removeItem("gw_token");
    localStorage.removeItem("gw_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}