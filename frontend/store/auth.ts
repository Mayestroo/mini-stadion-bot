import { create } from "zustand";
import { User } from "@/lib/types";
import { authApi } from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  hydrated: false,

  hydrate: async () => {
    if (typeof window === "undefined") return;
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, hydrated: true });
    } catch {
      set({ user: null, isAuthenticated: false, hydrated: true });
    }
  },

  login: (user) => {
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    authApi.logout().catch(() => undefined);
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    set({ user });
  },
}));
