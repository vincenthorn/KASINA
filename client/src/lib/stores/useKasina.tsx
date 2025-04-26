import { create } from "zustand";
import { KASINA_TYPES, KASINA_COLORS, KASINA_EMOJIS, KASINA_NAMES } from "../constants";
import { getLocalStorage, setLocalStorage } from "../utils";
import { KasinaSession, KasinaType } from "../types";
import { apiRequest } from "../api";

interface KasinaState {
  selectedKasina: string;
  setSelectedKasina: (type: string) => void;
  getKasinaColor: (type: string) => string;
  getKasinaEmoji: (type: string) => string;
  saveSession: (session: Omit<KasinaSession, "id">) => Promise<void>;
  addSession: (session: { kasinaType: string, duration: number }) => Promise<void>;
}

export const useKasina = create<KasinaState>((set, get) => ({
  // Default to white kasina or last used
  selectedKasina: getLocalStorage("selectedKasina", KASINA_TYPES.WHITE),
  
  setSelectedKasina: (type: string) => {
    set({ selectedKasina: type });
    setLocalStorage("selectedKasina", type);
  },
  
  getKasinaColor: (type: string) => {
    return KASINA_COLORS[type] || "#FFFFFF";
  },
  
  getKasinaEmoji: (type: string) => {
    return KASINA_EMOJIS[type] || "🔵";
  },
  
  saveSession: async (session) => {
    try {
      console.log("Saving session:", session);
      
      // Format the session data
      const sessionData = {
        kasinaType: session.kasinaType,
        kasinaName: KASINA_NAMES[session.kasinaType] || session.kasinaType,
        duration: session.duration,
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
  
  // Alias for saveSession to maintain compatibility with TimerFreestyle component
  addSession: async (session) => {
    // Just delegate to saveSession - this is for backwards compatibility
    const { saveSession } = get();
    // Cast to any to avoid type issues - we know these values are compatible
    return saveSession({
      kasinaType: session.kasinaType,
      duration: session.duration,
      date: new Date()
    } as any);
  }
}));