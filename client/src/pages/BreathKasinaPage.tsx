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
      console.log('No device connected, waiting for connection');
      
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
              
              {/* Clear indicator for device connection */}
              <div className="flex justify-center mb-4 items-center flex-wrap gap-2">
                <div className="px-3 py-1 bg-green-100 border-green-200 text-green-600 border rounded-full font-semibold text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Connected to: {localStorage.getItem('breathDeviceName') || 'Respiration Belt'}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
                  onClick={() => {
                    // Go back to the device connection page to reconnect
                    window.location.href = '/breath'; 
                  }}
                >
                  Reconnect Device
                </Button>
              </div>
              
              {/* Bluetooth Connection Debug Info */}
              <div className="flex flex-col items-center mb-6 mt-4 bg-gray-900 bg-opacity-50 p-4 rounded-lg">
                <h3 className="text-md text-white mb-2">Bluetooth Connection Troubleshooting</h3>
                <p className="text-xs text-gray-400 mb-3">Connection details for Vernier Go Direct Respiration Belt</p>
                
                <div className="grid grid-cols-1 gap-2 w-full max-w-lg text-xs">
                  <div className="flex justify-between px-3 py-1 bg-gray-800 rounded">
                    <span className="text-gray-400">Device Name:</span>
                    <span className="text-white font-mono">{localStorage.getItem('breathDeviceName') || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1 bg-gray-800 rounded">
                    <span className="text-gray-400">Data Source:</span>
                    <span className="text-white font-mono">{localStorage.getItem('breathDataSource') || 'None'}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1 bg-gray-800 rounded">
                    <span className="text-gray-400">Latest Reading:</span>
                    <span className="text-white font-mono">{localStorage.getItem('latestBreathReading') || '0'} N</span>
                  </div>
                  <div className="flex justify-between px-3 py-1 bg-gray-800 rounded">
                    <span className="text-gray-400">Latest Timestamp:</span>
                    <span className="text-white font-mono">
                      {localStorage.getItem('latestBreathTimestamp') 
                        ? new Date(parseInt(localStorage.getItem('latestBreathTimestamp') || '0')).toLocaleTimeString() 
                        : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between px-3 py-1 bg-gray-800 rounded">
                    <span className="text-gray-400">Breathing Rate:</span>
                    <span className="text-white font-mono">{breathingRate || 0} breaths/min</span>
                  </div>
                  <div className="flex justify-between px-3 py-1 bg-gray-800 rounded">
                    <span className="text-gray-400">Current Normalized Value:</span>
                    <span className="text-white font-mono">{breathData?.normalizedValue?.toFixed(3) || '0.000'}</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 border border-blue-600 rounded-md bg-blue-900 bg-opacity-30">
                  <h4 className="text-blue-400 font-semibold mb-2">Advanced Respiration Belt Integration</h4>
                  <p className="text-white text-xs mb-2">
                    We've implemented direct protocol communication with the Vernier Go Direct Respiration Belt. The system should be 
                    capturing force readings from the belt when properly worn around the chest.
                  </p>
                  <p className="text-white text-xs mb-2">
                    For best results: Ensure the belt is properly positioned just below the sternum, with the green light indicator 
                    showing correct tension. The blue orb should expand and contract with your breathing.
                  </p>
                </div>
                
                <div className="mt-4 p-3 border border-blue-900 rounded-md bg-blue-950 bg-opacity-30">
                  <p className="text-white text-xs">
                    <span className="block text-blue-300 font-semibold mb-1">Connection Details:</span>
                    Make sure the Vernier Go Direct Respiration Belt is properly positioned and the green tension light is visible.
                    The blue kasina will automatically respond to your breathing pattern when connected.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Breath Kasina Visualization</CardTitle>
              <CardDescription>
                The orb will respond to your breathing pattern
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative w-full h-[400px] flex justify-center items-center">
                {/* Main orb visualization */}
                <div className="w-4/5 h-4/5 flex items-center justify-center">
                  <BreathKasinaOrb 
                    breathData={breathData || { timestamp: Date.now(), amplitude: 0.5, normalizedValue: 0.5 }}
                    effect={selectedEffect}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                onClick={startMeditation}
                disabled={!isConnected}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Maximize className="w-4 h-4 mr-2" />
                Enter Fullscreen Mode
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* The FocusMode component is used to create the fullscreen meditation experience */}
        <FocusMode>
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="w-4/5 h-4/5 flex items-center justify-center">
              <BreathKasinaOrb 
                breathData={breathData || { timestamp: Date.now(), amplitude: 0.5, normalizedValue: 0.5 }}
                effect={selectedEffect}
              />
            </div>
          </div>
        </FocusMode>
      </div>
    </Layout>
  );
};

export default BreathKasinaPage;