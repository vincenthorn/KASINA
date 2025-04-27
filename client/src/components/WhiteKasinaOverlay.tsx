import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatTime } from '../lib/utils';

// Global state for the overlay
let globalTimeRemaining = 60;
let globalTimerActive = false;
let updateHandlers: Array<(time: number, active: boolean) => void> = [];

// Function to update all instances
export const updateWhiteKasinaTimer = (timeRemaining: number, active: boolean) => {
  globalTimeRemaining = timeRemaining;
  globalTimerActive = active;
  // Call all update handlers
  updateHandlers.forEach(handler => handler(timeRemaining, active));
};

/**
 * A component that creates a timer overlay portal - guaranteed to be 
 * displayed over everything else regardless of focus mode
 */
const WhiteKasinaOverlay: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(globalTimeRemaining);
  const [isActive, setIsActive] = useState(globalTimerActive);

  useEffect(() => {
    // Create a update handler
    const handleUpdate = (time: number, active: boolean) => {
      setTimeRemaining(time);
      setIsActive(active);
    };

    // Register this component as a handler
    updateHandlers.push(handleUpdate);

    // Set as mounted to render the portal
    setMounted(true);

    // Cleanup
    return () => {
      updateHandlers = updateHandlers.filter(h => h !== handleUpdate);
    };
  }, []);

  // Don't render anything server-side
  if (!mounted) return null;

  // Create a portal that attaches directly to the body
  return createPortal(
    <div
      className={`fixed top-0 left-0 w-full z-[100000] pointer-events-none transition-opacity duration-300 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)',
        height: '100px',
      }}
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