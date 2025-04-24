import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import KasinaOrb from "../components/KasinaOrb";
import RecordingControls from "../components/RecordingControls";
import RecordingList from "../components/RecordingList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import FreestyleControls from "../components/FreestyleControls";
import { Button } from "../components/ui/button";
import { Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";
import SimpleTimer from "../components/SimpleTimer";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_NAMES } from "../lib/constants";
import { apiRequest } from "../lib/api";

const RecordingPage: React.FC = () => {
  const { selectedKasina } = useKasina();
  
  // Use local state for focus mode
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("record");
  
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

  if (isFocusMode) {
    return (
      <Layout fullWidth isFocusMode={isFocusMode}>
        <div className={`h-full w-full relative ${isFocusMode && !isUIVisible ? 'cursor-none' : ''}`}>
          {/* Focus mode toggle button */}
          <div className={`
            absolute top-4 right-4 z-20
            transition-opacity duration-500 ease-in-out
            ${isUIVisible ? 'opacity-100' : 'opacity-0'}
          `}>
            <Button 
              variant="default"
              onClick={() => setIsFocusMode(false)}
              className="bg-white text-black hover:bg-gray-200 border-2 border-gray-300 transition-opacity hover:opacity-100 opacity-90 shadow-md"
              title="Exit Focus Mode"
            >
              <Minimize className="h-4 w-4 mr-2" />
              <span>Exit Focus</span>
            </Button>
          </div>
          
          {/* Full screen orb */}
          <div className="w-full h-full bg-black rounded-lg overflow-hidden">
            <KasinaOrb enableZoom={true} />
            
            {/* Timer component for focus mode */}
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
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Recording Studio</h1>
        
        {/* Focus mode button */}
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsFocusMode(true);
            
            // Display focus mode instruction toasts
            toast.info(
              "Entered Focus Mode. Move your mouse to show controls. Press ESC or click Exit to exit.", 
              { duration: 4000 }
            );
            
            // Add a small delay for the second toast
            setTimeout(() => {
              toast.info(
                "You can zoom in and out using your mouse wheel or trackpad gestures to change the orb size.",
                { duration: 4000 }
              );
            }, 500);
          }} 
          className="bg-gray-900 bg-opacity-50 hover:bg-gray-800 text-white transition-opacity hover:opacity-100 opacity-90"
          title="Enter Focus Mode"
        >
          <Maximize className="h-5 w-5" />
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-800 mb-6">
          <TabsTrigger value="record" className="text-white">Record Session</TabsTrigger>
          <TabsTrigger value="library" className="text-white">Recording Library</TabsTrigger>
        </TabsList>
        
        <TabsContent value="record">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Controls */}
            <div className="lg:col-span-1 space-y-6">
              <FreestyleControls />
              <RecordingControls />
            </div>
            
            {/* Right: Kasina Orb */}
            <div className="lg:col-span-2 h-96 bg-black rounded-lg overflow-hidden">
              <KasinaOrb enableZoom={false} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="library">
          <RecordingList />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default RecordingPage;
