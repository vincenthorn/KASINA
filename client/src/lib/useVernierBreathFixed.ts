import { useState, useRef, useCallback, useEffect } from 'react';
import * as godirect from '@vernier/godirect';

declare global {
  interface Window {
    godirect: any;
  }
}

export interface VernierBreathData {
  amplitude: number;
  phase: 'inhale' | 'exhale' | 'pause';
  rate: number;
}

export const useVernierBreathOfficial = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause');
  const [breathingRate, setBreathingRate] = useState(12);

  const deviceRef = useRef<any>(null);
  const baselineRef = useRef<number>(0);
  const isBaselineSetRef = useRef<boolean>(false);
  const baselineReadingsRef = useRef<number[]>([]);
  const lastForceValueRef = useRef<number>(0);
  const lastForceUpdateRef = useRef<number>(0);
  const breathCyclesRef = useRef<number[]>([]);
  const lastRateUpdateRef = useRef<number>(0);

  const connectDevice = useCallback(async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('Connecting to Vernier device using official GoDirect library...');
      
      console.log('GoDirect library loaded successfully');

      // Check if browser supports Bluetooth
      if (!('bluetooth' in navigator)) {
        throw new Error('Bluetooth is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.');
      }

      console.log('Starting device selection...');
      
      // Connect using official Vernier method with proper timeout handling
      const connectionTimeout = 30000; // 30 second timeout
      
      const gdxDevice = await Promise.race([
        godirect.selectDevice(true).catch((err: any) => {
          console.log('selectDevice error:', err);
          if (err.message?.includes('cancelled') || err.message?.includes('cancel')) {
            throw new Error('cancelled');
          } else if (err.message?.includes('not found') || err.message?.includes('No device')) {
            throw new Error('not found');
          } else if (err.message?.includes('permission')) {
            throw new Error('permission');
          }
          throw err;
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('timeout'));
          }, connectionTimeout);
        })
      ]);
      
      // Clear timeout if connection succeeded
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (!gdxDevice) {
        throw new Error('No device selected or connection cancelled');
      }
      
      deviceRef.current = gdxDevice;
      console.log('Connected to:', gdxDevice.name);
      
      // Set up device event handlers
      gdxDevice.on('device-closed', () => {
        console.log('Device disconnected');
        setIsConnected(false);
        setError(null);
      });

      // Enable default sensors
      gdxDevice.enableDefaultSensors();
      
      // Get enabled sensors
      const enabledSensors = gdxDevice.sensors.filter((s: any) => s.enabled);
      console.log('Enabled sensors:', enabledSensors.map((s: any) => s.name));
      
      // Set up data collection for each enabled sensor
      enabledSensors.forEach((sensor: any) => {
        console.log(`Setting up sensor: ${sensor.name} (${sensor.unit})`);
        
        gdxDevice.on('device-data', (data: any) => {
          if (data.deviceId === gdxDevice.orderCode) {
            const forceData = data.sensors.find((s: any) => s.name === 'Force');
            
            if (forceData && forceData.values && forceData.values.length > 0) {
              const forceValue = forceData.values[0];
              const currentTime = Date.now();
              
              // Initialize baseline during first 3 seconds
              if (!isBaselineSetRef.current && baselineReadingsRef.current.length < 30) {
                baselineReadingsRef.current.push(forceValue);
                if (baselineReadingsRef.current.length >= 30) {
                  baselineRef.current = baselineReadingsRef.current.reduce((a, b) => a + b, 0) / baselineReadingsRef.current.length;
                  isBaselineSetRef.current = true;
                  console.log('Baseline established:', baselineRef.current);
                }
                return;
              }
              
              if (isBaselineSetRef.current) {
                // Calculate normalized amplitude (0-1 range)
                const deviation = Math.abs(forceValue - baselineRef.current);
                const normalizedAmplitude = Math.min(deviation / 2.0, 1.0); // Scale factor
                setBreathAmplitude(normalizedAmplitude);
                
                // Detect breath phase changes based on force derivative
                if (currentTime - lastForceUpdateRef.current > 100) { // Update every 100ms
                  const forceChange = forceValue - lastForceValueRef.current;
                  
                  // Phase detection with hysteresis
                  if (forceChange > 0.2) {
                    if (breathPhase !== 'inhale') {
                      breathCyclesRef.current.push(currentTime);
                      if (breathCyclesRef.current.length > 10) {
                        breathCyclesRef.current = breathCyclesRef.current.slice(-10);
                      }
                    }
                    setBreathPhase('inhale');
                  } else if (forceChange < -0.2) {
                    setBreathPhase('exhale');
                  } else {
                    setBreathPhase('pause');
                  }
                  
                  // Calculate breathing rate every 10 seconds
                  if (currentTime - lastRateUpdateRef.current > 10000) {
                    const recentCycles = breathCyclesRef.current.filter(
                      timestamp => currentTime - timestamp < 60000 // Last minute
                    );
                    
                    if (recentCycles.length >= 2) {
                      const timeSpan = (currentTime - recentCycles[0]) / 1000; // seconds
                      const cyclesPerSecond = (recentCycles.length - 1) / timeSpan;
                      const bpm = Math.round(cyclesPerSecond * 60);
                      setBreathingRate(Math.max(4, Math.min(20, bpm))); // Clamp between 4-20 BPM
                    }
                    
                    lastRateUpdateRef.current = currentTime;
                  }
                  
                  lastForceValueRef.current = forceValue;
                  lastForceUpdateRef.current = currentTime;
                }
              }
            }
          }
        });
      });
      
      setIsConnected(true);
      setIsConnecting(false);
      console.log('Successfully connected to Vernier respiration belt via official library');
      
    } catch (err) {
      // Clear timeout if error occurred
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('Error connecting to Vernier device:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Connection failed';
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Connection timeout - device selection took too long. Please try again.';
        } else if (err.message.includes('No device selected')) {
          errorMessage = 'No device selected. Please select your Vernier belt from the device list.';
        } else if (err.message.includes('cancelled')) {
          errorMessage = 'Connection cancelled by user.';
        } else if (err.message.includes('not found')) {
          errorMessage = 'No compatible Vernier devices found. Make sure your belt is powered on and in pairing mode.';
        } else if (err.message.includes('permission')) {
          errorMessage = 'Bluetooth permission denied. Please allow Bluetooth access and try again.';
        } else {
          errorMessage = `Connection failed: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, []);

  const disconnectDevice = useCallback(() => {
    try {
      if (deviceRef.current) {
        deviceRef.current.close();
        deviceRef.current = null;
      }
      
      setIsConnected(false);
      setIsCalibrating(false);
      setError(null);
      
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, []);

  const startCalibration = useCallback(() => {
    if (!isConnected) return;
    
    setIsCalibrating(true);
    baselineReadingsRef.current = [];
    isBaselineSetRef.current = false;
    
    // Calibration will complete automatically in connectDevice data handler
    setTimeout(() => {
      setIsCalibrating(false);
    }, 3000);
  }, [isConnected]);

  return {
    isConnecting,
    isConnected,
    isCalibrating,
    error,
    breathAmplitude,
    breathPhase,
    breathingRate,
    connectDevice,
    disconnectDevice,
    startCalibration
  };
};