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
  breathingRate: number; // breaths per minute
  connectDevice: () => Promise<void>;
  disconnectDevice: () => void;
  forceDisconnectDevice: () => void; // Hard disconnect that clears all references
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
  respirationDataReceived: boolean;
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
  const [breathingRate, setBreathingRate] = useState(12); // Start with typical rate until we detect actual breathing
  const [respirationDataReceived, setRespirationDataReceived] = useState(false); // Track if we've received valid sensor data
  
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
      
      // Try to enable all sensors to capture respiration rate
      console.log('Attempting to enable all sensors...');
      
      // First enable defaults
      gdxDevice.enableDefaultSensors();
      
      // Then try to enable respiration rate sensor specifically
      const respirationSensor = gdxDevice.sensors.find((s: any) => 
        s.name.toLowerCase().includes('respiration') || 
        s.name.toLowerCase().includes('breath') ||
        s.name.toLowerCase().includes('rate')
      );
      
      if (respirationSensor && !respirationSensor.enabled) {
        console.log('Found respiration sensor, enabling it:', respirationSensor.name);
        respirationSensor.enabled = true;
      }
      
      // Get all sensors (not just enabled ones)
      console.log('All available sensors:', gdxDevice.sensors.map((s: any) => ({
        name: s.name,
        number: s.number,
        enabled: s.enabled,
        unit: s.unit,
        type: s.type
      })));
      
      // Get enabled sensors
      const enabledSensors = gdxDevice.sensors.filter((s: any) => s.enabled);
      console.log('Enabled sensors:', enabledSensors.map((s: any) => s.name));
      
      // Set up data collection for each enabled sensor
      enabledSensors.forEach((sensor: any) => {
        sensor.on('value-changed', (sensor: any) => {
          console.log(`Official Vernier data - Sensor: ${sensor.name}, Value: ${sensor.value}, Units: ${sensor.unit}`);
          
          // Check if this is the respiration rate sensor
          if (sensor.name.toLowerCase().includes('respiration') && sensor.unit === 'bpm') {
            const rate = parseFloat(sensor.value);
            console.log('[BREATH DEBUG] Respiration Rate Sensor:', sensor.name, '=', sensor.value, sensor.unit);
            
            if (!isNaN(rate) && rate > 0) {
              console.log('[BREATH DEBUG] ✅ Valid respiration rate from Vernier:', rate, 'BPM');
              setBreathingRate(Math.round(rate));
              setRespirationDataReceived(true);
            } else if (isNaN(rate)) {
              console.log('[BREATH DEBUG] ⏳ Respiration rate is NaN - waiting for 30 seconds of data...');
              // This is normal - Vernier needs 30 seconds of data before calculating BPM
            }
          }
          
          // Process force sensor data for breathing
          if (sensor.name.toLowerCase().includes('force') || sensor.unit === 'N') {
            const forceValue = parseFloat(sensor.value);
            setCurrentForce(forceValue);
            
            // Log every 20th force value to see the range
            if (Math.random() < 0.05) {
              console.log('[BREATH DEBUG] Raw force value:', forceValue.toFixed(4), 'N');
            }
            
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
                
                const range = percentile90 - percentile10;
                
                // Add breathing space only below for deeper exhales
                const bufferAmount = range * 0.6; // Increased buffer to capture full exhale capacity
                const dynamicMin = percentile10 - bufferAmount;
                const dynamicMax = percentile90 + (range * 0.1); // Small buffer above for occasional deep inhales
                
                // Calculate amplitude with stable range
                const normalizedAmplitude = Math.max(0, Math.min(1, (forceValue - dynamicMin) / (dynamicMax - dynamicMin)));
                
                // Debug amplitude calculation
                console.log('[BREATH AMPLITUDE DEBUG]:', {
                  forceValue: forceValue.toFixed(4),
                  percentile10: percentile10.toFixed(4),
                  percentile90: percentile90.toFixed(4),
                  range: range.toFixed(4),
                  dynamicMin: dynamicMin.toFixed(4),
                  dynamicMax: dynamicMax.toFixed(4),
                  normalizedAmplitude: normalizedAmplitude.toFixed(4),
                  dataPoints: forceDataRef.current.length
                });
                
                setBreathAmplitude(normalizedAmplitude);
              }
              
              // Enhanced phase detection with breath-hold awareness
              const currentTime = Date.now();
              if (currentTime - lastForceUpdateRef.current > 100) { // Update every 100ms
                const forceChange = forceValue - lastForceValueRef.current;
                
                // Use more sensitive thresholds for uncalibrated detection
                const sensitiveThreshold = 0.02; // Even more sensitive for tiny force changes
                
                // Debug logging for force changes
                if (Math.abs(forceChange) > 0.01) {
                  console.log('[BREATH DEBUG] Force change:', forceChange.toFixed(4), 'Current phase:', breathPhase, 'Threshold:', sensitiveThreshold);
                }
                
                // Track phase transitions to detect complete breath cycles
                const previousPhase = breathPhase;
                
                if (forceChange > sensitiveThreshold) {
                  setBreathPhase('inhale');
                } else if (forceChange < -sensitiveThreshold) {
                  setBreathPhase('exhale');
                } else {
                  setBreathPhase('pause');
                }
                
                // Only count a new breath cycle when transitioning from exhale to inhale
                if (previousPhase === 'exhale' && breathPhase === 'inhale') {
                  console.log('[BREATH DEBUG] New breath cycle detected at', new Date(currentTime).toLocaleTimeString());
                  breathCyclesRef.current.push(currentTime);
                  // Keep only recent cycles (last 2 minutes for rate calculation)
                  breathCyclesRef.current = breathCyclesRef.current.filter(
                    timestamp => currentTime - timestamp < 120000
                  );
                }
                
                // Only calculate breathing rate manually if we're not getting it from the sensor
                // The Vernier belt provides direct respiration rate data, but it may return NaN initially
                if (currentTime - lastRateUpdateRef.current > 10000) {
                  // Check if we need manual calculation (respiration sensor not providing valid data)
                  const recentCycles = breathCyclesRef.current.filter(
                    timestamp => currentTime - timestamp < 60000 // Last minute
                  );
                  
                  console.log('[BREATH DEBUG] Manual BPM calculation - Recent cycles:', recentCycles.length, 'Total cycles:', breathCyclesRef.current.length);
                  
                  if (recentCycles.length >= 2) {
                    // Calculate BPM from recent cycles
                    const timeSpan = (currentTime - recentCycles[0]) / 1000; // seconds
                    const cyclesPerSecond = (recentCycles.length - 1) / timeSpan;
                    const bpm = Math.round(cyclesPerSecond * 60);
                    console.log('[BREATH DEBUG] Manually calculated BPM:', bpm, 'from', recentCycles.length, 'cycles over', timeSpan.toFixed(1), 'seconds');
                    // Use manual calculation as fallback when sensor data is invalid
                    setBreathingRate(Math.max(4, Math.min(20, bpm)));
                  } else {
                    console.log('[BREATH DEBUG] Not enough cycles for manual BPM calculation');
                  }
                  
                  lastRateUpdateRef.current = currentTime;
                }
                
                lastForceValueRef.current = forceValue;
                lastForceUpdateRef.current = currentTime;
              }
            }
          }
        });
      });
      
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
  const disconnectDevice = useCallback(() => {
    try {
      if (deviceRef.current) {
        console.log('Disconnecting from Vernier device...');
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
  const forceDisconnectDevice = useCallback(() => {
    console.log('Force disconnecting from Vernier device...');
    disconnectDevice();
  }, [disconnectDevice]);

  /**
   * Process breathing data using calibration profile
   */
  const processBreathingData = useCallback((forceValue: number) => {
    if (!calibrationProfile) return;
    
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
      
      // Calculate breathing rate every 2 seconds for more responsive display
      if (currentTime - lastRateUpdateRef.current > 2000) {
        const recentCycles = breathCyclesRef.current.filter(
          timestamp => currentTime - timestamp < 60000 // Last 60 seconds
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
    respirationDataReceived,
  };
}