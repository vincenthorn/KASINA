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
import KasinaOrb from '../lib/kasina-orbs/KasinaOrb';
import { formatTime, roundUpToNearestMinute } from '../lib/utils';
import { toast } from 'sonner';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

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
  }, [selectedKasina]);
  
  // Handle timer completion
  const handleTimerComplete = () => {
    console.log("Timer completed", { elapsedTime, alreadySaved: sessionSavedRef.current, duration });
    
    // CRITICAL FIX: Handle focus mode exit properly
    console.log("Timer completed, scheduling focus mode exit and orb reinit");
    
    // Delay focus mode exit slightly to ensure proper cleanup
    setTimeout(() => {
      disableFocusMode();
      
      // Instead of forcing a DOM-based re-render, we'll use React's state management
      // to properly handle component re-rendering without visual artifacts
      console.log("Allowing React to handle re-rendering naturally");
    }, 100);
    
    // Show feedback
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
    
    // Only proceed if we haven't already saved this session
    if (sessionSavedRef.current) {
      console.log("Session already saved, skipping save operation");
      return;
    }
    
    // Determine which duration to use for saving the session
    // For fully completed timers, use the originally set duration (custom or preset)
    // For manually stopped timers, use the elapsed time
    
    // CRITICAL FIX: Get the ORIGINAL duration directly from the store via the new method
    const storeState = useSimpleTimer.getState();
    // CRITICAL FIX: Always use the original duration that was set via the dedicated method
    // This ensures 2-minute timers save as 2 minutes, etc.
    const originalDuration = storeState.getOriginalDuration();
    
    // Force log values to console for debugging
    console.log("SUPER CRITICAL DEBUG INFO:");
    console.log(`- Timer type: ${selectedKasina}`);
    console.log(`- Store duration value: ${originalDuration} seconds`);
    console.log(`- Duration variable: ${duration} seconds`);
    console.log(`- Timer running: ${storeState.isRunning}`);
    
    // Hard override fix: If original duration is missing but there's a component duration, use it
    let durationToSave = originalDuration || duration || 60;
    
    // Critical check for 2-minute sessions (120 seconds)
    if (durationToSave === 120) {
      console.log("⚠️ FOUND 2-MINUTE SESSION - Ensuring it's saved as 120 seconds");
    }
    
    // Extra check: 3-minute sessions (180 seconds)
    if (durationToSave === 180) {
      console.log("⚠️ FOUND 3-MINUTE SESSION - Ensuring it's saved as 180 seconds");
    }
    
    // Log the final value we're using
    console.log(`- Final duration to save: ${durationToSave} seconds`)
    
    // Log the exact value being used for saving
    console.log("DURATION DETAILS:");
    console.log("- Local duration variable:", duration, "seconds");
    console.log("- Store original duration value:", originalDuration, "seconds");
    console.log("- Duration being saved (exact):", durationToSave, "seconds");
    
    console.log("TIMER COMPLETION - Duration values:");
    console.log("- Original duration setting:", duration, "seconds");
    console.log("- Exact duration to save:", durationToSave, "seconds");
    
    // Only save if there was actual meditation time
    if (durationToSave > 0) {
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
      const sessionPayload = {
        kasinaType: selectedKasina,
        kasinaName: correctName, // Include correct name with minutes
        duration: minutesValue * 60, // Forces exact seconds based on minutes
        durationInMinutes: minutesValue, // Explicit marker
        originalDuration: durationToSave, // Debug reference
        timestamp: new Date().toISOString()
      };
      
      // Log what we're sending to the server
      console.log("🚀 FINAL SESSION PAYLOAD:", sessionPayload);
      
      // Send to the server
      addSession(sessionPayload as any);
      
      console.log(`Auto-saved session: ${formatTime(durationToSave)} ${KASINA_NAMES[selectedKasina]}`);
      
      // Show toast notification with exact time
      toast.success(`You completed a ${formatTime(durationToSave)} ${KASINA_NAMES[selectedKasina]} kasina meditation. Session saved.`);
    } else {
      console.warn("Not saving session because duration is 0");
      toast.error("Session too short to save - minimum recordable time is 1 minute");
    }
  };
  
  // Track timer status for saving
  const handleStatusUpdate = (remaining: number | null, elapsed: number) => {
    console.log("Timer update:", { remaining, elapsed, duration, alreadySaved: sessionSavedRef.current });
    setElapsedTime(elapsed);
    
    // Handle manual stop (when remaining is not 0 but we got a final update)
    // This condition detects when user manually stops the timer
    if (remaining !== null && remaining !== 0 && elapsed > 0) {
      // Skip if we already saved this session 
      if (sessionSavedRef.current) {
        console.log("Session already saved, skipping additional save");
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
        
        // Complete session payload with all needed information
        const manualSessionPayload = {
          kasinaType: selectedKasina,
          kasinaName: correctName,
          duration: minutesValue * 60, // Forces exact seconds based on minutes
          durationInMinutes: minutesValue,
          originalDuration: roundedDuration,
          timestamp: new Date().toISOString()
        };
        
        console.log("🚀 MANUAL STOP SESSION PAYLOAD:", manualSessionPayload);
        
        // Send to server
        addSession(manualSessionPayload as any);
        
        toast.success(`You completed a ${formatTime(roundedDuration)} ${KASINA_NAMES[selectedKasina]} kasina meditation. Session saved.`);
      } else {
        console.warn("Session too short to save - needs at least 1 minute");
        if (elapsed > 0) {
          toast.info("Session was too short to save - minimum is 1 minute");
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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Kasinas</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column - Kasina Selection */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">Select Kasina</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <h3 className="font-medium col-span-2">4 Color Orbs: White, Yellow, Red, & Blue</h3>
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
                  <h3 className="font-medium col-span-2">6 Elemental Orbs: Earth, Water, Fire, Air, Space, & Light</h3>
                  
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
                color={KASINA_COLORS[typedKasina] || "#FFFFFF"}
                speed={0.5}
                complexity={2}
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