import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import KasinaOrb from '../components/KasinaOrb';
import { useKasina } from '../lib/stores/useKasina';
import { useAuth } from '../lib/stores/useAuth';
import { KasinaType, getOrbConfig } from '../lib/types';
import { KASINA_NAMES } from '../lib/constants';
import { formatTime, roundUpToNearestMinute } from '../lib/utils';

import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import Layout from '../components/Layout';

const InfinityMode = () => {
  const navigate = useNavigate();
  const { selectedKasina, setSelectedKasina, saveSession } = useKasina();
  const { email } = useAuth();
  const typedKasina = selectedKasina as KasinaType;
  const [activeTab, setActiveTab] = useState<string>("color");
  
  // Dedicated infinity timer state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  // Start/stop the timer
  useEffect(() => {
    if (isRunning) {
      console.log("INFINITY PAGE: Starting count-up timer");
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      console.log("INFINITY PAGE: Stopping count-up timer");
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        console.log("INFINITY PAGE: Cleanup interval");
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]);

  // Reset timer when changing kasina
  useEffect(() => {
    setIsRunning(false);
    setElapsedTime(0);
  }, [selectedKasina]);

  // Handle save session
  const handleSave = () => {
    if (elapsedTime === 0 && !isRunning) {
      toast.error("Start a meditation first before saving");
      return;
    }
    
    // Round up to the nearest minute
    const roundedElapsedTime = roundUpToNearestMinute(elapsedTime);
    
    console.log("INFINITY PAGE: Saving session");
    console.log("- kasinaType:", typedKasina);
    console.log("- elapsedTime:", elapsedTime);
    console.log("- roundedElapsedTime:", roundedElapsedTime);
    
    try {
      // Create the session object with rounded duration
      const sessionData = {
        id: Date.now().toString(),
        kasinaType: typedKasina,
        kasinaName: KASINA_NAMES[typedKasina] || typedKasina,
        duration: roundedElapsedTime,
        timestamp: new Date().toISOString()
        // userEmail will be set by the server
      };
      
      // Store in localStorage
      try {
        let existingSessions = [];
        const stored = window.localStorage.getItem("sessions");
        
        if (stored) {
          existingSessions = JSON.parse(stored);
          if (!Array.isArray(existingSessions)) {
            existingSessions = [];
          }
        }
        
        // Add user email to the session in localStorage
        const sessionWithUser = {
          ...sessionData,
          userEmail: email // Add current user email
        };
        existingSessions.push(sessionWithUser);
        window.localStorage.setItem("sessions", JSON.stringify(existingSessions));
        console.log("INFINITY PAGE: Session saved to localStorage with user:", email);
      } catch (localStorageError) {
        console.error("INFINITY PAGE: LocalStorage error:", localStorageError);
      }
      
      // Use store method for server sync with rounded duration
      saveSession({
        kasinaType: typedKasina,
        duration: roundedElapsedTime,
        date: new Date(),
      });
      
      toast.success(`Infinity meditation session of ${formatTime(roundedElapsedTime)} saved!`);
      
      // Reset after saving
      setIsRunning(false);
      setElapsedTime(0);
    } catch (error) {
      console.error("INFINITY PAGE: Error saving session:", error);
      toast.error("Failed to save infinity session");
    }
  };

  const orbConfig = getOrbConfig(typedKasina);

  return (
    <Layout>
      <div className="h-full w-full bg-black text-white flex flex-col">
        <div className="flex flex-col md:flex-row h-full">
          {/* Sidebar */}
          <div className="w-full md:w-80 bg-gray-900 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Infinity Mode</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/freestyle')}
              >
                Switch to Timed
              </Button>
            </div>
            
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
            
            {/* Infinity Timer */}
            <div className="bg-gray-800 p-5 rounded-xl border border-blue-500 shadow-lg w-full">
              <div className="flex items-center justify-center mb-4">
                <h3 className="text-xl font-bold text-blue-400">Infinity Timer</h3>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-white animate-pulse">
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-sm text-blue-300 mt-1">
                  Time Elapsed - No Limits
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  size="lg"
                  className={`w-full ${isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isRunning ? "Pause" : "Start Infinity Meditation"}
                </Button>
                
                <Button
                  onClick={handleSave}
                  variant="outline"
                  className="w-full border-blue-500 text-blue-400 hover:bg-blue-900"
                >
                  Save Infinity Session
                </Button>
              </div>
            </div>
          </div>
          
          {/* Canvas */}
          <div className="flex-1 relative">
            <KasinaOrb
              type={typedKasina}
              color={orbConfig.color}
              speed={orbConfig.speed}
              complexity={orbConfig.complexity}
              enableZoom={true}
              remainingTime={null} 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InfinityMode;