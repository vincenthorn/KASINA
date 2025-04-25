import { useEffect, useState, useCallback, useRef } from "react";
import { formatTime } from "./utils";

interface TimerProps {
  duration: number | null; // in seconds, null means infinity (count up)
  running: boolean;
  onComplete?: () => void;
  onUpdate?: (remaining: number | null, elapsed: number) => void;
}

const Timer = ({ 
  duration, 
  running, 
  onComplete, 
  onUpdate 
}: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(duration);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  
  // Calculate percentage for progress circle
  const getPercentage = () => {
    if (duration === null) return 0; // Infinity mode doesn't show progress
    if (timeLeft === null) return 0;
    return ((duration - timeLeft) / duration) * 100;
  };
  
  // Update timer
  const updateTimer = useCallback(() => {
    if (duration === null) {
      // Count up mode (infinity)
      setElapsedTime(prev => prev + 1);
      onUpdate?.(null, elapsedTime + 1);
    } else {
      // Count down mode
      setTimeLeft(prev => {
        if (prev === null) return null;
        const newTimeLeft = Math.max(0, prev - 1);
        const newElapsed = duration - newTimeLeft;
        setElapsedTime(newElapsed);
        onUpdate?.(newTimeLeft, newElapsed);
        
        if (newTimeLeft === 0) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          console.log("Timer reached zero! Triggering onComplete");
          onComplete?.();
        }
        
        return newTimeLeft;
      });
    }
  }, [duration, elapsedTime, onComplete, onUpdate]);
  
  // Start/stop timer based on running state
  useEffect(() => {
    if (running) {
      timerRef.current = window.setInterval(updateTimer, 1000);
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running, updateTimer]);
  
  // Reset timer when duration changes
  useEffect(() => {
    setTimeLeft(duration);
    setElapsedTime(0);
  }, [duration]);
  
  // Calculate percentage for progress circle
  const percentage = getPercentage();
  const strokeDashoffset = 283 - (283 * percentage) / 100;
  
  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative h-32 w-32">
        {/* SVG Progress Circle */}
        <svg className="absolute top-0 left-0" width="128" height="128" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="text-gray-700"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
          />
          {/* Progress circle */}
          {duration !== null && (
            <circle
              className="text-blue-500"
              strokeWidth="8"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
              transform="rotate(-90 50 50)"
            />
          )}
        </svg>
        
        {/* Timer Display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {duration === null 
                ? formatTime(elapsedTime)  // Count up
                : formatTime(timeLeft || 0) // Count down
              }
            </div>
            <div className="text-xs text-gray-400">
              {duration === null ? "Elapsed" : "Remaining"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
