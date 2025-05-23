import { useState, useCallback, useRef, useEffect } from 'react';

// Import the official Vernier GoDirect library
declare global {
  interface Window {
    godirect: any;
  }
}

/**
 * Interface for Vernier respiration belt data using official library
 */
export interface VernierRespirationData {
  force: number; // Respiration force in Newtons (N)
  timestamp: number;
}

/**
 * Interface for the official Vernier breath detection hook results
 */
interface VernierBreathOfficialHookResult {
  isConnected: boolean;
  isConnecting: boolean;
  breathAmplitude: number; // 0-1 normalized amplitude based on force data
  breathPhase: 'inhale' | 'exhale' | 'pause'; // Current breathing phase
  breathingRate: number; // breaths per minute
  connectDevice: () => Promise<void>;
  disconnectDevice: () => void;
  error: string | null;
  // Calibration system for respiration belt
  isCalibrating: boolean;
  calibrationProgress: number; // 0-1 progress through calibration
  startCalibration: () => Promise<void>;
  calibrationComplete: boolean;
  currentForce: number;
  calibrationProfile: {
    minForce: number;
    maxForce: number;
    baselineForce: number;
    forceRange: number;
    isValid: boolean;
  } | null;
}

/**
 * Custom hook using official Vernier GoDirect library for breathing detection
 */
