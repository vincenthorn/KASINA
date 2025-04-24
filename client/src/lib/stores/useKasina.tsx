import { create } from "zustand";
import { KASINA_TYPES, KASINA_COLORS, KASINA_EMOJIS } from "../constants";
import { getLocalStorage, setLocalStorage } from "../utils";

interface KasinaState {
  selectedKasina: string;
  setSelectedKasina: (type: string) => void;
  getKasinaColor: (type: string) => string;
  getKasinaEmoji: (type: string) => string;
}

export const useKasina = create<KasinaState>((set, get) => ({
  // Default to white kasina or last used
  selectedKasina: getLocalStorage("selectedKasina") || KASINA_TYPES.WHITE,
  
  setSelectedKasina: (type: string) => {
    set({ selectedKasina: type });
    setLocalStorage("selectedKasina", type);
  },
  
  getKasinaColor: (type: string) => {
    return KASINA_COLORS[type] || "#FFFFFF";
  },
  
  getKasinaEmoji: (type: string) => {
    return KASINA_EMOJIS[type] || "🔵";
  }
}));
