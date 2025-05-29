import { useState, useEffect, useRef } from 'react';

interface UseAutoHideOptions {
  hideDelay?: number; // milliseconds before hiding
  hideCursor?: boolean; // whether to hide cursor
  hideControls?: boolean; // whether to hide controls
}

export function useAutoHide(options: UseAutoHideOptions = {}) {
  const {
    hideDelay = 3000,
    hideCursor = true,
    hideControls = true
  } = options;

  const [showCursor, setShowCursor] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle activity (mouse movement, touch, etc.)
  const handleActivity = () => {
    setLastActivityTime(Date.now());
    
    if (hideCursor) {
      setShowCursor(true);
    }
    if (hideControls) {
      setShowControls(true);
    }
    
    // Clear existing timeouts
    if (cursorTimeoutRef.current) {
      clearTimeout(cursorTimeoutRef.current);
    }
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Set new timeouts
    if (hideCursor) {
      cursorTimeoutRef.current = setTimeout(() => {
        setShowCursor(false);
      }, hideDelay);
    }
    
    if (hideControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, hideDelay);
    }
  };

  // Set up global event listeners
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial activity to start the timers
    handleActivity();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [hideDelay, hideCursor, hideControls]);

  return {
    showCursor,
    showControls,
    lastActivityTime,
    handleActivity
  };
}