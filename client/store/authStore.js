import { create } from "zustand";

export const useAuthStore = create((set, get) => ({
  user: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("agrovista_user")) : null,
  token: typeof window !== "undefined" ? localStorage.getItem("agrovista_token") : null,
  isAuthenticated: typeof window !== "undefined" ? !!localStorage.getItem("agrovista_token") : false,
  loading: false,

  login: (user, token) => {
    localStorage.setItem("agrovista_user", JSON.stringify(user));
    localStorage.setItem("agrovista_token", token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("agrovista_user");
    localStorage.removeItem("agrovista_token");
    set({ user: null, token: null, isAuthenticated: false });
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
