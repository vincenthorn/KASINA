import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { formatTime } from '../lib/utils';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { useKasina } from '../lib/stores/useKasina';

interface WhiteKasinaTimerProps {
  onComplete: () => void;
}

/**
 * A completely standalone timer implementation specifically for white kasina meditation.
 * This bypasses all normal timer logic to ensure 1-minute white kasina sessions work correctly.
 */
const WhiteKasinaTimer: React.FC<WhiteKasinaTimerProps> = ({ onComplete }) => {
  // State variables to avoid Zustand completely
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60); // Always 60 seconds (1 minute)
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Reference for the interval timer
  const intervalRef = useRef<number | null>(null);
  
  // Track completion separately from the timer state
  const completedRef = useRef(false);
  
  // Get focus mode functions
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  
  // Track whether to show or hide the timer based on mouse movement
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const visibilityTimeoutRef = useRef<number | null>(null);
  
  // Handle mouse movement to show/hide timer in focus mode
  useEffect(() => {
    const handleMouseMove = () => {
      // Always show the timer when mouse moves
      setIsTimerVisible(true);
      
      // Clear any existing timeout
      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
      }
      
      // Set a new timeout to hide the timer
      if (isRunning) {
        visibilityTimeoutRef.current = window.setTimeout(() => {
          setIsTimerVisible(false);
        }, 3000); // Hide after 3 seconds of inactivity
      }
    };
    
    // Add event listener for mouse movement
    window.addEventListener('mousemove', handleMouseMove);
    
    // Clean up
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [isRunning]);
  
  // Set up the timer interval with fade-out effect
  useEffect(() => {
    if (isRunning) {
      console.log("🕒 WHITE KASINA TIMER: Starting timer");
      enableFocusMode();
      
      // Clear any existing interval
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      
      // Set up a new interval
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          console.log(`🕒 WHITE KASINA TIMER: ${newTime}s remaining`);
          
          // Special handling for final 10 seconds - fade effect
          if (newTime <= 10 && newTime > 0) {
            // Force timer to be visible during final countdown
            setIsTimerVisible(true);
            
            // Add visual indicator for countdown
            const timerElement = document.querySelector('.white-kasina-final-countdown');
            if (timerElement) {
              timerElement.className = 'white-kasina-final-countdown pulse-animation';
            }
          }
          
          return newTime;
        });
        
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      return () => {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isRunning, enableFocusMode]);
  
  // Handle timer completion
  useEffect(() => {
    if (timeRemaining <= 0 && isRunning) {
      console.log("🎉 WHITE KASINA TIMER: Timer completed!");
      setIsRunning(false);
      disableFocusMode();
      
      // Clear the interval
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Call the completion handler only once
      if (!completedRef.current) {
        completedRef.current = true;
        console.log("🎉 WHITE KASINA TIMER: Calling completion handler");
        onComplete();
      }
    }
  }, [timeRemaining, isRunning, disableFocusMode, onComplete]);
  
  // Handle starting and stopping the timer
  const handleStartStop = () => {
    if (isRunning) {
      // Stop the timer
      console.log("⏹️ WHITE KASINA TIMER: Stopping timer manually");
      setIsRunning(false);
      disableFocusMode();
      
      // Clear the interval
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Call the completion handler if we're past 90% completion
      const completionPercentage = (elapsedTime / 60) * 100;
      console.log(`⏹️ WHITE KASINA TIMER: Completion percentage: ${completionPercentage.toFixed(1)}%`);
      
      if (completionPercentage >= 90 && !completedRef.current) {
        completedRef.current = true;
        console.log("⏹️ WHITE KASINA TIMER: Near completion, calling handler");
        onComplete();
      }
    } else {
      // Reset and start the timer
      console.log("▶️ WHITE KASINA TIMER: Starting timer");
      setTimeRemaining(60);
      setElapsedTime(0);
      completedRef.current = false;
      setIsRunning(true);
    }
  };
  
  // Handle resetting the timer
  const handleReset = () => {
    console.log("🔄 WHITE KASINA TIMER: Resetting timer");
    setTimeRemaining(60);
    setElapsedTime(0);
    completedRef.current = false;
    setIsRunning(false);
    disableFocusMode();
    
    // Clear the interval
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  return (
    <div 
      className={`flex flex-col items-center space-y-4 transition-opacity duration-1000 ${isTimerVisible || !isRunning ? 'opacity-100' : 'opacity-0'}`}
      style={{ pointerEvents: isTimerVisible || !isRunning ? 'auto' : 'none' }}
    >
      <div className={`text-3xl font-mono text-white white-kasina-final-countdown ${timeRemaining <= 10 && timeRemaining > 0 ? 'pulse-animation' : ''}`}>
        {formatTime(timeRemaining)}
      </div>
      
      <div className="text-xs text-gray-300">
        {`Remaining: ${formatTime(timeRemaining)} / ${formatTime(60)}`}
      </div>
      
      <div className="flex space-x-2">
        <Button 
          variant={isRunning ? "destructive" : "default"} 
          onClick={handleStartStop}
          className="w-20 focus-mode-exempt"
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={isRunning}
          className="w-20 focus-mode-exempt"
        >
          Reset
        </Button>
      </div>
      
      <div className="text-xs text-gray-400 mt-2">
        💡 Special 1-minute timer for White Kasina
      </div>
      
      {/* CSS animations are defined globally in CSS */}
    </div>
  );
};

export default WhiteKasinaTimer;