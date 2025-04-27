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
    
    // Ensure clean state for future focus mode activations
    console.log("Disabling focus mode and cleaning up state");
    
    // Set state after a longer delay to ensure React has time to process
    // This helps prevent issues with re-rendering and allows the orb to complete animations
    console.log("Scheduling focus mode deactivation with extended delay");
    
    setTimeout(() => {
      console.log("About to update focus mode state to inactive");
      set({ isFocusModeActive: false });
      
      // Log confirmation of state update
      console.log("Focus mode state updated to:", false);
    }, 200); // Increased from 10ms to 200ms
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