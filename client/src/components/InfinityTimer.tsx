import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatTime } from '../lib/utils';
import { Button } from './ui/button';

const InfinityTimer = () => {
  const [running, setRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Update timer every second
  const updateTimer = useCallback(() => {
    setElapsedTime(prev => prev + 1);
    console.log("Infinity timer tick, elapsed:", elapsedTime + 1);
  }, [elapsedTime]);

  // Start/stop timer based on running state
  useEffect(() => {
    console.log("Running state changed:", running);
    if (running) {
      console.log("Starting interval");
      intervalRef.current = window.setInterval(updateTimer, 1000);
    } else if (intervalRef.current) {
      console.log("Clearing interval");
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        console.log("Cleanup: clearing interval");
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, updateTimer]);

  const resetTimer = () => {
    setElapsedTime(0);
    setRunning(false);
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold text-white">Infinity Timer Test</h2>
      
      <div className="text-4xl font-mono text-white">
        {formatTime(elapsedTime)}
      </div>
      
      <div className="flex space-x-2">
        <Button 
          onClick={() => setRunning(!running)}
          variant="default"
        >
          {running ? "Pause" : "Start"}
        </Button>
        
        <Button 
          onClick={resetTimer}
          variant="outline"
        >
          Reset
        </Button>
      </div>
    </div>
  );
};

export default InfinityTimer;