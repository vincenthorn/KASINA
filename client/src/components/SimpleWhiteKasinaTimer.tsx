import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { useFocusMode } from '@/lib/stores/useFocusMode';

interface SimpleWhiteKasinaTimerProps {
  onComplete: () => void;
  onFadeOutChange?: (intensity: number) => void;
}

const SimpleWhiteKasinaTimer: React.FC<SimpleWhiteKasinaTimerProps> = ({
  onComplete,
  onFadeOutChange
}) => {
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60); // Always 60 seconds
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOutIntensity, setFadeOutIntensity] = useState(0);
  
  // References for timers
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);
  
  // Get focus mode functions
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  const isFocusMode = useFocusMode(state => state.isFocusModeActive);
  
  // Track if we're in the final countdown for timer visibility
  const isInFinalCountdown = timeRemaining <= 10 && timeRemaining > 0;
  
  // Handle mouse movement to show/hide timer
  useEffect(() => {
    // Don't do anything if timer is not running
    if (!isRunning) return;
    
    console.log("Setting up mouse/keyboard handlers for white kasina timer");
    
    // Force timer to be visible initially
    setIsVisible(true);
    
    // Schedule initial auto-hide if not in final countdown
    if (!isInFinalCountdown) {
      hideTimeoutRef.current = setTimeout(() => {
        if (isRunning && !isInFinalCountdown) {
          console.log("Initial auto-hide after 2s");
          setIsVisible(false);
        }
      }, 2000);
    }
    
    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      // Only respond to actual movement
      if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
        console.log("Mouse moved, showing timer");
        
        // Show timer
        setIsVisible(true);
        
        // Clear any existing timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
        
        // Don't auto-hide during final 10 seconds
        if (isInFinalCountdown) return;
        
        // Set timeout to hide timer after inactivity
        hideTimeoutRef.current = setTimeout(() => {
          console.log("Hiding timer after 2s of inactivity");
          setIsVisible(false);
        }, 2000);
      }
    };
    
    // Handle keyboard interaction
    const handleKeyPress = () => {
      console.log("Key pressed, showing timer");
      
      // Show timer
      setIsVisible(true);
      
      // Clear any existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      
      // Don't auto-hide during final 10 seconds
      if (isInFinalCountdown) return;
      
      // Set timeout to hide timer after inactivity
      hideTimeoutRef.current = setTimeout(() => {
        console.log("Hiding timer after 2s of inactivity");
        setIsVisible(false);
      }, 2000);
    };
    
    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyPress);
    
    // Clean up event listeners and timeouts
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyPress);
      
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [isRunning, isInFinalCountdown]);
  
  // Enable focus mode when timer starts
  useEffect(() => {
    if (isRunning) {
      console.log("White Kasina timer starting, enabling focus mode");
      enableFocusMode();
    } else if (!isRunning && timeRemaining <= 0) {
      console.log("White Kasina timer stopped, disabling focus mode");
      disableFocusMode();
    }
  }, [isRunning, timeRemaining, enableFocusMode, disableFocusMode]);
  
  // Set up the timer countdown (separate from focus mode effect)
  useEffect(() => {
    if (isRunning) {
      console.log("White Kasina timer interval starting");
      
      // Create interval to update time
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          console.log(`Time remaining: ${newTime}s`);
          
          // Apply fadeout effect in final 10 seconds
          if (newTime <= 10 && newTime > 0) {
            const intensity = (10 - newTime) / 10;
            setFadeOutIntensity(intensity);
            
            if (onFadeOutChange) {
              onFadeOutChange(intensity);
            }
            
            // Force timer to be visible during final countdown
            setIsVisible(true);
          }
          
          return newTime;
        });
        
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Reset fadeout when not running
      setFadeOutIntensity(0);
      if (onFadeOutChange) {
        onFadeOutChange(0);
      }
    }
  }, [isRunning, onFadeOutChange]);
  
  // Handle timer completion
  useEffect(() => {
    if (timeRemaining <= 0 && isRunning) {
      console.log("White Kasina timer completed");
      setIsRunning(false);
      disableFocusMode();
      
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Call completion handler only once
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }
  }, [timeRemaining, isRunning, disableFocusMode, onComplete]);
  
  // Handle start/stop with useCallback to prevent recreating on each render
  const handleStartStop = useCallback(() => {
    if (isRunning) {
      console.log("Stopping white kasina timer via button");
      // Stop timer
      setIsRunning(false);
      disableFocusMode();
      
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Call completion handler if past 90% completion
      const completionPercentage = (elapsedTime / 60) * 100;
      if (completionPercentage >= 90 && !completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    } else {
      console.log("Starting white kasina timer via button");
      // Start timer
      setTimeRemaining(60);
      setElapsedTime(0);
      completedRef.current = false;
      setIsRunning(true);
    }
  }, [isRunning, elapsedTime, disableFocusMode, onComplete]);
  
  // Handle reset with useCallback
  const handleReset = useCallback(() => {
    console.log("Resetting white kasina timer");
    setTimeRemaining(60);
    setElapsedTime(0);
    completedRef.current = false;
    setIsRunning(false);
    disableFocusMode();
    
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [disableFocusMode]);
  
  // Log state for debugging
  console.log("SimpleWhiteKasinaTimer state:", {
    isRunning,
    timeRemaining,
    isVisible,
    isFocusMode,
    isInFinalCountdown,
    fadeOutIntensity
  });
  
  // Focus mode version of the timer
  if (isFocusMode) {
    return (
      <>
        {/* Fixed timer at top of screen */}
        <div
          className={`fixed top-0 left-0 w-full flex justify-center z-[9999] transition-opacity duration-300 ${
            isVisible || (timeRemaining <= 10 && timeRemaining > 0)
              ? 'opacity-100'
              : 'opacity-0'
          }`}
        >
          <div className="w-full py-4 bg-gradient-to-b from-black/60 to-transparent flex justify-center">
            <div 
              className={`px-6 py-2 rounded-full flex items-center gap-3 shadow-lg shadow-black/30 ${
                timeRemaining <= 10 && timeRemaining > 0
                  ? 'bg-white/20 border-white border-2 animate-pulse'
                  : 'bg-black/80 border border-gray-600'
              }`}
            >
              <Timer className="h-5 w-5 text-white" />
              <div className="text-3xl font-mono text-white font-bold">
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls at bottom of screen */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className="flex space-x-2 mb-2">
            <Button
              variant={isRunning ? "destructive" : "default"}
              onClick={handleStartStop}
              className="w-24 focus-mode-exempt"
              size="sm"
            >
              {isRunning ? 'Stop Timer' : 'Start Timer'}
            </Button>
            
            {!isRunning && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-20 focus-mode-exempt"
                size="sm"
              >
                Reset
              </Button>
            )}
          </div>
          
          <div className="text-xs text-gray-400 bg-black/30 px-3 py-1 rounded-full">
            💡 Special 1-minute White Kasina timer
          </div>
        </div>
      </>
    );
  }
  
  // Regular timer display
  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        className={`text-3xl font-mono text-white ${
          timeRemaining <= 10 && timeRemaining > 0 ? 'animate-pulse' : ''
        }`}
      >
        {formatTime(timeRemaining)}
      </div>
      
      <div className={`text-xs ${timeRemaining <= 10 && timeRemaining > 0 ? 'text-white' : 'text-gray-300'}`}>
        {`Remaining: ${formatTime(timeRemaining)} / ${formatTime(60)}`}
      </div>
      
      <div className="flex space-x-2 mt-2">
        <Button
          variant={isRunning ? "destructive" : "default"}
          onClick={handleStartStop}
          className="w-24"
          size="sm"
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isRunning}
          className="w-20"
          size="sm"
        >
          Reset
        </Button>
      </div>
      
      <div className={`text-xs ${fadeOutIntensity > 0 ? 'text-white' : 'text-gray-400'} mt-2`}>
        {fadeOutIntensity > 0
          ? `💡 White kasina fadeout in progress (${Math.round(fadeOutIntensity * 100)}%)`
          : '💡 Special 1-minute timer for White Kasina'
        }
      </div>
    </div>
  );
};

export default SimpleWhiteKasinaTimer;