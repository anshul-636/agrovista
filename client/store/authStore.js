import { create } from "zustand";

// ─── Helpers (safe to call on client only) ───────────────────────────────────

const safeParseUser = () => {
  try {
    const rawUser = localStorage.getItem("agrovista_user");
    if (!rawUser) return null;
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem("agrovista_user");
    localStorage.removeItem("agrovista_token");
    localStorage.removeItem("agrovista_refresh_token");
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create((set, get) => ({
  // ✅ FIX: Always start with null / false so the server and client render
  // identical initial HTML. The real values are loaded from localStorage
  // inside hydrate(), which is called in a useEffect (client-only).
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: true, // true until hydrate() runs — lets UI show a skeleton/spinner

  // Call this once from AppProviders useEffect to sync localStorage → store.
  hydrate: () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("agrovista_token");
    const refreshToken = localStorage.getItem("agrovista_refresh_token");
    const user = safeParseUser();

    set({
      user,
      token,
      refreshToken,
      isAuthenticated: !!token,
      loading: false,
    });
  },

  login: (user, token, refreshToken = null) => {
    localStorage.setItem("agrovista_user", JSON.stringify(user));
    localStorage.setItem("agrovista_token", token);
    if (refreshToken) {
      localStorage.setItem("agrovista_refresh_token", refreshToken);
    }
    set({
      user,
      token,
      refreshToken: refreshToken || get().refreshToken,
      isAuthenticated: true,
      loading: false,
    });
  },

  logout: () => {
    localStorage.removeItem("agrovista_user");
    localStorage.removeItem("agrovista_token");
    localStorage.removeItem("agrovista_refresh_token");
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  updateProfile: (updatedData) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updatedData };
    localStorage.setItem("agrovista_user", JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  setLoading: (loading) => set({ loading }),
}));