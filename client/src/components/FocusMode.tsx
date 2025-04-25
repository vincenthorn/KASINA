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
      
      /* Set full background to black */
      body.focus-mode-body {
        background-color: black !important;
      }
      
      /* First hide everything */
      body.focus-mode-body > *:not(.focus-mode-root) {
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      /* Make sure all containers for focus mode exist and are visible */
      body.focus-mode-body .focus-mode-root,
      body.focus-mode-body .focus-mode-active,
      body.focus-mode-body .focus-mode-active > div {
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
        position: relative;
        z-index: 9995 !important;
        background-color: black !important;
        width: 100% !important;
        height: 100vh !important;
        pointer-events: auto !important;
      }
      
      /* Make focus mode root take over the screen */
      body.focus-mode-body .focus-mode-root {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
      }
      
      /* Make the orb container visible and centered */
      body.focus-mode-body .orb-container,
      body.focus-mode-body .orb-content,
      body.focus-mode-body .orb-content * {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      /* Position the orb correctly */
      body.focus-mode-body .orb-container {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 300px !important;
        height: 300px !important;
        max-width: none !important;
        max-height: none !important;
        min-width: 300px !important;
        min-height: 300px !important;
        z-index: 9999 !important;
        border-radius: 50% !important;
        overflow: visible !important;
      }
      
      /* Make exempt buttons visible */
      body.focus-mode-body .focus-mode-exempt {
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        position: relative;
        z-index: 9999 !important;
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
      className={`relative focus-mode-root ${isFocusModeActive ? 'focus-mode-active' : ''}`}
      onMouseMove={handleMouseMove}
    >
      {/* Focus mode toggle button */}
      <div className={`absolute top-4 right-4 z-10 transition-opacity duration-200 ${isFocusModeActive && !isUIVisible ? 'opacity-0' : 'opacity-100'}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={isFocusModeActive ? disableFocusMode : enableFocusMode}
          className="focus-mode-exempt"
        >
          {isFocusModeActive ? (
            <Minimize2 className="h-4 w-4 mr-1" />
          ) : (
            <Maximize2 className="h-4 w-4 mr-1" />
          )}
          {isFocusModeActive ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        </Button>
      </div>
      
      {/* Main content */}
      <div className="focus-mode-content">
        {children}
      </div>
    </div>
  );
};

export default FocusMode;