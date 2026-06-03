// client/src/store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserPublic } from "@nextask/types";

interface AuthState {
  token: string | null;
  user: UserPublic | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (token: string, user: UserPublic) => void;
  updateUser: (user: UserPublic) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      updateUser: (user) =>
        set({ user }),

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "nextask-auth",
      // Only persist token + user (not derived isAuthenticated)
      partialize: (state) => ({ token: state.token, user: state.user }),
      // Rehydrate isAuthenticated from persisted token
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.user) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
