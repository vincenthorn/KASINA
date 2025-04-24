import { create } from "zustand";
import { getLocalStorage, setLocalStorage } from "../utils";

interface TimerState {
  selectedDuration: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  pauseTime: number | null;
  elapsedTime: number;
  
  setSelectedDuration: (duration: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

export const useTimer = create<TimerState>((set, get) => ({
  // Default to 5 minutes (in seconds) or last selected
  selectedDuration: getLocalStorage("selectedDuration") || 5 * 60,
  isRunning: false,
  isPaused: false,
  startTime: null,
  pauseTime: null,
  elapsedTime: 0,
  
  setSelectedDuration: (duration: number) => {
    set({ selectedDuration: duration });
    setLocalStorage("selectedDuration", duration);
  },
  
  startTimer: () => {
    set({
      isRunning: true,
      isPaused: false,
      startTime: Date.now(),
      pauseTime: null,
      elapsedTime: 0
    });
    
    // Start the timer loop
    const timerLoop = () => {
      const { isRunning, isPaused, startTime, pauseTime, elapsedTime } = get();
      
      if (isRunning && !isPaused && startTime) {
        let newElapsedTime = elapsedTime;
        
        if (pauseTime) {
          // If resuming from pause, add the current elapsed time
          newElapsedTime = elapsedTime + Math.floor((Date.now() - pauseTime) / 1000);
        } else {
          // Normal running
          newElapsedTime = Math.floor((Date.now() - startTime) / 1000);
        }
        
        set({ elapsedTime: newElapsedTime });
        requestAnimationFrame(timerLoop);
      }
    };
    
    requestAnimationFrame(timerLoop);
  },
  
  pauseTimer: () => {
    set({
      isPaused: true,
      pauseTime: Date.now()
    });
  },
  
  resumeTimer: () => {
    const { pauseTime, elapsedTime } = get();
    
    if (pauseTime) {
      // Calculate new start time based on elapsed time
      const newStartTime = Date.now() - (elapsedTime * 1000);
      
      set({
        isRunning: true,
        isPaused: false,
        startTime: newStartTime,
        pauseTime: null
      });
      
      // Restart timer loop
      const timerLoop = () => {
        const { isRunning, isPaused, startTime } = get();
        
        if (isRunning && !isPaused && startTime) {
          const newElapsedTime = Math.floor((Date.now() - startTime) / 1000);
          set({ elapsedTime: newElapsedTime });
          requestAnimationFrame(timerLoop);
        }
      };
      
      requestAnimationFrame(timerLoop);
    }
  },
  
  stopTimer: () => {
    set({
      isRunning: false,
      isPaused: false
    });
  },
  
  resetTimer: () => {
    set({
      isRunning: false,
      isPaused: false,
      startTime: null,
      pauseTime: null,
      elapsedTime: 0
    });
  }
}));
