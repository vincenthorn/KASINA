import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import KasinaOrb from "../lib/kasina-orbs/KasinaOrb";
import Timer from "../lib/Timer";
import { useKasina } from "../lib/stores/useKasina";
import { KasinaType, getOrbConfig } from "../lib/types";
import { toast } from "sonner";
import { KASINA_NAMES } from "../lib/constants";

const Freestyle = () => {
  const { selectedKasina, setSelectedKasina, saveSession } = useKasina();
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number>(5 * 60); // Default 5 minutes
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [countUpTime, setCountUpTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>("color");

  // Reset timer when changing kasina
  useEffect(() => {
    setTimerRunning(false);
    setTimeRemaining(timerDuration);
    setCountUpTime(0);
  }, [selectedKasina, timerDuration]);

  const handleTimerComplete = () => {
    setTimerRunning(false);
    toast.success("Meditation session complete");
    
    // Save session data
    if (timeRemaining === null) {
      // Infinity mode (counting up)
      saveSession({
        kasinaType: selectedKasina,
        duration: countUpTime,
        date: new Date(),
      });
    } else {
      // Fixed duration mode
      saveSession({
        kasinaType: selectedKasina,
        duration: timerDuration,
        date: new Date(),
      });
    }
  };

  const handleTimerUpdate = (remaining: number | null, elapsed: number) => {
    setTimeRemaining(remaining);
    if (remaining === null) {
      setCountUpTime(elapsed);
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

  const orbConfig = getOrbConfig(selectedKasina);

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
                <RadioGroup 
                  value={selectedKasina} 
                  onValueChange={(val) => setSelectedKasina(val as KasinaType)}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="white" id="white" />
                    <Label htmlFor="white" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-white mr-2 border border-gray-400"></span>
                      White
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="blue" id="blue" />
                    <Label htmlFor="blue" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-blue-500 mr-2"></span>
                      Blue
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="red" id="red" />
                    <Label htmlFor="red" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-red-500 mr-2"></span>
                      Red
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yellow" id="yellow" />
                    <Label htmlFor="yellow" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-yellow-400 mr-2"></span>
                      Yellow
                    </Label>
                  </div>
                </RadioGroup>
              </TabsContent>
              
              <TabsContent value="elemental" className="mt-0">
                <RadioGroup 
                  value={selectedKasina} 
                  onValueChange={(val) => setSelectedKasina(val as KasinaType)}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="water" id="water" />
                    <Label htmlFor="water" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-blue-300 mr-2"></span>
                      Water
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="air" id="air" />
                    <Label htmlFor="air" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-gray-200 mr-2"></span>
                      Air
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fire" id="fire" />
                    <Label htmlFor="fire" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-orange-500 mr-2"></span>
                      Fire
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="earth" id="earth" />
                    <Label htmlFor="earth" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-green-800 mr-2"></span>
                      Earth
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="space" id="space" />
                    <Label htmlFor="space" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-indigo-900 mr-2"></span>
                      Space
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center">
                      <span className="w-4 h-4 rounded-full bg-yellow-200 mr-2"></span>
                      Light
                    </Label>
                  </div>
                </RadioGroup>
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
                  onClick={() => setTimerDuration(option.value || null)}
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
              onClick={() => setTimerRunning(!timerRunning)}
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
                const duration = timeRemaining === null ? countUpTime : timerDuration - (timeRemaining || 0);
                
                // Direct window.localStorage approach with explicit error handling
                try {
                  // Create the session object
                  const newSession = {
                    id: Date.now().toString(),
                    kasinaType: selectedKasina as string,
                    kasinaName: KASINA_NAMES[selectedKasina as string] || selectedKasina,
                    duration: duration,
                    timestamp: new Date().toISOString()
                  };
                  
                  console.log("SAVING SESSION", newSession);
                  
                  // Get existing sessions with careful error handling
                  let existingSessions = [];
                  
                  try {
                    const storedValue = window.localStorage.getItem("sessions");
                    console.log("Raw localStorage value:", storedValue);
                    
                    if (storedValue) {
                      const parsed = JSON.parse(storedValue);
                      if (Array.isArray(parsed)) {
                        existingSessions = parsed;
                      } else {
                        console.warn("Stored sessions is not an array, resetting:", parsed);
                      }
                    }
                  } catch (readError) {
                    console.error("Error reading from localStorage:", readError);
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
              type={selectedKasina}
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
