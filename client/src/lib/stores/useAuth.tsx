import { create } from "zustand";
import { apiRequest } from "../api";
import { toast } from "sonner";

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  user?: {
    email: string | null;
    isPremium: boolean;
    isAdmin: boolean;
  };
  
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: null,
  user: {
    email: null,
    isPremium: false,
    isAdmin: false
  },
  
  login: async (email: string) => {
    try {
      // Make API request to check if email is in whitelist
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Login failed');
        return false;
      }
      
      const data = await response.json();
      
      // Check if the user is admin or premium
      const isAdmin = data.user.email === "admin@kasina.app";
      const isPremium = data.user.email?.endsWith('@kasina.app') || 
                        data.user.email === 'brian@terma.asia' || 
                        data.user.email === 'emilywhorn@gmail.com' || 
                        data.user.email === 'ryan@ryanoelke.com' || 
                        data.user.email === 'ksowocki@gmail.com';
                        
      // Store authenticated state
      set({
        isAuthenticated: true,
        email: data.user.email,
        user: {
          email: data.user.email,
          isPremium: isPremium || isAdmin,
          isAdmin: isAdmin
        }
      });
      
      toast.success('Successfully logged in');
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error('Login failed. Please try again later.');
      
      // Fallback login for development/testing
      if (import.meta.env.DEV) {
        set({ isAuthenticated: true, email });
        return true;
      }
      
      return false;
    }
  },
  
  logout: async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      set({
        isAuthenticated: false,
        email: null,
      });
      
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
      
      // Still clear the local state on failure
      set({
        isAuthenticated: false,
        email: null,
      });
    }
  },
  
  checkAuthStatus: async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        set({
          isAuthenticated: true,
          email: data.user.email,
        });
      } else {
        set({
          isAuthenticated: false,
          email: null,
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      set({
        isAuthenticated: false,
        email: null,
      });
    }
  },
}));
