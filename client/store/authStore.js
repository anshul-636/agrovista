import { create } from "zustand";

const safeParseUser = () => {
  if (typeof window === "undefined") return null;

  const rawUser = localStorage.getItem("agrovista_user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem("agrovista_user");
    localStorage.removeItem("agrovista_token");
    localStorage.removeItem("agrovista_refresh_token");
    return null;
  }
};

const getStoredValue = (key) => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
};

export const useAuthStore = create((set, get) => ({
  user: safeParseUser(),
  token: getStoredValue("agrovista_token"),
  refreshToken: getStoredValue("agrovista_refresh_token"),
  isAuthenticated: !!getStoredValue("agrovista_token"),
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
