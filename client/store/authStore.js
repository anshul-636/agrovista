import { create } from "zustand";

export const useAuthStore = create((set, get) => ({
  user: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("agrovista_user")) : null,
  token: typeof window !== "undefined" ? localStorage.getItem("agrovista_token") : null,
  refreshToken: typeof window !== "undefined" ? localStorage.getItem("agrovista_refresh_token") : null,
  isAuthenticated: typeof window !== "undefined" ? !!localStorage.getItem("agrovista_token") : false,
  loading: false,

  login: (user, token, refreshToken = null) => {
    localStorage.setItem("agrovista_user", JSON.stringify(user));
    localStorage.setItem("agrovista_token", token);
    if (refreshToken) {
      localStorage.setItem("agrovista_refresh_token", refreshToken);
    }
    set({ user, token, refreshToken: refreshToken || get().refreshToken, isAuthenticated: true });
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
