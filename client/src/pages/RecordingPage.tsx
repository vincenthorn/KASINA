import React, { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import KasinaOrb from "../components/KasinaOrb";
import { KasinaType } from "../lib/types";
import { KASINA_COLORS } from "../lib/constants";
import RecordingControls from "../components/RecordingControls";
import RecordingList from "../components/RecordingList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

import { Button } from "../components/ui/button";
import { Maximize, Minimize, Mic, Video, Square } from "lucide-react";
import { toast } from "sonner";
import SimpleTimer from "../components/SimpleTimer";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_NAMES } from "../lib/constants";
import { apiRequest } from "../lib/api";

// Recording controls for focus mode
const FocusModeRecordingControls: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"audio" | "screen">("screen"); // Default to screen recording in focus mode
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startRecording = async () => {
    console.log("Focus mode: Starting recording, type:", recordingType);
    chunksRef.current = [];
    
    try {
      if (recordingType === "audio") {
        console.log("Focus mode: Requesting audio stream");
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        console.log("Focus mode: Requesting display media");
        streamRef.current = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        console.log("Focus mode: Display media obtained successfully");
      }
      
      if (!streamRef.current) {
        throw new Error("Failed to get media stream");
      }
      
      console.log("Focus mode: Creating MediaRecorder with stream");
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      
      mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
        console.log("Focus mode: Data available event received", event.data.size);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });
      
      mediaRecorderRef.current.addEventListener("stop", () => {
        console.log("Focus mode: Recording stopped, processing data");
        const blob = new Blob(chunksRef.current, { 
          type: recordingType === "audio" ? "audio/webm" : "video/webm" 
        });
        
        setRecordingBlob(blob);
        
        // Clean up the recording state
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Save the recording
        const now = new Date();
        const filename = `kasina_${recordingType === "audio" ? "audio" : "screen"}_${now.toISOString().split("T")[0]}.webm`;
        const url = URL.createObjectURL(blob);
        
        // Get the user's selected kasina from local storage since we're in focus mode
        const localSettings = localStorage.getItem("kasina-settings");
        const settings = localSettings ? JSON.parse(localSettings) : { selectedKasina: "blue" };
        
        // Add to recordings
        const recordings = JSON.parse(localStorage.getItem("recordings") || "[]");
        recordings.push({
          id: Date.now().toString(),
          type: recordingType,
          url,
          filename,
          kasinaType: settings.selectedKasina,
          duration: recordingTime,
          date: now.toISOString(),
          size: blob.size
        });
        localStorage.setItem("recordings", JSON.stringify(recordings));
        
        toast.success(`${recordingType === "audio" ? "Audio" : "Screen"} recording saved!`);
      });
      
      // Set up error handling
      mediaRecorderRef.current.addEventListener("error", (event) => {
        console.error("Focus mode: MediaRecorder error:", event);
        toast.error("Recording error occurred");
      });
      
      console.log("Focus mode: Starting MediaRecorder");
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      console.log("Focus mode: Starting timer");
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success("Recording started");
      
    } catch (error) {
      console.error("Focus mode: Error starting recording:", error);
      toast.error("Failed to start recording. Please check your permissions: " + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center">
      {/* Recording type toggle (only shown when not recording) */}
      {!isRecording && (
        <div className="flex gap-2 mb-2 w-full">
          <Button
            variant={recordingType === "screen" ? "default" : "outline"}
            size="sm"
            onClick={() => setRecordingType("screen")}
            className="flex items-center gap-1 flex-1"
          >
            <Video className="w-4 h-4" />
            <span className="text-sm">Screen</span>
          </Button>
          <Button
            variant={recordingType === "audio" ? "default" : "outline"}
            size="sm"
            onClick={() => setRecordingType("audio")}
            className="flex items-center gap-1 flex-1"
          >
            <Mic className="w-4 h-4" />
            <span className="text-sm">Audio</span>
          </Button>
        </div>
      )}
      
      {/* Recording status and timer */}
      {isRecording && (
        <div className="flex items-center mb-2 w-full justify-center text-sm">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
          <span>Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
        </div>
      )}
      
      {/* Recording control button */}
      {!isRecording ? (
        <Button
          onClick={startRecording}
          className="w-full bg-red-600 hover:bg-red-700 flex items-center gap-2"
          size="sm"
        >
          {recordingType === "audio" ? <Mic className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          Start Recording
        </Button>
      ) : (
        <Button
          onClick={stopRecording}
          variant="outline"
          className="w-full flex items-center gap-2"
          size="sm"
        >
          <Square className="w-4 h-4" />
          Stop Recording
        </Button>
      )}
    </div>
  );
};

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
            <KasinaOrb 
              enableZoom={true}
              type={selectedKasina as KasinaType} 
              color={KASINA_COLORS[selectedKasina as KasinaType] || "#FFFFFF"}
            />
            
            {/* Recording control panel for focus mode */}
            <div className={`
              absolute bottom-4 right-4
              transition-opacity duration-500 ease-in-out
              ${isUIVisible ? 'opacity-100' : 'opacity-0'}
            `}>
              <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-3 shadow-lg">
                <FocusModeRecordingControls />
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
              <RecordingControls />
            </div>
            
            {/* Right: Kasina Orb */}
            <div className="lg:col-span-2 h-96 bg-black rounded-lg overflow-hidden">
              <KasinaOrb 
                enableZoom={false}
                type={selectedKasina as KasinaType} 
                color={KASINA_COLORS[selectedKasina as KasinaType] || "#FFFFFF"}
              />
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
