import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { toast } from 'sonner';

import KasinaOrb from '../components/KasinaOrb';
import { useKasina } from '../lib/stores/useKasina';
import { KasinaType, getOrbConfig } from '../lib/types';
import { KASINA_NAMES } from '../lib/constants';
import Timer from '../lib/Timer';

import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const Freestyle = () => {
  const { selectedKasina, setSelectedKasina, saveSession } = useKasina();
  const typedKasina = selectedKasina as KasinaType;  // Cast to KasinaType for type safety
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number | null>(5 * 60); // Default 5 minutes
  const [timeRemaining, setTimeRemaining] = useState<number | null>(timerDuration);
  const [countUpTime, setCountUpTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("color");

  // Reset timer when changing kasina
  useEffect(() => {
    setTimerRunning(false);
    setTimeRemaining(timerDuration);
    setCountUpTime(0);
  }, [selectedKasina, timerDuration]);

  const handleTimerComplete = () => {
    console.log("TIMER COMPLETE TRIGGERED");
    console.log("timeRemaining:", timeRemaining);
    console.log("timerDuration:", timerDuration);
    console.log("countUpTime:", countUpTime);
    console.log("selectedKasina:", selectedKasina);

    setTimerRunning(false);
    toast.success("Meditation session complete");
    
    // Save session data
    try {
      if (timeRemaining === 0) {
        // Fixed duration mode that just completed
        console.log("Saving fixed duration session");
        if (timerDuration !== null) {
          saveSession({
            kasinaType: typedKasina,
            duration: timerDuration,
            date: new Date(),
          });
        }
      } else if (timeRemaining === null) {
        // Infinity mode (counting up)
        console.log("Saving infinity mode session");
        saveSession({
          kasinaType: typedKasina, 
          duration: countUpTime,
          date: new Date(),
        });
      } else {
        // Partial session - calculate actual duration
        if (timerDuration !== null) {
          const actualDuration = timerDuration - timeRemaining;
          console.log("Saving partial session with duration:", actualDuration);
          saveSession({
            kasinaType: typedKasina,
            duration: actualDuration,
            date: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("Error in handleTimerComplete:", error);
      toast.error("Failed to save your session. Please try again.");
    }
  };

  const handleTimerUpdate = (remaining: number | null, elapsed: number) => {
    // Handle infinite timer (null) vs countdown timer differently
    console.log("Timer update - remaining:", remaining, "elapsed:", elapsed);
    if (remaining === null) {
      console.log("Infinity mode timer update");
      setTimeRemaining(null);
      setCountUpTime(elapsed);
    } else {
      setTimeRemaining(remaining);
    }
  };

  const timerOptions = [
    { value: 60, label: "1 min" },
    { value: 300, label: "5 min" },
    { value: 600, label: "10 min" },
    { value: 900, label: "15 min" },
    { value: 1200, label: "20 min" },
    { value: null, label: "∞" },
  ];

  const orbConfig = getOrbConfig(typedKasina);

  return (
    <div className="h-full w-full bg-black text-white flex flex-col">
      <div className="flex flex-col md:flex-row h-full">
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-gray-900 p-4 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Freestyle</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Select Kasina Orb</h3>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-2">
                <TabsTrigger value="color">Color</TabsTrigger>
                <TabsTrigger value="elemental">Elemental</TabsTrigger>
              </TabsList>
              
              <TabsContent value="color" className="mt-0">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "white" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-white to-gray-100 text-gray-700 font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("white")}
                  >
                    <span className="block">⚪ White</span>
                  </button>
                  
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "blue" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("blue")}
                  >
                    <span className="block">🔵 Blue</span>
                  </button>
                  
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "red" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-red-500 to-red-700 text-white font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("red")}
                  >
                    <span className="block">🔴 Red</span>
                  </button>
                  
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "yellow" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-800 font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("yellow")}
                  >
                    <span className="block">🟡 Yellow</span>
                  </button>
                </div>
              </TabsContent>
              
              <TabsContent value="elemental" className="mt-0">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "water" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-sky-400 to-blue-600 text-white font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("water")}
                  >
                    <span className="block">💧 Water</span>
                  </button>
                  
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "air" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-gray-200 to-blue-100 text-gray-700 font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("air")}
                  >
                    <span className="block">💨 Air</span>
                  </button>
                  
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "fire" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-orange-500 to-red-600 text-white font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("fire")}
                  >
                    <span className="block">🔥 Fire</span>
                  </button>
                  
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "earth" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-green-700 to-amber-900 text-white font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("earth")}
                  >
                    <span className="block">🌎 Earth</span>
                  </button>
                  
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "space" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-indigo-900 to-purple-900 text-white font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("space")}
                  >
                    <span className="block">✨ Space</span>
                  </button>
                  
                  <button
                    className={`relative p-4 rounded border-2 ${selectedKasina === "light" ? "border-gray-300" : "border-transparent"} bg-gradient-to-br from-yellow-200 to-amber-100 text-amber-800 font-semibold shadow transition-all hover:shadow-md`}
                    onClick={() => setSelectedKasina("light")}
                  >
                    <span className="block">☀️ Light</span>
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Timer</h3>
            <div className="grid grid-cols-3 gap-2">
              {timerOptions.map((option) => (
                <Button
                  key={option.label}
                  variant={timerDuration === option.value ? "default" : "outline"}
                  onClick={() => {
                    console.log("Setting timer duration to:", option.value);
                    setTimerDuration(option.value);
                    // Log the current state for debugging
                    console.log("timerDuration after setting:", option.value);
                    console.log("Is infinity mode:", option.value === null);
                  }}
                  disabled={timerRunning}
                  className="w-full"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <Timer 
              duration={timerDuration}
              running={timerRunning}
              onComplete={handleTimerComplete}
              onUpdate={handleTimerUpdate}
            />
            
            <Button
              onClick={() => {
                console.log("Start/Pause button clicked");
                console.log("Current running state:", timerRunning);
                console.log("Changing to:", !timerRunning);
                console.log("Current timerDuration:", timerDuration);
                console.log("Is infinity mode:", timerDuration === null);
                setTimerRunning(!timerRunning);
              }}
              className="w-full mt-4"
              size="lg"
            >
              {timerRunning ? "Pause" : "Start Meditation"}
            </Button>
            
            <Button
              onClick={() => {
                // Only allow saving if timer has run
                if (countUpTime === 0 && timeRemaining === timerDuration && !timerRunning) {
                  toast.error("Start a meditation first before saving");
                  return;
                }
                
                // Record current session manually
                let duration = 0;
                if (timeRemaining === null) {
                  duration = countUpTime;
                } else if (timerDuration !== null) {
                  duration = timerDuration - (timeRemaining || 0);
                }
                
                try {
                  // Create the session object
                  const newSession = {
                    id: Date.now().toString(),
                    kasinaType: typedKasina,
                    kasinaName: KASINA_NAMES[typedKasina] || typedKasina,
                    duration: duration,
                    timestamp: new Date().toISOString()
                  };
                  
                  console.log("SAVING SESSION", newSession);
                  
                  // APPROACH 1: Direct localStorage manipulation with detailed debugging
                  try {
                    // Get existing sessions with careful error handling
                    let existingSessions = [];
                    
                    const storedValue = window.localStorage.getItem("sessions");
                    console.log("Raw localStorage value:", storedValue);
                    
                    if (storedValue) {
                      try {
                        const parsed = JSON.parse(storedValue);
                        if (Array.isArray(parsed)) {
                          existingSessions = parsed;
                        } else {
                          console.warn("Stored sessions is not an array, resetting:", parsed);
                        }
                      } catch (parseError) {
                        console.error("Parse error on localStorage, resetting:", parseError);
                      }
                    }
                    
                    // Add new session
                    existingSessions.push(newSession);
                    console.log("Updated sessions array:", existingSessions);
                    
                    // Save back to localStorage with explicit window reference
                    const sessionsString = JSON.stringify(existingSessions);
                    window.localStorage.setItem("sessions", sessionsString);
                    
                    // Verify the save worked
                    const verification = window.localStorage.getItem("sessions");
                    console.log("Verification - localStorage after save:", verification);
                  } catch (localStorageError) {
                    console.error("LocalStorage error:", localStorageError);
                  }
                  
                  // APPROACH 2: Use the Zustand store method
                  try {
                    // Use the store's saveSession method - this handles server sync
                    saveSession({
                      kasinaType: typedKasina,
                      duration: duration,
                      date: new Date(),
                    });
                    console.log("Session saved via store");
                  } catch (storeError) {
                    console.error("Store save error:", storeError);
                  }
                  
                  toast.success("Meditation session saved");
                  
                  // Stop timer after saving
                  setTimerRunning(false);
                } catch (error) {
                  console.error("Error saving session:", error);
                  toast.error("Failed to save session");
                }
              }}
              className="w-full mt-2"
              variant="secondary"
            >
              Save Session
            </Button>
          </div>
        </div>
        
        {/* Canvas */}
        <div className="flex-1 relative">
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={0.8} />
            <KasinaOrb
              type={typedKasina}
              color={orbConfig.color}
              speed={orbConfig.speed}
              complexity={orbConfig.complexity}
            />
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>
        </div>
      </div>
    </div>
  );
};

export default Freestyle;