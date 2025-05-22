import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Interface for an audio input device
 */
export interface AudioDevice {
  deviceId: string;
  label: string;
  isDefault?: boolean;
}

/**
 * Interface for the microphone breath detection hook results
 */
interface MicrophoneBreathHookResult {
  isListening: boolean;
  breathAmplitude: number; // 0-1 normalized amplitude 
  breathingRate: number; // breaths per minute
  startListening: (deviceId?: string) => Promise<void>;
  stopListening: () => void;
  error: string | null;
  devices: AudioDevice[];
  selectedDeviceId: string | null;
  refreshDevices: () => Promise<AudioDevice[]>;
  // Calibration system
  isCalibrating: boolean;
  calibrationProgress: number; // 0-1 progress through calibration
  startCalibration: () => Promise<void>;
  skipCalibration: () => void;
  calibrationComplete: boolean;
  calibrationPhase: 'deep' | 'settling';
  deepBreathCount: number;
  // Calibration profile for meditation use
  calibrationProfile: {
    baselineMin: number;
    baselineMax: number;
    averageAmplitude: number;
    breathingPattern: {
      inhaleThreshold: number;
      exhaleThreshold: number;
      cycleDetectionSensitivity: number;
    };
    isValid: boolean;
  } | null;
}

/**
 * Custom hook for detecting breathing patterns using the microphone
 * 
 * This hook provides real-time breathing data by analyzing audio input from the microphone.
 * It calculates both the current breath amplitude (how deeply someone is breathing)
 * and the breathing rate (breaths per minute).
 */
