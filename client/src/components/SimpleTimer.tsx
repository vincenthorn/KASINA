import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Infinity as InfinityIcon, Clock } from 'lucide-react';

interface SimpleTimerProps {
  initialDuration?: number | null; // in seconds, null means infinity (count up)
  onComplete?: () => void;
}

export const SimpleTimer: React.FC<SimpleTimerProps> = ({ 
  initialDuration = 60, // Default to 60 seconds (1 minute)
  onComplete
}) => {
  const [duration, setDuration] = useState<number | null>(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(duration);
  
  // Reset when duration changes
  useEffect(() => {
    setTimeRemaining(duration);
    setElapsedTime(0);
  }, [duration]);
  
  // Timer logic
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (isRunning) {
      intervalId = window.setInterval(() => {
        // Update elapsed time (for both countdown and count-up)
        setElapsedTime(prev => prev + 1);
        
        // Update remaining time (for countdown only)
        if (timeRemaining !== null) {
          setTimeRemaining(prev => {
            if (prev === null) return null;
            
            const newTime = prev - 1;
            
            // Stop at zero
            if (newTime <= 0) {
              setIsRunning(false);
              window.clearInterval(intervalId!);
              if (onComplete) onComplete();
              return 0;
            }
            
            return newTime;
          });
        }
      }, 1000);
    }
    
    // Cleanup
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isRunning, timeRemaining, onComplete]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startTimer = () => {
    console.log('Starting simple timer...');
    // Reset the timer if it's completed
    if (timeRemaining === 0) {
      setTimeRemaining(duration);
      setElapsedTime(0);
    }
    setIsRunning(true);
  };
  
  const stopTimer = () => {
    console.log('Stopping simple timer...');
    setIsRunning(false);
  };
  
  const resetTimer = () => {
    console.log('Resetting simple timer...');
    setIsRunning(false);
    setTimeRemaining(duration);
    setElapsedTime(0);
  };
  
  // Set duration to infinity (null)
  const setInfiniteMode = () => {
    setDuration(null);
    setTimeRemaining(null);
    setElapsedTime(0);
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