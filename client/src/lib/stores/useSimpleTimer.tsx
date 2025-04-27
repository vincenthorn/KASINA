import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Add global tracking for debugging
declare global {
  interface Window {
    __DEBUG_TIMER: {
      originalDuration: number | null;
      currentDuration: number | null;
      timerStartTime: number | null;
      lastTickTime: number | null;
      mountedComponentId: string | null;
    };
  }
}

// Initialize global debug object with expanded tracking
if (typeof window !== 'undefined') {
  window.__DEBUG_TIMER = {
    originalDuration: null,
    currentDuration: null,
    timerStartTime: null,
    lastTickTime: null,
    mountedComponentId: null
  };
}

// This store maintains the timer state across component mounts with persistence
interface SimpleTimerState {
  duration: number | null; // in seconds, null means infinity (count up)
  originalDuration: number | null; // Store the originally set duration for reference
  durationInMinutes: number | null; // Store the original input in minutes for accurate tracking
  isRunning: boolean;
  elapsedTime: number;
  timeRemaining: number | null;
  lastStartedAt: number | null; // Timestamp when the timer was started
  globalStartTime: number | null; // Absolute timestamp when the timer started (for recovery)
  expectedEndTime: number | null; // When the timer should finish (for validation)
  lastTickTime: number | null; // When the last tick occurred (for validation)
  
  // Actions
  setDuration: (duration: number | null) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  tick: () => void; // Update the timer state on each tick
  setInfiniteMode: () => void;
  getOriginalDuration: () => number | null; // New method to get the original duration
  validateTimerState: () => boolean; // New method to validate timer state and recover if needed
}

