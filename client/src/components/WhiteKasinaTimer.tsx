import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { formatTime } from '../lib/utils';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { useKasina } from '../lib/stores/useKasina';
import { Timer } from 'lucide-react';

interface WhiteKasinaTimerProps {
  onComplete: () => void;
  onFadeOutChange?: (intensity: number) => void;
}

/**
 * A completely standalone timer implementation specifically for white kasina meditation.
 * This bypasses all normal timer logic to ensure 1-minute white kasina sessions work correctly.
 */
const WhiteKasinaTimer: React.FC<WhiteKasinaTimerProps> = ({ onComplete, onFadeOutChange }) => {
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
    const handleMouseMove = (e: MouseEvent) => {
      // Always show the timer when mouse moves
      setIsTimerVisible(true);
      
      // Clear any existing timeout
      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
      }
      
      // Track significant mouse movement for better UX
      const lastPos = { x: e.clientX, y: e.clientY };
      
      // Set a new timeout to hide the timer
      if (isRunning) {
        visibilityTimeoutRef.current = window.setTimeout(() => {
          // Special case: Keep timer visible if we're in final 10 seconds
          if (timeRemaining <= 10) {
            console.log("Keeping timer visible during final countdown (10s)");
            setIsTimerVisible(true);
          } else {
            setIsTimerVisible(false);
          }
        }, 3000); // Hide after 3 seconds of inactivity
      }
    };
    
    // Handle any keypress
    const handleKeyPress = () => {
      // Show timer on any key press
      setIsTimerVisible(true);
      
      // Clear existing timeout
      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
      }
      
      // Set a new timeout to hide the timer
      if (isRunning && timeRemaining > 10) {
        visibilityTimeoutRef.current = window.setTimeout(() => {
          setIsTimerVisible(false);
        }, 3000);
      }
    };
    
    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyPress);
    
    // Clean up
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyPress);
      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [isRunning, timeRemaining]);
  
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
  
  // Check if focus mode is active
  const isFocusMode = useFocusMode(state => state.isFocusModeActive);
  
  // Track fadeout effect for the orb at the end of the session
  const [fadeOutIntensity, setFadeOutIntensity] = useState(0); // 0 = no fade, 1 = completely faded
  
  // Setup fadeout effect
  useEffect(() => {
    // Only apply fadeout during last 10 seconds
    if (isRunning && timeRemaining <= 10 && timeRemaining > 0) {
      // Calculate fade intensity: 0 at 10 seconds, 1 at 0 seconds
      const intensity = (10 - timeRemaining) / 10;
      setFadeOutIntensity(intensity);
      
      console.log(`🌟 WHITE KASINA FADEOUT: ${Math.round(intensity * 100)}% intensity`);
      
      // Call the parent component's callback to update the orb fadeout
      if (onFadeOutChange) {
        onFadeOutChange(intensity);
      }
      
      // Trigger class updates for the orb (as backup)
      const orbElement = document.querySelector('.kasina-orb-element');
      if (orbElement) {
        // Add a data attribute to the orb to signal the fade level (0-100)
        orbElement.setAttribute('data-fade-level', Math.round(intensity * 100).toString());
        
        // Also set a CSS variable for animation effects
        document.documentElement.style.setProperty('--white-fade-intensity', intensity.toString());
      }
    } else if (!isRunning || timeRemaining > 10) {
      // Reset fade intensity when not in final countdown
      setFadeOutIntensity(0);
      document.documentElement.style.setProperty('--white-fade-intensity', '0');
      
      // Call the parent component's callback to reset fadeout
      if (onFadeOutChange) {
        onFadeOutChange(0);
      }
    }
  }, [isRunning, timeRemaining, onFadeOutChange]);
  
  if (isFocusMode) {
    // Special focus mode timer display
    return (
      <div 
        className={`fixed top-16 left-1/2 transform -translate-x-1/2 transition-opacity duration-300 z-50 
                    ${isTimerVisible || !isRunning ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Timer display with pulse animation for countdown */}
        <div className={`bg-black/60 text-white px-4 py-2 rounded-full flex items-center gap-2 border border-gray-800
                     ${timeRemaining <= 10 && timeRemaining > 0 ? 'border-white/50' : 'border-gray-800'}`}>
          <Timer className={`h-4 w-4 ${timeRemaining <= 10 && timeRemaining > 0 ? 'text-white' : 'text-gray-400'}`} />
          <div className={`text-xl font-mono white-kasina-final-countdown 
                           ${timeRemaining <= 10 && timeRemaining > 0 ? 'white-kasina-timer-emphasis' : ''}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
        
        {/* Fixed controls at bottom of screen */}
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
      </div>
    );
  }
  
  // Regular timer display (for non-focus mode)
  return (
    <div 
      className={`flex flex-col items-center space-y-4 transition-opacity duration-1000`}
    >
      <div className={`text-3xl font-mono text-white white-kasina-final-countdown 
                       ${timeRemaining <= 10 && timeRemaining > 0 ? 'white-kasina-timer-emphasis' : ''}`}>
        {formatTime(timeRemaining)}
      </div>
      
      <div className={`text-xs ${timeRemaining <= 10 && timeRemaining > 0 ? 'text-white' : 'text-gray-300'}`}>
        {`Remaining: ${formatTime(timeRemaining)} / ${formatTime(60)}`}
      </div>
      
      <div className="flex space-x-2 mt-2">
        <Button 
          variant={isRunning ? "destructive" : "default"} 
          onClick={handleStartStop}
          className="w-24 focus-mode-exempt"
          size="sm"
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={isRunning}
          className="w-20 focus-mode-exempt"
          size="sm"
        >
          Reset
        </Button>
      </div>
      
      <div className={`text-xs ${fadeOutIntensity > 0 ? 'text-white' : 'text-gray-400'} mt-2 ${fadeOutIntensity > 0.5 ? 'white-kasina-timer-emphasis' : ''}`}>
        {fadeOutIntensity > 0 
          ? `💡 White kasina fadeout in progress (${Math.round(fadeOutIntensity * 100)}%)`
          : '💡 Special 1-minute timer for White Kasina'
        }
      </div>
    </div>
  );
};

export default WhiteKasinaTimer;