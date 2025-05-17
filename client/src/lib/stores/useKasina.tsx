import { create } from "zustand";
import { KASINA_TYPES, KASINA_COLORS, KASINA_EMOJIS, KASINA_NAMES } from "../constants";
import { getLocalStorage, setLocalStorage } from "../utils";
import { KasinaSession, KasinaType } from "../types";
import { apiRequest } from "../api";

interface KasinaState {
  selectedKasina: string;
  customColor: string;
  setSelectedKasina: (type: string) => void;
  setCustomColor: (color: string) => void;
  getKasinaColor: (type: string) => string;
  getKasinaEmoji: (type: string) => string;
  saveSession: (session: Omit<KasinaSession, "id">) => Promise<void>;
  addSession: (session: { kasinaType: string, duration: number }) => Promise<void>;
}

export const useKasina = create<KasinaState>((set, get) => ({
  // Default to white kasina or last used
  selectedKasina: getLocalStorage("selectedKasina", KASINA_TYPES.WHITE),
  customColor: getLocalStorage("customColor", "#8A2BE2"), // Default to medium violet red
  
  setSelectedKasina: (type: string) => {
    set({ selectedKasina: type });
    setLocalStorage("selectedKasina", type);
  },
  
  setCustomColor: (color: string) => {
    set({ customColor: color });
    setLocalStorage("customColor", color);
    
    // If the current selection is custom, we need to update KASINA_COLORS directly
    if (get().selectedKasina === KASINA_TYPES.CUSTOM) {
      KASINA_COLORS[KASINA_TYPES.CUSTOM] = color;
    }
  },
  
  getKasinaColor: (type: string) => {
    if (type === KASINA_TYPES.CUSTOM) {
      return get().customColor;
    }
    return KASINA_COLORS[type] || "#FFFFFF";
  },
  
  getKasinaEmoji: (type: string) => {
    return KASINA_EMOJIS[type] || "🔵";
  },
  
  saveSession: async (session) => {
    try {
      console.log("Saving session:", session);

      // CRITICAL FIX: Make sure duration is a valid number in seconds
      let duration = session.duration;
      
      // Convert to number if it's a string
      if (typeof duration === 'string') {
        duration = parseInt(duration, 10);
      }
      
      // If value is very small (like 1 or 2), it might be in minutes - convert to seconds
      if (duration > 0 && duration < 10) {
        console.log(`CRITICAL: Converting small duration ${duration} to seconds (${duration * 60}s)`);
        duration = duration * 60;
      }
      
      console.log("saveSession - Duration to save:", duration, "seconds");
      
      // Format the session data with explicit duration info
      // CRITICAL FIX: Include both original and processed durations for server reference
      let durationMinutes = Math.round(duration / 60);
      
      const sessionData = {
        kasinaType: session.kasinaType,
        // Include a duration reference in the name to help debugging
        kasinaName: `${KASINA_NAMES[session.kasinaType] || session.kasinaType} (${durationMinutes}-minute)`,
        duration: duration, // Use our validated duration
        // Include original duration values to help the server make correct decisions
        originalDuration: session.duration, // The raw value from the original session object
        durationInMinutes: durationMinutes, // Duration in minutes for easier reference
        timestamp: new Date().toISOString(),
        // The userEmail will be set by the server based on the authenticated user
      };
      
      // Only save to server, not to localStorage
      // This prevents duplicate entries between localStorage and API storage
      try {
        const response = await apiRequest("POST", "/api/sessions", sessionData);
        const serverResponse = await response.json();
        console.log("Session saved to server:", serverResponse);
      } catch (error) {
        console.warn("Failed to save session to server:", error);
        
        // Only save to localStorage as fallback if server save fails
        const localSessions = JSON.parse(localStorage.getItem("sessions") || "[]");
        
        // Try to get user email from auth data in localStorage
        let userEmail = null;
        try {
          const authData = localStorage.getItem("auth");
          if (authData) {
            const parsedAuth = JSON.parse(authData);
            userEmail = parsedAuth.email;
          }
        } catch (e) {
          console.warn("Failed to get user email from localStorage:", e);
        }
        
        const newSession = {
          id: Date.now().toString(),
          ...sessionData,
          userEmail // Include user email in localStorage fallback
        };
        
        localSessions.push(newSession);
        localStorage.setItem("sessions", JSON.stringify(localSessions));
        console.log("Session saved to local storage as fallback:", newSession);
      }
    } catch (error) {
      console.error("Error saving session:", error);
    }
  },
  
  // Alias for saveSession to maintain compatibility with TimerKasinas component
  addSession: async (session) => {
    // CRITICAL FIX: Make sure duration is passed as a number
    // and convert it to seconds if it's in minutes
    let duration = session.duration;
    const kasinaType = session.kasinaType;
    
    // Special debugging and handling for Yellow kasina
    if (kasinaType === 'yellow') {
      console.log(`🟡 YELLOW KASINA STORE PROCESSING:
      - Original duration: ${duration}
      - Type value: "${kasinaType}"
      - Correct YELLOW value: "${KASINA_TYPES.YELLOW}"
      - Session object: ${JSON.stringify(session)}`);
    }
    
    // If we get a string, convert it to a number
    if (typeof duration === 'string') {
      duration = parseInt(duration, 10);
    }
    
    // If it's a small number like 1 or 2, it might be in minutes instead of seconds
    // Ensure we always store seconds
    if (duration > 0 && duration < 10) {
      console.log(`CRITICAL: Converting small duration value ${duration} to seconds (${duration * 60}s)`);
      duration = duration * 60;
    }
    
    console.log("addSession - Final duration value to save:", duration, "seconds for kasina type:", kasinaType);
    
    // Just delegate to saveSession - this is for backwards compatibility
    const { saveSession } = get();
    
    // Special case for Yellow kasina - ensure it's properly formatted
    // This is a direct fix for the issue with Yellow not being saved properly
    let finalType = session.kasinaType;
    if (finalType === 'yellow' || finalType === KASINA_TYPES.YELLOW) {
      console.log(`🟡 YELLOW KASINA MANUAL FIX APPLIED - This should ensure Yellow sessions are saved correctly.
      - Original type: "${finalType}"
      - Normalized to: "yellow"
      - Duration: ${duration} seconds`);
      finalType = 'yellow'; // Make absolutely sure we're using the correct string value
    }
    
    // Cast to any to avoid type issues - we know these values are compatible
    return saveSession({
      kasinaType: finalType,
      duration: duration, // Use our validated duration
      date: new Date()
    } as any);
  }
}));