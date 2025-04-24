import { create } from "zustand";
import { KASINA_TYPES, KASINA_COLORS, KASINA_EMOJIS, KASINA_NAMES } from "../constants";
import { getLocalStorage, setLocalStorage } from "../utils";
import { KasinaSession } from "../types";
import { apiRequest } from "../api";

interface KasinaState {
  selectedKasina: string;
  setSelectedKasina: (type: string) => void;
  getKasinaColor: (type: string) => string;
  getKasinaEmoji: (type: string) => string;
  saveSession: (session: Omit<KasinaSession, "id">) => Promise<void>;
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
      };
      
      // Always save to local storage regardless of server success
      const localSessions = JSON.parse(localStorage.getItem("sessions") || "[]");
      const newSession = {
        id: Date.now().toString(),
        ...sessionData
      };
      localSessions.push(newSession);
      localStorage.setItem("sessions", JSON.stringify(localSessions));
      console.log("Session saved to local storage:", newSession);
      
      // Also try to save to server
      try {
        const response = await apiRequest("POST", "/api/sessions", sessionData);
        const serverResponse = await response.json();
        console.log("Session also saved to server:", serverResponse);
      } catch (error) {
        console.warn("Failed to save session to server:", error);
        // Local storage fallback already handled above
      }
    } catch (error) {
      console.error("Error saving session:", error);
    }
  }
}));
