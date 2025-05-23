import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Interface for Vernier respiration belt data
 */
export interface RespirationData {
  force: number; // Respiration force in Newtons (N)
  timestamp: number;
}

/**
 * Interface for the Vernier breath detection hook results
 */
interface VernierBreathHookResult {
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
  calibrationProfile: {
    minForce: number;
    maxForce: number;
    baselineForce: number;
    forceRange: number;
    isValid: boolean;
  } | null;
}

/**
 * Custom hook for detecting breathing patterns using Vernier Respiration Belt via Bluetooth
 * 
 * This hook connects to a Vernier GDX respiration belt and provides real-time breathing data
 * by analyzing the force sensor readings from the belt around the chest.
 */
export function useVernierBreath(): VernierBreathHookResult {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Breath data state
  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathingRate, setBreathingRate] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause');
  
  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [calibrationProfile, setCalibrationProfile] = useState<{
    minForce: number;
    maxForce: number;
    baselineForce: number;
    forceRange: number;
    isValid: boolean;
  } | null>(null);
  
  // Bluetooth device refs
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  
  // Data processing refs
  const forceDataRef = useRef<RespirationData[]>([]);
  const breathCyclesRef = useRef<number[]>([]);
  const lastBreathTimeRef = useRef<number>(0);
  const smoothedForceRef = useRef<number>(0);
  
  // Calibration data refs
  const calibrationDataRef = useRef<number[]>([]);
  const calibrationStartTimeRef = useRef<number>(0);
  
  /**
   * Connect to Vernier GDX respiration belt via Bluetooth
   */
  const connectDevice = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('Requesting Vernier GDX device...');
      
      // Request device with GDX name prefix
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "GDX" }],
        optionalServices: ['battery_service', 'device_information'] // Add more services as needed
      });
      
      console.log('Device selected:', device.name);
      deviceRef.current = device;
      
      // Connect to GATT server
      console.log('Connecting to GATT server...');
      const server = await device.gatt!.connect();
      serverRef.current = server;
      
      // Discover services and characteristics
      console.log('Discovering services...');
      const services = await server.getPrimaryServices();
      
      // Log all available services and characteristics for debugging
      for (const service of services) {
        console.log("Service:", service.uuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          console.log("  Characteristic:", char.uuid, "Properties:", char.properties);
          
          // Look for characteristics that can notify (likely sensor data)
          if (char.properties.notify || char.properties.read) {
            console.log("    -> Potential data characteristic found");
            characteristicRef.current = char;
            
            // Start notifications if supported
            if (char.properties.notify) {
              await char.startNotifications();
              char.addEventListener('characteristicvaluechanged', handleForceData);
              console.log("    -> Notifications started for", char.uuid);
              
              // If this is the main sensor data characteristic, try to start measurements
              if (char.uuid === 'b41e6675-a329-40e0-aa01-44d2f444babe') {
                console.log("    -> Found main sensor characteristic, attempting to start data stream...");
                
                // Try different start commands that Vernier devices commonly use
                try {
                  // Method 1: Simple start command (0x01)
                  const startCmd1 = new Uint8Array([0x01]);
                  if (char.properties.write || char.properties.writeWithoutResponse) {
                    await char.writeValue(startCmd1);
                    console.log("    -> Sent start command (0x01)");
                  }
                } catch (e) {
                  console.log("    -> Method 1 failed, trying alternative...");
                }
                
                // Method 2: Try reading from the characteristic to trigger data
                try {
                  if (char.properties.read) {
                    const initialRead = await char.readValue();
                    console.log("    -> Initial read performed, length:", initialRead.byteLength);
                  }
                } catch (e) {
                  console.log("    -> Initial read failed");
                }
              }
            }
          }
        }
      }
      
      if (!characteristicRef.current) {
        throw new Error('No suitable sensor data characteristic found on device');
      }
      
      setIsConnected(true);
      setIsConnecting(false);
      console.log('Successfully connected to Vernier respiration belt');
      
    } catch (err) {
      console.error('Error connecting to device:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to device');
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, []);
  
  /**
   * Disconnect from the device
   */
  const disconnectDevice = useCallback(() => {
    try {
      if (characteristicRef.current) {
        characteristicRef.current.removeEventListener('characteristicvaluechanged', handleForceData);
        characteristicRef.current = null;
      }
      
      if (serverRef.current) {
        serverRef.current.disconnect();
        serverRef.current = null;
      }
      
      deviceRef.current = null;
      setIsConnected(false);
      setError(null);
      
      console.log('Disconnected from Vernier device');
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, []);
  
  /**
   * Handle incoming force data from the respiration belt
   */
  const handleForceData = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    
    if (!value) return;
    
    // Debug: Log the raw data to understand the format
    console.log('Raw Vernier data - Buffer length:', value.byteLength);
    const rawBytes = new Uint8Array(value.buffer);
    console.log('Raw bytes:', Array.from(rawBytes));
    
    // Try different parsing methods to find the correct format
    let force = 0;
    
    try {
      // Method 1: Try as Float32 (little-endian)
      if (value.byteLength >= 4) {
        force = value.getFloat32(0, true);
        console.log('Float32 (LE) interpretation:', force);
      }
      
      // Method 2: Try as Float32 (big-endian) 
      if (value.byteLength >= 4) {
        const forceBE = value.getFloat32(0, false);
        console.log('Float32 (BE) interpretation:', forceBE);
      }
      
      // Method 3: Try as Int16 
      if (value.byteLength >= 2) {
        const forceInt16 = value.getInt16(0, true);
        console.log('Int16 interpretation:', forceInt16);
      }
      
      // Method 4: Try as Uint16
      if (value.byteLength >= 2) {
        const forceUint16 = value.getUint16(0, true);
        console.log('Uint16 interpretation:', forceUint16);
      }
      
      // For now, use Float32 little-endian as the primary value
      if (value.byteLength >= 4) {
        force = value.getFloat32(0, true);
      } else if (value.byteLength >= 2) {
        // Fall back to Int16 if not enough bytes for Float32
        force = value.getInt16(0, true) / 1000.0; // Convert to Newtons if needed
      }
      
    } catch (error) {
      console.error('Error parsing Vernier data:', error);
      return;
    }
    
    console.log('Final force value:', force);
    
    const timestamp = Date.now();
    const respirationData: RespirationData = { force, timestamp };
    
    // Store the data
    forceDataRef.current.push(respirationData);
    
    // Keep only recent data (last 30 seconds)
    const cutoffTime = timestamp - 30000;
    forceDataRef.current = forceDataRef.current.filter(data => data.timestamp > cutoffTime);
    
    // Process the data for breathing analysis
    processRespirationData(respirationData);
    
    // Handle calibration if active
    if (isCalibrating) {
      handleCalibrationData(force);
    }
    
    console.log(`🫁 Force: ${force.toFixed(3)}N, Phase: ${breathPhase}, Amplitude: ${breathAmplitude.toFixed(3)}`);
  }, [isCalibrating, breathPhase, breathAmplitude]);
  
  /**
   * Process respiration force data to extract breathing information
   */
  const processRespirationData = useCallback((data: RespirationData) => {
    const { force } = data;
    
    // Apply smoothing to reduce noise
    const smoothingFactor = 0.1;
    smoothedForceRef.current = smoothedForceRef.current + smoothingFactor * (force - smoothedForceRef.current);
    
    // If we have calibration data, use it to normalize
    if (calibrationProfile && calibrationProfile.isValid) {
      const { minForce, maxForce, baselineForce, forceRange } = calibrationProfile;
      
      // Normalize force to 0-1 range based on calibration
      const normalizedForce = Math.max(0, Math.min(1, 
        (smoothedForceRef.current - minForce) / forceRange
      ));
      
      setBreathAmplitude(normalizedForce);
      
      // Detect breathing phase based on force relative to baseline
      const forceThreshold = 0.1; // 10% threshold for phase detection
      if (normalizedForce > 0.5 + forceThreshold) {
        setBreathPhase('inhale');
      } else if (normalizedForce < 0.5 - forceThreshold) {
        setBreathPhase('exhale');
      } else {
        setBreathPhase('pause');
      }
      
      // Calculate breathing rate
      updateBreathingRate(data.timestamp);
    } else {
      // Without calibration, use raw force with basic normalization
      const rawAmplitude = Math.max(0, Math.min(1, force / 10)); // Assuming max ~10N
      setBreathAmplitude(rawAmplitude);
    }
  }, [calibrationProfile]);
  
  /**
   * Update breathing rate calculation
   */
  const updateBreathingRate = useCallback((timestamp: number) => {
    const timeSinceLastBreath = timestamp - lastBreathTimeRef.current;
    
    // Detect breath cycles (simplified - looking for inhale peaks)
    if (breathPhase === 'inhale' && timeSinceLastBreath > 1000) { // At least 1 second between breaths
      breathCyclesRef.current.push(timestamp);
      lastBreathTimeRef.current = timestamp;
      
      // Keep only recent breath cycles (last 2 minutes)
      const cutoffTime = timestamp - 120000;
      breathCyclesRef.current = breathCyclesRef.current.filter(time => time > cutoffTime);
      
      // Calculate breathing rate in breaths per minute
      if (breathCyclesRef.current.length > 1) {
        const totalTime = timestamp - breathCyclesRef.current[0];
        const breathsPerMs = (breathCyclesRef.current.length - 1) / totalTime;
        const breathsPerMinute = breathsPerMs * 60000;
        setBreathingRate(Math.round(breathsPerMinute));
      }
    }
  }, [breathPhase]);
  
  /**
   * Handle calibration data collection
   */
  const handleCalibrationData = useCallback((force: number) => {
    const now = Date.now();
    const elapsed = now - calibrationStartTimeRef.current;
    const calibrationDuration = 20000; // 20 seconds
    
    calibrationDataRef.current.push(force);
    setCalibrationProgress(Math.min(1, elapsed / calibrationDuration));
    
    // Complete calibration after duration
    if (elapsed >= calibrationDuration) {
      completeCalibration();
    }
  }, []);
  
  /**
   * Complete calibration and calculate profile
   */
  const completeCalibration = useCallback(() => {
    const forces = calibrationDataRef.current;
    
    if (forces.length < 10) {
      setError('Not enough calibration data collected');
      setIsCalibrating(false);
      return;
    }
    
    // Calculate calibration profile
    const minForce = Math.min(...forces);
    const maxForce = Math.max(...forces);
    const baselineForce = forces.reduce((sum, f) => sum + f, 0) / forces.length;
    const forceRange = maxForce - minForce;
    
    const profile = {
      minForce,
      maxForce,
      baselineForce,
      forceRange,
      isValid: forceRange > 0.5 // Ensure we have meaningful force variation
    };
    
    setCalibrationProfile(profile);
    setCalibrationComplete(true);
    setIsCalibrating(false);
    setCalibrationProgress(1);
    
    console.log('Calibration complete:', profile);
  }, []);
  
  /**
   * Start calibration process
   */
  const startCalibration = useCallback(async () => {
    if (!isConnected) {
      setError('Device not connected');
      return;
    }
    
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);
    calibrationDataRef.current = [];
    calibrationStartTimeRef.current = Date.now();
    
    console.log('Starting respiration belt calibration...');
  }, [isConnected]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectDevice();
    };
  }, [disconnectDevice]);
  
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
    calibrationProfile
  };
}