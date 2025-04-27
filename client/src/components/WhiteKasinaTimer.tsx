import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { formatTime } from '../lib/utils';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { useKasina } from '../lib/stores/useKasina';
import { Timer } from 'lucide-react';
import { updateWhiteKasinaTimer } from './WhiteKasinaOverlay';

interface WhiteKasinaTimerProps {
  onComplete: () => void;
  onFadeOutChange?: (intensity: number) => void;
}

/**
 * A completely standalone timer implementation specifically for white kasina meditation.
 * This bypasses all normal timer logic to ensure 1-minute white kasina sessions work correctly.
 */
// Create a global timer overlay for focus mode
let globalWhiteKasinaTimerState = {
  timeRemaining: 60,
  isRunning: false
};

// Create a global update function
const updateGlobalTimerState = (newState: Partial<typeof globalWhiteKasinaTimerState>) => {
  globalWhiteKasinaTimerState = {
    ...globalWhiteKasinaTimerState,
    ...newState
  };
  
  // Update any DOM elements
  setTimeout(() => {
    const timerElement = document.getElementById('global-white-kasina-timer');
    if (timerElement) {
      timerElement.textContent = formatTime(globalWhiteKasinaTimerState.timeRemaining);
    }
  }, 0);
};

// Only create the overlay element when we're on the kasinas page
const createOverlayIfNeeded = () => {
  // Only create when we're on the kasinas page
  if (typeof window !== 'undefined' && 
      window.location.pathname.includes('/kasinas') && 
      !document.getElementById('global-white-kasina-overlay')) {
    
    console.log("Creating white kasina timer overlay - only on kasinas page");
    
    const overlayStyle = document.createElement('style');
    overlayStyle.innerHTML = `
      #global-white-kasina-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 50px;
        background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        pointer-events: none;
        opacity: 0; /* Start hidden */
        transition: opacity 0.3s ease;
      }
      #global-white-kasina-timer-container {
        background-color: rgba(0,0,0,0.8);
        border-radius: 20px;
        padding: 6px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        border: 1px solid rgba(150,150,150,0.3);
      }
      #global-white-kasina-timer {
        font-family: monospace;
        font-size: 22px;
        font-weight: bold;
        color: white;
      }
      .timer-icon {
        width: 16px;
        height: 16px;
        margin-right: 5px;
        opacity: 0.8;
      }
    `;
    document.head.appendChild(overlayStyle);
    
    const overlay = document.createElement('div');
    overlay.id = 'global-white-kasina-overlay';
    
    const timerContainer = document.createElement('div');
    timerContainer.id = 'global-white-kasina-timer-container';
    
    // Add a timer icon
    const timerIcon = document.createElement('div');
    timerIcon.className = 'timer-icon';
    timerIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; color: white;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    
    const timer = document.createElement('div');
    timer.id = 'global-white-kasina-timer';
    timer.textContent = '01:00';
    
    timerContainer.appendChild(timerIcon);
    timerContainer.appendChild(timer);
    overlay.appendChild(timerContainer);
    document.body.appendChild(overlay);
  }
}

