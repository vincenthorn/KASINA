import React, { useState } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';

// Create a simple, standalone component for testing purposes
const SimpleFreestyle = () => {
  // Basic state
  const [timerDuration, setTimerDuration] = useState(300); // 5 minutes default
  const [timerDisplay, setTimerDisplay] = useState("05:00");
  
  // Debug function to verify clicks are working
  const handleButtonClick = (duration: number) => {
    // Show a toast message on click to confirm the button works
    toast.success(`Set timer to ${duration / 60} minutes`);
    console.log(`Button clicked: ${duration} seconds`);
    
    // Update the state
    setTimerDuration(duration);
    
    // Format the timer display
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    setTimerDisplay(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };
  
  return (
    <div className="h-full w-full bg-black text-white flex flex-col">
      <div className="flex flex-col md:flex-row h-full">
        {/* Simple sidebar */}
        <div className="w-full md:w-80 bg-gray-900 p-4">
          <h2 className="text-2xl font-bold mb-6">Simplified Freestyle</h2>
          
          {/* Timer buttons */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Timer Duration</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleButtonClick(60)} // 1 minute
                className="w-full"
              >
                1 Min
              </Button>
              <Button
                variant="outline"
                onClick={() => handleButtonClick(300)} // 5 minutes
                className="w-full"
              >
                5 Min
              </Button>
              <Button
                variant="outline"
                onClick={() => handleButtonClick(600)} // 10 minutes
                className="w-full"
              >
                10 Min
              </Button>
              <Button
                variant="outline"
                onClick={() => handleButtonClick(900)} // 15 minutes
                className="w-full"
              >
                15 Min
              </Button>
            </div>
          </div>
          
          {/* Timer display */}
          <div className="mb-6">
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <div className="text-3xl font-mono font-bold">{timerDisplay}</div>
              <div className="text-sm text-gray-400 mt-2">Selected: {timerDuration / 60} minutes</div>
            </div>
          </div>
        </div>
        
        {/* Content area */}
        <div className="flex-1 relative bg-gray-800 flex items-center justify-center">
          <div className="text-4xl">Timer Test</div>
        </div>
      </div>
    </div>
  );
};

export default SimpleFreestyle;