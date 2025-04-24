import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface SimpleTimerProps {
  initialDuration?: number; // in seconds
}

export const SimpleTimer: React.FC<SimpleTimerProps> = ({ 
  initialDuration = 60 // Default to 60 seconds (1 minute)
}) => {
  const [duration, setDuration] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  
  // Reset when duration changes
  useEffect(() => {
    setTimeRemaining(duration);
  }, [duration]);
  
  // Timer logic
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (isRunning) {
      intervalId = window.setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Stop at zero
          if (newTime <= 0) {
            setIsRunning(false);
            window.clearInterval(intervalId!);
            alert('Timer completed!');
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    // Cleanup
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isRunning]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startTimer = () => {
    console.log('Starting simple timer...');
    if (timeRemaining <= 0) {
      setTimeRemaining(duration);
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
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-3xl font-mono">
        {formatTime(timeRemaining)}
      </div>
      
      <div className="flex space-x-2">
        <Button 
          variant={isRunning ? "destructive" : "default"} 
          onClick={isRunning ? stopTimer : startTimer}
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={resetTimer}
          disabled={isRunning}
        >
          Reset
        </Button>
      </div>
      
      <div className="flex space-x-2 mt-4">
        <Button 
          variant="outline" 
          onClick={() => setDuration(60)}
          disabled={isRunning}
          className={duration === 60 ? "border-2 border-blue-500" : ""}
        >
          1:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setDuration(300)}
          disabled={isRunning}
          className={duration === 300 ? "border-2 border-blue-500" : ""}
        >
          5:00
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setDuration(600)}
          disabled={isRunning}
          className={duration === 600 ? "border-2 border-blue-500" : ""}
        >
          10:00
        </Button>
      </div>
    </div>
  );
};

export default SimpleTimer;