const WhiteKasinaTimer: React.FC<WhiteKasinaTimerProps> = ({ onComplete, onFadeOutChange }) => {
  // State variables to avoid Zustand completely
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60); // Always 60 seconds (1 minute)
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Check if we should create the overlay (only on kasinas page)
  useEffect(() => {
    // Only create DOM elements if we're on the kasinas page
    if (typeof window !== 'undefined' && window.location.pathname.includes('/kasinas')) {
      createOverlayIfNeeded();
    }
  }, []);
  
  // Reference for the interval timer
  const intervalRef = useRef<number | null>(null);
  
  // Track completion separately from the timer state
  const completedRef = useRef(false);
  
  // Get focus mode functions
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  
  // Check if focus mode is active
  const isFocusMode = useFocusMode(state => state.isFocusModeActive);
  
  // Track whether to show or hide the timer based on mouse movement
  const [isTimerVisible, setIsTimerVisible] = useState(true);
  const visibilityTimeoutRef = useRef<number | null>(null);
  
  // Track fadeout effect for the orb at the end of the session
  const [fadeOutIntensity, setFadeOutIntensity] = useState(0); // 0 = no fade, 1 = completely faded
  
  // Handle mouse movement to show/hide timer in focus mode
  useEffect(() => {
    // Log setup of event handlers for debugging
    console.log("Setting up mouse move handlers for white kasina timer", { isFocusMode, isRunning });
    
    // Force timer to be visible initially
    setIsTimerVisible(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      // Debug any mouse movement
      console.log("WhiteKasinaTimer - Mouse moved", { 
        x: e.clientX, 
        y: e.clientY,
        isTimerCurrentlyVisible: isTimerVisible
      });
      
      // Force DOM update to show timer control
      document.body.classList.add('mouse-moved');
      setTimeout(() => {
        document.body.classList.remove('mouse-moved');
      }, 100);
      
      // Always show the timer when mouse moves
      setIsTimerVisible(true);
      
      // Clear any existing timeout
      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
      
      // Set timeout to hide after inactivity - make it longer for white kasina
      visibilityTimeoutRef.current = window.setTimeout(() => {
        // Special case: Always keep timer visible during final 10 seconds
        if (timeRemaining <= 10 && timeRemaining > 0) {
          console.log("Keeping timer visible during final countdown (10s)");
          setIsTimerVisible(true);
        } else {
          console.log("Hiding timer after inactivity timeout");
          setIsTimerVisible(false);
        }
      }, 5000); // Extended to 5 seconds of inactivity for better usability
    };
    
    // Handle any keypress
    const handleKeyPress = (e: KeyboardEvent) => {
      console.log("WhiteKasinaTimer - Key pressed", { key: e.key });
      
      // Show timer on any key press
      setIsTimerVisible(true);
      
      // Clear existing timeout
      if (visibilityTimeoutRef.current) {
        window.clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
      
      // Set timeout to hide after inactivity (for all modes)
      visibilityTimeoutRef.current = window.setTimeout(() => {
        // Special case: Keep timer visible during final countdown
        if (timeRemaining <= 10 && timeRemaining > 0) {
          console.log("Keeping timer visible during final countdown (10s)");
          setIsTimerVisible(true);
        } else {
          console.log("Hiding timer after key press timeout");
          setIsTimerVisible(false);
        }
      }, 3000);
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
        visibilityTimeoutRef.current = null;
      }
    };
  }, [isRunning, timeRemaining, isTimerVisible, isFocusMode]);
  
  // Set up the timer interval with fade-out effect
  useEffect(() => {
    if (isRunning) {
      console.log("🕒 WHITE KASINA TIMER: Starting timer");
      enableFocusMode();
      
      // Update all timer versions - ordered from oldest to newest
      updateGlobalTimerState({ isRunning: true });
      updateWhiteKasinaTimer(timeRemaining, true);
      
      // Also start our latest native timer implementation
      if (typeof window !== 'undefined' && window.whiteKasinaTimer) {
        console.log("🕒 Starting native timer from useEffect");
        window.whiteKasinaTimer.start();
      }
      
      // Make the old overlay visible too for backward compatibility
      const overlay = document.getElementById('global-white-kasina-overlay');
      if (overlay) {
        overlay.style.opacity = '1';
      }
      
      // Clear any existing interval
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      
      // Set up a new interval
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          console.log(`🕒 WHITE KASINA TIMER: ${newTime}s remaining`);
          
          // Update all timer displays
          updateGlobalTimerState({ timeRemaining: newTime });
          updateWhiteKasinaTimer(newTime, true);
          
          // Update the native timer too
          if (typeof window !== 'undefined' && window.whiteKasinaTimer) {
            window.whiteKasinaTimer.setTime(newTime);
          }
          
          // Add pulse animation to both timer versions
          if (newTime <= 10 && newTime > 0) {
            // Old timer
            const timerContainer = document.getElementById('global-white-kasina-timer-container');
            if (timerContainer) {
              timerContainer.style.border = '2px solid white';
              timerContainer.style.animation = 'pulse 1s infinite';
            }
            
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
        
        // Also stop the native timer when cleaning up
        if (typeof window !== 'undefined' && window.whiteKasinaTimer) {
          window.whiteKasinaTimer.stop();
        }
      };
    } else {
      // Update all timer displays when not running
      updateGlobalTimerState({ isRunning: false });
      updateWhiteKasinaTimer(timeRemaining, false);
      
      // Also stop the native timer
      if (typeof window !== 'undefined' && window.whiteKasinaTimer) {
        window.whiteKasinaTimer.stop();
      }
    }
  }, [isRunning, enableFocusMode, timeRemaining]);
  
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
      
      // Also stop the native timer script
      if (typeof window !== 'undefined' && window.whiteKasinaTimer) {
        console.log("⏹️ WHITE KASINA TIMER: Stopping native timer");
        window.whiteKasinaTimer.stop();
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
      
      // Also start the native timer script
      if (typeof window !== 'undefined' && window.whiteKasinaTimer) {
        console.log("▶️ WHITE KASINA TIMER: Starting native timer");
        window.whiteKasinaTimer.start();
      }
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
    
    // Also stop the native timer script
    if (typeof window !== 'undefined' && window.whiteKasinaTimer) {
      console.log("🔄 WHITE KASINA TIMER: Stopping native timer");
      window.whiteKasinaTimer.stop();
    }
  };
  
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
      <>
        {/* Fixed timer display at the very top of screen */}
        <div
          className="fixed inset-0 z-[9999] pointer-events-none"
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
        >
          {/* Timer container with high contrast to ensure visibility */}
          <div 
            className="w-full py-4 bg-gradient-to-b from-black/60 to-transparent 
                      flex justify-center items-center"
            style={{ position: 'absolute', top: 0, width: '100%' }}
          >
            {/* Timer display - ALWAYS visible regardless of mouse movement */}
            <div className={`px-6 py-2 rounded-full flex items-center gap-3 pointer-events-auto
                          shadow-lg shadow-black/30
                          ${timeRemaining <= 10 && timeRemaining > 0 
                            ? 'bg-white/20 border-white border-2 animate-pulse' 
                            : 'bg-black/80 border border-gray-600'}`}>
              <Timer className="h-5 w-5 text-white" />
              <div className="text-3xl font-mono text-white font-bold">
                {formatTime(timeRemaining)}
              </div>
            </div>
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
      </>
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