import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  login: (data: {
    access_token: string;
    refresh_token: string;
    email?: string;
    userId?: string;
    name?: string;
  }) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem("access_token"),
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  userEmail: localStorage.getItem("user_email"),
  userId: localStorage.getItem("user_id"),
  userName: localStorage.getItem("user_name"),

  login: (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    if (data.email) localStorage.setItem("user_email", data.email);
    if (data.userId) localStorage.setItem("user_id", data.userId);
    if (data.name) localStorage.setItem("user_name", data.name);
    set({
      isAuthenticated: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userEmail: data.email || null,
      userId: data.userId || null,
      userName: data.name || null,
    });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      userEmail: null,
      userId: null,
      userName: null,
    });
  },

  hydrate: () => {
    set({
      isAuthenticated: !!localStorage.getItem("access_token"),
      accessToken: localStorage.getItem("access_token"),
      refreshToken: localStorage.getItem("refresh_token"),
      userEmail: localStorage.getItem("user_email"),
      userId: localStorage.getItem("user_id"),
      userName: localStorage.getItem("user_name"),
    });
  },
}));
