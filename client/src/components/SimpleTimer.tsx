import React, { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { formatTime } from '../lib/utils';
import { Input } from './ui/input';
import debug from '../lib/debugging';

// Define a unique ID for this component instance to track across re-renders
const TIMER_COMPONENT_ID = `SimpleTimer_${Date.now()}`;

interface SimpleTimerProps {
  initialDuration?: number | null; // in seconds, null means infinity (count up)
  onComplete?: () => void;
  onUpdate?: (remaining: number | null, elapsed: number) => void;
}

export const SimpleTimer: React.FC<SimpleTimerProps> = ({ 
  initialDuration = 60, // Default to 60 seconds (1 minute)
  onComplete,
  onUpdate
}) => {
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  // Use the Zustand store instead of local state
  const {
    duration,
    isRunning,
    elapsedTime,
    timeRemaining,
    setDuration,
    startTimer,
    stopTimer,
    resetTimer,
    tick
  } = useSimpleTimer();
  
  // State for editable timer - simplified to just minutes
  const [isEditing, setIsEditing] = useState(false);
  const [minutesInput, setMinutesInput] = useState('');
  const minutesInputRef = useRef<HTMLInputElement>(null);
  
  // Add a ref to track if the session completion handler has already been called
  // This prevents multiple completion events firing
  const sessionCompletedRef = useRef(false);
  
  // CRITICAL FIX: Add a ref to track if the component has unmounted
  // This will prevent the completion handler from firing after component unmount
  const isUnmountedRef = useRef(false);
  
  // Set initial duration if provided and only when the component first mounts
  useEffect(() => {
    console.log("SimpleTimer useEffect - initialDuration:", initialDuration, "current duration:", duration);
    // Only set the initialDuration when the component first mounts (when duration is 60 - default value)
    // This prevents overriding user selections when navigating between pages
    if (duration === 60 && initialDuration !== duration) {
      console.log("Setting duration to:", initialDuration);
      setDuration(initialDuration);
    }
  }, [initialDuration, setDuration]); // Removed duration dependency
  
  // Handle focus mode on timer start/stop
  useEffect(() => {
    // Only change focus mode state when timer actually starts/stops, not on every render
    if (isRunning) {
      // Enable focus mode only when starting
      enableFocusMode();
    } else if (elapsedTime > 0) {
      // Only disable when stopping after timer has run (not on initial load)
      disableFocusMode();
    }
  }, [isRunning, elapsedTime > 0]); // Only run when running state changes or when we go from 0 to >0 time
  
  // Create a timer start timestamp ref to track real elapsed time
  const timerStartedAtRef = useRef<number | null>(null);
  const completionTimeoutRef = useRef<number | null>(null);
  
  // Create a ref to track the real elapsed time separately from the store
  // This helps detect if the timer is being completed too early
  const realElapsedTimeRef = useRef(0);
  const realElapsedTimeIntervalRef = useRef<number | null>(null);
  
  // Reset tracking on component mount and handle unmount properly
  useEffect(() => {
    // Reset the unmount flag when component mounts
    isUnmountedRef.current = false;
    
    debug.log(TIMER_COMPONENT_ID, 'Component mounted', { props: { initialDuration, hasComplete: !!onComplete } });
    
    // Set up real-time elapsed time tracking (independent of the timer state)
    // This becomes our ground truth for how long the component has been mounted
    realElapsedTimeRef.current = 0; 
    const realTimeInterval = window.setInterval(() => {
      realElapsedTimeRef.current += 1;
      
      // Log real elapsed time every 10 seconds for debugging
      if (realElapsedTimeRef.current % 10 === 0) {
        debug.log(TIMER_COMPONENT_ID, 'Real elapsed time tracking', {
          realSeconds: realElapsedTimeRef.current,
          timerRunning: isRunning,
          timerElapsed: elapsedTime
        });
      }
    }, 1000);
    
    realElapsedTimeIntervalRef.current = realTimeInterval;
    
    // On unmount, clear any pending timeouts to prevent stale completions
    return () => {
      // Set the unmount flag to true
      isUnmountedRef.current = true;
      
      debug.log(TIMER_COMPONENT_ID, 'Component unmounting', { 
        completionTimeoutId: completionTimeoutRef.current,
        timerRunning: isRunning,
        elapsedTime,
        realElapsedTime: realElapsedTimeRef.current
      });
      
      // Clear all timeouts to prevent stale completions
      if (completionTimeoutRef.current) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      
      // Clear the real time tracking interval
      if (realElapsedTimeIntervalRef.current) {
        window.clearInterval(realElapsedTimeIntervalRef.current);
        realElapsedTimeIntervalRef.current = null;
      }
      
      // Reset timer refs
      sessionCompletedRef.current = false;
      timerStartedAtRef.current = null;
    };
  }, []);
  
  // Timer logic - separated from focus mode logic, with enhanced debugging
  useEffect(() => {
    // When timer starts running, record start time
    if (isRunning && !timerStartedAtRef.current) {
      timerStartedAtRef.current = Date.now();
      debug.log(TIMER_COMPONENT_ID, 'Timer started', { 
        startTime: timerStartedAtRef.current,
        duration,
        timeRemaining 
      });
      
      // Set the component ID in global debug tracking
      if (typeof window !== 'undefined') {
        window.__DEBUG_TIMER.mountedComponentId = TIMER_COMPONENT_ID;
        window.__DEBUG_TIMER.timerStartTime = Date.now();
      }
    }
    
    // When timer stops running, clear start time
    if (!isRunning && timerStartedAtRef.current) {
      debug.log(TIMER_COMPONENT_ID, 'Timer stopped', { 
        startTime: timerStartedAtRef.current,
        elapsedMs: Date.now() - timerStartedAtRef.current,
        elapsedTime,
        timeRemaining
      });
      timerStartedAtRef.current = null;
    }
    
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (isRunning) {
      // Create completion sentinel to prevent multiple completion events
      let hasCompleted = false;
      
      debug.log(TIMER_COMPONENT_ID, 'Setting up timer interval', { 
        duration, 
        timeRemaining,
        sessionCompleted: sessionCompletedRef.current 
      });
      
      // Set up a validation interval that runs more frequently
      // This will proactively fix timer issues before they cause problems
      const validationIntervalId = window.setInterval(() => {
        // Check and repair the timer state if needed
        const result = useSimpleTimer.getState().validateTimerState();
        if (!result) {
          debug.log(TIMER_COMPONENT_ID, 'Timer validation detected and fixed issues');
        }
      }, 500); // Check twice per second
      
      // Main timer tick interval 
      // Correcting type issue for intervalId
      const newIntervalId = window.setInterval(() => {
        // Add debugging before tick to catch any issues
        debug.log(TIMER_COMPONENT_ID, 'Tick start', { 
          timeRemaining, 
          elapsedTime, 
          isRunning,
          now: new Date().toISOString()
        });
        
        tick();
        
        // Calculate real elapsed time based on timestamp
        let realElapsedTime = 0;
        if (timerStartedAtRef.current) {
          realElapsedTime = Math.floor((Date.now() - timerStartedAtRef.current) / 1000);
        }
        
        // Add debugging after tick to see if the timer state is correct
        debug.log(TIMER_COMPONENT_ID, 'Tick complete', { 
          timeRemaining: useSimpleTimer.getState().timeRemaining, 
          elapsedTime: useSimpleTimer.getState().elapsedTime, 
          isRunning: useSimpleTimer.getState().isRunning,
          realElapsedTime
        });
        
        // Update the global debug tracking
        if (typeof window !== 'undefined') {
          window.__DEBUG_TIMER.lastTickTime = Date.now();
          window.__DEBUG_TIMER.currentDuration = timeRemaining;
        }
        
        // Log timer state every 10 seconds, or when close to completion
        if (realElapsedTime % 10 === 0 || (timeRemaining && timeRemaining <= 5)) {
          debug.log(TIMER_COMPONENT_ID, 'Timer tick', { 
            timeRemaining, 
            elapsedTime,
            realElapsedTime,
            startedAt: timerStartedAtRef.current,
            sessionCompleted: sessionCompletedRef.current
          });
        }
        
        // Update parent component with current timer status
        if (onUpdate) {
          onUpdate(timeRemaining, elapsedTime);
        }
        
        // Check for completion - only if timer is at 0 and we haven't already completed
        if (timeRemaining === 0 && !hasCompleted) {
          // Set the completion sentinel for this interval
          hasCompleted = true;
          
          // Clear the validation interval since we're completing
          clearInterval(validationIntervalId);
          
          // Always send the final update right before completion
          if (onUpdate) {
            onUpdate(0, elapsedTime);
          }
          
          debug.log(TIMER_COMPONENT_ID, 'Timer reached zero - scheduling completion', {
            realElapsedTime,
            elapsedTime,
            duration,
            sessionCompleted: sessionCompletedRef.current
          });
          
          // IMPORTANT: First give the orb time to show its shrinking animation
          // We'll use a longer delay to ensure the orb has enough time to animate
          if (completionTimeoutRef.current) {
            window.clearTimeout(completionTimeoutRef.current);
          }
          
          completionTimeoutRef.current = window.setTimeout(() => {
            // CRITICAL: Check if component has been unmounted before executing completion logic
            if (isUnmountedRef.current) {
              debug.log(TIMER_COMPONENT_ID, 'Initial completion check aborted - component unmounted');
              return; // Don't proceed if component unmounted
            }
            
            debug.log(TIMER_COMPONENT_ID, 'Executing timer completion after delay');
            
            // Then call the completion handler
            if (onComplete) {
              // Get the latest timer state from the store
              const currentState = useSimpleTimer.getState();
              
              // Check real time elapsed from our timestamp tracking
              let realTotalElapsed = 0;
              if (timerStartedAtRef.current) {
                realTotalElapsed = Math.floor((Date.now() - timerStartedAtRef.current) / 1000);
              }
              
              // CRITICAL NEW CHECK: Use the timestamps from the timer store
              // These are more reliable as they persist even if the component remounts
              if (currentState.globalStartTime) {
                const calculatedElapsed = Math.floor((Date.now() - currentState.globalStartTime) / 1000);
                debug.log(TIMER_COMPONENT_ID, 'Using global time tracking', {
                  globalStartTime: new Date(currentState.globalStartTime).toISOString(),
                  calculatedElapsed,
                  storeElapsedTime: currentState.elapsedTime  
                });
                // This is the most reliable measure of elapsed time
                realTotalElapsed = calculatedElapsed;
              }
              
              // Enhanced validity checks - SIGNIFICANTLY RELAXED FOR STABILITY
              // Check 1: timer is at zero in the store OR very close to zero
              // Check 2: session not already completed (using ref for persistence)
              // REMOVED the elapsedTime > 10 check as it was preventing short sessions
              // REMOVED the realTotalElapsed > 10 check as it was preventing short sessions
              if ((currentState.timeRemaining === 0 || currentState.timeRemaining < 3) && 
                  !sessionCompletedRef.current) {
                
                // Log the relaxed validation
                console.log("TIMER TERMINATION: Using relaxed validation criteria", {
                  timeRemaining: currentState.timeRemaining,
                  elapsedTime: currentState.elapsedTime,
                  realElapsedTime: realTotalElapsed
                });
                
                // Mark session as completed using the ref for persistence
                sessionCompletedRef.current = true;
                
                debug.log(TIMER_COMPONENT_ID, 'All completion checks passed - executing handler', {
                  storeElapsedTime: currentState.elapsedTime,
                  realElapsedTime: realTotalElapsed,
                  sessionCompleted: sessionCompletedRef.current
                });
                
                // Final delay before completion to ensure animation has time to finish
                const finalTimeout = window.setTimeout(() => {
                  // CRITICAL: Check if component has been unmounted before calling completion
                  if (isUnmountedRef.current) {
                    debug.log(TIMER_COMPONENT_ID, 'COMPLETION PREVENTED - Component unmounted', {
                      realElapsedTime: Math.floor((Date.now() - (timerStartedAtRef.current || 0)) / 1000)
                    });
                    return; // Don't proceed if component unmounted
                  }
                  
                  debug.log(TIMER_COMPONENT_ID, 'FINAL COMPLETION TRIGGER', {
                    realElapsedTime: Math.floor((Date.now() - (timerStartedAtRef.current || 0)) / 1000),
                    isUnmounted: isUnmountedRef.current
                  });
                  
                  // Call completion handler from props
                  onComplete();
                }, 500);
                
                // Store the timeout ID so we can clear it if needed
                completionTimeoutRef.current = finalTimeout;
              } else {
                debug.log(TIMER_COMPONENT_ID, 'Skipping completion - validity checks failed', {
                  timeRemaining: currentState.timeRemaining,
                  realElapsedTime: realTotalElapsed,
                  storeElapsedTime: currentState.elapsedTime,
                  alreadyCompleted: sessionCompletedRef.current
                });
              }
            }
            // Note: Focus mode disable happens in the other useEffect
          }, 1500); // 1.5 seconds to allow enough time for orb animation
        }
      }, 1000);
      
      // Store the validation interval ID so we can clean it up
      const validationIntervalRef = { current: validationIntervalId };
      
      // Assign the interval ID to the variable used for cleanup
      intervalId = newIntervalId;
      
      // Clean up both intervals
      return () => {
        if (intervalId) {
          debug.log(TIMER_COMPONENT_ID, 'Clearing timer interval', {
            isRunning,
            sessionCompleted: sessionCompletedRef.current
          });
          clearInterval(intervalId);
        }
        
        if (validationIntervalRef.current) {
          clearInterval(validationIntervalRef.current);
        }
      };
    }
    
    // Cleanup for non-running state
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, timeRemaining, elapsedTime, tick, onComplete, onUpdate, duration]);
  
  // Using formatTime imported from utils
  
  // Toggle edit mode
  const startEditing = () => {
    if (isRunning) return; // Don't allow editing while timer is running
    
    // Initialize the input field with current duration in minutes
    const mins = Math.floor((duration || 0) / 60);
    setMinutesInput(mins.toString());
    
    setIsEditing(true);
    
    // Focus the minutes input after rendering
    setTimeout(() => {
      if (minutesInputRef.current) {
        minutesInputRef.current.focus();
        minutesInputRef.current.select();
      }
    }, 50);
  };
  
  // Handle key press events for the timer input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // If Enter key is pressed, save the time
    if (e.key === 'Enter') {
      handleSaveTime();
    }
    // If Escape key is pressed, cancel editing
    else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };
  
  // Handle saving the edited time
  const handleSaveTime = () => {
    // Convert input to number
    const mins = parseInt(minutesInput) || 0;
    
    // EXTREME DEBUG: Log to console window
    console.log("=====================================================");
    console.log("🛑 CRITICAL DEBUG: CUSTOM TIME ENTRY");
    console.log(`User entered: ${mins} minutes`);
    
    // Set minimum duration to 1 minute (60 seconds)
    const totalSeconds = mins * 60;
    const newDuration = Math.max(totalSeconds, 60); // Minimum 1 minute
    
    console.log(`Total seconds calculated: ${totalSeconds}`);
    console.log(`New duration after min check: ${newDuration}`);
    
    try {
      // CRITICAL FIX: Create a global tracking object if it doesn't exist
      if (typeof window !== 'undefined' && !window.__DEBUG_TIMER) {
        window.__DEBUG_TIMER = {
          originalDuration: null,
          currentDuration: null,
          timerStartTime: null,
          lastTickTime: null,
          mountedComponentId: null
        };
      }
      
      // Update the global debug object
      if (typeof window !== 'undefined') {
        window.__DEBUG_TIMER.originalDuration = newDuration;
        window.__DEBUG_TIMER.currentDuration = newDuration;
        window.__DEBUG_TIMER.mountedComponentId = TIMER_COMPONENT_ID;
      }
    } catch (e) {
      console.error("Error updating debug object:", e);
    }
    
    // CRITICAL FIX: Always store the entered minutes to help with debugging
    if (typeof window !== 'undefined') {
      try {
        console.log(`🔥 Storing custom time value in localStorage: ${mins} minutes`);
        window.localStorage.setItem('lastTimerMinutes', mins.toString());
      } catch (e) {
        console.error("Error saving to localStorage:", e);
      }
    }
    
    // UNIVERSAL FIX FOR ALL CUSTOM TIME VALUES
    // Apply direct Zustand store update for ALL custom time values
    try {
      // First get the store state
      const store = useSimpleTimer.getState();
      
      // Force set all duration properties to exact values
      useSimpleTimer.setState({
        ...store,
        duration: newDuration,
        originalDuration: newDuration,
        timeRemaining: newDuration,
        durationInMinutes: mins // Add this property to track minutes directly
      });
      
      console.log(`🔥 Direct store update for ${mins}-minute timer:`, useSimpleTimer.getState());
    } catch (e) {
      console.error("Error updating store:", e);
    }
    
    // Also call the regular setter
    setDuration(newDuration);
    
    // Send a DOM custom event to notify any other components that need to know about this change
    if (typeof window !== 'undefined') {
      try {
        const event = new CustomEvent('custom-timer-set', { 
          detail: { 
            minutes: mins,
            seconds: newDuration,
            timestamp: Date.now()
          } 
        });
        window.dispatchEvent(event);
        console.log(`🔊 Dispatched custom-timer-set event: ${mins} minutes`);
      } catch (e) {
        console.error("Error dispatching custom event:", e);
      }
    }
    
    setIsEditing(false);
    
    // Give time for the state to update, then verify
    setTimeout(() => {
      // Log to help with debugging 
      const finalState = useSimpleTimer.getState();
      console.log("Timer state after setting:", finalState);
      console.log(`Final duration: ${finalState.duration}s`);
      console.log(`Original duration: ${finalState.originalDuration}s`);
      console.log(`Duration in minutes: ${finalState.durationInMinutes}`);
      console.log("=====================================================");
    }, 100);
  };
  
  // This is now handled by the handleKeyPress function above
  
  return (
    <div className="flex flex-col items-center space-y-4">
      {isEditing ? (
        <div className="flex items-center space-x-2 text-white">
          <Input
            ref={minutesInputRef}
            type="text"
            value={minutesInput}
            onChange={(e) => setMinutesInput(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={handleKeyPress}
            className="w-20 text-center font-mono text-white bg-gray-800 focus:ring-blue-500"
            maxLength={3}
            placeholder="minutes"
          />
          <span className="text-sm">minutes</span>
          <Button size="sm" variant="outline" onClick={handleSaveTime} className="ml-2">
            Set
          </Button>
        </div>
      ) : (
        <div 
          className="text-3xl font-mono text-white cursor-pointer hover:text-blue-400 transition-colors"
          onClick={() => !isRunning && startEditing()}
          title={isRunning ? "Cannot edit while timer is running" : "Click to edit timer"}
        >
          {timeRemaining === null ? 
            formatTime(elapsedTime) : 
            formatTime(timeRemaining)}
        </div>
      )}
      
      {/* Timer status - Include data attribute for tracking completed duration */}
      <div 
        className="text-xs text-gray-300 simple-timer-duration"
        data-duration={elapsedTime}
        data-time-remaining={timeRemaining}
      >
        {timeRemaining === null 
          ? `Elapsed: ${formatTime(elapsedTime)}`
          : `Remaining: ${formatTime(timeRemaining)} / ${formatTime(duration || 0)}`}
      </div>
      
      <div className="flex space-x-2">
        <Button 
          variant={isRunning ? "destructive" : "default"} 
          onClick={() => {
            // Just start/stop the timer, focus mode is managed in the useEffect
            if (isRunning) {
              stopTimer();
              // Ensure we send a final update when user stops the timer manually
              if (onUpdate) {
                onUpdate(timeRemaining, elapsedTime);
              }
            } else {
              startTimer();
            }
          }}
          className="w-20 focus-mode-exempt"
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => {
            resetTimer();
            // Safe to call directly since Reset is only clicked once
            disableFocusMode();
            // Reset the completion flag when the timer is reset
            sessionCompletedRef.current = false;
            console.log("Timer reset - completion flag cleared");
          }}
          disabled={isRunning}
          className="w-20 focus-mode-exempt"
        >
          Reset
        </Button>
      </div>
      
      <div className="grid grid-cols-4 gap-2 mt-4 w-full">
        <Button 
          variant="outline" 
          onClick={() => {
            console.log("Setting duration to 60 seconds (1 minute)");
            setDuration(60);
          }}
          disabled={isRunning}
          className={duration === 60 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          1:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => {
            console.log("Setting duration to 300 seconds (5 minutes)");
            setDuration(300);
          }}
          disabled={isRunning}
          className={duration === 300 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          5:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => {
            console.log("Setting duration to 600 seconds (10 minutes)");
            setDuration(600);
          }}
          disabled={isRunning}
          className={duration === 600 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          10:00
        </Button>

        <Button 
          variant="outline" 
          onClick={() => {
            console.log("Setting duration to 900 seconds (15 minutes)");
            setDuration(900);
          }}
          disabled={isRunning}
          className={duration === 900 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          15:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => {
            console.log("Setting duration to 1200 seconds (20 minutes)");
            setDuration(1200);
          }}
          disabled={isRunning}
          className={duration === 1200 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          20:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => {
            console.log("Setting duration to 1800 seconds (30 minutes)");
            setDuration(1800);
          }}
          disabled={isRunning}
          className={duration === 1800 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          30:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => {
            console.log("Setting duration to 2700 seconds (45 minutes)");
            setDuration(2700);
          }}
          disabled={isRunning}
          className={duration === 2700 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          45:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => {
            console.log("Setting duration to 3600 seconds (60 minutes)");
            setDuration(3600);
          }}
          disabled={isRunning}
          className={duration === 3600 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          60:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => startEditing()}
          disabled={isRunning}
          className="col-span-4 mt-2"
          size="sm"
        >
          Custom Time
        </Button>
      </div>
    </div>
  );
};

export default SimpleTimer;