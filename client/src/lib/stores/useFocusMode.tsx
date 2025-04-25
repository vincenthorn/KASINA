import { create } from "zustand";

interface FocusModeState {
  isFocusModeActive: boolean;
  enableFocusMode: () => void;
  disableFocusMode: () => void;
  toggleFocusMode: () => void;
}

export const useFocusMode = create<FocusModeState>((set, get) => ({
  isFocusModeActive: false,
  
  enableFocusMode: () => {
    // Remove body class to avoid CSS conflicts with our dialog approach
    document.body.classList.remove('focus-mode-body');
    set({ isFocusModeActive: true });
  },
  
  disableFocusMode: () => {
    // Remove body class to avoid CSS conflicts with our dialog approach
    document.body.classList.remove('focus-mode-body');
    document.body.classList.remove('cursor-none');
    set({ isFocusModeActive: false });
  },
  
  toggleFocusMode: () => {
    const currentState = get();
    if (currentState.isFocusModeActive) {
      currentState.disableFocusMode();
    } else {
      currentState.enableFocusMode();
    }
  },
}));