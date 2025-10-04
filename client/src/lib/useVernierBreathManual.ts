import { useState, useCallback, useRef, useEffect } from 'react';

// Import the official Vernier GoDirect library directly
let godirect: any = null;

// Dynamically import the Vernier library
const loadGoDirectLibrary = async () => {
  if (!godirect) {
    try {
      const goDirectModule = await import('@vernier/godirect');
      godirect = goDirectModule.default || goDirectModule;
      console.log('GoDirect library loaded successfully via import');
      return godirect;
    } catch (err) {
      console.error('Failed to import GoDirect library:', err);
      throw new Error('Failed to load Vernier GoDirect library');
    }
  }
  return godirect;
};

/**
 * Interface for Vernier respiration belt data using official library
 */
export interface VernierRespirationData {
  force: number; // Respiration force in Newtons (N)
  timestamp: number;
}

/**
 * Interface for the manual Vernier breath detection hook results
 */
interface VernierBreathManualHookResult {
  isConnected: boolean;
  isConnecting: boolean;
  breathAmplitude: number; // 0-1 normalized amplitude based on force data
  breathPhase: 'inhale' | 'exhale' | 'pause'; // Current breathing phase
  breathingRate: number; // breaths per minute (manual calculation)
  deviceBreathingRate: number | null; // Device-calculated breath rate from Channel 2
  stepsCount: number; // Steps from Channel 3
  stepRate: number; // Step rate from Channel 4
  connectDevice: () => Promise<void>;
  disconnectDevice: () => Promise<void>;
  forceDisconnectDevice: () => Promise<void>; // Hard disconnect that clears all references
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
 * Manual connection approach - users connect fresh each session for reliability
 */
export function useVernierBreathManual(): VernierBreathManualHookResult {
  console.log('🚨 VERNIER HOOK CALLED - Manual connection mode');
  
  // Connection state - Start fresh each time (no persistence)
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Breathing analysis state
  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause');
  const [breathingRate, setBreathingRate] = useState(0);
  const [deviceBreathingRate, setDeviceBreathingRate] = useState<number | null>(null); // Direct from Vernier Channel 2
  const [stepsCount, setStepsCount] = useState(0); // Channel 3
  const [stepRate, setStepRate] = useState(0); // Channel 4
  
  // Calibration state - Start fresh each session
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
  
  // Refs for device and data tracking (no persistence)
  const deviceRef = useRef<any>(null);
  const forceDataRef = useRef<VernierRespirationData[]>([]);
  const calibrationDataRef = useRef<number[]>([]);
  const calibrationStartTimeRef = useRef<number>(0);
  const lastForceValueRef = useRef<number>(0);
  const lastForceUpdateRef = useRef<number>(0);
  const breathCyclesRef = useRef<number[]>([]); // Track breath cycle timestamps
  const lastRateUpdateRef = useRef<number>(0);
  const initialRangeRef = useRef<number | null>(null); // Store initial force range to prevent heartbeat detection

  /**
   * Connect to Vernier GDX respiration belt using official library
   * Manual connection - fresh connection each session
   */
  const connectDevice = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('Connecting to Vernier device using official GoDirect library (manual mode)...');
      
      // Load the GoDirect library via dynamic import
      const goDirectLib = await loadGoDirectLibrary();
      console.log('GoDirect library loaded successfully');

      // Connect using official Vernier method
      const gdxDevice = await goDirectLib.selectDevice(true); // true = Bluetooth
      deviceRef.current = gdxDevice;
      
      console.log('Connected to:', gdxDevice.name);
      
      // CRITICAL: Explicitly enable both Force and Respiration Rate sensors
      // CHANNELS ARE 0-INDEXED!
      // Channel 0: Force (N)
      const forceSensor = gdxDevice.getSensor(0);
      if (forceSensor) {
        forceSensor.setEnabled(true);
        console.log('✅ Enabled Force sensor (Channel 0)');
      }
      
      // Channel 1: Respiration Rate (BPM) - THIS IS THE KEY!
      const respirationRateSensor = gdxDevice.getSensor(1);
      if (respirationRateSensor) {
        respirationRateSensor.setEnabled(true);
        console.log('✅ Enabled Respiration Rate sensor (Channel 1)');
      }
      
      // Optional: Enable Steps and Step Rate sensors if needed
      const stepsSensor = gdxDevice.getSensor(2);
      if (stepsSensor) {
        stepsSensor.setEnabled(false); // Disabled for now
        console.log('⏭️ Steps sensor (Channel 2) - disabled');
      }
      
      const stepRateSensor = gdxDevice.getSensor(3);
      if (stepRateSensor) {
        stepRateSensor.setEnabled(false); // Disabled for now
        console.log('⏭️ Step Rate sensor (Channel 3) - disabled');
      }
      
      // Set up listeners for Force sensor
      if (forceSensor) {
        forceSensor.on('value-changed', (sensor: any) => {
          console.log(`📊 VERNIER SENSOR DATA - Channel 0 (Force): ${sensor.value} ${sensor.unit}`);
          
          // Process ALL sensor types - not just Force!
          const sensorNameLower = sensor.name.toLowerCase();
          const sensorValue = sensor.value;
          
          // Channel 1: Force sensor (in Newtons)
          if (sensorNameLower.includes('force') || sensor.unit === 'N') {
            const forceValue = parseFloat(sensorValue);
            setCurrentForce(forceValue);
            console.log(`💪 Force detected: ${forceValue.toFixed(3)} N`);
            
            // Add to calibration data if calibrating
            const isCurrentlyCalibrating = calibrationStartTimeRef.current > 0 && !calibrationProfile;
            console.log('Data received - isCalibrating:', isCalibrating, 'isCurrentlyCalibrating:', isCurrentlyCalibrating, 'force:', forceValue.toFixed(2) + 'N');
            if (isCurrentlyCalibrating) {
              calibrationDataRef.current.push(forceValue);
              
              // Calculate time-based progress (20 seconds)
              const elapsed = Date.now() - calibrationStartTimeRef.current;
              const calibrationDuration = 20000; // 20 seconds
              const progressPercent = Math.min(elapsed / calibrationDuration, 1);
              setCalibrationProgress(progressPercent);
              
              console.log(`Calibration progress: ${Math.round(progressPercent * 100)}% (${calibrationDataRef.current.length} samples, ${Math.round(elapsed/1000)}s)`);
              
              // Complete calibration when time is up (but only once)
              if (elapsed >= calibrationDuration && !calibrationComplete) {
                console.log('Calibration time complete, processing data...');
                completeCalibration();
              }
            } else if (calibrationProfile) {
              // Process breathing data using calibration profile
              processBreathingData(forceValue);
            } else {
              // Breath-cycle-aware dynamic range that stabilizes during each breath
              const recentSamples = 100; // Larger sample window for stability
              forceDataRef.current.push({ timestamp: Date.now(), force: forceValue });
              
              if (forceDataRef.current.length < 20) {
                // Build up initial data
                setBreathAmplitude(0.5);
              } else {
                // Keep reasonable history
                if (forceDataRef.current.length > recentSamples) {
                  forceDataRef.current = forceDataRef.current.slice(-recentSamples);
                }
                
                // Calculate range from longer-term patterns (not just recent peaks)
                const forces = forceDataRef.current.map(d => d.force);
                
                // Use percentiles instead of min/max to avoid outliers affecting sync
                const sortedForces = [...forces].sort((a, b) => a - b);
                const percentile10 = sortedForces[Math.floor(sortedForces.length * 0.1)]; // 10th percentile as baseline min
                const percentile90 = sortedForces[Math.floor(sortedForces.length * 0.9)]; // 90th percentile as baseline max
                
                let range = percentile90 - percentile10;
                
                // CRITICAL FIX: Prevent range from collapsing to heartbeat level
                // Store initial range if not set
                if (!initialRangeRef.current && range > 0.5) {
                  initialRangeRef.current = range;
                  console.log(`Setting initial range: ${initialRangeRef.current.toFixed(3)}N`);
                }
                
                // Never let range drop below 15% of initial range to prevent heartbeat detection
                if (initialRangeRef.current) {
                  const minAllowedRange = initialRangeRef.current * 0.15;
                  if (range < minAllowedRange) {
                    console.log(`Range too narrow (${range.toFixed(3)}N), using minimum: ${minAllowedRange.toFixed(3)}N`);
                    range = minAllowedRange;
                  }
                }
                
                // Add breathing space only below for deeper exhales
                const bufferAmount = range * 0.6; // Increased buffer to capture full exhale capacity
                const dynamicMin = percentile10 - bufferAmount;
                const dynamicMax = percentile90 + (range * 0.1); // Small buffer above for occasional deep inhales
                
                // Calculate amplitude with stable range
                const normalizedAmplitude = Math.max(0, Math.min(1, (forceValue - dynamicMin) / (dynamicMax - dynamicMin)));
                setBreathAmplitude(normalizedAmplitude);
              }
              
              // Enhanced phase detection with breath-hold awareness
              const currentTime = Date.now();
              if (currentTime - lastForceUpdateRef.current > 100) { // Update every 100ms
                const forceChange = forceValue - lastForceValueRef.current;
                
                if (forceChange > 0.2) {
                  // Detect start of inhale - count as new breath cycle
                  if (breathPhase !== 'inhale') {
                    breathCyclesRef.current.push(currentTime);
                    // Keep only recent cycles (last 2 minutes for rate calculation)
                    breathCyclesRef.current = breathCyclesRef.current.filter(
                      timestamp => currentTime - timestamp < 120000
                    );
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
                    // Calculate BPM from recent cycles
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
        });
      }
      
      // Set up listener for Respiration Rate sensor (Channel 2)
      if (respirationRateSensor) {
        respirationRateSensor.on('value-changed', (sensor: any) => {
          console.log(`📊 VERNIER SENSOR DATA - Channel 1 (Respiration Rate): ${sensor.value} ${sensor.unit}`);
          
          const sensorValue = sensor.value;
          
          // Handle NAN values that occur initially
          if (sensorValue === 'NAN' || sensorValue === 'NaN' || isNaN(parseFloat(sensorValue))) {
            console.log(`⏳ Respiration Rate is calculating... (waiting for enough data)`);
            setDeviceBreathingRate(null);
          } else {
            const rateValue = parseFloat(sensorValue);
            console.log(`✅ DEVICE BREATH RATE: ${rateValue} BPM`);
            setDeviceBreathingRate(rateValue);
            // Use device rate as primary if available
            if (rateValue > 0) {
              setBreathingRate(Math.round(rateValue));
            }
          }
        });
      }
      
      // CRITICAL: Start data collection AFTER setting up all listeners
      await gdxDevice.start();
      console.log('✅ Data collection started - Respiration Rate will begin calculating (10-30 second window)');
      
      setIsConnected(true);
      setIsConnecting(false);
      console.log('Successfully connected to Vernier respiration belt via official library');
      
    } catch (err) {
      console.error('Connection failed:', err);
      setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [calibrationProfile, breathPhase, isCalibrating, calibrationComplete]);

  /**
   * Disconnect from device and clean up
   */
  const disconnectDevice = useCallback(async () => {
    try {
      if (deviceRef.current) {
        console.log('Disconnecting from Vernier device...');
        // Stop data collection before closing
        await deviceRef.current.stop();
        console.log('Data collection stopped');
        deviceRef.current.close();
        deviceRef.current = null;
      }
      
      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
      setBreathAmplitude(0);
      setBreathPhase('pause');
      setBreathingRate(0);
      setCurrentForce(0);
      setDeviceBreathingRate(null);
      setStepsCount(0);
      setStepRate(0);
      
      // Reset calibration
      setIsCalibrating(false);
      setCalibrationProgress(0);
      setCalibrationComplete(false);
      setCalibrationProfile(null);
      
      // Clear data refs
      forceDataRef.current = [];
      calibrationDataRef.current = [];
      calibrationStartTimeRef.current = 0;
      breathCyclesRef.current = [];
      
      console.log('Device disconnected successfully');
    } catch (err) {
      console.error('Error during disconnect:', err);
      setError(`Disconnect error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  /**
   * Force disconnect that clears all references
   */
  const forceDisconnectDevice = useCallback(async () => {
    console.log('Force disconnecting from Vernier device...');
    await disconnectDevice();
  }, [disconnectDevice]);

  /**
   * Process breathing data using calibration profile
   */
  const processBreathingData = useCallback((forceValue: number) => {
    if (!calibrationProfile) return;
    
    // Store initial calibration range if not set
    if (!initialRangeRef.current && calibrationProfile.forceRange > 0) {
      initialRangeRef.current = calibrationProfile.forceRange;
      console.log(`Calibration range stored: ${initialRangeRef.current.toFixed(3)}N`);
    }
    
    // Normalize force value to 0-1 range using calibration data
    const normalizedAmplitude = Math.max(0, Math.min(1, 
      (forceValue - calibrationProfile.minForce) / calibrationProfile.forceRange
    ));
    
    setBreathAmplitude(normalizedAmplitude);
    
    // Enhanced phase detection with calibrated thresholds
    const currentTime = Date.now();
    if (currentTime - lastForceUpdateRef.current > 100) { // Update every 100ms
      const forceChange = forceValue - lastForceValueRef.current;
      
      // Use calibrated thresholds for phase detection
      const changeThreshold = calibrationProfile.forceRange * 0.04; // 4% of calibrated range for minimal sensitivity
      
      if (forceChange > changeThreshold) {
        // Detect start of inhale - count as new breath cycle
        if (breathPhase !== 'inhale') {
          breathCyclesRef.current.push(currentTime);
          // Keep only recent cycles (last 2 minutes for rate calculation)
          breathCyclesRef.current = breathCyclesRef.current.filter(
            timestamp => currentTime - timestamp < 120000
          );
        }
        setBreathPhase('inhale');
      } else if (forceChange < -changeThreshold) {
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
          // Calculate BPM from recent cycles
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
  }, [calibrationProfile, breathPhase]);

  /**
   * Complete calibration and calculate profile
   */
  const completeCalibration = useCallback(() => {
    if (calibrationDataRef.current.length === 0) {
      setError('No calibration data collected');
      return;
    }
    
    console.log('Completing calibration with', calibrationDataRef.current.length, 'samples');
    
    // Calculate calibration profile from collected data
    const forces = [...calibrationDataRef.current];
    forces.sort((a, b) => a - b);
    
    const minForce = forces[0];
    const maxForce = forces[forces.length - 1];
    const baselineForce = forces[Math.floor(forces.length / 2)]; // Median
    const forceRange = maxForce - minForce;
    
    const profile = {
      minForce,
      maxForce,
      baselineForce,
      forceRange,
      isValid: forceRange > 0.5 // Minimum range threshold
    };
    
    console.log('Calibration profile:', profile);
    
    if (profile.isValid) {
      setCalibrationProfile(profile);
      setCalibrationComplete(true);
      setIsCalibrating(false);
      setCalibrationProgress(1.0);
      
      console.log('Calibration completed successfully');
    } else {
      setError('Calibration failed: insufficient force range detected. Try breathing more deeply during calibration.');
      setIsCalibrating(false);
      setCalibrationProgress(0);
    }
    
    // Reset calibration data
    calibrationDataRef.current = [];
    calibrationStartTimeRef.current = 0;
  }, []);

  /**
   * Start calibration process
   */
  const startCalibration = useCallback(async () => {
    if (!isConnected) {
      setError('Device must be connected before calibration');
      return;
    }
    
    console.log('Starting respiration belt calibration...');
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);
    setCalibrationProfile(null);
    setError(null);
    
    // Reset calibration data
    calibrationDataRef.current = [];
    calibrationStartTimeRef.current = Date.now();
    
    console.log('Calibration started - breathe normally for 20 seconds');
  }, [isConnected]);

  return {
    isConnected,
    isConnecting,
    breathAmplitude,
    breathPhase,
    breathingRate,
    deviceBreathingRate, // New: Device-calculated breath rate
    stepsCount,         // New: Steps from Channel 3
    stepRate,          // New: Step rate from Channel 4
    connectDevice,
    disconnectDevice,
    forceDisconnectDevice,
    error,
    isCalibrating,
    calibrationProgress,
    startCalibration,
    calibrationComplete,
    currentForce,
    calibrationProfile,
  };
}