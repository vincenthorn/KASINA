import { useState, useEffect, useCallback } from 'react';

// Adding proper TypeScript definitions for the Wake Lock API
interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: EventListener): void;
  removeEventListener(type: 'release', listener: EventListener): void;
}

// Type for our hook's return value
interface WakeLockState {
  isSupported: boolean;
  isEnabled: boolean;
  error: Error | null;
  enableWakeLock: () => Promise<void>;
  disableWakeLock: () => Promise<void>;
}

/**
 * Custom hook to prevent the screen from turning off during meditation sessions
 * Uses the Screen Wake Lock API which may not be available in all browsers
 */
function useWakeLock(): WakeLockState {
  const [wakeLockSentinel, setWakeLockSentinel] = useState<WakeLockSentinel | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Check if the Wake Lock API is supported in this browser
  const isSupported = typeof navigator !== 'undefined' && 
                     'wakeLock' in navigator && 
                     navigator.wakeLock !== undefined;
  
  // Function to request a wake lock
  const enableWakeLock = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      console.log("Screen Wake Lock API not supported in this browser");
      return;
    }
    
    try {
      if ('wakeLock' in navigator && navigator.wakeLock) {
        console.log("Requesting screen wake lock...");
        // @ts-ignore - TypeScript doesn't know about the wake lock API
        const lock = await navigator.wakeLock.request('screen');
        
        setWakeLockSentinel(lock);
        setIsEnabled(true);
        setError(null);
        
        console.log("Screen wake lock enabled - screen will remain on");
        
        // Add listener to reacquire wake lock if it's released
        lock.addEventListener('release', () => {
          console.log("Screen wake lock was released");
          setIsEnabled(false);
          
          // Try to reacquire wake lock if session is still active
          if (document.visibilityState === 'visible') {
            enableWakeLock(); // Re-enable wake lock
          }
        });
      }
    } catch (err) {
      console.error("Error acquiring screen wake lock:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsEnabled(false);
    }
  }, [isSupported]);
  
  // Function to release the wake lock
  const disableWakeLock = useCallback(async (): Promise<void> => {
    if (wakeLockSentinel && !wakeLockSentinel.released) {
      try {
        await wakeLockSentinel.release();
        console.log("Screen wake lock released");
      } catch (err) {
        console.error("Error releasing screen wake lock:", err);
      }
    }
    setIsEnabled(false);
    setWakeLockSentinel(null);
  }, [wakeLockSentinel]);
  
  // Re-acquire wake lock when the page becomes visible again
  useEffect(() => {
    if (!isSupported) return;
    
    const handleVisibilityChange = (): void => {
      if (wakeLockSentinel && document.visibilityState === 'visible') {
        enableWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Release wake lock on unmount
      if (wakeLockSentinel && !wakeLockSentinel.released) {
        wakeLockSentinel.release().catch(err => {
          console.error("Error releasing wake lock on unmount:", err);
        });
      }
    };
  }, [enableWakeLock, isSupported, wakeLockSentinel]);
  
  return {
    isSupported,
    isEnabled,
    error,
    enableWakeLock,
    disableWakeLock
  };
}

export default useWakeLock;