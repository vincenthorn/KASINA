import { create } from 'zustand';

// Add global tracking for debugging
declare global {
  interface Window {
    __DEBUG_TIMER: {
      originalDuration: number | null;
      currentDuration: number | null;
    };
  }
}

// Initialize global debug object
if (typeof window !== 'undefined') {
  window.__DEBUG_TIMER = {
    originalDuration: null,
    currentDuration: null
  };
}

// This store maintains the timer state across component mounts
interface SimpleTimerState {
  duration: number | null; // in seconds, null means infinity (count up)
  originalDuration: number | null; // Store the originally set duration for reference
  isRunning: boolean;
  elapsedTime: number;
  timeRemaining: number | null;
  lastStartedAt: number | null; // Timestamp when the timer was started
  
  // Actions
  setDuration: (duration: number | null) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  tick: () => void; // Update the timer state on each tick
  setInfiniteMode: () => void;
  getOriginalDuration: () => number | null; // New method to get the original duration
}

export const useSimpleTimer = create<SimpleTimerState>((set, get) => ({
  duration: 60, // Default to 60 seconds (1 minute)
  originalDuration: 60, // Store the original setting
  isRunning: false,
  elapsedTime: 0,
  timeRemaining: 60,
  lastStartedAt: null,
  
  setDuration: (duration: number | null) => {
    console.log("useSimpleTimer - Setting duration to:", duration);
    
    // Update global debug object
    if (typeof window !== 'undefined') {
      window.__DEBUG_TIMER.originalDuration = duration;
      window.__DEBUG_TIMER.currentDuration = duration;
    }
    
    // Store both the current and original duration
    set({ 
      duration, 
      originalDuration: duration, // CRITICAL: Store original value
      timeRemaining: duration,
      elapsedTime: 0
    });
  },
  
  startTimer: () => {
    const { timeRemaining, duration } = get();
    
    // Reset the timer if it's completed
    if (timeRemaining === 0) {
      set({
        timeRemaining: duration,
        elapsedTime: 0
      });
    }
    
    set({ 
      isRunning: true,
      lastStartedAt: Date.now()
    });
  },
  
  stopTimer: () => {
    set({ 
      isRunning: false,
      lastStartedAt: null
    });
  },
  
  resetTimer: () => {
    const { duration } = get();
    set({ 
      isRunning: false,
      timeRemaining: duration,
      elapsedTime: 0,
      lastStartedAt: null
    });
  },
  
  tick: () => {
    const { isRunning, timeRemaining, duration, elapsedTime } = get();
    
    if (!isRunning) return;
    
    // Update elapsed time (for both countdown and count-up)
    set({ elapsedTime: elapsedTime + 1 });
    
    // Update remaining time (for countdown only)
    if (timeRemaining !== null) {
      const newTime = timeRemaining - 1;
      
      // Stop at zero
      if (newTime <= 0) {
        set({
          isRunning: false,
          timeRemaining: 0,
          lastStartedAt: null
        });
        return;
      }
      
      set({ timeRemaining: newTime });
    }
  },
  
  setInfiniteMode: () => {
    set({
      duration: null,
      originalDuration: null,
      timeRemaining: null,
      elapsedTime: 0
    });
  },
  
  // Implement the getOriginalDuration method
  getOriginalDuration: () => {
    // Get the original duration that was set, not the current remaining time
    const { originalDuration, duration } = get();
    
    // Log to console for debugging
    console.log("getOriginalDuration called - values:", {
      originalDuration,
      currentDuration: duration
    });
    
    // Return the original duration, falling back to current duration if needed
    return originalDuration !== null ? originalDuration : duration;
  }
}));

export default useSimpleTimer;