import { useState, useEffect, useCallback } from 'react';

// Type definition for the wake lock API not included in default TypeScript
interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release: () => Promise<void>;
}

declare global {
  interface Navigator {
    // Use inline interface definition to avoid declaration conflicts
    wakeLock?: {
      request(type: 'screen'): Promise<WakeLockSentinel>;
    };
  }
}

type WakeLockState = {
  isSupported: boolean;
  isEnabled: boolean;
  error: Error | null;
  enableWakeLock: () => Promise<void>;
  disableWakeLock: () => Promise<void>;
};

/**
 * Hook to prevent the screen from turning off during meditation sessions.
 * Uses the Screen Wake Lock API to keep the screen active.
 */
export default function useWakeLock(): WakeLockState {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Check if wake lock is supported in this browser
  const isSupported = typeof navigator !== 'undefined' && 
                      'wakeLock' in navigator && 
                      navigator.wakeLock !== undefined;
  
  // Function to acquire the wake lock
  const enableWakeLock = useCallback(async () => {
    if (!isSupported) {
      console.log("Screen Wake Lock API not supported in this browser");
      return;
    }
    
    try {
      if (navigator.wakeLock) {
        console.log("Requesting screen wake lock...");
        const lock = await navigator.wakeLock.request('screen');
        
        setWakeLock(lock);
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
  const disableWakeLock = useCallback(async () => {
    if (wakeLock && !wakeLock.released) {
      try {
        await wakeLock.release();
        console.log("Screen wake lock released");
      } catch (err) {
        console.error("Error releasing screen wake lock:", err);
      }
    }
    setIsEnabled(false);
    setWakeLock(null);
  }, [wakeLock]);
  
  // Re-acquire wake lock when the page becomes visible again
  useEffect(() => {
    if (!isSupported) return;
    
    const handleVisibilityChange = () => {
      if (wakeLock && document.visibilityState === 'visible') {
        enableWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Release wake lock on unmount
      if (wakeLock && !wakeLock.released) {
        wakeLock.release().catch(err => {
          console.error("Error releasing wake lock on unmount:", err);
        });
      }
    };
  }, [enableWakeLock, isSupported, wakeLock]);
  
  return {
    isSupported,
    isEnabled,
    error,
    enableWakeLock,
    disableWakeLock
  };
}