import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useKasina } from '@/lib/stores/useKasina';
import { KasinaType } from '@/lib/types';
import { Maximize, Wind, Activity } from 'lucide-react';
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

  // Define a strict kasina for breath visualization - always blue
  const breathKasina: KasinaType = 'blue';
  
  // Set blue kasina when component mounts
  useEffect(() => {
    setSelectedKasina(breathKasina);
  }, [setSelectedKasina]);

  // Setup respiration belt and determine data source on component mount
  useEffect(() => {
    // Check if we're using real data or simulation
    const dataSource = localStorage.getItem('breathDataSource');
    const deviceName = localStorage.getItem('breathDeviceName');
    
    if (dataSource === 'real') {
      setIsUsingRealData(true);
      console.log('Using real device data from:', deviceName || 'Unknown device');
      
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

  // Breath data stream management - use hardware data
  useEffect(() => {
    if (!isConnected) return;
    
    console.log('Setting up real-time breath data polling');
    
    // Function to continuously update breath data from device
    const updateBreathData = () => {
      try {
        // Get current time
        const now = Date.now();
        
        // Get the latest reading from the device (via localStorage)
        const latestReading = parseFloat(localStorage.getItem('latestBreathReading') || '0');
        const timestamp = parseInt(localStorage.getItem('latestBreathTimestamp') || '0');
        const dataAge = now - timestamp;
        
        // Also check if we have raw bytes data from the device
        const rawBytesHex = localStorage.getItem('latestRawBytes');
        
        // Update breathing rate from localStorage if available
        const storageBreathRate = parseFloat(localStorage.getItem('breathingRate') || '0');
        if (storageBreathRate >= 4 && storageBreathRate <= 30) {
          setBreathingRate(storageBreathRate);
        }
        
        // Default to no movement when there's no data
        let amplitude = 0.5; // Default value
        
        // Check if we have any data at all
        if (rawBytesHex) {
          console.log('Raw sensor data available:', rawBytesHex);
        }
        
        // Only use real data from the belt
        if (latestReading > 0 && dataAge < 5000) {
          // Scale the reading to make visualization more dramatic
          // Use a min of 0.2 and max of 1.0 for more visible effect
          amplitude = 0.2 + (Math.min(0.8, Math.max(0, latestReading / 1.0)));
          
          // Make the visualization more dramatic for better visual feedback
          amplitude = Math.pow(amplitude, 0.7); // Apply power curve to emphasize changes
          
          setBreathData({
            timestamp: now,
            amplitude: amplitude,
            normalizedValue: amplitude
          });
          
          // Also update the raw sensor value display
          setRawSensorValue(latestReading);
          
          // Log data every second (approximately)
          if (now % 1000 < 50) {
            console.log(`Breath data: ${amplitude.toFixed(2)}, Force: ${latestReading.toFixed(2)}N, Rate: ${breathingRate} BPM`);
          }
        } else {
          // Even without recent data, set the raw value to help with debugging
          setRawSensorValue(latestReading);
          
          // If no recent data, keep the visualization static at the default position
          if (now % 3000 < 50) {
            console.log('No recent device data, keeping visualization static');
          }
          
          // Keep using the last known amplitude to prevent sudden jumps
          if (breathData) {
            amplitude = breathData.amplitude;
          }
          
          setBreathData({
            timestamp: now,
            amplitude: amplitude,
            normalizedValue: amplitude
          });
        }
      } catch (error) {
        console.error('Error processing breath data:', error);
      }
      
      // Continue the animation loop
      animationFrameRef.current = requestAnimationFrame(updateBreathData);
    };
    
    // Start the update loop
    animationFrameRef.current = requestAnimationFrame(updateBreathData);
    
    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isConnected]);

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
                    {rawSensorValue.toFixed(2)} N
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
              
              {/* Sensor readings display - simplified for better user experience */}
              <div className="flex flex-col items-center mb-6 mt-4 bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Respiration Belt Data</h3>
                
                <div className="w-full flex justify-between mb-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Force Reading</div>
                    <div className="text-2xl font-mono font-bold text-blue-600">
                      {rawSensorValue !== null ? `${rawSensorValue.toFixed(1)} N` : '- N'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Breathing Rate</div>
                    <div className="text-2xl font-mono font-bold text-green-600">
                      {breathingRate} <span className="text-xs">BPM</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Last Update</div>
                    <div className="text-base font-mono text-gray-800">
                      {localStorage.getItem('latestBreathTimestamp') 
                        ? new Date(parseInt(localStorage.getItem('latestBreathTimestamp') || '0')).toLocaleTimeString() 
                        : '-'}
                    </div>
                  </div>
                </div>
                
                <div className="w-full p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">How it works:</span> The respiration belt measures the force created 
                    when you breathe. For best results, make sure the belt is snug around your lower abdomen
                    and the green light indicator is on.
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
                The orb will respond to your breathing pattern in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative w-full h-[400px] flex justify-center items-center">
                {/* Main orb visualization */}
                <div className="w-4/5 h-4/5 flex items-center justify-center">
                  {/* Only show one orb on the page */}
                  <BreathKasinaOrb 
                    type={breathKasina}
                    breathAmplitude={(breathData?.normalizedValue || 0.5)}
                    breathingRate={breathingRate}
                    effectType={selectedEffect as 'expand-contract' | 'brighten-darken' | 'color-shift'}
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
        
        {/* The FocusMode component is used to create the fullscreen meditation experience 
             Only shown when actually in focus mode to prevent duplicate orbs */}
        {useFocusMode().isFocusModeActive && (
          <FocusMode>
            <div className="w-full h-full flex items-center justify-center bg-black">
              <div className="w-4/5 h-4/5 flex items-center justify-center">
                <BreathKasinaOrb 
                  type={breathKasina}
                  breathAmplitude={(breathData?.normalizedValue || 0.5)}
                  breathingRate={breathingRate}
                  effectType={selectedEffect as 'expand-contract' | 'brighten-darken' | 'color-shift'}
                />
              </div>
            </div>
          </FocusMode>
        )}
      </div>
    </Layout>
  );
};

export default BreathKasinaPage;
