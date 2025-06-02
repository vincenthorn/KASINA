import { create } from "zustand";
import { apiRequest } from "../api";
import { toast } from "sonner";

// Define our types first
interface User {
  email: string;
  subscription?: 'free' | 'premium';
  subscriptionType?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  user: User | null;
  isAdmin: boolean;
  subscriptionType: string | null;
  
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

// Export the hook for use in components
export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: null,
  user: null,
  isAdmin: false,
  subscriptionType: null,
  
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
      
      // Handle both response formats (direct email or nested user object)
      const userEmail = data.user?.email || data.email;
      const subscriptionType = data.user?.subscriptionType || data.subscriptionType;
      
      // Determine if user is admin
      const isAdmin = userEmail === 'admin@kasina.app';
      
      // Use the subscription type from the database instead of hardcoded list
      const isPremium = subscriptionType === 'premium' || subscriptionType === 'admin';
      
      // Create user object with subscription info
      const user = {
        email: userEmail,
        subscriptionType: subscriptionType,
        subscription: isPremium ? 'premium' : 'free'
      };
      
      // Store authenticated state with subscription type
      set({
        isAuthenticated: true,
        email: userEmail,
        user,
        isAdmin,
        subscriptionType: subscriptionType
      });
      
      toast.success('Successfully logged in');
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error('Login failed. Please try again later.');
      
      // Fallback login for development/testing
      if (import.meta.env.DEV) {
        const isAdmin = email === 'admin@kasina.app';
        
        // Check for premium email addresses
        const isPremium = 
          email === 'premium@kasina.app' || 
          email === 'brian@terma.asia' || 
          email === 'emilywhorn@gmail.com' || 
          email === 'ryan@ryanoelke.com' || 
          email === 'ksowocki@gmail.com' ||
          isAdmin;
          
        const user: User = { 
          email, 
          subscription: isPremium ? 'premium' : 'free'
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
      console.log(`[AUTH_CHECK] Checking authentication status at ${new Date().toISOString()}`);
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle both response formats (direct email or nested user object)
        const userEmail = data.user?.email || data.email;
        
        // Determine if user is admin
        const isAdmin = userEmail === 'admin@kasina.app';
        
        // Get subscription type from server response
        const serverSubscriptionType = data.user?.subscriptionType || data.subscriptionType;
        
        // Create user object with subscription info from database
        const user = {
          email: userEmail,
          subscriptionType: serverSubscriptionType,
          subscription: (serverSubscriptionType === 'premium' || serverSubscriptionType === 'admin') ? 'premium' as const : 'free' as const
        };
        
        console.log("Setting auth state with user:", user);
        
        set({
          isAuthenticated: true,
          email: userEmail,
          user,
          isAdmin,
          subscriptionType: serverSubscriptionType
        });
      } else {
        console.log(`[AUTH_CHECK] Authentication failed - status: ${response.status} at ${new Date().toISOString()}`);
        set({
          isAuthenticated: false,
          email: null,
          user: null,
          isAdmin: false
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      set({
        isAuthenticated: false,
        email: null,
        user: null,
        isAdmin: false
      });
    }
  },
}));