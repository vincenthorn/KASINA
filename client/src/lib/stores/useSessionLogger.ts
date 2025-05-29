import { create } from 'zustand';
import { toast } from 'sonner';
import { KasinaType } from '../types';
import { useAuth } from './useAuth';

/**
 * A dedicated store for reliable session logging
 * This store provides a central mechanism for logging sessions
 * that works regardless of where it's called from in the app
 */

interface SessionLoggerState {
  // Internal state
  isSaving: boolean;
  lastSaved: number | null;
  lastError: string | null;
  
  // Session log method
  logSession: (params: {
    kasinaType: KasinaType;
    duration: number;
    showToast?: boolean;
    kasinaBreakdown?: { [kasina: string]: number };
    customSessionName?: string;
  }) => Promise<boolean>;
  
  // For debugging
  resetState: () => void;
}

export const useSessionLogger = create<SessionLoggerState>((set, get) => ({
  isSaving: false,
  lastSaved: null,
  lastError: null,
  
  logSession: async ({ kasinaType, duration, showToast = true, kasinaBreakdown = {}, customSessionName }) => {
    // Prevent duplicate saves within 2 seconds
    const { lastSaved, isSaving } = get();
    if (isSaving) {
      console.warn("Session save already in progress, skipping");
      return false;
    }
    
    if (lastSaved && (Date.now() - lastSaved < 2000)) {
      console.warn("Session was saved within the last 2 seconds, skipping");
      return false;
    }
    
    // Start saving
    set({ isSaving: true, lastError: null });
    
    try {
      // Calculate minutes for display name
      const minutes = Math.max(1, Math.round(duration / 60));
      const minuteText = minutes === 1 ? "minute" : "minutes";
      
      // Normalize kasina type
      const kasinaTypeNormalized = kasinaType.toLowerCase() as KasinaType;
      const kasinaName = customSessionName || `${kasinaTypeNormalized.charAt(0).toUpperCase() + kasinaTypeNormalized.slice(1)} Kasina`;
      
      // Get the current user's email from auth store
      const authState = useAuth.getState();
      const userEmail = authState.email;

      // RELIABILITY FIX: Save session data in localStorage as a backup 
      // in case the network request fails
      const sessionBackup = {
        id: Date.now().toString(),
        kasinaType: kasinaTypeNormalized,
        kasinaName,
        duration: minutes * 60, // Always use whole minutes in seconds
        durationInMinutes: minutes,
        timestamp: new Date().toISOString(),
        userEmail: userEmail || null
      };
      
      try {
        localStorage.setItem('lastSessionBackup', JSON.stringify(sessionBackup));
        localStorage.setItem('sessionBackupStatus', 'pending');
        console.log("💾 Saved session backup to localStorage");
      } catch (e) {
        console.warn("Failed to save session backup to localStorage:", e);
      }
      
      // Create the session payload with all required fields
      const payload = {
        kasinaType: kasinaTypeNormalized,
        kasinaName,
        duration: minutes * 60, // Always use whole minutes in seconds
        durationInMinutes: minutes,
        timestamp: new Date().toISOString(),
        userEmail: userEmail || null, // Include the user's email for proper attribution
        _guaranteedSession: true, // This flag tells the server to prioritize this session
        _critical: true // Mark as critical to ensure it's saved
      };
      
      console.log("🚀 SessionLogger - Saving session:", payload);
      
      // Make the API call to the correct sessions endpoint
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          kasinaType: kasinaTypeNormalized,
          kasinaName,
          duration: minutes * 60, // Duration in seconds
          userEmail: userEmail,
          timestamp: new Date().toISOString(),
          kasinaBreakdown: kasinaBreakdown // Include breakdown data
        })
      });
      
      if (response.ok) {
        console.log("✅ SessionLogger - Session saved successfully");
        
        // Mark backup as completed
        try {
          localStorage.setItem('sessionBackupStatus', 'completed');
        } catch (e) {
          console.warn("Failed to update session backup status:", e);
        }
        
        // Show success toast
        if (showToast) {
          toast.success(`${kasinaName} session saved successfully`);
        }
        
        // Update state
        set({ isSaving: false, lastSaved: Date.now() });
        
        // Force refresh the sessions list
        window.dispatchEvent(new Event('session-saved'));
        
        return true;
      } else {
        // Try fallback method if direct API fails
        console.log("⚠️ Primary session save failed, trying fallback method");
        
        try {
          // Use image beacon as ultra-reliable fallback (works even when fetch fails)
          const imgBeacon = new Image();
          const beaconUrl = `/api/save-session/${encodeURIComponent(kasinaTypeNormalized)}/${minutes}`;
          imgBeacon.src = beaconUrl;
          console.log(`📡 Emergency beacon created: ${beaconUrl}`);
          
          // Mark this as attempted rescue
          localStorage.setItem('sessionBackupStatus', 'rescue-attempted');
        } catch (e) {
          console.error("Failed to create emergency beacon:", e);
        }
        
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error("❌ SessionLogger - Error saving session:", error);
      
      // Show error toast and offer recovery
      if (showToast) {
        toast.error("Session save failed. Your session will be saved when you reconnect.");
      }
      
      // Update state
      set({ 
        isSaving: false, 
        lastError: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  },
  
  resetState: () => {
    set({ isSaving: false, lastSaved: null, lastError: null });
  }
}));