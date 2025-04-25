import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { useKasina } from '../lib/stores/useKasina';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { KasinaType } from '../lib/types';
import { KASINA_NAMES } from '../lib/constants';

import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Clock, Play, Pause, Square } from 'lucide-react';
import FocusMode from './FocusMode';

const TimerFreestyle = () => {
  const navigate = useNavigate();
  const { selectedKasina, setSelectedKasina, saveSession } = useKasina();
  const { enableFocusMode, disableFocusMode } = useFocusMode();
  const typedKasina = selectedKasina as KasinaType;  // Cast to KasinaType for type safety
  
  // Timer state
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
    
    // Enter focus mode when timer starts
    enableFocusMode();
    console.log("Focus mode activated");
    
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
    toast.success(`Started timer for ${formatTime(timerDuration)}`);
  };
  
  // Stop the timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Exit focus mode when timer is stopped
    disableFocusMode();
    console.log("Focus mode deactivated");
    
    setTimerRunning(false);
    toast.info("Timer paused");
  };
  
  // Reset the timer
  const resetTimer = () => {
    stopTimer(); // This also exits focus mode via stopTimer
    setTimeRemaining(timerDuration);
    setElapsedTime(0);
    toast.info("Timer reset");
  };
  
  // Handle timer completion
  const completeTimer = () => {
    stopTimer(); // This also exits focus mode via stopTimer
    setTimeRemaining(0);
    
    toast.success("Meditation session complete");
    console.log("Timer completed with duration:", timerDuration);
    
    // Save session data - we'll use the Save Session button instead of auto-saving
    // to prevent duplicate entries
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
      
      // Use only the store method to prevent duplicate session entries
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
    
    toast.success(`Timer set to ${Math.floor(newDuration / 60)} minutes`);
  };

  const getColorForKasina = (type: string): string => {
    const colorMap: Record<string, string> = {
      "white": "#FFFFFF",
      "blue": "#1E40AF",
      "red": "#DC2626",
      "yellow": "#FBBF24",
      "water": "#38BDF8",
      "air": "#E5E7EB",
      "fire": "#F97316",
      "earth": "#4B7F52",
      "space": "#4338CA",
      "light": "#FEF3C7"
    };
    
    return colorMap[type] || "#FFFFFF";
  };

  return (
    <FocusMode>
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
              
              {/* Timer Display */}
              <div className="mt-6 bg-gray-800 rounded-lg p-8 text-center">
                <div className="text-5xl font-mono">{formatTime(timeRemaining)}</div>
                <div className="text-sm text-gray-400 mt-2">Elapsed: {formatTime(elapsedTime)}</div>
              </div>
              
              {/* Timer Controls */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={startTimer}
                  disabled={timerRunning}
                  className="w-full"
                >
                  <Play className="mr-1 h-4 w-4" />
                  Start
                </Button>
                
                <Button
                  variant="outline"
                  onClick={stopTimer}
                  disabled={!timerRunning}
                  className="w-full"
                >
                  <Pause className="mr-1 h-4 w-4" />
                  Pause
                </Button>
                
                <Button
                  variant="outline"
                  onClick={resetTimer}
                  className="w-full"
                >
                  <Square className="mr-1 h-4 w-4" />
                  Reset
                </Button>
                
                <Button
                  onClick={saveCurrentSession}
                  className="w-full mt-4 col-span-3"
                  variant="secondary"
                  disabled={elapsedTime === 0}
                >
                  Save Session
                </Button>
              </div>
            </div>
          </div>
          
          {/* Content area */}
          <div className="flex-1 relative flex items-center justify-center" style={{ backgroundColor: 'black' }}>
            <div className="orb-container w-64 h-64 rounded-full relative flex items-center justify-center" 
                 style={{ 
                   backgroundColor: getColorForKasina(typedKasina),
                   boxShadow: `0 0 80px 20px ${getColorForKasina(typedKasina)}`
                 }}>
              <div className="text-white text-opacity-0">
                {selectedKasina} kasina
              </div>
            </div>
          </div>
        </div>
      </div>
    </FocusMode>
  );
};

export default TimerFreestyle;