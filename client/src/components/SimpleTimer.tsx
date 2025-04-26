import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { useFocusMode } from '../lib/stores/useFocusMode';

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
  
  // Set initial duration if provided
  useEffect(() => {
    if (initialDuration !== duration) {
      setDuration(initialDuration);
    }
  }, [initialDuration, duration, setDuration]);
  
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
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-3xl font-mono text-white">
        {timeRemaining === null ? 
          formatTime(elapsedTime) : 
          formatTime(timeRemaining)}
      </div>
      
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
          onClick={() => setDuration(60)}
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
          onClick={() => setDuration(600)}
          disabled={isRunning}
          className={duration === 600 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          10:00
        </Button>

        <Button 
          variant="outline" 
          onClick={() => setDuration(900)}
          disabled={isRunning}
          className={duration === 900 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          15:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setDuration(1200)}
          disabled={isRunning}
          className={duration === 1200 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          20:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setDuration(1800)}
          disabled={isRunning}
          className={duration === 1800 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          30:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setDuration(2700)}
          disabled={isRunning}
          className={duration === 2700 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          45:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setDuration(3600)}
          disabled={isRunning}
          className={duration === 3600 ? "border-2 border-blue-500" : ""}
          size="sm"
        >
          60:00
        </Button>
      </div>
    </div>
  );
};

export default SimpleTimer;