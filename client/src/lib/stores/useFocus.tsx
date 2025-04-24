import { create } from 'zustand';

interface FocusState {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;
}

export const useFocus = create<FocusState>((set, get) => ({
  isFocusMode: false,
  toggleFocusMode: () => {
    // Get current state
    const currentMode = get().isFocusMode;
    // Log for debugging
    console.log('Current focus mode:', currentMode);
    console.log('Toggling to:', !currentMode);
    // Set new state
    set({ isFocusMode: !currentMode });
  },
  setFocusMode: (enabled: boolean) => {
    console.log('Setting focus mode to:', enabled);
    set({ isFocusMode: enabled });
  },
}));