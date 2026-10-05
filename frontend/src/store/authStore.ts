/**
 * Authentication store — Zustand
 * Handles login state, token persistence, and user info.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState, User } from "@/types";

interface AuthActions {
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true, isLoading: false }),

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "nwis-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
