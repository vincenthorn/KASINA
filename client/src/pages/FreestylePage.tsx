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

  return (
    <Layout fullWidth>
      <div className="h-full flex flex-col md:flex-row">
        {/* Left side: Controls */}
        <div className="w-full md:w-72 lg:w-96 mb-4 md:mb-0">
          <FreestyleControls />
        </div>
        
        {/* Right side: Kasina Orb */}
        <div className="flex-1 bg-black rounded-lg overflow-hidden">
          <KasinaOrb />
        </div>
      </div>
    </Layout>
  );
};

export default FreestylePage;
