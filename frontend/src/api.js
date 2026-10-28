import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

let tokenGetter = null;

// Called once from App so every request carries the Clerk session token
export const setTokenGetter = (getter) => {
  tokenGetter = getter;
};

api.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
