import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import KasinaOrb from '../components/KasinaOrb';
import { useKasina } from '../lib/stores/useKasina';
import { KasinaType, getOrbConfig } from '../lib/types';
import { KASINA_NAMES } from '../lib/constants';

import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Clock, Play, Pause, Square } from 'lucide-react';

const Freestyle = () => {
  const navigate = useNavigate();
  const { selectedKasina, setSelectedKasina, saveSession } = useKasina();
  const typedKasina = selectedKasina as KasinaType;  // Cast to KasinaType for type safety
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number>(5 * 60); // Default 5 minutes
  const [timeRemaining, setTimeRemaining] = useState<number>(5 * 60);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("color");
  const timerRef = useRef<number | null>(null);

  // Reset timer when changing kasina
  useEffect(() => {
    // Stop the timer if it's running
    if (timerRunning) {
      stopTimer();
    }
    
    // Reset the timer values
    setTimerRunning(false);
    setTimeRemaining(timerDuration);
    setElapsedTime(0);
  }, [selectedKasina]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Start the timer
  const startTimer = () => {
    if (timerRef.current !== null) return; // Timer already running
    
    console.log("Starting timer with duration:", timerDuration);
    const startTime = Date.now();
    
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000) + elapsedTime;
      setElapsedTime(elapsed);
      
      const remaining = Math.max(0, timerDuration - elapsed);
      setTimeRemaining(remaining);
      
      console.log(`Timer update - Elapsed: ${elapsed}s, Remaining: ${remaining}s`);
      
      // Check if timer should end
      if (remaining <= 0) {
        completeTimer();
      }
    }, 1000);
    
    setTimerRunning(true);
  };
  
  // Stop the timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerRunning(false);
  };
  
  // Reset the timer
  const resetTimer = () => {
    stopTimer();
    setTimeRemaining(timerDuration);
    setElapsedTime(0);
  };
  
  // Handle timer completion
  const completeTimer = () => {
    stopTimer();
    setTimeRemaining(0);
    
    toast.success("Meditation session complete");
    console.log("Timer completed with duration:", timerDuration);
    
    // Save session data
    try {
      saveSession({
        kasinaType: typedKasina,
        duration: timerDuration,
        date: new Date(),
      });
    } catch (error) {
      console.error("Error saving completed session:", error);
      toast.error("Failed to save your session. Please try again.");
    }
  };
  
  // Handle manual save
  const saveCurrentSession = () => {
    // Only allow saving if timer has run
    if (elapsedTime === 0 && !timerRunning) {
      toast.error("Start a meditation first before saving");
      return;
    }
    
    try {
      const duration = timerDuration - timeRemaining;
      console.log("Saving session with duration:", duration);
      
      // Create the session object
      const newSession = {
        id: Date.now().toString(),
        kasinaType: typedKasina,
        kasinaName: KASINA_NAMES[typedKasina] || typedKasina,
        duration: duration,
        timestamp: new Date().toISOString()
      };
      
      // Store in localStorage
      let existingSessions = [];
      const storedValue = window.localStorage.getItem("sessions");
      
      if (storedValue) {
        try {
          const parsed = JSON.parse(storedValue);
          if (Array.isArray(parsed)) {
            existingSessions = parsed;
          }
        } catch (error) {
          console.error("Parse error:", error);
        }
      }
      
      existingSessions.push(newSession);
      window.localStorage.setItem("sessions", JSON.stringify(existingSessions));
      
      // Use store method
      saveSession({
        kasinaType: typedKasina,
        duration: duration,
        date: new Date(),
      });
      
      toast.success("Meditation session saved");
      resetTimer();
    } catch (error) {
      console.error("Error saving session manually:", error);
      toast.error("Failed to save session");
    }
  };
  
  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Handle setting a new timer duration
  const setNewTimerDuration = (newDuration: number) => {
    console.log("Setting new timer duration:", newDuration);
    setTimerDuration(newDuration);
    setTimeRemaining(newDuration);
    setElapsedTime(0);
    
    // If timer is already running, restart it with the new duration
    if (timerRunning) {
      stopTimer();
      startTimer();
    }
  };

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
          
          {/* Timer Section */}
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Timer</h3>
            </div>
            
            {/* Timer Options */}
            <div className="grid grid-cols-3 gap-2">
              {/* 1 minute */}
              <Button
                variant={timerDuration === 60 ? "default" : "outline"}
                onClick={() => setNewTimerDuration(60)}
                disabled={timerRunning}
                className={`w-full ${timerDuration === 60 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <Clock className="mr-1 h-4 w-4" />
                1 min
              </Button>
              
              {/* 5 minutes */}
              <Button
                variant={timerDuration === 300 ? "default" : "outline"}
                onClick={() => setNewTimerDuration(300)}
                disabled={timerRunning}
                className={`w-full ${timerDuration === 300 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <Clock className="mr-1 h-4 w-4" />
                5 min
              </Button>
              
              {/* 10 minutes */}
              <Button
                variant={timerDuration === 600 ? "default" : "outline"}
                onClick={() => setNewTimerDuration(600)}
                disabled={timerRunning}
                className={`w-full ${timerDuration === 600 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <Clock className="mr-1 h-4 w-4" />
                10 min
              </Button>
              
              {/* 15 minutes */}
              <Button
                variant={timerDuration === 900 ? "default" : "outline"}
                onClick={() => setNewTimerDuration(900)}
                disabled={timerRunning}
                className={`w-full ${timerDuration === 900 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <Clock className="mr-1 h-4 w-4" />
                15 min
              </Button>
              
              {/* 20 minutes */}
              <Button
                variant={timerDuration === 1200 ? "default" : "outline"}
                onClick={() => setNewTimerDuration(1200)}
                disabled={timerRunning}
                className={`w-full ${timerDuration === 1200 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <Clock className="mr-1 h-4 w-4" />
                20 min
              </Button>
              
              {/* 30 minutes */}
              <Button
                variant={timerDuration === 1800 ? "default" : "outline"}
                onClick={() => setNewTimerDuration(1800)}
                disabled={timerRunning}
                className={`w-full ${timerDuration === 1800 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <Clock className="mr-1 h-4 w-4" />
                30 min
              </Button>
            </div>
            
            {/* Timer Display and Controls */}
            <div className="flex flex-col items-center mt-6">
              <div className="mb-2 text-sm text-gray-300">
                Selected: {timerDuration === 60 ? "1 min" : 
                          timerDuration === 300 ? "5 min" : 
                          timerDuration === 600 ? "10 min" : 
                          timerDuration === 900 ? "15 min" : 
                          timerDuration === 1200 ? "20 min" : 
                          timerDuration === 1800 ? "30 min" : 
                          "Custom"}
              </div>
              
              {/* Custom Timer Display */}
              <div className="relative flex flex-col items-center justify-center mb-4">
                <div className="relative h-32 w-32">
                  {/* SVG Progress Circle */}
                  <svg className="absolute top-0 left-0" width="128" height="128" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      className="text-gray-700"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                    />
                    {/* Progress circle */}
                    <circle
                      className="text-blue-500"
                      strokeWidth="8"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * (timerDuration - timeRemaining) / timerDuration)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="45"
                      cx="50"
                      cy="50"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  
                  {/* Timer Display */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatTime(timeRemaining)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Remaining
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Timer Controls */}
              <div className="flex gap-2 w-full">
                {timerRunning ? (
                  <Button
                    onClick={stopTimer}
                    className="flex-1"
                    size="lg"
                    variant="destructive"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    onClick={startTimer}
                    className="flex-1"
                    size="lg"
                    variant="default"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </Button>
                )}
                
                <Button
                  onClick={resetTimer}
                  className="w-12"
                  size="lg"
                  variant="outline"
                  disabled={timerRunning}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                onClick={saveCurrentSession}
                className="w-full mt-4"
                variant="secondary"
                disabled={elapsedTime === 0}
              >
                Save Session
              </Button>
            </div>
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