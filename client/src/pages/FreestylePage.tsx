import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import KasinaOrb from "../components/KasinaOrb";
import FreestyleControls from "../components/FreestyleControls";
import SimpleTimer from "../components/SimpleTimer";
import { useTimer } from "../lib/stores/useTimer";
import { toast } from "sonner";
import { useKasina } from "../lib/stores/useKasina";
import { apiRequest } from "../lib/api";
import { KASINA_NAMES } from "../lib/constants";
import { Button } from "../components/ui/button";
import { Maximize, Minimize, Timer } from "lucide-react";

const FreestylePage: React.FC = () => {
  const { 
    isRunning, 
    isPaused,
    selectedDuration,
    elapsedTime, 
    resetTimer,
    stopTimer,
    startTimer,
    setSelectedDuration
  } = useTimer();
  
  const { selectedKasina } = useKasina();
  
  // Use local state for focus mode instead of Zustand store
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  // For fading UI elements on mouse inactivity
  const [isUIVisible, setIsUIVisible] = useState(true);
  const inactivityTimerRef = useRef<number | null>(null);
  
  // Function to handle mouse movement
  const handleMouseMove = () => {
    if (isFocusMode) {
      // Show UI elements
      setIsUIVisible(true);
      
      // Clear any existing timer
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      
      // Set a new timer to hide UI elements after 2 seconds of inactivity
      inactivityTimerRef.current = window.setTimeout(() => {
        setIsUIVisible(false);
      }, 2000);
    }
  };
  
  // Set up mouse movement listener for focus mode
  useEffect(() => {
    if (isFocusMode) {
      // Show UI initially
      setIsUIVisible(true);
      
      // Set initial timer
      inactivityTimerRef.current = window.setTimeout(() => {
        setIsUIVisible(false);
      }, 2000);
      
      // Add mouse move listener
      window.addEventListener('mousemove', handleMouseMove);
      
      // Cleanup
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (inactivityTimerRef.current) {
          window.clearTimeout(inactivityTimerRef.current);
        }
      };
    } else {
      // When not in focus mode, UI is always visible
      setIsUIVisible(true);
    }
  }, [isFocusMode]);

  // Effect to handle timer completion
  useEffect(() => {
    // Check if timer has completed (not for infinity mode)
    if (
      isRunning && 
      !isPaused && 
      selectedDuration !== Infinity && 
      elapsedTime >= selectedDuration
    ) {
      // Timer has completed
      stopTimer();
      toast.success("Meditation session completed!");
      
      // Record the meditation session
      const recordSession = async () => {
        try {
          await apiRequest("POST", "/api/sessions", {
            kasinaType: selectedKasina,
            kasinaName: KASINA_NAMES[selectedKasina],
            duration: elapsedTime,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Failed to record session:", error);
          // Store locally if API call fails
          const sessions = JSON.parse(localStorage.getItem("sessions") || "[]");
          sessions.push({
            id: Date.now().toString(),
            kasinaType: selectedKasina,
            kasinaName: KASINA_NAMES[selectedKasina],
            duration: elapsedTime,
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem("sessions", JSON.stringify(sessions));
        }
      };
      
      recordSession();
    }
  }, [isRunning, isPaused, selectedDuration, elapsedTime, stopTimer, selectedKasina]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Only save session if it was running when component unmounts
      if (isRunning) {
        stopTimer();
        
        // Only record if significant time has passed (more than 5 seconds)
        if (elapsedTime > 5) {
          const recordSession = async () => {
            try {
              await apiRequest("POST", "/api/sessions", {
                kasinaType: selectedKasina,
                kasinaName: KASINA_NAMES[selectedKasina],
                duration: elapsedTime,
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              console.error("Failed to record session:", error);
              // Store locally if API call fails
              const sessions = JSON.parse(localStorage.getItem("sessions") || "[]");
              sessions.push({
                id: Date.now().toString(),
                kasinaType: selectedKasina,
                kasinaName: KASINA_NAMES[selectedKasina],
                duration: elapsedTime,
                timestamp: new Date().toISOString(),
              });
              localStorage.setItem("sessions", JSON.stringify(sessions));
            }
          };
          
          recordSession();
        }
      }
      
      resetTimer();
    };
  }, [isRunning, elapsedTime, resetTimer, stopTimer, selectedKasina]);

  // Listen for escape key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        console.log("ESC key pressed, exiting focus mode");
        setIsFocusMode(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocusMode]);

  // Apply cursor-none style to the root element as well when in focus mode and UI is hidden
  useEffect(() => {
    if (isFocusMode && !isUIVisible) {
      document.body.classList.add('cursor-none');
    } else {
      document.body.classList.remove('cursor-none');
    }
    
    return () => {
      document.body.classList.remove('cursor-none');
    };
  }, [isFocusMode, isUIVisible]);

  return (
    <Layout fullWidth isFocusMode={isFocusMode}>
      <div className={`h-full w-full relative ${isFocusMode && !isUIVisible ? 'cursor-none' : ''}`}>
        {/* Focus mode toggle button - more visible in focus mode */}
        <div className={`
          absolute top-4 right-4 z-20
          transition-opacity duration-500 ease-in-out
          ${(!isFocusMode || isUIVisible) ? 'opacity-100' : 'opacity-0'}
        `}>
          <Button 
            variant={isFocusMode ? "default" : "ghost"}
            size={isFocusMode ? "default" : "icon"}
            onClick={() => {
              console.log("Button clicked, current focus mode:", isFocusMode);
              
              // Toggle the focus mode
              if (isFocusMode) {
                // Exiting focus mode
                setIsFocusMode(false);
              } else {
                // Entering focus mode
                setIsFocusMode(true);
                toast.info(
                  "Entered Focus Mode. Move your mouse to show controls. Press ESC or click Exit to exit.", 
                  { duration: 4000 }
                );
              }
            }} 
            className={`
              ${isFocusMode 
                ? "bg-white text-black hover:bg-gray-200 border-2 border-gray-300" 
                : "bg-gray-900 bg-opacity-50 hover:bg-gray-800 text-white"}
              transition-opacity hover:opacity-100
              ${isFocusMode ? "opacity-90" : "opacity-90"}
              ${isFocusMode ? "shadow-md" : ""}
            `}
            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            {isFocusMode ? (
              <>
                <Minimize className="h-4 w-4 mr-2" />
                <span>Exit Focus</span>
              </>
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Flex container for content */}
        <div className={`h-full flex ${isFocusMode ? 'flex-col' : 'flex-col md:flex-row'}`}>
          {/* Left side: Controls - hidden in focus mode */}
          {!isFocusMode && (
            <div className="w-full md:w-72 lg:w-96 mb-4 md:mb-0">
              <FreestyleControls />
            </div>
          )}
          
          {/* Kasina Orb - full screen in focus mode */}
          <div className={`
            ${isFocusMode ? 'w-full h-full' : 'flex-1'} 
            bg-black rounded-lg overflow-hidden
          `}>
            <KasinaOrb />
            
            {/* Timer component for focus mode */}
            {isFocusMode && (
              <div className={`
                absolute bottom-4 right-4
                transition-opacity duration-500 ease-in-out
                ${isUIVisible ? 'opacity-100' : 'opacity-0'}
              `}>
                <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-2 shadow-lg">
                  <SimpleTimer onComplete={() => {
                    toast.success("Meditation session completed!");
                    
                    // Record the meditation session
                    const timerDuration = document.querySelector('.simple-timer-duration')?.getAttribute('data-duration');
                    const duration = timerDuration ? parseInt(timerDuration, 10) : 60;
                    
                    const recordSession = async () => {
                      try {
                        await apiRequest("POST", "/api/sessions", {
                          kasinaType: selectedKasina,
                          kasinaName: KASINA_NAMES[selectedKasina],
                          duration, // The completed duration
                          timestamp: new Date().toISOString(),
                        });
                        toast.info("Session saved to your practice log");
                      } catch (error) {
                        console.error("Failed to record session:", error);
                        // Store locally if API call fails
                        const sessions = JSON.parse(localStorage.getItem("sessions") || "[]");
                        sessions.push({
                          id: Date.now().toString(),
                          kasinaType: selectedKasina,
                          kasinaName: KASINA_NAMES[selectedKasina],
                          duration,
                          timestamp: new Date().toISOString(),
                        });
                        localStorage.setItem("sessions", JSON.stringify(sessions));
                        toast.info("Session saved locally (offline mode)");
                      }
                    };
                    
                    recordSession();
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FreestylePage;
