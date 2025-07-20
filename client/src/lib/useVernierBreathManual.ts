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
  const dataCollectionStartRef = useRef<number>(0); // Track when data collection started
  const lastPeakRef = useRef<number>(0); // Track last peak force value
  const lastValleyRef = useRef<number>(0); // Track last valley force value
  const breathingPatternRef = useRef<'rising' | 'falling'>('rising'); // Track breathing direction

  /**
   * Calculate BPM from detected breath cycles
   */
  const calculateBPM = useCallback(() => {
    const now = Date.now();
    
    console.log(`📊 calculateBPM called with ${breathCyclesRef.current.length} total cycles`);
    
    // Clean up old cycles (keep last 2 minutes)
    const beforeCleanup = breathCyclesRef.current.length;
    breathCyclesRef.current = breathCyclesRef.current.filter(
      timestamp => now - timestamp < 120000
    );
    const afterCleanup = breathCyclesRef.current.length;
    
    if (beforeCleanup !== afterCleanup) {
      console.log(`🧹 Cleaned up ${beforeCleanup - afterCleanup} old cycles`);
    }
    
    // Need at least 3 cycles for reliable calculation
    if (breathCyclesRef.current.length >= 3) {
      // Use recent cycles for calculation
      const recentCycles = breathCyclesRef.current.slice(-10); // Last 10 breaths
      console.log(`📈 Using ${recentCycles.length} recent cycles for BPM calculation`);
      
      // Calculate average interval
      let totalInterval = 0;
      const intervals: number[] = [];
      for (let i = 1; i < recentCycles.length; i++) {
        const interval = recentCycles[i] - recentCycles[i - 1];
        intervals.push(interval);
        totalInterval += interval;
      }
      const avgInterval = totalInterval / (recentCycles.length - 1);
      
      console.log(`⏱️ Breath intervals (ms): ${intervals.map(i => Math.round(i)).join(', ')}`);
      console.log(`⏱️ Average interval: ${Math.round(avgInterval)}ms`);
      
      // Convert to BPM
      const bpm = Math.round(60000 / avgInterval);
      
      console.log(`🫁 Calculated BPM: ${bpm}`);
      
      // Validate reasonable range
      if (bpm >= 4 && bpm <= 30) {
        console.log(`✅ Setting BPM to ${bpm} (from ${recentCycles.length} cycles)`);
        setBreathingRate(bpm);
      } else {
        console.warn(`⚠️ BPM ${bpm} outside valid range (4-30)`);
      }
    } else {
      console.log(`⏳ Not enough cycles yet (${breathCyclesRef.current.length} < 3)`);
    }
  }, []);

  /**
   * Detect breathing cycles from force sensor patterns
   */
  const detectBreathingCycles = useCallback((forceValue: number) => {
    const now = Date.now();
    
    // Need some data to work with
    if (forceDataRef.current.length < 10) {
      return;
    }
    
    // Get recent force values for pattern detection
    const recentForces = forceDataRef.current.slice(-30).map(d => d.force);
    const avgForce = recentForces.reduce((a, b) => a + b, 0) / recentForces.length;
    const minForce = Math.min(...recentForces);
    const maxForce = Math.max(...recentForces);
    const forceRange = maxForce - minForce;
    
    // Log detection status periodically
    if (now % 3000 < 100) {
      console.log(`🔍 Breathing detection: range=${forceRange.toFixed(3)}N, current=${forceValue.toFixed(2)}N, pattern=${breathingPatternRef.current}, lastPeak=${lastPeakRef.current.toFixed(2)}N, lastValley=${lastValleyRef.current.toFixed(2)}N`);
    }
    
    // Need meaningful variation to detect breathing
    if (forceRange < 0.05) {
      return;
    }
    
    // Initialize peak/valley if not set
    if (lastPeakRef.current === 0 || lastValleyRef.current === 0) {
      lastPeakRef.current = avgForce + forceRange * 0.3;
      lastValleyRef.current = avgForce - forceRange * 0.3;
      console.log(`🎯 Initialized peak/valley: peak=${lastPeakRef.current.toFixed(2)}N, valley=${lastValleyRef.current.toFixed(2)}N`);
    }
    
    // Detect peaks and valleys with lower threshold
    const threshold = forceRange * 0.08; // 8% of range for better sensitivity
    
    if (breathingPatternRef.current === 'rising') {
      if (forceValue > lastPeakRef.current) {
        lastPeakRef.current = forceValue;
      } else if (forceValue < lastPeakRef.current - threshold && lastPeakRef.current > avgForce) {
        // Peak detected, now falling
        console.log(`🌊 Breath PEAK detected at ${lastPeakRef.current.toFixed(2)}N (threshold=${threshold.toFixed(3)}N)`);
        breathCyclesRef.current.push(now);
        breathingPatternRef.current = 'falling';
        lastValleyRef.current = forceValue;
        
        // Calculate BPM if we have enough cycles
        calculateBPM();
      }
    } else { // falling
      if (forceValue < lastValleyRef.current) {
        lastValleyRef.current = forceValue;
      } else if (forceValue > lastValleyRef.current + threshold && lastValleyRef.current < avgForce) {
        // Valley detected, now rising
        console.log(`🌊 Breath VALLEY detected at ${lastValleyRef.current.toFixed(2)}N (threshold=${threshold.toFixed(3)}N)`);
        breathingPatternRef.current = 'rising';
        lastPeakRef.current = forceValue;
      }
    }
  }, [calculateBPM]);

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

      // Connect using official Vernier method with proper initialization
      console.log('Opening device selection dialog...');
      
      // Request the BLE device first
      const bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{namePrefix: 'GDX'}],
        optionalServices: ['d91714ef-28b9-4f91-ba16-f0d9a604f112']
      });
      
      console.log('BLE device selected:', bleDevice.name);
      
      // Create the GDX device with specific options
      const gdxDevice = await goDirectLib.createDevice(bleDevice, {
        open: true,              // Open the device connection
        startMeasurements: false // Don't start measurements immediately
      });
      
      deviceRef.current = gdxDevice;
      
      console.log('Connected to:', gdxDevice.name);
      
      // Log all available sensors with their channel numbers
      console.log('📊 Available sensors on device:');
      gdxDevice.sensors.forEach((sensor: any, index: number) => {
        console.log(`  Channel ${index}: ${sensor.name} (${sensor.unit}) - Enabled: ${sensor.enabled}`);
      });
      
      // Try manually enabling sensors 0 and 1 (Force and Respiration Rate)
      console.log('🔧 Manually enabling Force (0) and Respiration Rate (1) channels...');
      
      // First, disable all sensors
      gdxDevice.sensors.forEach((sensor: any, index: number) => {
        sensor.setEnabled(false);
      });
      
      // Enable Force sensor (channel 0)
      if (gdxDevice.sensors[0]) {
        gdxDevice.sensors[0].setEnabled(true);
        console.log('✅ Enabled Channel 0:', gdxDevice.sensors[0].name);
      }
      
      // Enable Respiration Rate sensor (channel 1)
      if (gdxDevice.sensors[1]) {
        gdxDevice.sensors[1].setEnabled(true);
        console.log('✅ Enabled Channel 1:', gdxDevice.sensors[1].name);
      }
      
      // Get enabled sensors
      const enabledSensors = gdxDevice.sensors.filter((s: any) => s.enabled);
      console.log('✅ Manually enabled sensors:', enabledSensors.map((s: any) => ({
        name: s.name,
        unit: s.unit,
        channelNumber: gdxDevice.sensors.indexOf(s)
      })));
      
      // Try device-level event handler for better sensor data
      if (gdxDevice.on) {
        console.log('🔧 Setting up device-level event handler...');
        gdxDevice.on('device-readings-received', (readings: any) => {
          console.log('📊 Device readings received:', readings);
          
          readings.forEach((reading: any) => {
            const sensor = gdxDevice.sensors[reading.sensor_id];
            if (sensor) {
              console.log(`Sensor ${reading.sensor_id}: ${sensor.name} = ${reading.value} ${sensor.unit}`);
              
              // Process based on sensor type
              if (sensor.name.toLowerCase().includes('respiration rate')) {
                const elapsedSeconds = dataCollectionStartRef.current > 0 
                  ? Math.round((Date.now() - dataCollectionStartRef.current) / 1000)
                  : 0;
                console.log(`🔍 RESPIRATION RATE at ${elapsedSeconds}s: ${reading.value} BPM`);
                
                if (reading.value && !isNaN(reading.value) && reading.value > 0) {
                  console.log(`✅ Valid BPM after ${elapsedSeconds}s: ${reading.value}`);
                  setBreathingRate(Math.round(reading.value));
                }
              } else if (sensor.name.toLowerCase().includes('force')) {
                // Process force reading inline for now
                const forceValue = parseFloat(reading.value);
                setCurrentForce(forceValue);
                
                // Add to force data
                forceDataRef.current.push({
                  timestamp: Date.now(),
                  force: forceValue
                });
                
                // Keep only last 100 samples
                if (forceDataRef.current.length > 100) {
                  forceDataRef.current = forceDataRef.current.slice(-100);
                }
                
                // Detect breathing cycles from force patterns
                detectBreathingCycles(forceValue);
              }
            }
          });
        });
      }
      
      // Also set up individual sensor handlers as fallback
      enabledSensors.forEach((sensor: any) => {
        sensor.on('value-changed', (sensor: any) => {
          console.log(`Sensor event - ${sensor.name}: ${sensor.value} ${sensor.unit}`);
          
          // Process respiration rate sensor data
          if (sensor.name.toLowerCase().includes('respiration rate') || sensor.unit === 'bpm') {
            const bpmValue = parseFloat(sensor.value);
            const elapsedSeconds = dataCollectionStartRef.current > 0 
              ? Math.round((Date.now() - dataCollectionStartRef.current) / 1000)
              : 0;
            
            console.log(`🔍 RESPIRATION RATE SENSOR at ${elapsedSeconds}s: raw=${sensor.value}, parsed=${bpmValue}, isNaN=${isNaN(bpmValue)}`);
            
            if (!isNaN(bpmValue) && bpmValue > 0) {
              console.log(`✅ RESPIRATION RATE SENSOR VALID after ${elapsedSeconds}s: ${bpmValue} BPM`);
              setBreathingRate(Math.round(bpmValue));
            } else {
              // Log timing info for NaN values
              if (elapsedSeconds < 30) {
                console.log(`⏳ Waiting for sensor data... ${elapsedSeconds}/30s elapsed`);
              } else {
                console.log(`⚠️ Still NaN after ${elapsedSeconds}s - check belt position`);
              }
            }
          }
          
          // Process force sensor data for breathing
          if (sensor.name.toLowerCase().includes('force') || sensor.unit === 'N') {
            const forceValue = parseFloat(sensor.value);
            setCurrentForce(forceValue);
            
            // Diagnostic: Track force variation
            if (forceDataRef.current.length > 10) {
              const recentForces = forceDataRef.current.slice(-10).map(d => d.force);
              const minForce = Math.min(...recentForces);
              const maxForce = Math.max(...recentForces);
              const forceRange = maxForce - minForce;
              const avgForce = recentForces.reduce((a, b) => a + b, 0) / recentForces.length;
              
              // Log every 5 seconds
              if (Date.now() % 5000 < 100) {
                console.log(`📊 Force Analysis: Range=${forceRange.toFixed(3)}N, Min=${minForce.toFixed(3)}N, Max=${maxForce.toFixed(3)}N, Avg=${avgForce.toFixed(3)}N`);
                
                if (forceRange < 0.1) { // Less than 0.1N variation
                  console.warn('⚠️ LOW FORCE VARIATION - Belt may be too loose or positioned incorrectly');
                  console.warn('💡 TIP: Ensure belt is snug and positioned just below sternum');
                }
              }
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
              
              // Also detect breathing cycles for BPM calculation
              detectBreathingCycles(forceValue);
              
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
                
                // Only calculate breathing rate manually if we don't have sensor data
                // The Respiration Rate sensor provides more accurate BPM readings
                if (currentTime - lastRateUpdateRef.current > 10000) {
                  const recentCycles = breathCyclesRef.current.filter(
                    timestamp => currentTime - timestamp < 60000 // Last minute
                  );
                  
                  if (recentCycles.length >= 2) {
                    // Calculate BPM from recent cycles as fallback
                    const timeSpan = (currentTime - recentCycles[0]) / 1000; // seconds
                    const cyclesPerSecond = (recentCycles.length - 1) / timeSpan;
                    const bpm = Math.round(cyclesPerSecond * 60);
                    // Only update if we don't have sensor BPM data
                    if (!breathingRate || breathingRate === 0 || breathingRate === 12) {
                      console.log('📊 Calculated BPM (fallback):', bpm);
                      // Don't update - user wants direct sensor data only
                      // setBreathingRate(Math.max(4, Math.min(20, bpm))); // Clamp between 4-20 BPM
                    }
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
      
      // Start data collection
      console.log('🚀 Starting data collection on device...');
      await gdxDevice.start();
      
      // Additional initialization for respiration rate sensor
      console.log('⏱️ Respiration Rate sensor needs 30+ seconds of breathing data to calculate BPM');
      console.log('💡 Please breathe normally - the sensor will start showing BPM after collecting enough cycles');
      
      // Track when data collection started
      dataCollectionStartRef.current = Date.now();
      
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
        deviceRef.current.stop();
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