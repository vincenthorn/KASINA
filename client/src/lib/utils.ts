import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getLocalStorage = <T>(key: string, defaultValue?: T): T => {
  const stored = window.localStorage.getItem(key);
  if (stored === null) return defaultValue as T;
  try {
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`Error parsing stored value for ${key}:`, error);
    return defaultValue as T;
  }
};

export const setLocalStorage = <T>(key: string, value: T): void => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

// CSV parsing helper
export const parseCSV = (csv: string): string[] => {
  if (!csv) return [];
  
  // Remove trailing commas, whitespace, split by commas and filter out empty entries
  return csv
    .trim()
    .split(',')
    .map(email => email.trim())
    .filter(email => email);
};

// Format time in seconds to MM:SS or HH:MM:SS
export const formatTime = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Round up to the nearest minute using the 31-second rule
// - Under 31 seconds: Not recorded (returns 0)
// - Between 31-59 seconds: Round up to 1 minute (60 seconds)
// - For > 1 minute: Round up if seconds portion is >= 31, otherwise round down
export const roundUpToNearestMinute = (seconds: number): number => {
  if (seconds <= 0) return 0;
  
  // Sessions under 31 seconds aren't logged
  if (seconds < 31) {
    console.log(`UTILS: Session too short (${seconds}s) - not saving`);
    return 0;
  }
  
  // If the seconds value is exactly a multiple of 60 (a whole number of minutes)
  if (seconds % 60 === 0) {
    console.log(`UTILS: Keeping exact minute value: ${seconds} seconds = ${seconds/60} minutes`);
    return seconds; // Return unchanged
  }
  
  // For values under 60 seconds but at least 31 seconds, round up to 1 minute
  if (seconds < 60) {
    console.log(`UTILS: Rounding short session (${seconds}s) up to 1 minute`);
    return 60;
  }
  
  // For longer durations, round based on the seconds portion
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  // If the remaining seconds are >= 31, round up, otherwise round down
  if (remainingSeconds >= 31) {
    const roundedSeconds = (minutes + 1) * 60;
    console.log(`UTILS: Rounding ${seconds}s up to ${roundedSeconds}s (${minutes + 1}m)`);
    return roundedSeconds;
  } else {
    const roundedSeconds = minutes * 60;
    console.log(`UTILS: Rounding ${seconds}s down to ${roundedSeconds}s (${minutes}m)`);
    return roundedSeconds;
  }
};

// EMERGENCY FIX: Special function that uses the test API route to directly save a session
// This uses the special test route that we know works reliably
export const saveDirectTestSession = async (
  kasinaType: string,
  minutes: number = 1,
  isManualStop: boolean = false
): Promise<boolean> => {
  try {
    const minuteText = minutes === 1 ? "minute" : "minutes";
    console.log(`🚨 EMERGENCY DIRECT TEST SAVE: ${kasinaType} for ${minutes} ${minuteText}`);
    
    // Create a simple payload that mimics the test route format
    const payload = {
      kasinaType: kasinaType.toLowerCase(),
      kasinaName: `${kasinaType.charAt(0).toUpperCase() + kasinaType.slice(1).toLowerCase()} (${minutes}-${minuteText})`,
      duration: minutes * 60, // Always use exact minutes in seconds
      durationInMinutes: minutes,
      timestamp: new Date().toISOString(),
      _directTest: true, // Mark as a direct test route payload
      _manualStop: isManualStop // Indicate if this was manually stopped
    };
    
    console.log("📋 Direct test payload:", payload);
    
    // Make the direct API call that we know works
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`✅ DIRECT TEST: Session saved successfully`);
      return true;
    } else {
      console.error(`❌ DIRECT TEST: Session save failed:`, response.status);
      return false;
    }
  } catch (e) {
    console.error("❌ DIRECT TEST: Error saving session:", e);
    return false;
  }
};

// CRITICAL FIX: Helper function to directly save whole-minute sessions
// This bypasses the regular flow that may be failing for naturally completed sessions
export const saveWholeMinuteSession = async (
  kasinaType: string, 
  durationInSeconds: number, 
  completedNaturally = true
): Promise<boolean> => {
  try {
    // Ensure we have valid inputs
    if (!kasinaType || !durationInSeconds) {
      console.error("Invalid inputs for saveWholeMinuteSession", { kasinaType, durationInSeconds });
      return false;
    }
    
    // Calculate minutes
    const minutes = Math.round(durationInSeconds / 60);
    const minuteText = minutes === 1 ? "minute" : "minutes";
    
    // Log what we're doing
    console.log(`🔥 DIRECT WHOLE-MINUTE SAVE: ${kasinaType} for ${minutes} ${minuteText}`);
    
    // Create a payload with all the necessary data and MULTIPLE flags for detection
    const payload = {
      kasinaType: kasinaType.toLowerCase(),
      kasinaName: `${kasinaType.charAt(0).toUpperCase() + kasinaType.slice(1).toLowerCase()} (${minutes}-${minuteText})`,
      duration: durationInSeconds,
      durationInMinutes: minutes,
      timestamp: new Date().toISOString(),
      _forceWholeMinuteFix: true,
      _completedNaturally: completedNaturally,
      _duration: durationInSeconds,
      _universalFix: true,     // Add a universal flag for any kasina type
      _guaranteedSession: true, // Additional flag for failsafe detection
      _critical: true          // Critical flag to ensure highest priority
    };
    
    // Store as backup in localStorage
    try {
      localStorage.setItem('lastCompletedSession', JSON.stringify(payload));
      console.log("💾 Saved whole-minute session data to localStorage as fallback");
    } catch (e) { /* Ignore */ }
    
    // Make the direct API call
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`✅ WHOLE-MINUTE FIX: ${minutes}-${minuteText} session saved successfully`);
      return true;
    } else {
      console.error(`❌ WHOLE-MINUTE FIX: Session save failed:`, response.status);
      
      // Try a second time with a slight variation
      try {
        console.log("Attempting backup save method...");
        const backupResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            _backupMethod: true,
            timestamp: new Date().toISOString() // Update timestamp for the retry
          })
        });
        
        if (backupResponse.ok) {
          console.log("✅ Backup save succeeded");
          return true;
        } else {
          console.error("❌ Backup save failed:", backupResponse.status);
        }
      } catch (e) {
        console.error("Error during backup save:", e);
      }
      
      return false;
    }
  } catch (error) {
    console.error(`❌ WHOLE-MINUTE FIX: Error saving session:`, error);
    return false;
  }
};
