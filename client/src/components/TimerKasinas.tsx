import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useKasina } from '../lib/stores/useKasina';
import { KASINA_NAMES, KASINA_TYPES, KASINA_COLORS, KASINA_BACKGROUNDS, KASINA_EMOJIS } from '../lib/constants';
import { KasinaType } from '../lib/types';
import { useFocusMode } from '../lib/stores/useFocusMode';
import SimpleTimer from './SimpleTimer';
import FocusMode from './FocusMode';
import KasinaOrb from './KasinaOrb';
import { formatTime, roundUpToNearestMinute, saveWholeMinuteSession } from '../lib/utils';
import { toast } from 'sonner';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { guaranteedSessionSave } from './OneMinuteFix';
import notificationManager from '../lib/notificationManager';

const TimerKasinas: React.FC = () => {
  const { selectedKasina, setSelectedKasina, addSession } = useKasina();
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  const { timeRemaining, duration } = useSimpleTimer();
  
  // Add this ref to prevent multiple session saves
  const sessionSavedRef = useRef(false);
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("simple");
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Convert selectedKasina to KasinaType
  const typedKasina = selectedKasina as KasinaType;
  
  // Special debug for Yellow Kasina to identify selection issues
  useEffect(() => {
    if (selectedKasina === KASINA_TYPES.YELLOW) {
      console.log(`🟡 YELLOW KASINA SELECTED - Confirming state:
      - Value: "${selectedKasina}" 
      - Type: "${typeof selectedKasina}"
      - Color: ${KASINA_COLORS.yellow}
      - Emoji: ${KASINA_EMOJIS.yellow}
      - Selected == YELLOW: ${selectedKasina === KASINA_TYPES.YELLOW ? 'MATCH' : 'MISMATCH'}
      - Raw value: "${KASINA_TYPES.YELLOW}"
      `);
    }
  }, [selectedKasina]);
  
  // Reset session saved flag when the component mounts
  useEffect(() => {
    sessionSavedRef.current = false;
    
    // Reset saved flag when navigating or unmounting
    return () => {
      sessionSavedRef.current = false;
    };
  }, []);
  
  // Reset session saved flag when changing kasina type
  useEffect(() => {
    // When user selects a different kasina, reset the saved flag
    sessionSavedRef.current = false;
    console.log("Resetting session saved flag - kasina changed to", selectedKasina);
    
    // CRITICAL FIX: Store the selected kasina type in window.__KASINA_DEBUG
    // This ensures proper session logging when a timer completes
    if (typeof window !== 'undefined') {
      try {
        if (!window.__KASINA_DEBUG) {
          window.__KASINA_DEBUG = {
            selectedKasina,
            startTime: Date.now(),
            duration: 60 // Default value
          };
        } else {
          // Update just the selectedKasina in the existing object
          window.__KASINA_DEBUG.selectedKasina = selectedKasina;
        }
        
        console.log(`🔐 Updated window.__KASINA_DEBUG with selected kasina: ${selectedKasina}`);
      } catch (e) {
        console.error("Error updating window.__KASINA_DEBUG:", e);
      }
    }
  }, [selectedKasina]);
  
  // Handle timer completion
  const handleTimerComplete = () => {
    console.log("Timer completed", { elapsedTime, alreadySaved: sessionSavedRef.current, duration });
    
    // Reset notification flags on complete
    tooShortNotifiedRef.current = false;
    
    // Handle focus mode exit properly
    console.log("Timer completed, scheduling focus mode exit");
    
    // Note: Session saving is handled by the specialized handlers below
    // We'll either use guaranteedSessionSave OR handleWholeMinuteSession but not both
    sessionSavedRef.current = true; // Mark as already saved to prevent duplicates
    
    // Delay focus mode exit slightly to ensure proper cleanup
    setTimeout(() => {
      disableFocusMode();
      console.log("Focus mode disabled");
    }, 100);
    
    // Show confetti feedback
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
    
    // CRITICAL FIX: Direct save on completion for whole-number timer durations (1-min, 2-min, etc.)
    // This is a direct bypass of the regular save flow which seems to fail for naturally completed timers
    
    // Check if this is a whole-number minute timer (60s, 120s, 180s, etc.)
    const isWholeMinuteTimer = duration && duration % 60 === 0 && duration > 0;
    const minutes = duration ? Math.round(duration / 60) : 1;
    const minuteText = minutes === 1 ? "minute" : "minutes";
    
    // Log the exact timer values we're working with
    console.log(`TIMER CHECK: duration=${duration}, isWholeMinute=${isWholeMinuteTimer}, minutes=${minutes}`);
    
    if (isWholeMinuteTimer) {
      console.log(`🔥 CRITICAL WHOLE-MINUTE FIX: Forcing direct API save for ${minutes}-${minuteText} session`);
      
      // Create a whole-minute session with built-in fallback for all whole-minute durations
      const handleWholeMinuteSession = async () => {
        try {
          console.log(`DIRECT WHOLE-MINUTE SAVE: ${selectedKasina} for ${minutes} ${minuteText}`);
          
          // Create a guaranteed working payload
          const payload = {
            kasinaType: selectedKasina.toLowerCase(),
            kasinaName: `${selectedKasina.charAt(0).toUpperCase() + selectedKasina.slice(1).toLowerCase()} (${minutes}-${minuteText})`,
            duration: minutes * 60,
            durationInMinutes: minutes,
            timestamp: new Date().toISOString(),
            _forceWholeMinuteFix: true,
            _completedNaturally: true,
            _duration: minutes * 60
          };
          
          // Store as backup in localStorage
          try {
            localStorage.setItem('lastCompletedSession', JSON.stringify(payload));
            console.log("💾 Saved whole-minute session data to localStorage as fallback");
          } catch (e) { /* Ignore */ }
          
          // First attempt - direct API call
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            console.log(`✅ WHOLE-MINUTE FIX: ${minutes}-${minuteText} session saved successfully`);
            sessionSavedRef.current = true;
            toast.success(`${selectedKasina.charAt(0).toUpperCase() + selectedKasina.slice(1)} kasina session saved (${minutes} ${minuteText})`);
            return;
          } 
          
          // If first attempt failed, try again with a slightly different payload
          console.log("First attempt failed, trying backup method...");
          const backupResponse = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              _backupMethod: true,
              timestamp: new Date().toISOString() // Update timestamp
            })
          });
          
          if (backupResponse.ok) {
            console.log("✅ Backup save succeeded");
            sessionSavedRef.current = true;
            toast.success(`${selectedKasina} session saved using fallback method`);
            return;
          }
          
          // Both attempts failed, log error
          console.error("❌ All save attempts failed");
          toast.error(`Failed to save session. Please try again.`);
          
        } catch (error) {
          console.error("❌ Error saving whole-minute session:", error);
          toast.error(`Error saving session. Please try again.`);
        }
      };
      
      // Execute the function
      handleWholeMinuteSession();
      
      return; // Skip the normal flow since we handled it directly
    }
    
    // For non-whole-minute timers, use our guaranteedSessionSave utility
    // which has comprehensive duplicate prevention built in
    
    console.log("📌 Using guaranteedSessionSave as fallback for non-whole-minute timer");
    
    // Get timer information
    const storeState = useSimpleTimer.getState();
    const originalDuration = storeState.getOriginalDuration() || duration || 60;
    const minutesValue = Math.ceil(originalDuration / 60);
    
    // Call our guaranteed save utility
    console.log(`🧿 NON-WHOLE-MINUTE: Using guaranteedSessionSave for ${selectedKasina} (${minutesValue} min)`);
    
    guaranteedSessionSave(selectedKasina, minutesValue)
      .then(success => {
        if (success) {
          console.log(`✅ NON-WHOLE-MINUTE: Session saved successfully`);
        } else {
          console.error(`❌ NON-WHOLE-MINUTE: Session save failed`);
        }
      })
      .catch(error => {
        console.error(`❌ NON-WHOLE-MINUTE: Error saving session:`, error);
      });
      
    return; // Exit the function
    
    // Only save if there was actual meditation time (at least 31 seconds)
    if (durationToSave >= 31) {
      // Apply the 31-second rule: sessions between 31-59 seconds should round up to 1 minute
      if (durationToSave < 60) {
        console.log(`📊 Rounding up completed session duration from ${durationToSave}s to 60s (1 minute) - special 31s rule`);
        durationToSave = 60;
      }
      
      console.log("Saving session with data:", {
        kasinaType: selectedKasina,
        duration: durationToSave
      });
      
      // Mark as saved before the API call to prevent duplicates
      sessionSavedRef.current = true;
      
      // CRITICAL FIX: Attempt to retrieve stored minutes from localStorage for debugging
      let lastTimerMinutes = 0;
      if (typeof window !== 'undefined') {
        try {
          const storedMinutes = window.localStorage.getItem('lastTimerMinutes');
          if (storedMinutes) {
            lastTimerMinutes = parseInt(storedMinutes, 10);
            console.log("🔍 Retrieved stored timer minutes:", lastTimerMinutes);
          }
        } catch (e) {
          console.error("Error reading from localStorage:", e);
        }
      }
      
      // Special handling for 2 and 3 minute sessions based on stored value
      if (lastTimerMinutes === 2) {
        console.log("🛑 OVERRIDING SESSION DURATION TO 120 SECONDS (2 minutes) based on localStorage value");
        durationToSave = 120;
      } else if (lastTimerMinutes === 3) {
        console.log("🛑 OVERRIDING SESSION DURATION TO 180 SECONDS (3 minutes) based on localStorage value");
        durationToSave = 180;
      }
      
      // FINAL DEBUG before sending to server
      console.log("=======================================================");
      console.log("FINAL CRITICAL DEBUG BEFORE SESSION SAVE:");
      console.log(`- Selected kasina: ${selectedKasina}`);
      console.log(`- Last timer minutes set: ${lastTimerMinutes}`);
      console.log(`- Original duration: ${originalDuration} seconds`);
      console.log(`- Final duration to save: ${durationToSave} seconds`);
      console.log("=======================================================");
      
      // NEW IMPROVED FIX: Create a much more informative payload
      // Note: The server will override the kasinaName
      const exactMinutes = Math.round(durationToSave / 60); 
      
      // Explicitly check for the store's durationInMinutes first (most accurate)
      const minutesValue = storeState.durationInMinutes || 
                          lastTimerMinutes || 
                          exactMinutes;
      
      // Extra check for 4-minute sessions (important edge case)
      if (minutesValue === 4 || durationToSave === 240) {
        console.log("🔍 FOUND 4-MINUTE SESSION - Ensuring it's saved as 240 seconds");
      }
      
      // Ensure the displayed name matches exactly with proper pluralization
      const minuteText = minutesValue === 1 ? "minute" : "minutes";
      const correctName = `${selectedKasina.charAt(0).toUpperCase() + selectedKasina.slice(1)} (${minutesValue}-${minuteText})`;
            
      // Create a complete, detailed payload
      // For complete sessions, we still use the full original duration
      // since the user intended to complete the full session
      const sessionPayload = {
        kasinaType: selectedKasina,
        kasinaName: correctName, // Include correct name with minutes
        duration: originalDuration || duration || minutesValue * 60, // Use the original duration as set
        durationInMinutes: minutesValue, // Explicit marker
        originalDuration: durationToSave, // Debug reference
        timestamp: new Date().toISOString()
      };
      
      // Log what we're sending to the server
      console.log("🚀 FINAL SESSION PAYLOAD:", sessionPayload);
      
      // DIRECT SESSION SAVE - Improved handling for all kasina types
      // This bypasses the store for more reliable saving
      
      // Ensure the kasina type is consistent
      const normalizedType = selectedKasina.toLowerCase();
      
      // Format the name with proper capitalization
      const displayName = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
      
      // ⚠️ CRITICAL - Create a GUARANTEED WORKING PAYLOAD that mirrors the test button ⚠️
      // This is the critical change that makes the session save properly
      const guaranteedPayload = {
        kasinaType: normalizedType, // Use normalized lowercase type
        kasinaName: `${displayName} (${minutesValue}-${minuteText})`, // Proper capitalization and format
        duration: durationToSave,
        durationInMinutes: minutesValue, // Add explicit minutes value
        originalDuration: duration, // Include original duration for reference
        timestamp: new Date().toISOString(),
        _directTest: true // Same flag as the test button, which we know works
      };
      
      // Log the guaranteed payload for all kasina types
      console.log(`🧪 GUARANTEED WORKING PAYLOAD FOR ${displayName.toUpperCase()} KASINA:`, guaranteedPayload);
      
      // ⚠️ CRITICAL: Using the SAME API call format as the test button ⚠️
      // This mimics exactly what works in the test button
      fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guaranteedPayload)
      })
      .then(response => {
        if (response.ok) {
          console.log(`✅ ${displayName.toUpperCase()} KASINA SESSION SAVED SUCCESSFULLY USING GUARANTEED METHOD`);
          toast.success(`${displayName} kasina session saved successfully (${minutesValue} ${minuteText})`);
        } else {
          console.error(`Failed to save ${displayName} kasina session:`, response.status);
          toast.error(`Failed to save ${displayName} kasina session`);
        }
        return response.json();
      })
      .catch(error => {
        console.error(`Error saving ${displayName} kasina session:`, error);
        toast.error(`Error saving ${displayName} kasina session`);
      });
      
      console.log(`Auto-saved session: ${formatTime(durationToSave)} ${KASINA_NAMES[selectedKasina]}`);
      
      // Note: No toast notification here - the guaranteedSessionSave function
      // will handle showing exactly one toast notification
    } else {
      console.warn("Not saving session because duration is 0");
      toast.error("Session too short to save - minimum recordable time is 31 seconds");
    }
  };
  
  // Track if we've already shown a "too short" notification
  const tooShortNotifiedRef = useRef(false);
  
  // Track timer status for saving
  const handleStatusUpdate = (remaining: number | null, elapsed: number) => {
    console.log("Timer update:", { 
      kasinaType: selectedKasina,
      remaining, 
      elapsed, 
      duration, 
      alreadySaved: sessionSavedRef.current 
    });
    
    // CRITICAL SOLUTION: Force-stop timer at 1 second remaining
    // This is the key fix to ensure sessions are properly saved
    if (remaining === 1 && !sessionSavedRef.current && duration && duration > 30) {
      console.log("⚡ CRITICAL FIX: Force-stopping timer at 1 second remaining");
      
      // Mark session as already saved to prevent duplicates
      sessionSavedRef.current = true;
      
      // Get store access for direct control
      const storeState = useSimpleTimer.getState();
      
      // Force stop the timer to trigger manual save logic
      storeState.stopTimer();
      
      // Calculate minutes (round up to match UI expectations)
      const minutes = Math.max(1, Math.ceil(duration / 60));
      const minuteText = minutes === 1 ? "minute" : "minutes";
      
      console.log(`⚡ FORCE-STOP: Saving ${selectedKasina} session (${minutes} ${minuteText})`);
      
      // Use our guaranteed session save utility
      guaranteedSessionSave(selectedKasina, minutes)
        .then(success => {
          if (success) {
            console.log(`✅ FORCE-STOP: Session saved successfully`);
            
            // Show completion confetti
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
            
            // Disable focus mode after a slight delay
            setTimeout(() => {
              disableFocusMode();
            }, 200);
            
            // Note: No toast notification here - the guaranteedSessionSave function
            // will show exactly one toast notification already
          } else {
            console.error(`❌ FORCE-STOP: Session save failed`);
          }
        })
        .catch(error => {
          console.error(`❌ FORCE-STOP: Error saving session:`, error);
        });
        
      return; // Skip the rest of the update logic
    }
    
    // Special debug for yellow kasina sessions
    if (selectedKasina === KASINA_TYPES.YELLOW) {
      console.log(`🟡 YELLOW KASINA SESSION DATA:
        - Selected Kasina: ${selectedKasina}
        - Kasina Type: ${KASINA_TYPES.YELLOW}
        - Elapsed Time: ${elapsed}s
        - Duration Set: ${duration}s
        - Already Saved: ${sessionSavedRef.current}
        - Timer Status: ${remaining === null ? 'Counting up' : 'Counting down'}`);
    }
    
    setElapsedTime(elapsed);
    
    // Handle manual stop (when remaining is not 0 but we got a final update)
    // This condition detects when user manually stops the timer
    if (remaining !== null && remaining !== 0 && elapsed > 0) {
      // Skip if we already saved this session 
      if (sessionSavedRef.current || tooShortNotifiedRef.current) {
        console.log("Session already saved or notification already shown, skipping");
        return;
      }
      
      // Determine which duration to save based on completion percentage
      // If user completed more than 90% of the meditation, use the full duration
      
      // CRITICAL FIX: Get the ORIGINAL duration value from the store to ensure correct time
      const storeState = useSimpleTimer.getState();
      const actualDuration = storeState.getOriginalDuration();
      
      const completionPercentage = elapsed / (actualDuration || 60) * 100;
      let durationToSave = elapsed;
      
      console.log(`Completion: ${completionPercentage.toFixed(1)}%`);
      console.log("- Local duration variable:", duration, "seconds");
      console.log("- Store duration value:", actualDuration, "seconds");
      
      if (completionPercentage >= 90) {
        // If they were very close to finishing, count it as a full session
        durationToSave = actualDuration || 60;
        console.log("Manual stop near completion - using full duration:", durationToSave);
      } else {
        console.log("Manual stop - using actual elapsed time:", elapsed);
      }
      
      // Round up to nearest minute for storage
      let roundedDuration = roundUpToNearestMinute(durationToSave);
      
      // Special handling for Yellow kasina sessions on manual stop
      if (selectedKasina === KASINA_TYPES.YELLOW) {
        console.log(`🟡 YELLOW KASINA MANUALLY STOPPED:
        - Selected kasina: ${selectedKasina}
        - Raw elapsed time: ${elapsed}s
        - Calculated duration to save: ${durationToSave}s
        - Rounded duration: ${roundedDuration}s
        - Timer was manually stopped`);
      }
      
      if (roundedDuration >= 60) {
        console.log("Manual stop detected - saving session with data:", {
          kasinaType: selectedKasina,
          duration: roundedDuration
        });
        
        // Mark as saved before the API call to prevent duplicates
        sessionSavedRef.current = true;
        
        // CRITICAL FIX: Attempt to retrieve stored minutes from localStorage for debugging
        let lastTimerMinutes = 0;
        if (typeof window !== 'undefined') {
          try {
            const storedMinutes = window.localStorage.getItem('lastTimerMinutes');
            if (storedMinutes) {
              lastTimerMinutes = parseInt(storedMinutes, 10);
              console.log("🔍 Retrieved stored timer minutes:", lastTimerMinutes);
              
              // Override duration for 2 and 3 minute sessions
              if (lastTimerMinutes === 2) {
                console.log("🛑 OVERRIDING MANUAL STOP DURATION TO 120 SECONDS (2 minutes)");
                roundedDuration = 120;
              } else if (lastTimerMinutes === 3) {
                console.log("🛑 OVERRIDING MANUAL STOP DURATION TO 180 SECONDS (3 minutes)");
                roundedDuration = 180;
              }
            }
          } catch (e) {
            console.error("Error reading from localStorage:", e);
          }
        }
        
        // NEW IMPROVED FIX: Use the same enhanced payload format for manual stops
        const exactMinutes = Math.round(roundedDuration / 60);
        
        // Get the correct minutes value with fallbacks
        const minutesValue = storeState.durationInMinutes || 
                            lastTimerMinutes || 
                            exactMinutes;
                            
        // Special case handling for common durations
        if (minutesValue === 4 || roundedDuration === 240) {
          console.log("🔍 FOUND MANUAL STOP 4-MINUTE SESSION - Ensuring correct duration");
        }
        
        // Create the correct name with proper pluralization
        const minuteText = minutesValue === 1 ? "minute" : "minutes";
        const correctName = `${selectedKasina.charAt(0).toUpperCase() + selectedKasina.slice(1)} (${minutesValue}-${minuteText})`;
        
        // For sessions between 31-59 seconds, ensure they round up to 1 minute
        let adjustedDuration = elapsed;
        if (elapsed >= 31 && elapsed < 60) {
          console.log(`📊 Rounding up session duration from ${elapsed}s to 60s (1 minute) - special 31s rule`);
          adjustedDuration = 60;
        }
        
        // Complete session payload with all needed information
        const manualSessionPayload = {
          kasinaType: selectedKasina,
          kasinaName: correctName,
          duration: adjustedDuration, // Apply 31-second rule for manually stopped sessions
          durationInMinutes: Math.ceil(adjustedDuration / 60), // Round to proper minutes
          originalDuration: actualDuration, // Include the original duration that was set
          timestamp: new Date().toISOString()
        };
        
        console.log("🚀 MANUAL STOP SESSION PAYLOAD:", manualSessionPayload);
        
        // DIRECT SESSION SAVE FOR MANUAL STOPS - Generalized for all kasinas
        // This ensures all manually stopped sessions are reliably saved
        
        // Ensure the kasina type is consistent
        const normalizedType = selectedKasina.toLowerCase();
        
        // Format the name with proper capitalization
        const displayName = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
        
        // Create a guaranteed working payload with the same format as the test button
        const guaranteedManualPayload = {
          ...manualSessionPayload,
          kasinaType: normalizedType, // Use normalized lowercase type
          kasinaName: correctName, // Use the properly formatted name
          _directTest: true, // Use the same flag as the test button
          _manualStop: true // Additional flag to show this was manually stopped
        };
        
        // Log the guaranteed manual stop payload
        console.log(`🧪 GUARANTEED MANUAL STOP PAYLOAD FOR ${displayName.toUpperCase()} KASINA:`, guaranteedManualPayload);
        
        // Use our unified guaranteedSessionSave utility for consistency
        console.log(`🧿 MANUAL STOP: Using guaranteedSessionSave for ${displayName} (${minutesValue} min)`);
        
        guaranteedSessionSave(selectedKasina, minutesValue)
          .then(success => {
            if (success) {
              console.log(`✅ MANUAL STOP: Session saved successfully`);
            } else {
              console.error(`❌ MANUAL STOP: Session save failed`);
            }
          })
          .catch(error => {
            console.error(`❌ MANUAL STOP: Error saving session:`, error);
          });
        
        // Note: No toast notification here - guaranteedSessionSave will show one already
        // This prevents duplicate toast notifications
      } else {
        console.warn("Session too short to save - needs at least 31 seconds");
        if (elapsed > 0 && !tooShortNotifiedRef.current) {
          // Set flag to prevent multiple notifications 
          tooShortNotifiedRef.current = true;
          toast.info("Session was too short to save - minimum is 31 seconds");
        }
      }
    }
  };
  
  // Set up a timer ref to track duration
  const timerDurationRef = useRef<HTMLDivElement>(null);
  
  // Note: Manual save session functionality has been removed
  // Sessions are now saved automatically when the timer completes
  
  // Handle timer start to enable focus mode
  const handleTimerStart = () => {
    console.log("Timer started - activating focus mode");
    // Reset notification flags when a new timer starts
    tooShortNotifiedRef.current = false;
    sessionSavedRef.current = false;
    enableFocusMode();
  };
  
  // Helper function to get the appropriate color for the selected kasina
  const getColorForKasina = (type: KasinaType): string => {
    return KASINA_COLORS[type] || '#FFFFFF';
  };
  
  // Helper function to get the appropriate background color for the selected kasina
  const getBackgroundForKasina = (type: KasinaType): string => {
    return KASINA_BACKGROUNDS[type] || '#000000';
  };
  
  // Helper function to determine if we should apply special animation effects
  const shouldApplyAnimation = (type: KasinaType): boolean => {
    return [
      KASINA_TYPES.WATER, 
      KASINA_TYPES.AIR, 
      KASINA_TYPES.FIRE, 
      KASINA_TYPES.EARTH, 
      KASINA_TYPES.SPACE, 
      KASINA_TYPES.LIGHT
    ].includes(type);
  };
  
  // Get the appropriate animation class based on kasina type
  const getAnimationClass = (type: KasinaType): string => {
    switch(type) {
      case KASINA_TYPES.WATER:
        return 'water-animation';
      case KASINA_TYPES.AIR:
        return 'air-animation';
      case KASINA_TYPES.FIRE:
        return 'fire-animation';
      case KASINA_TYPES.EARTH:
        return 'earth-animation';
      case KASINA_TYPES.SPACE:
        return 'space-animation';
      case KASINA_TYPES.LIGHT:
        return 'light-animation';
      default:
        return '';
    }
  };
  
  return (
    <FocusMode>
      <div className="container mx-auto px-4 py-8" data-selected-kasina={selectedKasina}>
        <h1 className="text-3xl font-bold mb-6">Kasinas</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column - Kasina Selection */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Select Kasina</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <h3 className="font-medium col-span-2">Color Kasinas</h3>
                  <Button
                    variant={selectedKasina === KASINA_TYPES.WHITE ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.WHITE)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.WHITE ? KASINA_COLORS.white : 'transparent',
                      color: selectedKasina === KASINA_TYPES.WHITE ? 'black' : 'white'
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.WHITE]} White
                  </Button>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.BLUE ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.BLUE)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.BLUE ? KASINA_COLORS.blue : 'transparent' 
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.BLUE]} Blue
                  </Button>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.RED ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.RED)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.RED ? KASINA_COLORS.red : 'transparent' 
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.RED]} Red
                  </Button>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.YELLOW ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.YELLOW)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.YELLOW ? KASINA_COLORS.yellow : 'transparent',
                      color: selectedKasina === KASINA_TYPES.YELLOW ? 'black' : 'white'
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.YELLOW]} Yellow
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <h3 className="font-medium col-span-2">Element Kasinas</h3>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.WATER ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.WATER)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.WATER ? KASINA_COLORS.water : 'transparent' 
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.WATER]} Water
                  </Button>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.FIRE ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.FIRE)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.FIRE ? KASINA_COLORS.fire : 'transparent' 
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.FIRE]} Fire
                  </Button>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.AIR ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.AIR)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.AIR ? KASINA_COLORS.air : 'transparent',
                      color: selectedKasina === KASINA_TYPES.AIR ? 'black' : 'white'
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.AIR]} Air
                  </Button>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.EARTH ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.EARTH)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.EARTH ? KASINA_COLORS.earth : 'transparent' 
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.EARTH]} Earth
                  </Button>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.SPACE ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.SPACE)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.SPACE ? KASINA_COLORS.space : 'transparent' 
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.SPACE]} Space
                  </Button>
                  
                  <Button
                    variant={selectedKasina === KASINA_TYPES.LIGHT ? "default" : "outline"}
                    onClick={() => setSelectedKasina(KASINA_TYPES.LIGHT)}
                    className="w-full"
                    style={{ 
                      backgroundColor: selectedKasina === KASINA_TYPES.LIGHT ? KASINA_COLORS.light : 'transparent',
                      color: selectedKasina === KASINA_TYPES.LIGHT ? 'black' : 'white'
                    }}
                  >
                    {KASINA_EMOJIS[KASINA_TYPES.LIGHT]} Light
                  </Button>
                </div>
                
                {/* TEMPORARY TEST BUTTON - For direct session testing */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h3 className="font-medium mb-2">Debug Tools</h3>
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      // Create a guaranteed test session with the current kasina type
                      const normalizedType = selectedKasina.toLowerCase();
                      const displayName = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
                      
                      console.log(`🧪 TESTING DIRECT SESSION SAVE FOR ${displayName.toUpperCase()} KASINA`);
                      
                      // Create a test payload with guaranteed values
                      const testPayload = {
                        kasinaType: normalizedType,
                        kasinaName: `${displayName} (2-minutes)`,
                        duration: 120, // 2 minutes in seconds
                        durationInMinutes: 2,
                        timestamp: new Date().toISOString(),
                        _directTest: true // Flag to identify this as a direct test
                      };
                      
                      // Log the test payload
                      console.log(`🧪 TEST PAYLOAD:`, testPayload);
                      
                      // Use our unified guaranteedSessionSave utility
                      console.log(`🧿 TEST BUTTON: Using guaranteedSessionSave for ${selectedKasina} (2 min)`);
                      
                      guaranteedSessionSave(selectedKasina, 2)
                        .then(success => {
                          if (success) {
                            toast.success(`Test ${displayName} session saved successfully`);
                            console.log(`✅ TEST BUTTON: Session saved successfully`);
                          } else {
                            toast.error(`Failed to save test ${displayName} session`);
                            console.error(`❌ TEST BUTTON: Session save failed`);
                          }
                        })
                        .catch(error => {
                          toast.error(`Error saving test ${displayName} session`);
                          console.error(`❌ TEST BUTTON: Error saving session:`, error);
                        });
                    }}
                  >
                    🧪 Save Test {selectedKasina.charAt(0).toUpperCase() + selectedKasina.slice(1)} Session (2min)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right column - Kasina Orb */}
          <div className="flex-1 relative flex items-center justify-center rounded-lg" 
               style={{ minHeight: '400px' }}>
            <div className="w-full h-full" style={{ minHeight: '400px' }}>
              <KasinaOrb 
                type={typedKasina} 
                remainingTime={timeRemaining} 
              />
            </div>
          </div>
        </div>
        
        {/* Timer Controls - Below kasina selection and orb */}
        <div className="mt-8">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="simple">Timer</TabsTrigger>
            </TabsList>
            
            <TabsContent value="simple" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <SimpleTimer
                    onComplete={handleTimerComplete}
                    onUpdate={handleStatusUpdate}
                  />
                  <div ref={timerDurationRef} className="hidden simple-timer-duration"></div>
                </CardContent>
              </Card>
              
              {/* Sessions are now saved automatically when the timer completes */}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FocusMode>
  );
};

export default TimerKasinas;