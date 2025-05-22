import { create } from "zustand";
import { apiRequest } from "../api";
import { toast } from "sonner";

interface User {
  email: string;
  subscription?: 'free' | 'premium';
}

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  user: User | null;
  isAdmin: boolean;
  
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: null,
  user: null,
  isAdmin: false,
  
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
      
      // Store authenticated state
      const isAdmin = data.user.email === 'admin@kasina.app';
      set({
        isAuthenticated: true,
        email: data.user.email,
        user: data.user,
        isAdmin
      });
      
      toast.success('Successfully logged in');
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error('Login failed. Please try again later.');
      
      // Fallback login for development/testing
      if (import.meta.env.DEV) {
        const isAdmin = email === 'admin@kasina.app';
        const user: User = { 
          email, 
          subscription: isAdmin ? 'premium' : 'free'
        };
        set({ 
          isAuthenticated: true, 
          email,
          user,
          isAdmin
        });
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
        user: null,
        isAdmin: false,
      });
      
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed. Please try again.');
      
      // Still clear the local state on failure
      set({
        isAuthenticated: false,
        email: null,
        user: null,
        isAdmin: false,
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
        
        const isAdmin = data.user.email === 'admin@kasina.app';
        set({
          isAuthenticated: true,
          email: data.user.email,
          user: data.user,
          isAdmin
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
