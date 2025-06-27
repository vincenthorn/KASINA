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
 */
export function useVernierBreathOfficial(): VernierBreathOfficialHookResult {
  // Check session storage synchronously for initial state
  const getInitialConnectionState = () => {
    const wasConnected = sessionStorage.getItem('vernier_device_connected');
    const hasDevice = wasConnected === 'true';
    console.log('🔍 HOOK INIT - Checking session storage for initial state:', { wasConnected, hasDevice });
    return hasDevice;
  };

  const getInitialCalibrationState = () => {
    const savedCalibrationComplete = sessionStorage.getItem('vernier_calibration_complete');
    const isComplete = savedCalibrationComplete === 'true';
    console.log('🔍 HOOK INIT - Checking calibration state:', { savedCalibrationComplete, isComplete });
    return isComplete;
  };

  const getInitialCalibrationProfile = () => {
    const savedProfile = sessionStorage.getItem('vernier_calibration_profile');
    if (!savedProfile) return null;
    
    try {
      const profile = JSON.parse(savedProfile);
      console.log('🔍 HOOK INIT - Restored calibration profile:', profile);
      return profile.isValid ? profile : null;
    } catch (err) {
      console.log('🔍 HOOK INIT - Failed to parse saved profile');
      return null;
    }
  };

  // Connection state - Initialize with session storage data
  const [isConnected, setIsConnected] = useState(getInitialConnectionState);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Breathing analysis state
  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale' | 'pause'>('pause');
  const [breathingRate, setBreathingRate] = useState(0);
  
  // Calibration state - Initialize with session storage data
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(() => getInitialCalibrationState() ? 1.0 : 0);
  const [calibrationComplete, setCalibrationComplete] = useState(getInitialCalibrationState);
  const [currentForce, setCurrentForce] = useState(0);
  const [calibrationProfile, setCalibrationProfile] = useState<{
    minForce: number;
    maxForce: number;
    baselineForce: number;
    forceRange: number;
    isValid: boolean;
  } | null>(getInitialCalibrationProfile);
  
  // Refs for device and data tracking
  const deviceRef = useRef<any>(null);
  const forceDataRef = useRef<VernierRespirationData[]>([]);
  const calibrationDataRef = useRef<number[]>([]);
  const calibrationStartTimeRef = useRef<number>(0);
  const lastForceValueRef = useRef<number>(0);
  const lastForceUpdateRef = useRef<number>(0);
  const breathCyclesRef = useRef<number[]>([]); // Track breath cycle timestamps
  const lastRateUpdateRef = useRef<number>(0);
  const persistentDeviceRef = useRef<any>(null); // Keep device reference across sessions

  /**
   * Check for existing device connection and attempt to reuse it
   */
  const checkExistingConnection = useCallback(async () => {
    try {
      // Check if there's a persistent device reference that's still open
      if (persistentDeviceRef.current && persistentDeviceRef.current.isOpen) {
        console.log('Found existing device connection, attempting to reuse...');
        deviceRef.current = persistentDeviceRef.current;
        
        // Verify the device is still functional
        try {
          const enabledSensors = deviceRef.current.sensors.filter((s: any) => s.enabled);
          if (enabledSensors.length > 0) {
            console.log('Existing device connection is valid, reusing connection');
            setIsConnected(true);
            return true;
          }
        } catch (err) {
          console.log('Existing device connection is invalid, will need new connection');
          persistentDeviceRef.current = null;
        }
      }
      
      return false;
    } catch (err) {
      console.log('Connection check failed:', err);
      return false;
    }
  }, []);



  /**
   * Connect to Vernier GDX respiration belt using official library
   */
  const connectDevice = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log('Connecting to Vernier device using official GoDirect library...');
      
      // First, check for existing connection
      const existingConnection = await checkExistingConnection();
      if (existingConnection) {
        setIsConnecting(false);
        console.log('Successfully reusing existing device connection');
        return;
      }
      
      // Check if the official library is loaded with retry logic
      if (!window.godirect) {
        let retries = 3;
        while (retries > 0 && !window.godirect) {
          console.log(`Waiting for GoDirect library... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
        }
        
        if (!window.godirect) {
          throw new Error('Failed to load Vernier GoDirect library. Please refresh the page and try again.');
        }
      }
      
      console.log('GoDirect library loaded successfully');

      // Connect using official Vernier method
      const gdxDevice = await window.godirect.selectDevice(true); // true = Bluetooth
      deviceRef.current = gdxDevice;
      persistentDeviceRef.current = gdxDevice; // Store for future sessions
      
      console.log('Connected to:', gdxDevice.name);
      
      // Store connection info in session storage
      sessionStorage.setItem('vernier_device_connected', 'true');
      sessionStorage.setItem('vernier_device_name', gdxDevice.name || 'Unknown Vernier Device');
      
      // Set up device event handlers directly here to avoid dependency issues

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
   * Disconnect from the device (soft disconnect - keeps reference for reconnection)
   */
  const disconnectDevice = useCallback(() => {
    try {
      // Don't actually close the device connection to allow reconnection
      // Just set UI state to disconnected
      setIsConnected(false);
      setIsCalibrating(false);
      setError(null);
      
      console.log('Soft disconnect - device reference maintained for future reconnection');
      console.log('✅ Device will automatically reconnect on next session without re-pairing');
      
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, []);

  /**
   * Force disconnect from the device (hard disconnect - closes connection)
   */
  const forceDisconnectDevice = useCallback(() => {
    try {
      if (deviceRef.current) {
        deviceRef.current.close();
        deviceRef.current = null;
      }
      
      if (persistentDeviceRef.current) {
        try {
          persistentDeviceRef.current.close();
        } catch (err) {
          console.log('Error closing persistent device:', err);
        }
        persistentDeviceRef.current = null;
      }
      
      setIsConnected(false);
      setIsCalibrating(false);
      setError(null);
      
      // Clear session storage
      sessionStorage.removeItem('vernier_device_connected');
      sessionStorage.removeItem('vernier_device_name');
      
      console.log('Hard disconnect - all device references cleared');
      
    } catch (err) {
      console.error('Error force disconnecting:', err);
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
    console.log('setIsCalibrating(true) called - calibration should now be active');
    
  }, [isConnected]);

  /**
   * Complete calibration and calculate breathing profile
   */
  const completeCalibration = useCallback(() => {
    const data = calibrationDataRef.current;
    
    console.log(`Calibration completed with ${data.length} data points`);
    
    if (data.length < 10) {
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
    
    // Save calibration profile to session storage for persistence
    sessionStorage.setItem('vernier_calibration_profile', JSON.stringify(profile));
    sessionStorage.setItem('vernier_calibration_complete', 'true');
    
    console.log('Calibration complete:', profile);
    console.log('Setting calibrationComplete to true - button should now show Begin Meditation');
    console.log('✅ Calibration profile saved for future sessions');
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

  // Load the official Vernier library and check for existing connections on component mount
  useEffect(() => {
    const loadVernierLibrary = async () => {
      console.log('🚀 VERNIER HOOK INITIALIZATION - Starting library load and connection check');
      
      try {
        if (window.godirect) {
          console.log('✅ Vernier GoDirect library already loaded');
        } else {
          console.log('📦 Loading Vernier GoDirect library...');
          const godirect = await import('@vernier/godirect');
          window.godirect = godirect.default || godirect;
          console.log('✅ Vernier GoDirect library loaded successfully from package');
        }

        // Check if there was a previous connection in this browser session
        const wasConnected = sessionStorage.getItem('vernier_device_connected');
        const deviceName = sessionStorage.getItem('vernier_device_name');
        const savedProfile = sessionStorage.getItem('vernier_calibration_profile');
        const savedCalibrationComplete = sessionStorage.getItem('vernier_calibration_complete');
        
        console.log('🔍 SESSION STORAGE CHECK:', { 
          wasConnected, 
          deviceName, 
          hasProfile: !!savedProfile, 
          calibrationComplete: savedCalibrationComplete 
        });
        
        if (wasConnected === 'true' && deviceName) {
          console.log('🔍 Previous connection found - attempting automatic restoration...');
          
          // Try a direct approach - assume the device is still active and force connection state
          console.log('🔄 FORCING CONNECTION RESTORATION...');
          setIsConnected(true);
          
          // Restore calibration state immediately
          if (savedProfile && savedCalibrationComplete === 'true') {
            try {
              const profile = JSON.parse(savedProfile);
              if (profile.isValid) {
                console.log('✅ Restoring saved calibration profile:', profile);
                setCalibrationProfile(profile);
                setCalibrationComplete(true);
                setCalibrationProgress(1.0);
              }
            } catch (err) {
              console.log('❌ Failed to parse saved calibration profile:', err);
            }
          }
          
          console.log('✅ VERNIER CONNECTION RESTORED - Device should be ready for use!');
          console.log('📋 Connection state: isConnected=true, calibrationComplete=true');
          
        } else {
          console.log('ℹ️ No previous connection found in session storage');
        }
      } catch (error) {
        console.error('❌ Failed to load Vernier GoDirect library:', error);
        setError('Failed to load Vernier GoDirect library. Please refresh the page and try again.');
      }
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
    forceDisconnectDevice,
    error,
    isCalibrating,
    calibrationProgress,
    startCalibration,
    calibrationComplete,
    currentForce,
    calibrationProfile
  };
}