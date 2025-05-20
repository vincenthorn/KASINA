import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useKasina } from '@/lib/stores/useKasina';
import { KasinaType } from '@/lib/types';
import { Maximize, Minimize, Wind, Activity } from 'lucide-react';
import FocusMode from '@/components/FocusMode';
import BreathKasinaOrb from '@/components/BreathKasinaOrb';
import { useFocusMode } from '@/lib/stores/useFocusMode';

interface BreathData {
  timestamp: number;
  amplitude: number;
  normalizedValue: number;
}

// Mock simulation of breath data for testing
const simulateBreathData = (): BreathData => {
  const now = Date.now();
  // Simulate breathing with a sine wave (period of about 5 seconds)
  const amplitude = Math.sin(now / 2500) * 0.5 + 0.5; // Value between 0 and 1
  
  return {
    timestamp: now,
    amplitude: amplitude,
    normalizedValue: amplitude
  };
};

const BreathKasinaPage = () => {
  const { selectedKasina, setSelectedKasina } = useKasina();
  const { enableFocusMode } = useFocusMode();
  const [breathData, setBreathData] = useState<BreathData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<string>('expand-contract');
  const [breathingRate, setBreathingRate] = useState<number>(12); // breaths per minute
  const [breathCycles, setBreathCycles] = useState<{timestamp: number, isInhale: boolean}[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Make sure we have a default kasina selected
  useEffect(() => {
    if (!selectedKasina) {
      setSelectedKasina('air' as KasinaType);
    }
  }, [selectedKasina, setSelectedKasina]);

  // This is where we would connect to the Bluetooth device
  // For now, we'll simulate being connected
  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setIsConnected(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Simulation of breath data stream
  useEffect(() => {
    if (!isConnected) return;

    // Function to update breath data
    const updateBreathData = () => {
      const newData = simulateBreathData();
      setBreathData(newData);
      
      // Detect breath cycles for calculating breathing rate
      const previousData = breathData;
      if (previousData && previousData.amplitude < 0.3 && newData.amplitude > 0.7) {
        // Detected start of inhale
        const now = Date.now();
        setBreathCycles(prev => {
          // Keep only the last 5 cycles for rate calculation
          const newCycles = [...prev, { timestamp: now, isInhale: true }].slice(-10);
          
          // Calculate breathing rate if we have enough cycles
          if (newCycles.length >= 4) {
            const timeSpan = (newCycles[newCycles.length - 1].timestamp - newCycles[0].timestamp) / 1000; // in seconds
            const cycles = newCycles.length - 1;
            const rate = (cycles / timeSpan) * 60; // breaths per minute
            setBreathingRate(Math.round(rate * 10) / 10); // round to 1 decimal place
          }
          
          return newCycles;
        });
      }
      
      // Request next animation frame
      animationFrameRef.current = requestAnimationFrame(updateBreathData);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(updateBreathData);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isConnected, breathData]);

  // Start the meditation experience with the chosen effect
  const startMeditation = () => {
    // Store the selected effect in localStorage or a global state if needed
    localStorage.setItem('breathKasinaEffect', selectedEffect);
    
    // Enable focus mode to start meditation
    enableFocusMode();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Wind className="h-12 w-12 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Breath Kasina</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
            Experience dynamic kasina visualizations that respond to your breathing in real-time.
          </p>
          
          {isConnected && (
            <div className="text-green-600 font-medium flex items-center justify-center mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Respiration Belt Connected
              {breathingRate && (
                <span className="ml-4 text-blue-600">
                  <Activity className="inline h-4 w-4 mr-1" /> 
                  {breathingRate} breaths/min
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Kasina Selection</CardTitle>
              <CardDescription>
                Choose which kasina you want to visualize with breath effects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kasina Type</label>
                  <Select
                    value={selectedKasina}
                    onValueChange={(value) => setSelectedKasina(value as KasinaType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a kasina" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="air">Air</SelectItem>
                      <SelectItem value="fire">Fire</SelectItem>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="earth">Earth</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Breath Effect</CardTitle>
              <CardDescription>
                Choose how your breathing affects the kasina visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Effect Type</label>
                  <Select
                    value={selectedEffect}
                    onValueChange={setSelectedEffect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an effect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expand-contract">Expand & Contract</SelectItem>
                      {/* Future effects to be added later */}
                      <SelectItem value="brighten-darken" disabled>Brighten & Darken (Coming Soon)</SelectItem>
                      <SelectItem value="color-shift" disabled>Color Shift (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-2">Current Breath Amplitude</h3>
                  <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-100 ease-in-out"
                      style={{ width: `${breathData ? breathData.normalizedValue * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                onClick={startMeditation}
                disabled={!isConnected}
              >
                Start Meditation
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="mt-8 text-center text-gray-600 max-w-xl mx-auto">
          <p className="text-sm">
            <strong>Breath Kasina Guidance:</strong> This visualization responds to your breathing in real-time.
            As your breathing slows down below 4 breaths per minute, the visualizations will become more subtle,
            supporting deeper states of concentration.
          </p>
        </div>
      </div>
      
      {/* Focus Mode Component - Handles the actual meditation experience */}
      <FocusMode>
        <div className="flex flex-col items-center justify-center h-full">
          {/* Breath visualization - uses our special BreathKasinaOrb component */}
          <div className="mb-8 relative" style={{ width: '300px', height: '300px' }}>
            {breathData && (
              <BreathKasinaOrb
                type={selectedKasina as KasinaType}
                breathAmplitude={breathData.normalizedValue}
                breathingRate={breathingRate}
                effectType={selectedEffect as 'expand-contract'}
                remainingTime={null}
              />
            )}
          </div>
          
          {/* Timer controls will be automatically inserted by FocusMode */}
          <div className="space-x-2">
            <Button 
              variant="outline" 
              className="w-20 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
            >
              5 Min
            </Button>
            <Button 
              variant="outline"
              className="w-20 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
            >
              10 Min
            </Button>
            <Button 
              variant="outline"
              className="w-20 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
            >
              20 Min
            </Button>
            <Button 
              variant="outline"
              className="w-20 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
            >
              30 Min
            </Button>
          </div>
        </div>
      </FocusMode>
    </Layout>
  );
};

export default BreathKasinaPage;