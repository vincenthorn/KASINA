import { create } from "zustand";

interface FocusModeState {
  isFocusModeActive: boolean;
  enableFocusMode: () => void;
  disableFocusMode: () => void;
  toggleFocusMode: () => void;
}

export const useFocusMode = create<FocusModeState>((set, get) => ({
  isFocusModeActive: false,
  
  enableFocusMode: () => set({ isFocusModeActive: true }),
  
  disableFocusMode: () => set({ isFocusModeActive: false }),
  
  toggleFocusMode: () => set(state => ({ isFocusModeActive: !state.isFocusModeActive })),
}));