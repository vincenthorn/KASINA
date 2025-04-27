import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatTime } from '../lib/utils';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { useKasina } from '../lib/stores/useKasina';

// Global state for the overlay
let globalTimeRemaining = 60;
let globalTimerActive = false;
let updateHandlers: Array<(time: number, active: boolean) => void> = [];

// Function to update all instances - but only show on kasinas page
export const updateWhiteKasinaTimer = (timeRemaining: number, active: boolean) => {
  // Update global state values
  globalTimeRemaining = timeRemaining;
  globalTimerActive = active;
  
  // Only show the timer if we're on the kasinas page
  if (typeof window !== 'undefined' && window.location.pathname.includes('/kasinas')) {
    // Call all update handlers 
    updateHandlers.forEach(handler => handler(timeRemaining, active));
  } else {
    console.log("WhiteKasinaTimer: Not showing timer (not on kasinas page)");
  }
};

/**
 * A component that creates a timer overlay portal - guaranteed to be 
 * displayed over everything else regardless of focus mode
 * 
 * This overlay will ONLY be rendered on the kasinas page.
 */
const WhiteKasinaOverlay: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(globalTimeRemaining);
  const [isActive, setIsActive] = useState(globalTimerActive);
  const [isOnKasinasPage, setIsOnKasinasPage] = useState(false);
  
  // Track mouse activity similar to FocusMode component
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isUIVisible, setIsUIVisible] = useState(true);
  const timerRef = useRef<HTMLDivElement>(null);
  
  // Get current focus mode state to coordinate timers
  const { isFocusModeActive } = useFocusMode();
  const { selectedKasina } = useKasina();
  
  // Handle mouse movement to show UI temporarily
  const handleMouseMove = () => {
    if (isActive) {
      setLastActivity(Date.now());
      setIsUIVisible(true);
      
      // Debug log for mouse movement
      if (selectedKasina === 'white') {
        console.log("WHITE KASINA TIMER: Mouse movement detected in overlay");
      }
    }
  };

  useEffect(() => {
    // Only mount if we're on the kasinas page
    if (typeof window !== 'undefined') {
      const checkPath = () => {
        const currentPath = window.location.pathname;
        const onKasinasPage = currentPath.includes('/kasinas');
        console.log("WhiteKasinaOverlay path check:", { currentPath, onKasinasPage });
        setIsOnKasinasPage(onKasinasPage);
      };
      
      // Check initial path
      checkPath();
      
      // Create a update handler for timer changes
      const handleUpdate = (time: number, active: boolean) => {
        setTimeRemaining(time);
        setIsActive(active);
        
        // Reset visibility state on timer start
        if (active) {
          setLastActivity(Date.now());
          setIsUIVisible(true);
        }
      };

      // Register this component as a handler
      updateHandlers.push(handleUpdate);

      // Set as mounted to render the portal
      setMounted(true);
      
      // Listen for route changes
      const interval = setInterval(checkPath, 1000);

      // Cleanup
      return () => {
        updateHandlers = updateHandlers.filter(h => h !== handleUpdate);
        clearInterval(interval);
      };
    }
  }, []);
  
  // Setup document-wide mouse move listener
  useEffect(() => {
    const handleDocumentMouseMove = () => {
      if (isActive && isOnKasinasPage) {
        setLastActivity(Date.now());
        setIsUIVisible(true);
      }
    };
    
    // Add listener to entire document
    document.addEventListener('mousemove', handleDocumentMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
    };
  }, [isActive, isOnKasinasPage]);
  
  // Hide UI after inactivity - exactly like FocusMode does
  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive && Date.now() - lastActivity > 2000) {
        // Don't hide during final countdown
        if (timeRemaining > 10) {
          setIsUIVisible(false);
        }
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [isActive, lastActivity, timeRemaining]);
  
  // When in final countdown, always show the timer
  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0 && isActive) {
      setIsUIVisible(true);
    }
  }, [timeRemaining, isActive]);

  // Don't render anything server-side or when not on kasinas page
  if (!mounted || !isOnKasinasPage) return null;

  // Create a portal that attaches directly to the body
  return createPortal(
    <div
      ref={timerRef}
      className={`fixed top-0 left-0 w-full z-[100000] pointer-events-none transition-opacity duration-300 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)',
        height: '100px',
        opacity: isUIVisible ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}
      onMouseMove={handleMouseMove}
    >
      <div className="h-full w-full flex justify-center items-center">
        <div 
          className={`
            bg-black/90 rounded-full px-8 py-3 flex items-center gap-4 
            border-2 ${timeRemaining <= 10 ? 'border-white animate-pulse' : 'border-gray-600'}
            shadow-xl shadow-black/50
          `}
          style={{
            borderWidth: timeRemaining <= 10 ? '3px' : '2px',
            boxShadow: '0 0 20px rgba(0,0,0,0.8)'
          }}
        >
          {/* Timer icon with pulse animation */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={`text-white ${timeRemaining <= 10 ? 'animate-pulse' : ''}`}
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          
          {/* Timer display */}
          <div className="text-3xl font-mono font-bold text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WhiteKasinaOverlay;