export function useVernierBreathOfficial(): VernierBreathOfficialHookResult {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Breathing analysis state
  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause');
  const [breathingRate, setBreathingRate] = useState(0);
  
  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [currentForce, setCurrentForce] = useState(0);
  const [calibrationProfile, setCalibrationProfile] = useState<{
    minForce: number;
    maxForce: number;
    baselineForce: number;
    forceRange: number;
    isValid: boolean;
  } | null>(null);
  
  // Refs for device and data tracking
  const deviceRef = useRef<any>(null);
  const forceDataRef = useRef<VernierRespirationData[]>([]);
  const calibrationDataRef = useRef<number[]>([]);
  const calibrationStartTimeRef = useRef<number>(0);

  /**
   * Connect to Vernier GDX respiration belt using official library
   */
  const connectDevice = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('Connecting to Vernier device using official GoDirect library...');
      
      // Check if the official library is loaded
      if (!window.godirect) {
        throw new Error('Vernier GoDirect library not loaded. Please refresh the page.');
      }

      // Connect using official Vernier method
      const gdxDevice = await window.godirect.selectDevice(true); // true = Bluetooth
      deviceRef.current = gdxDevice;
      
      console.log('Connected to:', gdxDevice.name);
      
      // Set up device event handlers
      gdxDevice.on('device-closed', () => {
        console.log('Device disconnected');
        setIsConnected(false);
        setError(null);
      });

      // Enable default sensors (should include force sensor for respiration belt)
      gdxDevice.enableDefaultSensors();
      
      // Get enabled sensors
      const enabledSensors = gdxDevice.sensors.filter((s: any) => s.enabled);
      console.log('Enabled sensors:', enabledSensors.map((s: any) => s.name));
      
      // Set up data collection for each enabled sensor
      enabledSensors.forEach((sensor: any) => {
        sensor.on('value-changed', (sensor: any) => {
          console.log(`Official Vernier data - Sensor: ${sensor.name}, Value: ${sensor.value}, Units: ${sensor.unit}`);
          
          // Process force sensor data for breathing
          if (sensor.name.toLowerCase().includes('force') || sensor.unit === 'N') {
            const forceValue = parseFloat(sensor.value);
            setCurrentForce(forceValue);
            
            // Add to calibration data if calibrating
            if (isCalibrating) {
              calibrationDataRef.current.push(forceValue);
              
              // Calculate time-based progress (20 seconds)
              const elapsed = Date.now() - calibrationStartTimeRef.current;
              const calibrationDuration = 20000; // 20 seconds
              const progressPercent = Math.min(elapsed / calibrationDuration, 1);
              setCalibrationProgress(progressPercent);
              
              console.log(`Calibration progress: ${Math.round(progressPercent * 100)}% (${calibrationDataRef.current.length} samples, ${Math.round(elapsed/1000)}s)`);
              
              // Complete calibration when time is up
              if (elapsed >= calibrationDuration) {
                console.log('Calibration time complete, processing data...');
                completeCalibration();
              }
            } else if (calibrationProfile) {
              // Process breathing data using calibration profile
              processBreathingData(forceValue);
            }
          }
        });
      });
      
      setIsConnected(true);
      setIsConnecting(false);
      console.log('Successfully connected to Vernier respiration belt via official library');
      
    } catch (err) {
      console.error('Error connecting to Vernier device:', err);
      setError(`Connection failed: ${err}`);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, []);

  /**
   * Disconnect from the device
   */
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

  /**
   * Start calibration process
   */
  const startCalibration = useCallback(async () => {
    if (!isConnected) {
      setError('Please connect to device first');
      return;
    }

    console.log('Starting Vernier respiration belt calibration...');
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);
    setError(null);
    calibrationDataRef.current = [];
    calibrationStartTimeRef.current = Date.now();
    
    console.log('Calibration started at:', new Date(calibrationStartTimeRef.current).toLocaleTimeString());
  }, [isConnected]);

  /**
   * Complete calibration and calculate breathing profile
   */
  const completeCalibration = useCallback(() => {
    const data = calibrationDataRef.current;
    
    if (data.length < 50) {
      setError('Not enough calibration data. Please try again.');
      setIsCalibrating(false);
      return;
    }

    // Calculate breathing profile statistics
    const minForce = Math.min(...data);
    const maxForce = Math.max(...data);
    const baselineForce = data.reduce((sum, val) => sum + val, 0) / data.length;
    const forceRange = maxForce - minForce;

    const profile = {
      minForce,
      maxForce,
      baselineForce,
      forceRange,
      isValid: forceRange > 0.1 // Valid if range is more than 0.1N
    };

    setCalibrationProfile(profile);
    setCalibrationComplete(true);
    setIsCalibrating(false);
    
    console.log('Calibration complete:', profile);
  }, []);

  /**
   * Process breathing data using calibration profile
   */
  const processBreathingData = useCallback((force: number) => {
    if (!calibrationProfile) return;

    // Normalize force to 0-1 based on calibration
    const normalized = Math.max(0, Math.min(1, 
      (force - calibrationProfile.minForce) / calibrationProfile.forceRange
    ));
    
    setBreathAmplitude(normalized);

    // Determine breathing phase
    if (normalized > 0.7) {
      setBreathPhase('inhale');
    } else if (normalized < 0.3) {
      setBreathPhase('exhale');
    } else {
      setBreathPhase('pause');
    }

    // Store data for breathing rate calculation
    const timestamp = Date.now();
    forceDataRef.current.push({ force, timestamp });
    
    // Keep only last 60 seconds of data
    const cutoffTime = timestamp - 60000;
    forceDataRef.current = forceDataRef.current.filter(d => d.timestamp > cutoffTime);

    // Calculate breathing rate (simplified)
    if (forceDataRef.current.length > 100) {
      // Count peaks in the last minute
      const peaks = countBreathPeaks(forceDataRef.current);
      setBreathingRate(peaks);
    }
  }, [calibrationProfile]);

  /**
   * Count breathing peaks for rate calculation
   */
  const countBreathPeaks = (data: VernierRespirationData[]): number => {
    if (data.length < 20) return 0;
    
    let peaks = 0;
    let lastWasPeak = false;
    
    for (let i = 5; i < data.length - 5; i++) {
      const current = data[i].force;
      const isLocalMax = data.slice(i-3, i+4).every(d => d.force <= current);
      
      if (isLocalMax && !lastWasPeak && current > (calibrationProfile?.baselineForce || 0) + 0.1) {
        peaks++;
        lastWasPeak = true;
      } else if (!isLocalMax) {
        lastWasPeak = false;
      }
    }
    
    return peaks;
  };

  // Load the official Vernier library on component mount
  useEffect(() => {
    const loadVernierLibrary = () => {
      if (window.godirect) {
        console.log('Vernier GoDirect library already loaded');
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@vernier/godirect/dist/godirect.min.umd.js';
      script.onload = () => {
        console.log('Vernier GoDirect library loaded successfully');
      };
      script.onerror = () => {
        setError('Failed to load Vernier GoDirect library');
      };
      document.head.appendChild(script);
    };

    loadVernierLibrary();
  }, []);

  return {
    isConnected,
    isConnecting,
    breathAmplitude,
    breathPhase,
    breathingRate,
    connectDevice,
    disconnectDevice,
    error,
    isCalibrating,
    calibrationProgress,
    startCalibration,
    calibrationComplete,
    currentForce,
    calibrationProfile
  };
}