import { create } from 'zustand';

// Add global tracking for debugging
declare global {
  interface Window {
    __DEBUG_TIMER?: {
      originalDuration: number | null;
      currentDuration: number | null;
    };
  }
}

// Initialize global debug object
if (typeof window !== 'undefined') {
  window.__DEBUG_TIMER = {
    originalDuration: null, // null means infinite/no timer
    currentDuration: null   // null means infinite/no timer
  };
}

// This store maintains the timer state across component mounts
interface SimpleTimerState {
  duration: number | null; // in seconds, null means infinity (count up)
  originalDuration: number | null; // Store the originally set duration for reference
  durationInMinutes: number | null; // Store the original input in minutes for accurate tracking
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
  duration: null, // Default to infinite/no timer for uninterrupted meditation
  originalDuration: null, // Store the original setting
  durationInMinutes: null, // Store the minutes directly
  isRunning: false,
  elapsedTime: 0,
  timeRemaining: null, // null means infinite time
  lastStartedAt: null,
  
  setDuration: (duration: number | null) => {
    console.log("useSimpleTimer - Setting duration to:", duration);
    
    // Update global debug object
    if (typeof window !== 'undefined') {
      if (!window.__DEBUG_TIMER) {
        window.__DEBUG_TIMER = {
          originalDuration: duration,
          currentDuration: duration
        };
      } else {
        window.__DEBUG_TIMER.originalDuration = duration;
        window.__DEBUG_TIMER.currentDuration = duration;
      }
    }
    
    // Calculate minutes from seconds
    const minutes = duration !== null ? Math.round(duration / 60) : null;
    console.log(`Setting durationInMinutes to ${minutes} (from ${duration} seconds)`);
    
    // Store the complete duration information
    set({ 
      duration, 
      originalDuration: duration, // CRITICAL: Store original value
      durationInMinutes: minutes, // CRITICAL: Track minutes explicitly
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
    const { duration, durationInMinutes } = get();
    set({ 
      isRunning: false,
      timeRemaining: duration,
      elapsedTime: 0,
      lastStartedAt: null,
      // No need to reset duration-related values as they stay the same on reset
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
      durationInMinutes: null,
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