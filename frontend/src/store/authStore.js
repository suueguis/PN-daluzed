// src/store/authStore.js
import { create } from "zustand";

const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  loginAt: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: ({ access, username, role }) =>
    set({
      accessToken: access,
      user: { username, role },
      loginAt: new Date().toISOString(),
      isAuthenticated: true,
      isLoading: false,
    }),

  setAccessToken: (access) => set({ accessToken: access }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      loginAt: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

export default useAuthStore;