export function useMicrophoneBreath(): MicrophoneBreathHookResult {
  // Main state variables for the hook
  const [isListening, setIsListening] = useState(false);
  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathingRate, setBreathingRate] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Calibration system state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [calibrationPhase, setCalibrationPhase] = useState<'deep' | 'settling'>('deep');
  const [deepBreathCount, setDeepBreathCount] = useState(0);
  const [breathCycleDetection, setBreathCycleDetection] = useState({
    lastPeak: 0,
    lastTrough: 0,
    cycleCount: 0,
    isInhaling: false,
    minCycleTime: 2000, // Minimum 2 seconds between complete cycles
    lastCycleTime: 0,
    recentSamples: [] as number[], // Store recent volume samples for pattern analysis
    sampleWindow: 20 // Number of samples to analyze for trends (reduced for faster response)
  });

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Refs for breath detection algorithm
  const breathSamplesRef = useRef<number[]>([]);
  const lastBreathTimeRef = useRef<number>(0);
  const breathIntervalsRef = useRef<number[]>([]);
  const requestAnimationFrameIdRef = useRef<number | null>(null);

  // Calibration data storage
  const calibrationDataRef = useRef<number[]>([]);
  const deepBreathDataRef = useRef<number[]>([]);
  
  // Calibration profile - stores user's personal breathing baseline
  const [calibrationProfile, setCalibrationProfile] = useState<{
    baselineMin: number;
    baselineMax: number;
    averageAmplitude: number;
    breathingPattern: {
      inhaleThreshold: number;
      exhaleThreshold: number;
      cycleDetectionSensitivity: number;
    };
    isValid: boolean;
  } | null>(null);
  const settlingBreathDataRef = useRef<number[]>([]);
  const calibrationMinRef = useRef<number>(Infinity);
  const calibrationMaxRef = useRef<number>(-Infinity);
  const calibrationStartTimeRef = useRef<number>(0);
  
  // Calibration timing constants
  const DEEP_BREATH_DURATION = 9000; // 9 seconds for 3 deep breaths (3 seconds each)
  const SETTLING_DURATION = 11000; // 11 seconds for settling breath
  const TOTAL_CALIBRATION_DURATION = DEEP_BREATH_DURATION + SETTLING_DURATION; // 20 seconds total

  // Constants for breath detection
  const BREATH_THRESHOLD = 0.3; // Threshold to detect a breath (0-1)
  const SAMPLE_HISTORY_SIZE = 50; // Number of samples to keep for detection
  const BREATH_RATE_HISTORY_SIZE = 5; // Number of breath intervals to keep for rate calculation
  const MIN_BREATH_INTERVAL_MS = 1500; // Minimum time between breaths (ms)

  /**
   * Calculate the volume level from audio data with enhanced sensitivity
   */
  const calculateVolume = useCallback((dataArray: Uint8Array): number => {
    // Calculate the RMS (root mean square) of the audio samples
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      // Convert from 0-255 to -1 to 1
      const amplitude = (dataArray[i] / 128) - 1;
      sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // If we have calibration data, use it to normalize the volume
    if (calibrationComplete && calibrationMinRef.current !== Infinity && calibrationMaxRef.current !== -Infinity) {
      // Use the calibrated range to map the current volume
      const calibratedRange = calibrationMaxRef.current - calibrationMinRef.current;
      const normalizedVolume = calibratedRange > 0 
        ? Math.max(0, Math.min(1, (rms - calibrationMinRef.current) / calibratedRange))
        : 0;
      
      // Apply slight amplification for better visualization
      return Math.min(Math.pow(normalizedVolume * 1.5, 0.8), 1);
    }
    
    // Fallback to enhanced normalization if not calibrated
    const enhancedRms = Math.pow(rms * 4, 1.2);
    return Math.min(enhancedRms, 1); 
  }, [calibrationComplete]);

  /**
   * Detect complete breath cycles (inhale + exhale) during calibration
   */

  const detectBreathCycle = useCallback((volume: number, currentTime: number): boolean => {
    console.log(`🔍 Detection check: isCalibrating=${isCalibrating}, phase=${calibrationPhase}, volume=${volume.toFixed(4)}`);
    if (!isCalibrating || calibrationPhase !== 'deep') {
      console.log(`❌ Detection skipped: not in deep breath phase`);
      return false;
    }
    
    const detection = breathCycleDetection;
    
    // Add current sample to the sliding window
    const newSamples = [...detection.recentSamples, volume].slice(-detection.sampleWindow);
    
    // Update the recent samples
    setBreathCycleDetection(prev => ({
      ...prev,
      recentSamples: newSamples
    }));
    
    // Need at least 10 samples for peak detection
    if (newSamples.length < 10) {
      console.log(`❌ Not enough samples yet: ${newSamples.length}/10`);
      return false;
    }
    
    console.log(`✅ Running peak detection with ${newSamples.length} samples`);
    
    // Calculate adaptive baseline from recent samples
    const baseline = Math.min(...newSamples.slice(-15)); // Minimum of recent 15 samples
    const maxRecent = Math.max(...newSamples.slice(-15)); // Maximum of recent 15 samples
    const dynamicRange = maxRecent - baseline;
    const breathThreshold = baseline + (dynamicRange * 0.3); // 30% above baseline
    
    // Simple peak detection - look for local maxima and minima
    const currentIndex = newSamples.length - 1;
    const currentValue = newSamples[currentIndex];
    const prevValue = newSamples[currentIndex - 1];
    const prev2Value = newSamples[currentIndex - 2];
    
    // Debug logging every 20th sample
    if (newSamples.length % 20 === 0) {
      console.log(`Peak detection: current=${currentValue.toFixed(4)}, baseline=${baseline.toFixed(4)}, threshold=${breathThreshold.toFixed(4)}, isInhaling=${detection.isInhaling}`);
    }
    
    // Detect start of inhale - look for crossing above threshold (more flexible)
    if (!detection.isInhaling && currentValue > breathThreshold && 
        prevValue <= breathThreshold && (currentTime - detection.lastCycleTime) > 1000) { // At least 1 second between cycles
      
      console.log(`🟢 INHALE START detected: ${currentValue.toFixed(4)} (rising trend)`);
      
      setBreathCycleDetection(prev => ({
        ...prev,
        lastPeak: currentValue,
        isInhaling: true
      }));
    }
    
    // Update peak during inhale
    if (detection.isInhaling && currentValue > detection.lastPeak) {
      setBreathCycleDetection(prev => ({
        ...prev,
        lastPeak: currentValue
      }));
    }
    
    // Detect exhale completion - look for crossing back below threshold
    if (detection.isInhaling && currentValue <= breathThreshold && 
        prevValue > breathThreshold && detection.lastPeak > baseline + (dynamicRange * 0.4)) { // Make sure we had a real peak (40% above baseline)
      
      console.log(`🔴 BREATH CYCLE COMPLETED! Peak: ${detection.lastPeak.toFixed(4)}, End: ${currentValue.toFixed(4)}`);
      
      // Complete breath cycle detected
      setBreathCycleDetection(prev => ({
        ...prev,
        lastTrough: currentValue,
        isInhaling: false,
        lastCycleTime: currentTime,
        cycleCount: prev.cycleCount + 1
      }));
      
      return true; // Signal that a complete cycle was detected
    }
    
    return false;
  }, [isCalibrating, calibrationPhase, breathCycleDetection]);

  /**
   * Detect breaths and calculate breathing rate
   */
  const detectBreath = useCallback((currentVolume: number, currentTime: number) => {
    // Add current sample to history
    breathSamplesRef.current.push(currentVolume);
    
    // Keep only the most recent samples
    if (breathSamplesRef.current.length > SAMPLE_HISTORY_SIZE) {
      breathSamplesRef.current.shift();
    }
    
    // Find local peaks in the breath pattern
    const samples = breathSamplesRef.current;
    if (samples.length > 5) {
      const currentIndex = samples.length - 1;
      const prevSample = samples[currentIndex - 1] || 0;
      
      // Detect a breath by looking for a peak that passes the threshold
      if (
        currentVolume > BREATH_THRESHOLD && 
        currentVolume > prevSample &&
        currentTime - lastBreathTimeRef.current > MIN_BREATH_INTERVAL_MS
      ) {
        // Calculate the time since last breath
        const timeSinceLastBreath = currentTime - lastBreathTimeRef.current;
        
        // Only count if it's not the first breath and within reasonable limits
        if (lastBreathTimeRef.current > 0 && timeSinceLastBreath < 15000) {
          breathIntervalsRef.current.push(timeSinceLastBreath);
          
          // Keep only recent intervals
          if (breathIntervalsRef.current.length > BREATH_RATE_HISTORY_SIZE) {
            breathIntervalsRef.current.shift();
          }
          
          // Calculate breathing rate (breaths per minute)
          if (breathIntervalsRef.current.length > 0) {
            const avgInterval = breathIntervalsRef.current.reduce((sum, val) => sum + val, 0) / 
              breathIntervalsRef.current.length;
            const breathsPerMinute = (60 * 1000) / avgInterval;
            setBreathingRate(Math.round(breathsPerMinute * 10) / 10); // Round to 1 decimal place
          }
        }
        
        lastBreathTimeRef.current = currentTime;
      }
    }
  }, []);

  /**
   * Process audio data in animation frame loop
   */
  const processAudioData = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    // Get audio data
    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
    
    // Calculate volume/amplitude
    const volume = calculateVolume(dataArrayRef.current);
    
    // Handle calibration data collection
    if (isCalibrating) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - calibrationStartTimeRef.current;
      
      console.log(`Calibration progress: ${elapsedTime}ms / ${TOTAL_CALIBRATION_DURATION}ms, volume: ${volume.toFixed(4)}`);
      
      // Store calibration data based on phase
      if (calibrationPhase === 'deep') {
        // Deep breath phase - detect actual breath cycles
        deepBreathDataRef.current.push(volume);
        
        // Detect breath cycles for smart phase transition
        const cycleDetected = detectBreathCycle(volume, currentTime);
        if (cycleDetected) {
          const newCycleCount = breathCycleDetection.cycleCount + 1;
          setBreathCycleDetection(prev => ({ ...prev, cycleCount: newCycleCount }));
          setDeepBreathCount(newCycleCount);
          
          console.log(`Detected breath cycle ${newCycleCount}/3`);
          
          // After 3 complete breath cycles, switch to settling phase
          if (newCycleCount >= 3) {
            console.log('3 breath cycles detected, switching to settling phase');
            setCalibrationPhase('settling');
          }
        }
      } else {
        // Settling phase (fixed 11 seconds after deep breath phase ends)
        settlingBreathDataRef.current.push(volume);
      }
      
      // Update calibration progress based on phase
      let progress;
      if (calibrationPhase === 'deep') {
        // Progress during deep breath phase (0% to 50% based on breath cycles)
        progress = (deepBreathCount / 3) * 0.5;
      } else {
        // Progress during settling phase (50% to 100% based on time)
        const settlingElapsed = Math.max(0, elapsedTime - 10000); // Settling phase timing
        const settlingProgress = Math.min(1, settlingElapsed / SETTLING_DURATION);
        progress = 0.5 + (settlingProgress * 0.5);
      }
      setCalibrationProgress(Math.min(1, progress));
      
      // Always show the raw volume during calibration for user feedback
      setBreathAmplitude(volume);
      
      // Complete calibration after total duration
      if (elapsedTime >= TOTAL_CALIBRATION_DURATION) {
        // Complete calibration
        console.log('Completing calibration...');
        
        // Analyze deep breath data
        let deepBreathMax = 0;
        let deepBreathAvg = 0;
        if (deepBreathDataRef.current.length > 0) {
          deepBreathMax = Math.max(...deepBreathDataRef.current);
          deepBreathAvg = deepBreathDataRef.current.reduce((sum, val) => sum + val, 0) / deepBreathDataRef.current.length;
        }
        
        // Analyze settling breath data
        let settlingBreathMax = 0;
        let settlingBreathAvg = 0;
        if (settlingBreathDataRef.current.length > 0) {
          settlingBreathMax = Math.max(...settlingBreathDataRef.current);
          settlingBreathAvg = settlingBreathDataRef.current.reduce((sum, val) => sum + val, 0) / settlingBreathDataRef.current.length;
        }
        
        // Calculate dynamic sensitivity range
        calibrationMinRef.current = Math.min(settlingBreathAvg * 0.5, 0.01);
        calibrationMaxRef.current = Math.max(deepBreathMax, settlingBreathMax * 2);
        
        console.log(`Two-phase calibration complete!`);
        console.log(`Deep breath - Max: ${deepBreathMax.toFixed(4)}, Avg: ${deepBreathAvg.toFixed(4)}`);
        console.log(`Settling breath - Max: ${settlingBreathMax.toFixed(4)}, Avg: ${settlingBreathAvg.toFixed(4)}`);
        console.log(`Sensitivity range: ${calibrationMinRef.current.toFixed(4)} - ${calibrationMaxRef.current.toFixed(4)}`);
        
        // Create calibration profile for meditation use
        const profile = {
          baselineMin: calibrationMinRef.current,
          baselineMax: calibrationMaxRef.current,
          averageAmplitude: (deepBreathAvg + settlingBreathAvg) / 2,
          breathingPattern: {
            inhaleThreshold: settlingBreathAvg + (deepBreathMax - settlingBreathAvg) * 0.3, // 30% above settling average
            exhaleThreshold: settlingBreathAvg * 0.8, // 80% of settling average  
            cycleDetectionSensitivity: Math.max(0.15, (deepBreathMax - settlingBreathAvg) / settlingBreathAvg * 0.5) // Adaptive sensitivity
          },
          isValid: true
        };
        
        setCalibrationProfile(profile);
        console.log('Calibration profile created:', profile);
        
        setIsCalibrating(false);
        setCalibrationComplete(true);
        setCalibrationProgress(1);
      }
    } else {
      // Meditation practice mode - use calibration profile for breath detection
      if (calibrationProfile && calibrationProfile.isValid) {
        // Normalize volume using the user's personal breathing baseline
        const { baselineMin, baselineMax } = calibrationProfile;
        const normalizedAmplitude = Math.max(0, Math.min(1, 
          (volume - baselineMin) / (baselineMax - baselineMin)
        ));
        setBreathAmplitude(normalizedAmplitude);
        detectBreath(normalizedAmplitude, Date.now());
      } else {
        // Fallback to basic calibrated sensitivity if no profile
        const adjustedAmplitude = applyCalibratedSensitivity(volume);
        setBreathAmplitude(adjustedAmplitude);
        detectBreath(adjustedAmplitude, Date.now());
      }
    }
    
    // Continue the loop
    requestAnimationFrameIdRef.current = requestAnimationFrame(processAudioData);
  }, [calculateVolume, detectBreath, detectBreathCycle, isCalibrating, calibrationPhase, breathCycleDetection, calibrationProfile]);

  /**
   * Get available audio input devices
   */
  const refreshDevices = async (): Promise<AudioDevice[]> => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Browser does not support device enumeration');
      }
      
      // We need to request permission first to get labeled devices
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err) {
        console.error('Error getting initial media stream:', err);
        throw new Error('Permission to access microphone was denied');
      }
      
      // Get all devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter for audio input devices
      const audioInputDevices = allDevices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
          isDefault: device.deviceId === 'default'
        }));
      
      // Stop the temporary stream we used for permissions
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Update state with the found devices
      setDevices(audioInputDevices);
      
      // If we don't have a selected device yet, select the default
      if (!selectedDeviceId && audioInputDevices.length > 0) {
        const defaultDevice = audioInputDevices.find(d => d.isDefault) || audioInputDevices[0];
        setSelectedDeviceId(defaultDevice.deviceId);
      }
      
      return audioInputDevices;
    } catch (err) {
      console.error('Error listing audio devices:', err);
      setError(err instanceof Error ? err.message : 'Failed to list audio devices');
      return [];
    }
  };

  /**
   * Start listening to microphone
   */
  const startListening = async (deviceId?: string) => {
    try {
      // Reset error state
      setError(null);
      
      // First stop listening if already active
      if (isListening) {
        stopListening();
      }
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio capture');
      }
      
      // If no devices are loaded yet, refresh the device list
      if (devices.length === 0) {
        await refreshDevices();
      }
      
      // Use the provided deviceId, selected device, or default
      const audioDeviceId = deviceId || selectedDeviceId || 'default';
      
      // Update the selected device
      if (deviceId) {
        setSelectedDeviceId(deviceId);
      }
      
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Configure analyzer
      analyserRef.current.fftSize = 1024;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      // Get microphone access with specific device if provided
      const constraints = {
        audio: {
          deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined
        },
        video: false
      };
      
      console.log('Starting microphone with device:', audioDeviceId);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      microphoneStreamRef.current = stream;
      
      // Connect microphone to analyzer
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start processing audio
      setIsListening(true);
      requestAnimationFrameIdRef.current = requestAnimationFrame(processAudioData);
      
      // Reset breath detection data
      breathSamplesRef.current = [];
      breathIntervalsRef.current = [];
      lastBreathTimeRef.current = 0;
      
      // Log that we're now listening
      console.log('Successfully started listening to microphone');
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setIsListening(false);
    }
  };

  /**
   * Stop listening to microphone
   */
  const stopListening = () => {
    // Cancel animation frame
    if (requestAnimationFrameIdRef.current) {
      cancelAnimationFrame(requestAnimationFrameIdRef.current);
      requestAnimationFrameIdRef.current = null;
    }
    
    // Stop and clean up microphone stream
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    
    // Clean up audio context
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    // Reset state
    setIsListening(false);
    setBreathAmplitude(0);
    
    // We keep the breathing rate to avoid jumps when restarting
  };

  // Load devices on mount
  useEffect(() => {
    const loadDevices = async () => {
      await refreshDevices();
    };
    
    loadDevices();
    
    // Add event listener for device changes (like when headphones are plugged in)
    navigator.mediaDevices?.addEventListener('devicechange', () => {
      console.log('Media devices changed, refreshing list');
      refreshDevices();
    });
    
    return () => {
      // Clean up
      stopListening();
      navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
    };
  }, []);

  /**
   * Complete the two-phase calibration
   */
  const completeCalibration = useCallback(() => {
    console.log('Completing two-phase calibration...');
    
    // Analyze deep breath data
    let deepBreathMax = 0;
    let deepBreathAvg = 0;
    if (deepBreathDataRef.current.length > 0) {
      deepBreathMax = Math.max(...deepBreathDataRef.current);
      deepBreathAvg = deepBreathDataRef.current.reduce((sum, val) => sum + val, 0) / deepBreathDataRef.current.length;
    }
    
    // Analyze settling breath data
    let settlingBreathMax = 0;
    let settlingBreathAvg = 0;
    if (settlingBreathDataRef.current.length > 0) {
      settlingBreathMax = Math.max(...settlingBreathDataRef.current);
      settlingBreathAvg = settlingBreathDataRef.current.reduce((sum, val) => sum + val, 0) / settlingBreathDataRef.current.length;
    }
    
    // Calculate dynamic sensitivity range
    calibrationMinRef.current = Math.min(settlingBreathAvg * 0.5, 0.01); // Minimum threshold
    calibrationMaxRef.current = Math.max(deepBreathMax, settlingBreathMax * 2); // Maximum range
    
    console.log(`Two-phase calibration complete!`);
    console.log(`Deep breath - Max: ${deepBreathMax.toFixed(4)}, Avg: ${deepBreathAvg.toFixed(4)}`);
    console.log(`Settling breath - Max: ${settlingBreathMax.toFixed(4)}, Avg: ${settlingBreathAvg.toFixed(4)}`);
    console.log(`Sensitivity range: ${calibrationMinRef.current.toFixed(4)} - ${calibrationMaxRef.current.toFixed(4)}`);
    
    setIsCalibrating(false);
    setCalibrationComplete(true);
    setCalibrationProgress(1);
  }, []);

  /**
   * Apply calibrated sensitivity to breath amplitude
   */
  const applyCalibratedSensitivity = useCallback((rawVolume: number): number => {
    if (!calibrationComplete) {
      return rawVolume; // Use raw volume if not calibrated
    }
    
    const min = calibrationMinRef.current;
    const max = calibrationMaxRef.current;
    const range = max - min;
    
    if (range <= 0) {
      return rawVolume; // Fallback to raw volume if invalid range
    }
    
    // Normalize the volume based on calibrated range
    const normalized = Math.max(0, Math.min(1, (rawVolume - min) / range));
    
    // Apply gentle amplification for better visual feedback
    return Math.pow(normalized, 0.8); // Slight curve to enhance subtle movements
  }, [calibrationComplete]);

  /**
   * Start the two-phase calibration process
   */
  const startCalibration = useCallback(async (): Promise<void> => {
    console.log('Starting two-phase breath calibration...');
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setCalibrationComplete(false);
    setCalibrationPhase('deep');
    setDeepBreathCount(0);
    
    // Reset breath cycle detection
    setBreathCycleDetection({
      lastPeak: 0,
      lastTrough: 0,
      cycleCount: 0,
      isInhaling: false,
      minCycleTime: 2000,
      lastCycleTime: 0,
      recentSamples: [],
      sampleWindow: 20
    });
    
    // Reset calibration data
    calibrationDataRef.current = [];
    deepBreathDataRef.current = [];
    settlingBreathDataRef.current = [];
    calibrationMinRef.current = Infinity;
    calibrationMaxRef.current = -Infinity;
    calibrationStartTimeRef.current = Date.now();
    
    // Start listening if not already
    if (!isListening) {
      await startListening();
    }
  }, [isListening, startListening]);

  /**
   * Skip calibration and use default sensitivity
   */
  const skipCalibration = useCallback(() => {
    console.log('Skipping calibration, using default sensitivity');
    setIsCalibrating(false);
    setCalibrationComplete(true);
    setCalibrationProgress(1);
    
    // Set reasonable default values for uncalibrated mode
    calibrationMinRef.current = 0;
    calibrationMaxRef.current = 0.1;
  }, []);

  return {
    isListening,
    breathAmplitude,
    breathingRate,
    startListening,
    stopListening,
    error,
    devices,
    selectedDeviceId,
    refreshDevices,
    // Calibration system
    isCalibrating,
    calibrationProgress,
    startCalibration,
    skipCalibration,
    calibrationComplete,
    calibrationPhase,
    deepBreathCount,
    calibrationProfile
  };
}