// Using persist middleware to maintain timer state across page refreshes
export const useSimpleTimer = create<SimpleTimerState>()(
  persist(
    (set, get) => ({
      duration: 60, // Default to 60 seconds (1 minute)
      originalDuration: 60, // Store the original setting
      durationInMinutes: 1, // Store the minutes directly
      isRunning: false,
      elapsedTime: 0,
      timeRemaining: 60,
      lastStartedAt: null,
      globalStartTime: null,
      expectedEndTime: null,
      lastTickTime: null,
      
      setDuration: (duration: number | null) => {
        console.log("useSimpleTimer - Setting duration to:", duration);
        
        // Update global debug object
        if (typeof window !== 'undefined') {
          window.__DEBUG_TIMER.originalDuration = duration;
          window.__DEBUG_TIMER.currentDuration = duration;
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
          elapsedTime: 0,
          globalStartTime: null,
          expectedEndTime: null,
          lastTickTime: null
        });
      },
      
      startTimer: () => {
        const { timeRemaining, duration } = get();
        const now = Date.now();
        
        // Reset the timer if it's completed
        if (timeRemaining === 0) {
          set({
            timeRemaining: duration,
            elapsedTime: 0
          });
        }
        
        // Calculate when the timer should end
        const expectedEnd = duration !== null ? now + (duration * 1000) : null;
        
        // Update global debug tracking
        if (typeof window !== 'undefined') {
          window.__DEBUG_TIMER.timerStartTime = now;
        }
        
        set({ 
          isRunning: true,
          lastStartedAt: now,
          globalStartTime: now,
          expectedEndTime: expectedEnd,
          lastTickTime: now
        });
        
        console.log(`Timer started at ${new Date(now).toISOString()}, will end at ${expectedEnd ? new Date(expectedEnd).toISOString() : 'never'}`);
      },
      
      stopTimer: () => {
        // Update global debug tracking
        if (typeof window !== 'undefined') {
          window.__DEBUG_TIMER.timerStartTime = null;
        }
        
        set({ 
          isRunning: false,
          lastStartedAt: null,
          // Keep globalStartTime for reference
          // Keep expectedEndTime for reference
        });
      },
      
      resetTimer: () => {
        const { duration } = get();
        
        // Update global debug tracking
        if (typeof window !== 'undefined') {
          window.__DEBUG_TIMER.timerStartTime = null;
          window.__DEBUG_TIMER.lastTickTime = null;
        }
        
        set({ 
          isRunning: false,
          timeRemaining: duration,
          elapsedTime: 0,
          lastStartedAt: null,
          globalStartTime: null,
          expectedEndTime: null,
          lastTickTime: null
        });
      },
      
      tick: () => {
        const { isRunning, timeRemaining, elapsedTime, globalStartTime, expectedEndTime } = get();
        const now = Date.now();
        
        // CRITICAL FIX: Add timestamp to the last tick for validation
        set({ lastTickTime: now });
        
        // Update global debug object
        if (typeof window !== 'undefined') {
          window.__DEBUG_TIMER.lastTickTime = now;
          window.__DEBUG_TIMER.currentDuration = timeRemaining;
        }
        
        if (!isRunning) return;
        
        // CRITICAL FIX: Validate time against expected end time if available
        if (expectedEndTime !== null && now >= expectedEndTime) {
          console.log(`Timer reached expected end time (${new Date(expectedEndTime).toISOString()})`);
          set({
            isRunning: false,
            timeRemaining: 0,
            elapsedTime: get().originalDuration || 0, // Set elapsed to the full duration
            lastStartedAt: null
          });
          return;
        }
        
        // Calculate elapsed time based on globalStartTime if available
        if (globalStartTime !== null) {
          const calculatedElapsed = Math.floor((now - globalStartTime) / 1000);
          
          // Only update if the calculated time makes sense (prevent negative values)
          if (calculatedElapsed >= 0 && Math.abs(calculatedElapsed - elapsedTime) > 2) {
            console.log(`Timer sync correction: ${elapsedTime}s → ${calculatedElapsed}s`);
            set({ elapsedTime: calculatedElapsed });
          } else {
            // Normal tick increment
            set({ elapsedTime: elapsedTime + 1 });
          }
        } else {
          // Fallback to normal tick increment if we don't have a global start time
          set({ elapsedTime: elapsedTime + 1 });
        }
        
        // Update remaining time (for countdown only)
        if (timeRemaining !== null) {
          // ROBUST METHOD: Calculate remaining based on expected end time
          if (expectedEndTime !== null) {
            const calculatedRemaining = Math.max(0, Math.ceil((expectedEndTime - now) / 1000));
            
            // Only sync if there's a significant difference (>2s)
            if (Math.abs(calculatedRemaining - timeRemaining) > 2) {
              console.log(`Remaining time sync correction: ${timeRemaining}s → ${calculatedRemaining}s`);
              set({ timeRemaining: calculatedRemaining });
            } else {
              // Normal decrement
              set({ timeRemaining: Math.max(0, timeRemaining - 1) });
            }
          } else {
            // Fallback to normal decrement
            const newTime = Math.max(0, timeRemaining - 1);
            set({ timeRemaining: newTime });
          }
          
          // Check if timer has completed
          const currentRemaining = get().timeRemaining;
          if (currentRemaining !== null && currentRemaining <= 0) {
            console.log("Timer completed (reached zero)");
            set({
              isRunning: false,
              timeRemaining: 0,
              lastStartedAt: null
            });
          }
        }
      },
      
      setInfiniteMode: () => {
        set({
          duration: null,
          originalDuration: null,
          durationInMinutes: null,
          timeRemaining: null,
          elapsedTime: 0,
          globalStartTime: null,
          expectedEndTime: null
        });
      },
      
      // Implement the getOriginalDuration method
      getOriginalDuration: () => {
        // Get the original duration that was set, not the current remaining time
        const { originalDuration, duration } = get();
        
        // Return the original duration, falling back to current duration if needed
        return originalDuration !== null ? originalDuration : duration;
      },
      
      // CRITICAL NEW METHOD: Validate the timer state and recover if needed
      validateTimerState: () => {
        const { 
          isRunning, 
          timeRemaining, 
          globalStartTime, 
          expectedEndTime,
          duration,
          lastTickTime
        } = get();
        
        const now = Date.now();
        
        // If timer isn't running, nothing to validate
        if (!isRunning) return true;
        
        // Check if the timer has been running but we haven't seen a tick in a while (>5s)
        if (lastTickTime !== null && (now - lastTickTime) > 5000) {
          console.warn(`Timer validation: No ticks for ${Math.floor((now - lastTickTime)/1000)}s, potential stale timer`);
          
          // If we have an expected end time, check if we should have already finished
          if (expectedEndTime !== null && now >= expectedEndTime) {
            console.log("Timer validation: Timer should have completed. Forcing completion.");
            set({
              isRunning: false,
              timeRemaining: 0, 
              elapsedTime: duration || 0,
              lastStartedAt: null
            });
            return false;
          }
          
          // Otherwise check if the elapsed time makes sense (should be positive)
          if (globalStartTime !== null) {
            const calculatedElapsed = Math.floor((now - globalStartTime) / 1000);
            
            // If we've been running for a significant time and timeRemaining is off by >5s
            if (calculatedElapsed > 10 && timeRemaining !== null) {
              const calculatedRemaining = 
                expectedEndTime ? Math.max(0, Math.ceil((expectedEndTime - now) / 1000)) : 
                (duration ? Math.max(0, duration - calculatedElapsed) : null);
              
              if (calculatedRemaining !== null && Math.abs(calculatedRemaining - timeRemaining) > 5) {
                console.warn(`Timer validation: Correcting significant time drift - remaining ${timeRemaining}s → ${calculatedRemaining}s`);
                set({ 
                  timeRemaining: calculatedRemaining,
                  elapsedTime: calculatedElapsed
                });
                return false;
              }
            }
          }
        }
        
        return true;
      }
    }),
    {
      name: 'kasina-timer-storage',
      // Only persist core timer values, not transient state
      partialize: (state) => ({
        duration: state.duration,
        originalDuration: state.originalDuration,
        durationInMinutes: state.durationInMinutes,
        // Don't persist runtime state
      })
    }
  )
);

export default useSimpleTimer;