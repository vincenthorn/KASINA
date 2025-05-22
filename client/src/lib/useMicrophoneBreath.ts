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
    
    // Enhanced normalization with higher sensitivity for breath detection
    // This makes the visualization much more responsive to subtle changes
    const enhancedRms = Math.pow(rms * 4, 1.2);
    
    // Normalize between 0 and 1 with increased range for better visualization
    return Math.min(enhancedRms, 1); 
  }, []);

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
    setBreathAmplitude(volume);
    
    // Detect breaths and update breathing rate
    detectBreath(volume, Date.now());
    
    // Continue the loop
    requestAnimationFrameIdRef.current = requestAnimationFrame(processAudioData);
  }, [calculateVolume, detectBreath]);

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

  return {
    isListening,
    breathAmplitude,
    breathingRate,
    startListening,
    stopListening,
    error,
    devices,
    selectedDeviceId,
    refreshDevices
  };
}