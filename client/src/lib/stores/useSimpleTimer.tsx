import { create } from 'zustand';

// This store maintains the timer state across component mounts
interface SimpleTimerState {
  duration: number | null; // in seconds, null means infinity (count up)
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
}

export const useSimpleTimer = create<SimpleTimerState>((set, get) => ({
  duration: 60, // Default to 60 seconds (1 minute)
  isRunning: false,
  elapsedTime: 0,
  timeRemaining: 60,
  lastStartedAt: null,
  
  setDuration: (duration: number | null) => {
    console.log("useSimpleTimer - Setting duration to:", duration);
    set({ 
      duration, 
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
      timeRemaining: null,
      elapsedTime: 0
    });
  }
}));

export default useSimpleTimer;