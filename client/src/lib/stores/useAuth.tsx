import { create } from "zustand";
import { apiRequest } from "../api";
import { getLocalStorage, setLocalStorage } from "../utils";

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  checkAuthStatus: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: getLocalStorage("isAuthenticated") || false,
  email: getLocalStorage("userEmail") || null,
  
  login: async (email: string) => {
    try {
      // Make API request to check if email is in whitelist
      const response = await apiRequest("POST", "/api/auth/login", { email });
      
      if (!response.ok) {
        console.error("Login failed:", await response.text());
        return false;
      }
      
      // Store authenticated state
      set({ isAuthenticated: true, email });
      setLocalStorage("isAuthenticated", true);
      setLocalStorage("userEmail", email);
      
      return true;
    } catch (error) {
      console.error("Login error:", error);
      
      // Fallback login for development/testing
      // In a real app, we would always use the server validation
      if (import.meta.env.DEV) {
        set({ isAuthenticated: true, email });
        setLocalStorage("isAuthenticated", true);
        setLocalStorage("userEmail", email);
        return true;
      }
      
      return false;
    }
  },
  
  logout: () => {
    set({ isAuthenticated: false, email: null });
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
  },
  
  checkAuthStatus: () => {
    const isAuthenticated = getLocalStorage("isAuthenticated");
    const email = getLocalStorage("userEmail");
    
    if (isAuthenticated && email) {
      set({ isAuthenticated, email });
    } else {
      set({ isAuthenticated: false, email: null });
    }
  },
}));
