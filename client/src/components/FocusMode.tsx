import React, { useEffect, useState } from 'react';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { Button } from './ui/button';
import { Minimize2, Maximize2 } from 'lucide-react';

interface FocusModeProps {
  children: React.ReactNode;
}

const FocusMode: React.FC<FocusModeProps> = ({ children }) => {
  const { isFocusModeActive, enableFocusMode, disableFocusMode } = useFocusMode();
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const inactivityThreshold = 300; // 300 milliseconds for near-instant transition
  
  // Handle mouse movement to show UI and track user activity
  const handleMouseMove = () => {
    setLastActivity(Date.now());
    if (!isUIVisible) {
      setIsUIVisible(true);
    }
  };
  
  // Check for inactivity to hide UI
  useEffect(() => {
    if (!isFocusModeActive) return;
    
    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActivity > inactivityThreshold) {
        setIsUIVisible(false);
      }
    };
    
    const interval = setInterval(checkInactivity, 100); // Check more frequently
    return () => clearInterval(interval);
  }, [isFocusModeActive, lastActivity, inactivityThreshold]);
  
  // Add and remove event listeners and body class
  useEffect(() => {
    if (isFocusModeActive) {
      window.addEventListener('mousemove', handleMouseMove);
      // Add focus mode class to body
      document.body.classList.add('focus-mode-body');
      // Also hide cursor after inactivity
      document.body.classList.toggle('cursor-none', !isUIVisible);
    } else {
      setIsUIVisible(true);
      document.body.classList.remove('focus-mode-body');
      document.body.classList.remove('cursor-none');
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.classList.remove('focus-mode-body');
      document.body.classList.remove('cursor-none');
    };
  }, [isFocusModeActive, isUIVisible]);

  // Add CSS for cursor hiding and focus mode styling
  useEffect(() => {
    // Create style element if it doesn't exist
    let style = document.getElementById('focus-mode-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'focus-mode-style';
      document.head.appendChild(style);
    }
    
    style.textContent = `
      .cursor-none {
        cursor: none !important;
      }
      .cursor-none * {
        cursor: none !important;
      }
      
      /* Create a fixed full-screen black overlay */
      body.focus-mode-body:before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: black;
        z-index: 9990;
      }
      
      /* Hide UI elements individually instead of using * selector */
      body.focus-mode-body header,
      body.focus-mode-body aside,
      body.focus-mode-body nav,
      body.focus-mode-body .sidebar,
      body.focus-mode-body h1,
      body.focus-mode-body h2,
      body.focus-mode-body h3,
      body.focus-mode-body button:not(.focus-mode-exempt),
      body.focus-mode-body .tabs-list,
      body.focus-mode-body .card:not(.orb-container),
      body.focus-mode-body form,
      body.focus-mode-body footer {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      
      /* Make the orb container visible and centered */
      body.focus-mode-body .orb-container {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 300px !important;
        height: 300px !important;
        z-index: 9999 !important;
        pointer-events: auto !important;
        border-radius: 50% !important;
      }
    `;
    
    return () => {
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return (
    <div 
      className={`relative ${isFocusModeActive ? 'focus-mode-active' : ''}`}
      onMouseMove={handleMouseMove}
    >
      {/* Focus mode toggle button */}
      <div className={`absolute top-4 right-4 z-10 transition-opacity duration-200 ${isFocusModeActive && !isUIVisible ? 'opacity-0' : 'opacity-100'}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={isFocusModeActive ? disableFocusMode : enableFocusMode}
        >
          {isFocusModeActive ? (
            <Minimize2 className="h-4 w-4 mr-1" />
          ) : (
            <Maximize2 className="h-4 w-4 mr-1" />
          )}
          {isFocusModeActive ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        </Button>
      </div>
      
      {/* Main content - will be hidden in focus mode */}
      <div>
        {children}
      </div>
    </div>
  );
};

export default FocusMode;