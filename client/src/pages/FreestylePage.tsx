import React, { useEffect } from "react";
import Layout from "../components/Layout";
import KasinaOrb from "../components/KasinaOrb";
import FreestyleControls from "../components/FreestyleControls";
import { useTimer } from "../lib/stores/useTimer";
import { toast } from "sonner";
import { useKasina } from "../lib/stores/useKasina";
import { useFocus } from "../lib/stores/useFocus";
import { apiRequest } from "../lib/api";
import { KASINA_NAMES } from "../lib/constants";
import { Button } from "../components/ui/button";
import { Maximize, Minimize } from "lucide-react";

const FreestylePage: React.FC = () => {
  const { 
    isRunning, 
    isPaused,
    selectedDuration,
    elapsedTime, 
    resetTimer,
    stopTimer
  } = useTimer();
  
  const { selectedKasina } = useKasina();
  const { isFocusMode, toggleFocusMode } = useFocus();

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

  // Effect to exit focus mode when leaving the page
  useEffect(() => {
    return () => {
      if (isFocusMode) {
        toggleFocusMode();
      }
    };
  }, [isFocusMode, toggleFocusMode]);
  
  // Listen for escape key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        toggleFocusMode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocusMode, toggleFocusMode]);

  return (
    <Layout fullWidth>
      <div className="h-full w-full relative">
        {/* Focus mode toggle button */}
        <div className="absolute top-4 right-4 z-20">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              toggleFocusMode();
              
              // Show toast notification only when entering focus mode
              if (!isFocusMode) {
                toast.info(
                  "Entered Focus Mode. Press ESC or click the button again to exit.", 
                  { duration: 4000 }
                );
              }
            }} 
            className="bg-gray-900 bg-opacity-50 hover:bg-gray-800 text-white"
            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            {isFocusMode ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FreestylePage;
