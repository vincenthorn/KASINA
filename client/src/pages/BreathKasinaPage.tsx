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

// Mock simulation of breath data that's visually obvious for testing
const simulateBreathData = (): { breathData: BreathData, rawValue: number } => {
  const now = Date.now();
  
  // Create a much more obvious breathing pattern with very slow cycles
  // This creates a 7-second total cycle (inhale 3.5 sec, exhale 3.5 sec)
  const breathCycleSeconds = 3.5;
  const millisPerCycle = breathCycleSeconds * 1000;
  
  // Generate a sine wave based on the current time
  const rawValue = Math.sin((now % (millisPerCycle * 2)) / millisPerCycle * Math.PI);
  
  // Create very exaggerated peaks and valleys with a power function
  // This makes the transitions between inhale and exhale more obvious
  const shapedValue = Math.sign(rawValue) * Math.pow(Math.abs(rawValue), 0.6);
  
  // Normalize to 0-1 range for visualization, using a wider range for more obvious effect
  const normalizedValue = (shapedValue + 1) / 2;
  
  // Generate a very obvious sensor value in Newtons with larger range
  // Making the swing in values much more dramatic for visibility
  const baseForce = 4; // Lower minimum force when exhaling
  const maxForce = 20; // Higher maximum force when inhaling
  const sensorForce = baseForce + normalizedValue * (maxForce - baseForce);
  
  // Add minimal noise to keep the visualization clean and readable
  const minimalNoise = (Math.random() - 0.5) * 0.2;
  const sensorValueWithNoise = sensorForce + minimalNoise;
  
  // Console log for debugging - helps see the values changing
  if (now % 500 < 50) { // Log every 500ms to avoid console spam
    console.log(`Breath value: ${normalizedValue.toFixed(2)}, Force: ${sensorValueWithNoise.toFixed(2)}N`);
  }
  
  return {
    breathData: {
      timestamp: now,
      amplitude: normalizedValue,
      normalizedValue: normalizedValue
    },
    rawValue: Number(sensorValueWithNoise.toFixed(2)) // Round to 2 decimal places
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
  const [rawSensorValue, setRawSensorValue] = useState<number | null>(null); // Raw sensor reading in Newtons (N)
  const [isUsingRealData, setIsUsingRealData] = useState<boolean>(false); // Flag to track if we're getting real device data
  const [useSimulation, setUseSimulation] = useState<boolean>(false); // Flag to toggle testing simulation
  const animationFrameRef = useRef<number | null>(null);

  // Make sure we have a default kasina selected
  useEffect(() => {
    // Always default to blue kasina
    setSelectedKasina('blue' as KasinaType);
  }, [setSelectedKasina]);

  // Setup respiration belt and determine data source on component mount
  useEffect(() => {
    // Check if we're using real data or simulation
    const dataSource = localStorage.getItem('breathDataSource');
    const deviceName = localStorage.getItem('breathDeviceName');
    
    if (dataSource === 'real') {
      setIsUsingRealData(true);
      console.log('Using real device data from:', deviceName || 'Unknown device');
      
      // In a production app, we would need to reconnect to the device here
      // We would use the device ID stored in localStorage to reconnect
      
      // For now, we'll just mark as connected immediately
      setIsConnected(true);
    } else {
      setIsUsingRealData(false);
      console.log('Using simulated breath data');
      
      // Delay to simulate connection process
      const timer = setTimeout(() => {
        setIsConnected(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Breath data stream management - focus only on real hardware connection
  useEffect(() => {
    if (!isConnected) return;
    
    // Function to continuously update breath data from device
    const updateBreathData = () => {
      try {
        // Read latest breath data from localStorage (set by the Bluetooth event listener)
        const latestReading = parseFloat(localStorage.getItem('latestBreathReading') || '0');
        const timestamp = parseInt(localStorage.getItem('latestBreathTimestamp') || '0');
        const now = Date.now();
        
        // Check if we have fresh data (within last 2 seconds)
        const isFreshData = (now - timestamp) < 2000;
        
        if (isFreshData && !isNaN(latestReading)) {
          // Convert the force reading (Newtons) to a normalized value (0-1)
          // Typical respiration belt readings range from 0-20 Newtons
          const minForce = 4;   // minimum baseline force (relaxed)
          const maxForce = 22;  // maximum force (deep breath)
          
          // Normalize the value between 0-1 for animation
          let normalizedValue = Math.min(1, Math.max(0, 
            (latestReading - minForce) / (maxForce - minForce)
          ));
          
          // Create a new data point
          const newBreathData = {
            timestamp: now,
            amplitude: normalizedValue,
            normalizedValue: normalizedValue
          };
          
          // Update UI state with the real data
          setBreathData(newBreathData);
          setRawSensorValue(latestReading);
          
          // Calculate breathing rate when we detect a breath cycle
          const previousData = breathData;
          if (previousData) {
            // Detect inhalation cycle transitions for breathing rate
            if (previousData.normalizedValue < 0.3 && normalizedValue > 0.7) {
              // Detected start of inhale
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
          }
          
          console.log(`Breath data: ${normalizedValue.toFixed(2)}, Force: ${latestReading.toFixed(2)}N`);
        } else {
          // If no data is coming in, use a fallback static value
          if (!breathData) {
            const staticData = {
              timestamp: now,
              amplitude: 0.5,
              normalizedValue: 0.5
            };
            setBreathData(staticData);
            setRawSensorValue(0);
          }
          
          console.log('Waiting for fresh device data from Vernier Go Direct Respiration Belt...');
        }
      } catch (error) {
        console.error('Error processing device data:', error);
      }
      
      // Continue polling for device data
      animationFrameRef.current = requestAnimationFrame(updateBreathData);
    };

    // Start polling for device data
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
            <>
              <div className="text-green-600 font-medium flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Respiration Belt Connected
                {breathingRate && (
                  <span className="ml-4 text-blue-600">
                    <Activity className="inline h-4 w-4 mr-1" /> 
                    {breathingRate} breaths/min
                  </span>
                )}
                {rawSensorValue !== null && (
                  <span className="ml-4 px-3 py-1 bg-gray-800 rounded-full text-white font-mono text-sm">
                    {rawSensorValue} N
                  </span>
                )}
              </div>
              
              {/* Clear indicator for simulation vs real data */}
              <div className="flex justify-center mb-4 items-center">
                <div className="px-3 py-1 bg-green-100 border-green-200 text-green-600 border rounded-full font-semibold text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connected to: {localStorage.getItem('breathDeviceName') || 'Respiration Belt'}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2 text-xs bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
                  onClick={() => {
                    // Go back to the device connection page to reconnect
                    window.location.href = '/breath'; 
                  }}
                >
                  Reconnect Device
                </Button>
              </div>
              

            </>
          )}
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Breath Visualization Testing</CardTitle>
              <CardDescription>
                Visualizing your breathing with a blue kasina
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                Test Visualization
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
      
      {/* Focus Mode Component - Handles the visualization experience */}
      <FocusMode>
        <div className="flex flex-col items-center justify-center h-full bg-black">
          {/* Breath visualization - uses our special BreathKasinaOrb component */}
          <div className="relative" style={{ width: '350px', height: '350px' }}>
            {breathData && (
              <BreathKasinaOrb
                type={selectedKasina as KasinaType}
                breathAmplitude={breathData.normalizedValue}
                breathingRate={breathingRate}
                effectType={selectedEffect as 'expand-contract'}
                remainingTime={null}
              />
            )}
            
            {/* Display real-time readings directly in the visualization */}
            <div className="absolute bottom-4 left-0 right-0 text-center space-y-3">
              {rawSensorValue !== null && (
                <div>
                  <span className="px-4 py-2 bg-gray-800 bg-opacity-75 rounded-full text-white font-mono text-lg">
                    Force: {rawSensorValue} N
                  </span>
                </div>
              )}
              
              {breathingRate && (
                <div>
                  <span className="px-4 py-2 bg-blue-800 bg-opacity-75 rounded-full text-white font-mono text-lg flex items-center justify-center inline-flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {breathingRate} breaths/min
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </FocusMode>
    </Layout>
  );
};

export default BreathKasinaPage;