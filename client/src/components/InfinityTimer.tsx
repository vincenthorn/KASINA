import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useKasina } from '../lib/stores/useKasina';
import { formatTime } from '../lib/utils';
import { Button } from './ui/button';

interface InfinityTimerProps {
  kasinaType: string;
}

/**
 * A dedicated component for infinity timer mode that's completely independent
 * from the regular timer component. This ensures the infinity mode works correctly.
 */
const InfinityTimer: React.FC<InfinityTimerProps> = ({ kasinaType }) => {
  const { saveSession } = useKasina();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  // Start/stop the timer
  useEffect(() => {
    if (isRunning) {
      console.log("INFINITY TIMER: Starting count-up timer");
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      console.log("INFINITY TIMER: Stopping count-up timer");
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        console.log("INFINITY TIMER: Cleanup interval");
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning]);

  // Reset timer when changing kasina
  useEffect(() => {
    setIsRunning(false);
    setElapsedTime(0);
  }, [kasinaType]);

  // Handle save session
  const handleSave = () => {
    if (elapsedTime === 0 && !isRunning) {
      toast.error("Start a meditation first before saving");
      return;
    }
    
    console.log("INFINITY TIMER: Saving session");
    console.log("- kasinaType:", kasinaType);
    console.log("- elapsedTime:", elapsedTime);
    
    try {
      // Create the session object
      const sessionData = {
        id: Date.now().toString(),
        kasinaType: kasinaType,
        duration: elapsedTime,
        timestamp: new Date().toISOString()
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
        
        existingSessions.push(sessionData);
        window.localStorage.setItem("sessions", JSON.stringify(existingSessions));
        console.log("INFINITY TIMER: Session saved to localStorage");
      } catch (localStorageError) {
        console.error("INFINITY TIMER: LocalStorage error:", localStorageError);
      }
      
      // Use store method for server sync
      saveSession({
        kasinaType: kasinaType as any,
        duration: elapsedTime,
        date: new Date(),
      });
      
      toast.success("Infinity meditation session saved!");
      
      // Reset after saving
      setIsRunning(false);
      setElapsedTime(0);
    } catch (error) {
      console.error("INFINITY TIMER: Error saving session:", error);
      toast.error("Failed to save infinity session");
    }
  };

  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-blue-500 shadow-lg w-full mt-4">
      <div className="flex items-center justify-center mb-4">
        <h3 className="text-xl font-bold text-blue-400">Infinity Mode</h3>
      </div>
      
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-white animate-pulse">
          {formatTime(elapsedTime)}
        </div>
        <div className="text-sm text-gray-400 mt-1">Time Elapsed</div>
      </div>
      
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => setIsRunning(!isRunning)}
          size="lg"
          className="w-full bg-blue-600 hover:bg-blue-700"
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
  );
};

export default InfinityTimer;