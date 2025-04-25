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
      
      /* Hide everything first */
      body.focus-mode-body * {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.15s ease !important;
      }
      
      /* Then make sure specific elements like sidebar are completely gone */
      body.focus-mode-body aside,
      body.focus-mode-body nav,
      body.focus-mode-body header,
      body.focus-mode-body .sidebar,
      body.focus-mode-body h1,
      body.focus-mode-body button,
      body.focus-mode-body .tabs,
      body.focus-mode-body .tabs-list,
      body.focus-mode-body .card,
      body.focus-mode-body form {
        display: none !important;
        visibility: hidden !important;
      }
      
      /* Ensure body background is black in focus mode */
      body.focus-mode-body {
        background-color: black !important;
      }
      
      /* Make the orb and its container visible */
      body.focus-mode-body .orb-container,
      body.focus-mode-body .orb-container *,
      body.focus-mode-body .orb-content,
      body.focus-mode-body .orb-content *,
      body.focus-mode-body canvas {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      /* Center and size the orb properly */
      body.focus-mode-body .orb-container {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 400px !important;
        height: 400px !important;
        z-index: 9999 !important;
        background-color: black !important;
      }
      
      /* Ensure the sidebar is hidden */
      body.focus-mode-body aside,
      body.focus-mode-body nav {
        display: none !important;
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