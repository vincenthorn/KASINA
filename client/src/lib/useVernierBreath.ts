import { useState, useCallback, useRef, useEffect } from 'react';

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
  
  // Breathing analysis state
  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause');
  const [breathingRate, setBreathingRate] = useState(0);
  
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
  
  // Refs for device connections and data
  const deviceRef = useRef<any>(null);
  const serverRef = useRef<any>(null);
  const characteristicRef = useRef<any>(null);
  const forceDataRef = useRef<RespirationData[]>([]);
  const calibrationDataRef = useRef<number[]>([]);
  const calibrationStartTimeRef = useRef<number>(0);
  const smoothedForceRef = useRef<number>(0);
  const lastBreathTimeRef = useRef<number>(0);
  const breathCyclesRef = useRef<number[]>([]);

  /**
   * Connect to Vernier GDX respiration belt via Bluetooth
   */
  const connectDevice = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('Requesting Vernier GDX device...');
      
      // Request Bluetooth device
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX' },
          { namePrefix: 'Vernier' }
        ],
        optionalServices: [
          'd91714ef-28b9-4f91-ba16-f0d9a604f112', // Vernier service
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery service
          '0000180a-0000-1000-8000-00805f9b34fb'  // Device info service
        ]
      });
      
      console.log('Device selected:', device.name);
      deviceRef.current = device;
      
      console.log('Connecting to GATT server...');
      const server = await device.gatt!.connect();
      serverRef.current = server;
      
      console.log('Discovering services...');
      const services = await server.getPrimaryServices();
      
      for (const service of services) {
        console.log("Service:", service.uuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          console.log("  Characteristic:", char.uuid, "Properties:", char.properties);
          
          // Look for the main data characteristic
          if (char.uuid === 'b41e6675-a329-40e0-aa01-44d2f444babe') {
            console.log("    -> Found main sensor characteristic");
            characteristicRef.current = char;
            
            if (char.properties.notify) {
              await char.startNotifications();
              char.addEventListener('characteristicvaluechanged', handleForceData);
              console.log("    -> Notifications started");
            }
          }
          
          // Look for write characteristic to send start commands
          if (char.uuid === 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb') {
            console.log("    -> Found command characteristic, sending GDX-RB activation sequence...");
            try {
              // GDX-RB specific activation sequence
              
              // Try polling approach - actively request data
              console.log("    -> Starting active data polling...");
              
              // Set up interval to poll for data every 50ms
              const pollInterval = setInterval(async () => {
                try {
                  // Send data request command
                  const requestData = new Uint8Array([0x12]); // Simple data request
                  await char.writeValue(requestData);
                } catch (e) {
                  console.log("Polling error:", e);
                }
              }, 50);
              
              // Store interval for cleanup
              pollIntervalRef.current = pollInterval;
              
              console.log("    -> GDX-RB activation sequence completed successfully");
              
            } catch (e) {
              console.log("    -> GDX commands failed, trying simple fallback:", e);
              try {
                // Fallback to simple start command
                const simpleStart = new Uint8Array([0x01]);
                await char.writeValue(simpleStart);
                console.log("    -> Fallback start command sent");
              } catch (e2) {
                console.log("    -> All activation attempts failed");
              }
            }
          }
        }
      }
      
      if (!characteristicRef.current) {
        throw new Error('Could not find sensor data characteristic');
      }
      
      setIsConnected(true);
      setIsConnecting(false);
      console.log('Successfully connected to Vernier respiration belt');
      
    } catch (err) {
      console.error('Error connecting to device:', err);
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
      
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, []);
  
  /**
   * Handle incoming force data from the respiration belt
   */
  const handleForceData = useCallback((event: Event) => {
    const target = event.target as any;
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
      
      // GDX-RB specific data format (7 bytes)
      if (value.byteLength === 7) {
        // GDX-RB sends 7-byte packets with force data
        // Typical format: [header] [force_low] [force_high] [other_data...]
        // Force is usually in bytes 1-2 or 1-4 depending on resolution
        
        // Try interpreting as 16-bit force value at different positions
        const force16_pos1 = value.getInt16(1, true); // Position 1-2
        const force16_pos2 = value.getInt16(2, true); // Position 2-3
        const force16_pos3 = value.getInt16(3, true); // Position 3-4
        
        console.log('Force interpretations: pos1:', force16_pos1, 'pos2:', force16_pos2, 'pos3:', force16_pos3);
        
        // Use the most reasonable value (likely position 1 based on your 1948 reading)
        force = force16_pos1 / 100.0; // Convert to Newtons (typical GDX-RB scaling)
        
        // Sanity check - force should be reasonable for breathing (0.1 to 50 Newtons)
        if (Math.abs(force) > 100) {
          force = force16_pos2 / 100.0; // Try position 2
          if (Math.abs(force) > 100) {
            force = force16_pos3 / 100.0; // Try position 3
          }
        }
      } else if (value.byteLength >= 4) {
        force = value.getFloat32(0, true);
      } else if (value.byteLength >= 2) {
        force = value.getInt16(0, true) / 100.0; // Scale to Newtons
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
    // Apply exponential smoothing to reduce noise
    const smoothingFactor = 0.1;
    smoothedForceRef.current = smoothedForceRef.current * (1 - smoothingFactor) + data.force * smoothingFactor;
    
    // Only process if we have calibration data
    if (!calibrationProfile || !calibrationProfile.isValid) {
      return;
    }
    
    // Normalize force to 0-1 range based on calibration
    const normalizedForce = Math.max(0, Math.min(1, 
      (smoothedForceRef.current - calibrationProfile.minForce) / calibrationProfile.forceRange
    ));
    
    setBreathAmplitude(normalizedForce);
    
    // Determine breathing phase based on force level
    if (normalizedForce > 0.7) {
      setBreathPhase('inhale');
    } else if (normalizedForce < 0.3) {
      setBreathPhase('exhale');
    } else {
      setBreathPhase('pause');
    }
    
    // Simple breath amplitude mapping (can be enhanced)
    setBreathAmplitude(normalizedForce);
    
    // Update breathing rate calculation
    updateBreathingRate(data.timestamp, calibrationProfile);
  }, [calibrationProfile]);
  
  /**
   * Update breathing rate calculation
   */
  const updateBreathingRate = useCallback((timestamp: number, profile: any) => {
    // Detect breath cycles (simplified)
    if (breathPhase === 'inhale' && timestamp - lastBreathTimeRef.current > 1000) {
      breathCyclesRef.current.push(timestamp);
      lastBreathTimeRef.current = timestamp;
      
      // Keep only recent breath cycles (last 60 seconds)
      const cutoff = timestamp - 60000;
      breathCyclesRef.current = breathCyclesRef.current.filter(time => time > cutoff);
      
      // Calculate breaths per minute
      if (breathCyclesRef.current.length > 1) {
        const timeSpan = timestamp - breathCyclesRef.current[0];
        const rate = (breathCyclesRef.current.length - 1) * 60000 / timeSpan;
        setBreathingRate(Math.round(rate));
      }
    }
  }, [breathPhase]);
  
  /**
   * Handle calibration data collection
   */
  const handleCalibrationData = useCallback((force: number) => {
    const now = Date.now();
    const elapsed = now - calibrationStartTimeRef.current;
    
    calibrationDataRef.current.push(force);
    setCalibrationProgress(Math.min(1, elapsed / 30000)); // 30 second calibration
    
    // Complete calibration after 30 seconds or 300 samples
    if (elapsed >= 30000 || calibrationDataRef.current.length >= 300) {
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
    
    // Calculate calibration metrics
    const sortedForces = [...forces].sort((a, b) => a - b);
    const minForce = sortedForces[Math.floor(sortedForces.length * 0.05)]; // 5th percentile
    const maxForce = sortedForces[Math.floor(sortedForces.length * 0.95)]; // 95th percentile
    const baselineForce = forces.reduce((sum, f) => sum + f, 0) / forces.length;
    const forceRange = maxForce - minForce;
    
    console.log(`Calibration complete: Min=${minForce.toFixed(3)}N, Max=${maxForce.toFixed(3)}N, Range=${forceRange.toFixed(3)}N`);
    
    setCalibrationProfile({
      minForce,
      maxForce,
      baselineForce,
      forceRange,
      isValid: forceRange > 0.1 // Require minimum force range
    });
    setCalibrationComplete(true);
    setIsCalibrating(false);
    setCalibrationProgress(1);
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