import React from "react";
import { useKasina } from "../lib/stores/useKasina";
import { useTimer } from "../lib/stores/useTimer";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { KASINA_TYPES, KASINA_NAMES, TIMER_OPTIONS } from "../lib/constants";
import { PlayCircle, PauseCircle, StopCircle, TimerReset } from "lucide-react";
import SimpleTimer from "./SimpleTimer";
import { toast } from "sonner";
import { apiRequest } from "../lib/api";

const KasinaSelector: React.FC = () => {
  const { selectedKasina, setSelectedKasina } = useKasina();

  return (
    <Tabs defaultValue="colors" className="w-full">
      <TabsList className="grid grid-cols-2 w-full bg-gray-800">
        <TabsTrigger value="colors" className="text-white">Color Kasinas</TabsTrigger>
        <TabsTrigger value="elements" className="text-white">Elemental Kasinas</TabsTrigger>
      </TabsList>
      
      <TabsContent value="colors" className="mt-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            KASINA_TYPES.WHITE,
            KASINA_TYPES.BLUE,
            KASINA_TYPES.RED,
            KASINA_TYPES.YELLOW
          ].map((type) => (
            <Button
              key={type}
              onClick={() => setSelectedKasina(type)}
              variant={selectedKasina === type ? "default" : "outline"}
              className={`h-14 flex items-center justify-center ${selectedKasina === type ? 'border-2 border-white' : ''}`}
              style={{ 
                backgroundColor: selectedKasina === type ? undefined : 
                  type === KASINA_TYPES.WHITE ? "#FFFFFF" : 
                  type === KASINA_TYPES.BLUE ? "#0000FF" : 
                  type === KASINA_TYPES.RED ? "#FF0000" : 
                  "#FFFF00",
                color: (type === KASINA_TYPES.WHITE || type === KASINA_TYPES.YELLOW) ? "#000000" : "#FFFFFF"
              }}
            >
              {KASINA_NAMES[type]}
            </Button>
          ))}
        </div>
      </TabsContent>
      
      <TabsContent value="elements" className="mt-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            KASINA_TYPES.WATER,
            KASINA_TYPES.AIR,
            KASINA_TYPES.FIRE,
            KASINA_TYPES.EARTH,
            KASINA_TYPES.SPACE,
            KASINA_TYPES.LIGHT
          ].map((type) => (
            <Button
              key={type}
              onClick={() => setSelectedKasina(type)}
              variant={selectedKasina === type ? "default" : "outline"}
              className={`h-14 ${selectedKasina === type ? 'border-2 border-white' : ''}`}
            >
              {KASINA_NAMES[type]}
            </Button>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};

const TimerControl: React.FC = () => {
  const { 
    selectedDuration, 
    setSelectedDuration,
    isRunning,
    isPaused,
    elapsedTime,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer
  } = useTimer();

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = selectedDuration === Infinity 
    ? formatTime(elapsedTime) 
    : formatTime(Math.max(0, selectedDuration - elapsedTime));

  const timeRemaining = selectedDuration === Infinity || selectedDuration - elapsedTime > 0;

  return (
    <div className="space-y-6">
      {/* Timer selection */}
      <div className="grid grid-cols-3 gap-2">
        {TIMER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            onClick={() => setSelectedDuration(option.value)}
            variant={selectedDuration === option.value ? "default" : "outline"}
            disabled={isRunning}
            className={`${selectedDuration === option.value ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Timer display */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="flex flex-col items-center justify-center pt-6">
          <div className="text-4xl font-mono text-white mb-4">
            {displayTime}
          </div>

          <div className="flex space-x-2">
            {!isRunning && !isPaused ? (
              <Button 
                onClick={() => {
                  console.log('Start button clicked');
                  console.log('Selected duration:', selectedDuration);
                  startTimer();
                  console.log('Timer started, isRunning:', isRunning);
                }} 
                className="bg-green-600 hover:bg-green-700"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Start
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button onClick={resumeTimer} className="bg-green-600 hover:bg-green-700">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                ) : (
                  <Button onClick={pauseTimer} className="bg-amber-600 hover:bg-amber-700" disabled={!timeRemaining}>
                    <PauseCircle className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                )}
                <Button onClick={stopTimer} className="bg-red-600 hover:bg-red-700">
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
            
            <Button onClick={resetTimer} variant="outline" disabled={!isRunning && !isPaused}>
              <TimerReset className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const FreestyleControls: React.FC = () => {
  const { selectedKasina } = useKasina();
  
  return (
    <div className="space-y-6 p-4 bg-gray-900 rounded-lg">
      <h2 className="text-xl text-white font-semibold">Kasina Selection</h2>
      <KasinaSelector />
      
      <h2 className="text-xl text-white font-semibold mt-8">Timer Controls</h2>
      <div className="mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <SimpleTimer 
          initialDuration={60} 
          onComplete={() => {
            toast.success("Meditation session completed!");
            
            // The actual duration will be tracked by our component, so we'll get it dynamically
            const timerDuration = document.querySelector('.simple-timer-duration')?.getAttribute('data-duration');
            const duration = timerDuration ? parseInt(timerDuration, 10) : 60;
            
            // Record the meditation session
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
          }}
        />
      </div>
    </div>
  );
};

export default FreestyleControls;
