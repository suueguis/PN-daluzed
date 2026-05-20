// src/store/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Store de autenticación con Zustand.
 *
 * SEGURIDAD:
 *   - Solo accessToken y refreshToken se persisten en localStorage.
 *   - user (email/role) e isAuthenticated viven únicamente en memoria.
 *   - Al recargar la página el token sigue activo, pero los datos del
 *     usuario no son visibles en las herramientas del navegador.
 *
 * version: 1 — fuerza el borrado de cualquier dato antiguo (v0) que
 *   haya guardado user/role en localStorage.
 */
const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null, // { username, role } — solo en memoria
      isAuthenticated: false, // solo en memoria

      /** Llamar tras login exitoso con la respuesta del backend */
      setAuth: ({ access, refresh, username, role }) =>
        set({
          accessToken: access,
          refreshToken: refresh,
          user: { username, role },
          isAuthenticated: true,
        }),

      /** Actualiza solo el access token (usado por el interceptor de Axios) */
      setAccessToken: (access) => set({ accessToken: access }),

      /** Limpia al cerrar sesión */
      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "daluzed-auth",
      version: 1, // sube a 1 → Zustand descarta el estado v0 automáticamente

      // Solo tokens — nunca datos del usuario
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),

      // Migración explícita: si había datos v0 con user/role, los elimina
      migrate: (persisted) => ({
        accessToken: persisted?.accessToken ?? null,
        refreshToken: persisted?.refreshToken ?? null,
      }),
    },
  ),
);

export default useAuthStore;
