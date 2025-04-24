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

export const useTimer = create<TimerState>()((set, get) => ({
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
    const startNow = Date.now();
    
    set({
      isRunning: true,
      isPaused: false,
      startTime: startNow,
      pauseTime: null,
      elapsedTime: 0
    });
    
    // Start the timer loop with a separate function to prevent closure issues
    function createTimerLoop() {
      let lastFrameTime = performance.now();
      let animationFrameId: number;
      
      function loop(currentTime: number) {
        const { isRunning, isPaused } = get();
        
        // Only continue if timer is still running and not paused
        if (!isRunning || isPaused) return;
        
        // Calculate time since last frame (with a reasonable cap to handle tab switching)
        const deltaTime = Math.min(currentTime - lastFrameTime, 1000) / 1000;
        lastFrameTime = currentTime;
        
        // Get the current state
        const state = get();
        
        // Update elapsed time based on actual time difference
        let newElapsedTime = state.elapsedTime;
        
        if (state.startTime) {
          newElapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
          set({ elapsedTime: newElapsedTime });
        }
        
        // Continue the loop
        animationFrameId = requestAnimationFrame(loop);
      }
      
      // Start the loop
      animationFrameId = requestAnimationFrame(loop);
      
      // Return a cleanup function
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
    
    // Initialize the timer loop
    createTimerLoop();
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
      
      // Start the timer loop with a separate function to prevent closure issues
      function createTimerLoop() {
        let lastFrameTime = performance.now();
        let animationFrameId: number;
        
        function loop(currentTime: number) {
          const { isRunning, isPaused } = get();
          
          // Only continue if timer is still running and not paused
          if (!isRunning || isPaused) return;
          
          // Calculate time since last frame (with a reasonable cap to handle tab switching)
          const deltaTime = Math.min(currentTime - lastFrameTime, 1000) / 1000;
          lastFrameTime = currentTime;
          
          // Get the current state
          const state = get();
          
          // Update elapsed time based on actual time difference
          if (state.startTime) {
            const newElapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
            set({ elapsedTime: newElapsedTime });
          }
          
          // Continue the loop
          animationFrameId = requestAnimationFrame(loop);
        }
        
        // Start the loop
        animationFrameId = requestAnimationFrame(loop);
        
        // Return a cleanup function
        return () => {
          cancelAnimationFrame(animationFrameId);
        };
      }
      
      // Initialize the timer loop
      createTimerLoop();
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
