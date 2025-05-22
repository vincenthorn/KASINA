import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Interface for the microphone breath detection hook results
 */
interface MicrophoneBreathHookResult {
  isListening: boolean;
  breathAmplitude: number; // 0-1 normalized amplitude 
  breathingRate: number; // breaths per minute
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
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
   * Calculate the volume level from audio data
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
    
    // Normalize between 0 and 1 with some headroom
    return Math.min(rms * 3, 1); 
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
   * Start listening to microphone
   */
  const startListening = async () => {
    try {
      // Reset error state
      setError(null);
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio capture');
      }
      
      // Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // Configure analyzer
      analyserRef.current.fftSize = 1024;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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

  // Clean up when the component unmounts
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return {
    isListening,
    breathAmplitude,
    breathingRate,
    startListening,
    stopListening,
    error
  };
}