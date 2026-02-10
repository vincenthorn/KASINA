import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { useKasina } from '../lib/stores/useKasina';
import { KASINA_NAMES, KASINA_TYPES, KASINA_COLORS, KASINA_BACKGROUNDS, KASINA_EMOJIS, KASINA_SERIES } from '../lib/constants';
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import CustomColorDialog from './CustomColorDialog';
import { useAuth } from '../lib/stores/useAuth';
import { sessionRecovery } from '../lib/sessionRecovery';

// Utility function to determine if a color is light or dark
// Used to set text color for better contrast
function isColorLight(color: string): boolean {
  // Default to false if color is invalid
  if (!color || color === 'transparent') return false;
  
  // Handle colors without # prefix
  const hex = color.charAt(0) === '#' ? color.substring(1) : color;
  
  // Handle both 3-digit and 6-digit hex codes
  const r = parseInt(hex.length === 3 ? hex.charAt(0) + hex.charAt(0) : hex.substring(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex.charAt(1) + hex.charAt(1) : hex.substring(2, 4), 16);
  const b = parseInt(hex.length === 3 ? hex.charAt(2) + hex.charAt(2) : hex.substring(4, 6), 16);
  
  // Calculate perceived brightness using the formula
  // (299*R + 587*G + 114*B) / 1000
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if the color is light (brightness > 128)
  return brightness > 128;
}

const TimerKasinas: React.FC = () => {
  const { selectedKasina, customColor, setSelectedKasina, setCustomColor, addSession } = useKasina();
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  const { timeRemaining, duration, isRunning } = useSimpleTimer();
  const { email, subscriptionType } = useAuth(); // Get user email and subscription type
  
  // Check if user is admin or premium
  const isAdmin = subscriptionType === "admin";
  
  // Check if current user is premium based on their actual subscription status
  const isPremium = subscriptionType === "premium" || subscriptionType === "admin";
  
  // State for kasina selection flow (matching breath kasinas)
  const [showKasinaSelection, setShowKasinaSelection] = useState(true);
  const [selectedKasinaSeries, setSelectedKasinaSeries] = useState('');
  const [kasinaSelectionStep, setKasinaSelectionStep] = useState<'series' | 'kasina'>('series');
  
  // Debug logging for marie.a.ramos@gmail.com specifically
  useEffect(() => {
    if (email === "marie.a.ramos@gmail.com") {
      console.log("🔍 MARIE DEBUG - email:", email);
      console.log("🔍 MARIE DEBUG - subscriptionType:", subscriptionType);
      console.log("🔍 MARIE DEBUG - isPremium:", isPremium);
      console.log("🔍 MARIE DEBUG - isAdmin:", isAdmin);
      console.log("🔍 MARIE DEBUG - typeof subscriptionType:", typeof subscriptionType);
      console.log("🔍 MARIE DEBUG - subscriptionType === 'premium':", subscriptionType === "premium");
      console.log("🔍 MARIE DEBUG - subscriptionType === 'admin':", subscriptionType === "admin");
    }
  }, [email, subscriptionType, isPremium, isAdmin]);
  
  // Add this ref to prevent multiple session saves
  const sessionSavedRef = useRef(false);
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("simple");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tempCustomColor, setTempCustomColor] = useState(customColor);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  
  // Convert selectedKasina to KasinaType
  const typedKasina = selectedKasina as KasinaType;
  
  // Handle kasina series selection
  const handleSeriesSelection = (series: string) => {
    setSelectedKasinaSeries(series);
    setKasinaSelectionStep('kasina');
  };

  // Handle individual kasina selection
  const handleKasinaSelection = (kasina: string) => {
    setSelectedKasina(kasina);
    setShowKasinaSelection(false);
    console.log(`🎨 Selected kasina: ${KASINA_NAMES[kasina]} (${kasina})`);
  };

  // Get kasinas for the selected series
  const getKasinasForSeries = (series: string) => {
    switch (series) {
      case 'COLOR':
        return KASINA_SERIES.COLOR;
      case 'ELEMENTAL':
        return KASINA_SERIES.ELEMENTAL;
      case 'VAJRAYANA':
        return KASINA_SERIES.VAJRAYANA;
      default:
        return [];
    }
  };

  // Handle custom color change from the color wheel picker
  const handleCustomColorChange = (newColor: string) => {
    setTempCustomColor(newColor);
    setCustomColor(newColor);
    
    // Update the color in the constants
    KASINA_COLORS[KASINA_TYPES.CUSTOM] = newColor;
  };

  // Handle custom color selection (when user clicks "Select Color" in dialog)
  const handleCustomColorSelect = () => {
    setSelectedKasina(KASINA_TYPES.CUSTOM);
    console.log(`🎨 Selected custom color: ${tempCustomColor}`);
  };
  
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
  
  // Reset session saved flag and default to White kasina when the component mounts
  useEffect(() => {
    sessionSavedRef.current = false;
    
    // Set White kasina as default when component mounts
    setSelectedKasina(KASINA_TYPES.WHITE);
    
    // Check for any sessions that need recovery
    sessionRecovery.checkForRecovery();
    
    // Reset saved flag when navigating or unmounting
    return () => {
      sessionSavedRef.current = false;
      sessionRecovery.clearSession();
    };
  }, []);
  
  // Keep tempCustomColor in sync with customColor from the store
  useEffect(() => {
    setTempCustomColor(customColor);
  }, [customColor]);
  
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
          
          // First, use our reliable guaranteedSessionSave utility to show exactly one notification
          // This also handles all the complicated notification and deduplication logic for us
          const savedSuccessfully = await guaranteedSessionSave(selectedKasina, minutes, true); // true = show notification
          
          // If the guaranteed method worked, we're done
          if (savedSuccessfully) {
            console.log("✅ Session saved via guaranteedSessionSave utility");
            return;
          }
          
          // If guaranteedSessionSave failed, try our legacy backup methods
          // But DON'T show any toast notifications from here - they should only come from guaranteedSessionSave
          
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
          
          // First attempt - direct API call (no toast here - already shown by guaranteedSessionSave)
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            console.log(`✅ WHOLE-MINUTE FIX: ${minutes}-${minuteText} session saved successfully`);
            sessionSavedRef.current = true;
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
            return;
          }
          
          // Both attempts failed, log error
          console.error("❌ All save attempts failed");
          // No toast notification here - guaranteedSessionSave already showed one
          
        } catch (error) {
          console.error("❌ Error saving whole-minute session:", error);
          // No toast notification here - guaranteedSessionSave already showed one
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
    
    guaranteedSessionSave(selectedKasina, minutesValue, true) // true = show notification
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
      
    return; // Exit the function - we're relying on guaranteedSessionSave for all saving
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
      const minutes = Math.max(1, Math.ceil(elapsed / 60)); // Use actual elapsed time instead of duration
      const minuteText = minutes === 1 ? "minute" : "minutes";
      
      console.log(`⚡ FORCE-STOP: Saving ${selectedKasina} session (${minutes} ${minuteText}) - Used actual elapsed time of ${elapsed}s`);
      
      // Use our guaranteed session save utility with explicit notification control
      guaranteedSessionSave(selectedKasina, minutes, true) // true = show notification
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
        
        guaranteedSessionSave(selectedKasina, minutesValue, true) // true = show notification
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
  
  // Add state for tab selection
  const [kasinaTab, setKasinaTab] = useState<string>("colors");

  return (
    <FocusMode>
      <div className="max-w-[1800px] mx-auto px-4 py-6 lg:py-8" data-selected-kasina={selectedKasina}>
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Visual Kasinas</h1>
        
        {/* New layout: Kasina visualization on top, selection and timer below */}
        <div className="flex flex-col gap-6">
          {/* Row 1: Kasina visualization (rectangular on desktop, square on mobile) */}
          <div className="w-full">
            <Card className="shadow-lg overflow-hidden p-0" 
                  style={{ 
                    backgroundColor: KASINA_BACKGROUNDS[typedKasina] || "#000000" 
                  }}>
              <div className="relative w-full">
                {/* On large screens - 16:9 aspect ratio for rectangular layout */}
                <div className="hidden md:block pb-[56.25%] w-full"></div>
                {/* On mobile - square aspect ratio */}
                <div className="md:hidden pb-[100%] w-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-full h-full ${selectedKasina === KASINA_TYPES.AIR ? 'air-kasina-container' : ''}`}>
                    <KasinaOrb 
                      type={typedKasina} 
                      remainingTime={timeRemaining} 
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Row 2: Kasina selection and Timer (side by side on desktop, stacked on mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1 - Kasina Selection with dropdown */}
            <div className="w-full order-1">
              <Card className="shadow-lg h-full">
                <div className="h-full flex flex-col">
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h2 className="text-xl font-semibold mb-4 text-white">Select Kasina</h2>
                    
                    {/* Dropdown selector for Kasina types with enhanced visuals */}
                    <div className="mb-5 relative">
                      <div className="absolute right-0 -top-6 text-yellow-300 text-sm">
                        ⬇️ Click to change
                      </div>
                      <Select value={kasinaTab} onValueChange={setKasinaTab}>
                        <SelectTrigger className="w-full bg-black/50 text-white border-2 border-white/60 focus:ring-white/40 shadow-md shadow-white/10 hover:border-yellow-300/70 hover:shadow-yellow-300/20 transition-all duration-300 py-3">
                          <SelectValue>
                            <span className="flex items-center">
                              {kasinaTab === 'colors' ? (
                                <>
                                  <span className="flex gap-1 mr-2">
                                    <span className="text-yellow-300">🟡</span>
                                  </span>
                                  <span>Color Kasinas</span>
                                </>
                              ) : kasinaTab === 'elements' ? (
                                <>
                                  <span className="flex gap-1 mr-2">
                                    <span>🌎</span>
                                  </span>
                                  <span>Elemental Kasinas</span>
                                </>
                              ) : kasinaTab === 'vajrayana' ? (
                                <>
                                  <span className="flex gap-1 mr-2">
                                    <span>💀</span>
                                  </span>
                                  <span>Vajrayana Kasinas</span>
                                </>
                              ) : (
                                <>
                                  <span className="flex gap-1 mr-2">
                                    <span className="text-yellow-300">🟡</span>
                                  </span>
                                  <span>Color Kasinas</span>
                                </>
                              )}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-black text-white border-white/60 shadow-lg shadow-white/10">
                          <SelectItem value="colors" className="hover:bg-white/10 focus:bg-white/10 py-2">
                            <span className="flex items-center">
                              <span className="flex gap-1 mr-2">
                                <span className="text-yellow-300">🟡</span>
                              </span>
                              <span>Color Kasinas</span>
                            </span>
                          </SelectItem>
                          <SelectItem value="elements" className="hover:bg-white/10 focus:bg-white/10 py-2">
                            <span className="flex items-center">
                              <span className="flex gap-1 mr-2">
                                <span>🌎</span>
                              </span>
                              <span>Elemental Kasinas</span>
                            </span>
                          </SelectItem>
                          {/* Vajrayana Kasinas - visible to everyone but with different states */}
                          <SelectItem value="vajrayana" className="hover:bg-white/10 focus:bg-white/10 py-2">
                            <span className="flex items-center">
                              <span className="flex gap-1 mr-2">
                                <span>💀</span>
                              </span>
                              <span>
                                Vajrayana Kasinas
                              </span>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Content area for selected type */}
                    <div className="flex-1 overflow-y-auto min-h-[300px]">
                      {/* Color Kasinas */}
                      {kasinaTab === 'colors' && (
                        <div className="flex flex-col gap-4 py-1">
                          {/* Standard Color Kasinas Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* White Kasina button */}
                            <Button
                              variant={selectedKasina === KASINA_TYPES.WHITE ? "default" : "outline"}
                              onClick={() => setSelectedKasina(KASINA_TYPES.WHITE)}
                              className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                              style={{ 
                                backgroundColor: selectedKasina === KASINA_TYPES.WHITE ? KASINA_COLORS.white : 'transparent',
                                color: selectedKasina === KASINA_TYPES.WHITE ? 'black' : 'white'
                              }}
                            >
                              <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.WHITE]}</span> 
                              <span>White</span>
                            </Button>
                            
                            {/* Blue Kasina button */}
                            <Button
                              variant={selectedKasina === KASINA_TYPES.BLUE ? "default" : "outline"}
                              onClick={() => setSelectedKasina(KASINA_TYPES.BLUE)}
                              className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                              style={{ 
                                backgroundColor: selectedKasina === KASINA_TYPES.BLUE ? KASINA_COLORS.blue : 'transparent' 
                              }}
                            >
                              <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.BLUE]}</span>
                              <span>Blue</span>
                            </Button>
                            
                            {/* Red Kasina button */}
                            <Button
                              variant={selectedKasina === KASINA_TYPES.RED ? "default" : "outline"}
                              onClick={() => setSelectedKasina(KASINA_TYPES.RED)}
                              className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                              style={{ 
                                backgroundColor: selectedKasina === KASINA_TYPES.RED ? KASINA_COLORS.red : 'transparent' 
                              }}
                            >
                              <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.RED]}</span>
                              <span>Red</span>
                            </Button>
                            
                            {/* Yellow Kasina button */}
                            <Button
                              variant={selectedKasina === KASINA_TYPES.YELLOW ? "default" : "outline"}
                              onClick={() => setSelectedKasina(KASINA_TYPES.YELLOW)}
                              className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                              style={{ 
                                backgroundColor: selectedKasina === KASINA_TYPES.YELLOW ? KASINA_COLORS.yellow : 'transparent',
                                color: selectedKasina === KASINA_TYPES.YELLOW ? 'black' : 'white'
                              }}
                            >
                              <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.YELLOW]}</span>
                              <span>Yellow</span>
                            </Button>
                          </div>
                          
                          {/* Custom Color Picker Section - Available to all users */}
                          <div className="mt-3">
                            <CustomColorDialog
                              isOpen={isColorDialogOpen}
                              onOpenChange={setIsColorDialogOpen}
                              customColor={tempCustomColor}
                              onColorChange={handleCustomColorChange}
                              onSelect={handleCustomColorSelect}
                            >
                              <Button
                                variant={selectedKasina === KASINA_TYPES.CUSTOM ? "default" : "outline"}
                                className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                                style={{ 
                                  backgroundColor: selectedKasina === KASINA_TYPES.CUSTOM ? customColor : 'transparent',
                                  color: selectedKasina === KASINA_TYPES.CUSTOM ? 
                                    (isColorLight(customColor) ? 'black' : 'white') : 'white'
                                }}
                              >
                                <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.CUSTOM]}</span>
                                <span>Custom Color</span>
                              </Button>
                            </CustomColorDialog>
                          </div>
                        </div>
                      )}
                      
                      {/* Elemental Kasinas */}
                      {kasinaTab === 'elements' && (
                        <div className="grid grid-cols-2 gap-3 py-1">
                          {/* Water Kasina button */}
                          <Button
                            variant={selectedKasina === KASINA_TYPES.WATER ? "default" : "outline"}
                            onClick={() => setSelectedKasina(KASINA_TYPES.WATER)}
                            className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                            style={{ 
                              backgroundColor: selectedKasina === KASINA_TYPES.WATER ? KASINA_COLORS.water : 'transparent' 
                            }}
                          >
                            <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.WATER]}</span>
                            <span>Water</span>
                          </Button>
                          
                          {/* Fire Kasina button */}
                          <Button
                            variant={selectedKasina === KASINA_TYPES.FIRE ? "default" : "outline"}
                            onClick={() => setSelectedKasina(KASINA_TYPES.FIRE)}
                            className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                            style={{ 
                              backgroundColor: selectedKasina === KASINA_TYPES.FIRE ? KASINA_COLORS.fire : 'transparent' 
                            }}
                          >
                            <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.FIRE]}</span>
                            <span>Fire</span>
                          </Button>
                          
                          {/* Air Kasina button */}
                          <Button
                            variant={selectedKasina === KASINA_TYPES.AIR ? "default" : "outline"}
                            onClick={() => setSelectedKasina(KASINA_TYPES.AIR)}
                            className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                            style={{ 
                              backgroundColor: selectedKasina === KASINA_TYPES.AIR ? KASINA_COLORS.air : 'transparent',
                              color: selectedKasina === KASINA_TYPES.AIR ? 'black' : 'white'
                            }}
                          >
                            <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.AIR]}</span>
                            <span>Air</span>
                          </Button>
                          
                          {/* Earth Kasina button */}
                          <Button
                            variant={selectedKasina === KASINA_TYPES.EARTH ? "default" : "outline"}
                            onClick={() => setSelectedKasina(KASINA_TYPES.EARTH)}
                            className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                            style={{ 
                              backgroundColor: selectedKasina === KASINA_TYPES.EARTH ? KASINA_COLORS.earth : 'transparent' 
                            }}
                          >
                            <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.EARTH]}</span>
                            <span>Earth</span>
                          </Button>
                          
                          {/* Space Kasina button */}
                          <Button
                            variant={selectedKasina === KASINA_TYPES.SPACE ? "default" : "outline"}
                            onClick={() => setSelectedKasina(KASINA_TYPES.SPACE)}
                            className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                            style={{ 
                              backgroundColor: selectedKasina === KASINA_TYPES.SPACE ? KASINA_COLORS.space : 'transparent' 
                            }}
                          >
                            <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.SPACE]}</span>
                            <span>Space</span>
                          </Button>
                          
                          {/* Light Kasina button */}
                          <Button
                            variant={selectedKasina === KASINA_TYPES.LIGHT ? "default" : "outline"}
                            onClick={() => setSelectedKasina(KASINA_TYPES.LIGHT)}
                            className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                            style={{ 
                              backgroundColor: selectedKasina === KASINA_TYPES.LIGHT ? KASINA_COLORS.light : 'transparent',
                              color: selectedKasina === KASINA_TYPES.LIGHT ? 'black' : 'white'
                            }}
                          >
                            <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.LIGHT]}</span>
                            <span>Light</span>
                          </Button>
                        </div>
                      )}
                      
                      {/* Vajrayana Kasinas - With different content based on user type */}
                      {kasinaTab === 'vajrayana' && (
                        <div className="py-1">
                            <div className="grid grid-cols-2 gap-3">
                              {/* OM Kasina button */}
                              <Button
                                variant={selectedKasina === KASINA_TYPES.OM_KASINA ? "default" : "outline"}
                                onClick={() => setSelectedKasina(KASINA_TYPES.OM_KASINA)}
                                className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                                style={{ 
                                  backgroundColor: selectedKasina === KASINA_TYPES.OM_KASINA ? KASINA_COLORS[KASINA_TYPES.OM_KASINA] : 'transparent',
                                  color: selectedKasina === KASINA_TYPES.OM_KASINA ? 'black' : 'white'
                                }}
                              >
                                <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.OM_KASINA]}</span>
                                <span>OM</span>
                              </Button>
                              
                              {/* AH Kasina button */}
                              <Button
                                variant={selectedKasina === KASINA_TYPES.AH_KASINA ? "default" : "outline"}
                                onClick={() => setSelectedKasina(KASINA_TYPES.AH_KASINA)}
                                className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                                style={{ 
                                  backgroundColor: selectedKasina === KASINA_TYPES.AH_KASINA ? KASINA_COLORS[KASINA_TYPES.AH_KASINA] : 'transparent',
                                  color: 'white'
                                }}
                              >
                                <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.AH_KASINA]}</span>
                                <span>AH</span>
                              </Button>
                              
                              {/* HUM Kasina button */}
                              <Button
                                variant={selectedKasina === KASINA_TYPES.HUM_KASINA ? "default" : "outline"}
                                onClick={() => setSelectedKasina(KASINA_TYPES.HUM_KASINA)}
                                className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                                style={{ 
                                  backgroundColor: selectedKasina === KASINA_TYPES.HUM_KASINA ? KASINA_COLORS[KASINA_TYPES.HUM_KASINA] : 'transparent',
                                  color: 'white'
                                }}
                              >
                                <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.HUM_KASINA]}</span>
                                <span>HUM</span>
                              </Button>
                              
                              {/* White A Kasina button */}
                              <Button
                                variant={selectedKasina === KASINA_TYPES.WHITE_A_KASINA ? "default" : "outline"}
                                onClick={() => setSelectedKasina(KASINA_TYPES.WHITE_A_KASINA)}
                                className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                                style={{ 
                                  backgroundColor: selectedKasina === KASINA_TYPES.WHITE_A_KASINA ? KASINA_COLORS[KASINA_TYPES.WHITE_A_KASINA] : 'transparent',
                                  color: selectedKasina === KASINA_TYPES.WHITE_A_KASINA ? 'black' : 'white'
                                }}
                              >
                                <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.WHITE_A_KASINA]}</span>
                                <span>White A</span>
                              </Button>
                              
                              {/* Clear Light Kasina button */}
                              <Button
                                variant={selectedKasina === KASINA_TYPES.WHITE_A_THIGLE ? "default" : "outline"}
                                onClick={() => setSelectedKasina(KASINA_TYPES.WHITE_A_THIGLE)}
                                className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                                style={{ 
                                  backgroundColor: selectedKasina === KASINA_TYPES.WHITE_A_THIGLE ? KASINA_COLORS[KASINA_TYPES.WHITE_A_THIGLE] : 'transparent',
                                  color: selectedKasina === KASINA_TYPES.WHITE_A_THIGLE ? 'black' : 'white'
                                }}
                              >
                                <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.WHITE_A_THIGLE]}</span>
                                <span>Clear Light</span>
                              </Button>
                              
                              {/* Rainbow Kasina button */}
                              <Button
                                variant={selectedKasina === KASINA_TYPES.RAINBOW_KASINA ? "default" : "outline"}
                                onClick={() => setSelectedKasina(KASINA_TYPES.RAINBOW_KASINA)}
                                className="w-full h-[70px] flex items-center justify-center gap-2 text-sm md:text-base"
                                style={{ 
                                  backgroundColor: selectedKasina === KASINA_TYPES.RAINBOW_KASINA ? KASINA_COLORS[KASINA_TYPES.RAINBOW_KASINA] : 'transparent',
                                  color: 'white'
                                }}
                              >
                                <span className="text-2xl">{KASINA_EMOJIS[KASINA_TYPES.RAINBOW_KASINA]}</span>
                                <span>Rainbow</span>
                              </Button>
                            </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
            
            {/* Column 2 - Timer */}
            <div className="w-full order-2">
              <Card className="shadow-lg h-full">
                <div className="h-full flex flex-col">
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="text-center text-xl font-medium mb-4 text-white">Timer</h3>
                    
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-full max-w-[350px] mx-auto">
                        <SimpleTimer
                          onComplete={handleTimerComplete}
                          onUpdate={handleStatusUpdate}
                        />
                      </div>
                    </div>
                    
                    <div ref={timerDurationRef} className="hidden simple-timer-duration"></div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </FocusMode>
  );
};

export default TimerKasinas;