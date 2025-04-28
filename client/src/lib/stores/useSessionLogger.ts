import { create } from 'zustand';
import { toast } from 'sonner';
import { KasinaType } from '../types';

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
  }) => Promise<boolean>;
  
  // For debugging
  resetState: () => void;
}

export const useSessionLogger = create<SessionLoggerState>((set, get) => ({
  isSaving: false,
  lastSaved: null,
  lastError: null,
  
  logSession: async ({ kasinaType, duration, showToast = true }) => {
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
      const kasinaName = `${kasinaTypeNormalized.charAt(0).toUpperCase() + kasinaTypeNormalized.slice(1)} (${minutes}-${minuteText})`;
      
      // Create the session payload with all required fields
      const payload = {
        kasinaType: kasinaTypeNormalized,
        kasinaName,
        duration: minutes * 60, // Always use whole minutes in seconds
        durationInMinutes: minutes,
        timestamp: new Date().toISOString(),
        _guaranteedSession: true // This flag tells the server to prioritize this session
      };
      
      console.log("🚀 SessionLogger - Saving session:", payload);
      
      // Make the API call
      const response = await fetch('/api/direct-one-minute-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kasinaType: kasinaTypeNormalized })
      });
      
      if (response.ok) {
        console.log("✅ SessionLogger - Session saved successfully");
        
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
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error("❌ SessionLogger - Error saving session:", error);
      
      // Show error toast
      if (showToast) {
        toast.error("Failed to save session. Please try again.");
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