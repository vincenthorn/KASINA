import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { Infinity as InfinityIcon } from 'lucide-react';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

interface SimpleTimerProps {
  initialDuration?: number | null; // in seconds, null means infinity (count up)
  onComplete?: () => void;
}

export const SimpleTimer: React.FC<SimpleTimerProps> = ({ 
  initialDuration = 60, // Default to 60 seconds (1 minute)
  onComplete
}) => {
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
    tick,
    setInfiniteMode
  } = useSimpleTimer();
  
  // Set initial duration if provided
  useEffect(() => {
    if (initialDuration !== duration) {
      setDuration(initialDuration);
    }
  }, [initialDuration, duration, setDuration]);
  
  // Timer logic
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (isRunning) {
      intervalId = window.setInterval(() => {
        tick();
        
        // Check for completion
        if (timeRemaining === 0) {
          if (onComplete) onComplete();
        }
      }, 1000);
    }
    
    // Cleanup
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isRunning, timeRemaining, tick, onComplete]);
  
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
      >
        {timeRemaining === null 
          ? `Elapsed: ${formatTime(elapsedTime)}`
          : `Remaining: ${formatTime(timeRemaining)} / ${formatTime(duration || 0)}`}
      </div>
      
      <div className="flex space-x-2">
        <Button 
          variant={isRunning ? "destructive" : "default"} 
          onClick={isRunning ? stopTimer : startTimer}
          className="w-20"
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={resetTimer}
          disabled={isRunning}
          className="w-20"
        >
          Reset
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-4 w-full">
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
          onClick={() => setDuration(300)}
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
          onClick={setInfiniteMode}
          disabled={isRunning}
          className={duration === null ? "border-2 border-purple-500" : ""}
          size="sm"
        >
          <InfinityIcon className="h-4 w-4 mr-1" />
          ∞
        </Button>
      </div>
    </div>
  );
};

export default SimpleTimer;