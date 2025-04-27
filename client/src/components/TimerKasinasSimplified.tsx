import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useKasina } from '../lib/stores/useKasina';
import { KasinaType, ensureValidKasinaType } from '../lib/types';
import { useFocusMode } from '../lib/stores/useFocusMode';
import SimpleTimer from './SimpleTimer';
import FocusMode from './FocusMode';
import KasinaOrb from './KasinaOrb';
import SimpleWhiteKasinaTimer from './SimpleWhiteKasinaTimer';
import { toast } from 'sonner';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';

const TimerKasinasSimplified: React.FC = () => {
  const { selectedKasina, setSelectedKasina, addSession } = useKasina();
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  const { timeRemaining } = useSimpleTimer();
  
  // Add this ref to prevent multiple session saves
  const sessionSavedRef = useRef(false);
  
  // Add a unique key for the orb rendering to force re-initialization when needed
  const [orbKey, setOrbKey] = useState<string>(() => `kasina-orb-initial-${Date.now()}`);
  
  // Track fadeout effect for white kasina
  const [whiteFadeOutIntensity, setWhiteFadeOutIntensity] = useState(0);
  const [selectedTab, setSelectedTab] = useState<string>("simple");
  
  // Convert selectedKasina to KasinaType using our validation utility
  const typedKasina = ensureValidKasinaType(selectedKasina);
  
  // Debug logging
  useEffect(() => {
    console.log("SIMPLIFIED VERSION: Selected kasina type:", typedKasina);
    console.log("SIMPLIFIED VERSION: Is white?", typedKasina === 'white');
    
    // Reset session saved flag when mounting or changing kasina type
    sessionSavedRef.current = false;
  }, [typedKasina]);
  
  // Handle regular timer completion
  const handleTimerComplete = () => {
    console.log("Regular timer completed");
    
    // Exit focus mode
    disableFocusMode();
    
    // Generate a new orbKey to force a complete re-initialization
    const newOrbKey = `kasina-orb-${Date.now()}-complete`;
    setOrbKey(newOrbKey);
    
    // Only save if we haven't already
    if (!sessionSavedRef.current) {
      sessionSavedRef.current = true;
      
      // Create session payload with 60 seconds for simplicity
      const sessionPayload = {
        kasinaType: selectedKasina,
        kasinaName: `${selectedKasina.charAt(0).toUpperCase() + selectedKasina.slice(1)} (1-minute)`,
        duration: 60,
        timestamp: new Date().toISOString()
      };
      
      // Send to the server
      addSession(sessionPayload as any);
      
      // Show success notification
      toast.success(`Meditation session saved.`);
    }
  };
  
  // Track timer status
  const handleStatusUpdate = (remaining: number | null, elapsed: number) => {
    // This is intentionally simplified
    console.log("Timer update:", { remaining, elapsed });
  };
  
  return (
    <FocusMode>
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-6">Kasina Meditation</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Orb column */}
          <div className="flex-1 relative flex items-center justify-center">
            <KasinaOrb 
              key={orbKey}
              type={typedKasina} 
              remainingTime={timeRemaining}
              fadeOutIntensity={typedKasina === 'white' ? whiteFadeOutIntensity : 0}
            />
          </div>
        </div>
        
        {/* Timer Controls */}
        <div className="mt-8">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="simple">Timer</TabsTrigger>
            </TabsList>
            
            <TabsContent value="simple" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  {/* Debug indicator */}
                  <div className="text-center mb-4">
                    <div className="text-sm text-gray-400">
                      Selected: {typedKasina} | Is White? {typedKasina === 'white' ? 'Yes' : 'No'}
                    </div>
                  </div>
                  
                  {/* Timer component selection based on kasina type */}
                  {typedKasina === 'white' ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="text-2xl text-white">White Kasina Timer</div>
                      <div className="mt-4">
                        <SimpleWhiteKasinaTimer
                          onComplete={() => {
                            console.log("WHITE KASINA DEDICATED TIMER COMPLETED");
                            
                            // Only save if we haven't already
                            if (!sessionSavedRef.current) {
                              sessionSavedRef.current = true;
                              
                              // Create session payload with exactly 1 minute
                              const sessionPayload = {
                                kasinaType: 'white',
                                kasinaName: 'White (1-minute)',
                                duration: 60,
                                timestamp: new Date().toISOString()
                              };
                              
                              // Send to the server
                              addSession(sessionPayload as any);
                              
                              // Show success notification
                              toast.success(`White kasina meditation completed.`);
                              
                              // Generate a new orbKey
                              const newOrbKey = `kasina-orb-${Date.now()}-whitedone`;
                              setOrbKey(newOrbKey);
                            }
                          }}
                          onFadeOutChange={(intensity: number) => {
                            console.log(`Setting white kasina fadeout intensity to ${intensity}`);
                            setWhiteFadeOutIntensity(intensity);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <SimpleTimer
                      onComplete={handleTimerComplete}
                      onUpdate={handleStatusUpdate}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FocusMode>
  );
};

export default TimerKasinasSimplified;