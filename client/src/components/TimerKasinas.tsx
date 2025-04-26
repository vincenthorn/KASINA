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
import { formatTime, roundUpToNearestMinute } from '../lib/utils';
import { toast } from 'sonner';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

const TimerKasinas: React.FC = () => {
  const { selectedKasina, setSelectedKasina, addSession } = useKasina();
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  const { timeRemaining } = useSimpleTimer();
  
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
    console.log("Timer completed", { elapsedTime, alreadySaved: sessionSavedRef.current });
    
    // Disable focus mode when timer completes
    disableFocusMode();
    
    // Show feedback
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
    
    // Only proceed if we haven't already saved this session
    if (sessionSavedRef.current) {
      console.log("Session already saved, skipping save operation");
      return;
    }
    
    // Automatically save the session with rounded duration
    const roundedElapsedTime = roundUpToNearestMinute(elapsedTime);
    console.log("Rounded elapsed time:", roundedElapsedTime);
    
    // Only save if there was actual meditation time
    if (roundedElapsedTime > 0) {
      console.log("Saving session with data:", {
        kasinaType: selectedKasina,
        duration: roundedElapsedTime
      });
      
      // Mark as saved before the API call to prevent duplicates
      sessionSavedRef.current = true;
      
      addSession({
        kasinaType: selectedKasina,
        duration: roundedElapsedTime
      });
      
      console.log(`Auto-saved session: ${formatTime(roundedElapsedTime)} ${KASINA_NAMES[selectedKasina]}`);
      
      // Show toast notification with rounded time
      toast.success(`You completed a ${formatTime(roundedElapsedTime)} ${KASINA_NAMES[selectedKasina]} kasina meditation. Session saved.`);
    } else {
      console.warn("Not saving session because roundedElapsedTime is 0");
      toast.error("Session too short to save - minimum recordable time is 1 minute");
    }
  };
  
  // Track timer status for saving
  const handleStatusUpdate = (remaining: number | null, elapsed: number) => {
    console.log("Timer update:", { remaining, elapsed, alreadySaved: sessionSavedRef.current });
    setElapsedTime(elapsed);
    
    // Handle manual stop (when remaining is not 0 but we got a final update)
    // This condition detects when user manually stops the timer
    if (remaining !== null && remaining !== 0 && elapsed > 0) {
      // Skip if we already saved this session 
      if (sessionSavedRef.current) {
        console.log("Session already saved, skipping additional save");
        return;
      }
      
      // This happens when the user manually stops the timer
      // Let's save the session if it's at least 1 minute long
      const roundedElapsedTime = roundUpToNearestMinute(elapsed);
      
      if (roundedElapsedTime >= 60) {
        console.log("Manual stop detected - saving session with data:", {
          kasinaType: selectedKasina,
          duration: roundedElapsedTime
        });
        
        // Mark as saved before the API call to prevent duplicates
        sessionSavedRef.current = true;
        
        addSession({
          kasinaType: selectedKasina,
          duration: roundedElapsedTime
        });
        
        toast.success(`You completed a ${formatTime(roundedElapsedTime)} ${KASINA_NAMES[selectedKasina]} kasina meditation. Session saved.`);
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
        <h1 className="text-3xl font-bold mb-6">Kasinas Meditation</h1>
        
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
                    initialDuration={60}
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