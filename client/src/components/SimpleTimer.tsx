import React, { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { formatTime } from '../lib/utils';
import { Input } from './ui/input';

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
  
  // Timer logic - separated from focus mode logic
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (isRunning) {
      intervalId = window.setInterval(() => {
        tick();
        
        // Update parent component with current timer status
        if (onUpdate) {
          onUpdate(timeRemaining, elapsedTime);
        }
        
        // Check for completion
        if (timeRemaining === 0) {
          // Always send the final update right before completion
          if (onUpdate) {
            onUpdate(0, elapsedTime);
          }
          
          // Then call the completion handler
          if (onComplete) onComplete();
          // Note: Focus mode disable happens in the other useEffect
        }
      }, 1000);
    }
    
    // Cleanup
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isRunning, timeRemaining, elapsedTime, tick, onComplete, onUpdate]);
  
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
      if (typeof window !== 'undefined') {
        if (!window.__DEBUG_TIMER) {
          window.__DEBUG_TIMER = {
            originalDuration: null,
            currentDuration: null
          };
        }
        
        // Now it's safe to update the properties
        if (window.__DEBUG_TIMER) {
          window.__DEBUG_TIMER.originalDuration = newDuration;
          window.__DEBUG_TIMER.currentDuration = newDuration;
        }
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
              
              // ⚠️ CRITICAL: Force save kasinaType when manual stop happens ⚠️
              if (elapsedTime >= 31) {
                console.log(`⚠️ MANUAL TIMER STOP DETECTED - Elapsed time: ${elapsedTime}s`);
                
                try {
                  // Retrieve special KASINA data from window
                  const kasina = window.__KASINA_DEBUG || {};
                  const kasinaType = kasina.selectedKasina || 'white';
                  console.log(`🧪 Retrieved kasinaType from window.__KASINA_DEBUG: ${kasinaType}`);
                  
                  // Apply 31-second rule
                  let adjustedTime = elapsedTime;
                  if (elapsedTime < 60) {
                    adjustedTime = 60; // Round up to 1 minute
                  }
                  
                  // Get minutes value
                  const minutesValue = Math.ceil(adjustedTime / 60);
                  const minuteText = minutesValue === 1 ? "minute" : "minutes";
                  
                  // Normalize kasina type
                  const normalizedType = kasinaType.toLowerCase();
                  const displayName = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
                  
                  // Create test-like payload that we know works
                  const testPayload = {
                    kasinaType: normalizedType,
                    kasinaName: `${displayName} (${minutesValue}-${minuteText})`,
                    duration: adjustedTime,
                    durationInMinutes: minutesValue,
                    timestamp: new Date().toISOString(),
                    _directTest: true,
                    _manualStop: true
                  };
                  
                  console.log(`🧪 EMERGENCY MANUAL STOP SAVE:`, testPayload);
                  
                  // Use the test button approach that we know works
                  fetch('/api/sessions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(testPayload)
                  })
                  .then(response => {
                    if (response.ok) {
                      console.log(`✓ EMERGENCY MANUAL STOP SAVE SUCCESSFUL - ${displayName} kasina (${minutesValue}m)`);
                      // Skip toast to avoid duplicate notifications
                    } else {
                      console.error(`Failed emergency save: ${response.status}`);
                    }
                  })
                  .catch(error => {
                    console.error(`Error in emergency save:`, error);
                  });
                } catch (e) {
                  console.error(`Failed to execute emergency save:`, e);
                }
              }
            } else {
              // ⚠️ CRITICAL: Store current kasina type in window when starting ⚠️
              try {
                // Create a global tracking object on window for emergency recovery
                if (typeof window !== 'undefined') {
                  // Get current kasina type from document if possible
                  const selectedKasinaElement = document.querySelector('[data-selected-kasina]');
                  const selectedKasina = selectedKasinaElement?.getAttribute('data-selected-kasina') || 'white';
                  
                  window.__KASINA_DEBUG = {
                    selectedKasina,
                    startTime: Date.now(),
                    duration
                  };
                  
                  console.log(`🔐 Stored timer debug info in window.__KASINA_DEBUG:`, window.__KASINA_DEBUG);
                }
              } catch (e) {
                console.error("Error storing debug info:", e);
              }
              
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