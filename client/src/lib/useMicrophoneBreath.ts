import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Custom hook to detect breath using the device microphone
 * 
 * @returns {Object} Breath detection state and controls
 */
export const useMicrophoneBreath = () => {
  // State to track breath data and connection status
  const [isConnected, setIsConnected] = useState(false);
  const [breathAmplitude, setBreathAmplitude] = useState(0);
  const [breathingRate, setBreathingRate] = useState(12); // Default 12 breaths per minute
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to store audio processing components
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // State for breath pattern tracking
  const breathPeaksRef = useRef<number[]>([]);
  const lastBreathTimeRef = useRef<number>(Date.now());
  const smoothedAmplitudeRef = useRef<number>(0);
  
  // Connect to the microphone and start breath detection
  const connectMicrophone = useCallback(async () => {
    try {
      setError(null);
      
      // Check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access. Please try a different browser.');
      }
      
      console.log('Requesting microphone access...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Store the stream for later cleanup
      streamRef.current = stream;
      
      // Create audio processing pipeline
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      // Configure the analyser
      analyser.fftSize = 1024; // Larger FFT size for more detail
      analyser.smoothingTimeConstant = 0.8; // Smooth the data
      
      // Connect the microphone to the analyser
      microphone.connect(analyser);
      
      // Store references for cleanup
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      
      // Start the breath detection loop
      startBreathDetection();
      
      // Update connection state
      setIsConnected(true);
      console.log('✅ Microphone connected successfully');
      
    } catch (err: any) {
      console.error('Microphone connection error:', err);
      
      // Handle permission denied case
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Microphone access was denied. Please grant permission to use this feature.');
      } else {
        setError(`Could not connect to microphone: ${err.message}`);
      }
      
      // Ensure we're marked as disconnected
      setIsConnected(false);
    }
  }, []);
  
  // Disconnect from the microphone
  const disconnectMicrophone = useCallback(() => {
    // Stop the animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop and disconnect the microphone
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    // Close the audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    // Stop the media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset breath tracking
    breathPeaksRef.current = [];
    
    // Update state
    setIsConnected(false);
    setBreathAmplitude(0);
    console.log('Microphone disconnected');
  }, []);
  
  // The core breath detection algorithm
  const startBreathDetection = useCallback(() => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.fftSize);
    
    // Store the current time for breathing rate calculation
    const now = Date.now();
    
    // For detecting breath peaks and calculating breathing rate
    let isBreathPeak = false;
    let peakThreshold = 0.15; // Adjust based on testing
    
    // Function to process audio data
    const detectBreath = () => {
      // Get time domain data from the analyser
      analyser.getByteTimeDomainData(dataArray);
      
      // Calculate signal amplitude (range: 0-255)
      let sum = 0;
      let min = 255;
      let max = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        sum += value;
        if (value < min) min = value;
        if (value > max) max = value;
      }
      
      // Calculate the overall amplitude (0-1 range)
      const amplitude = (max - min) / 255;
      
      // Apply exponential smoothing for more natural visualization
      const alpha = 0.1; // Smoothing factor (0-1), lower = smoother
      smoothedAmplitudeRef.current = (alpha * amplitude) + 
                                     ((1 - alpha) * smoothedAmplitudeRef.current);
      
      // Update the breath amplitude state
      setBreathAmplitude(smoothedAmplitudeRef.current);
      
      // Detect breath peaks for breathing rate calculation
      if (smoothedAmplitudeRef.current > peakThreshold && !isBreathPeak) {
        isBreathPeak = true;
        
        // Record the time between peaks (breathing rate)
        const currentTime = Date.now();
        const timeSinceLastBreath = currentTime - lastBreathTimeRef.current;
        
        // Only count if it's a reasonable breath time (0.5 to 10 seconds)
        if (timeSinceLastBreath > 500 && timeSinceLastBreath < 10000) {
          breathPeaksRef.current.push(timeSinceLastBreath);
          
          // Keep only the last 5 breaths for the average
          if (breathPeaksRef.current.length > 5) {
            breathPeaksRef.current.shift();
          }
          
          // Calculate average breathing rate
          if (breathPeaksRef.current.length > 1) {
            const avgBreathTime = breathPeaksRef.current.reduce((a, b) => a + b, 0) / 
                                 breathPeaksRef.current.length;
            const breathsPerMinute = Math.round(60000 / avgBreathTime);
            
            // Limit to reasonable range (4-30 breaths per minute)
            if (breathsPerMinute >= 4 && breathsPerMinute <= 30) {
              setBreathingRate(breathsPerMinute);
            }
          }
          
          lastBreathTimeRef.current = currentTime;
        }
      } else if (smoothedAmplitudeRef.current < peakThreshold * 0.7) {
        // Reset the peak detection once amplitude drops below threshold
        isBreathPeak = false;
      }
      
      // Continue the detection loop
      animationFrameRef.current = requestAnimationFrame(detectBreath);
    };
    
    // Start the detection loop
    detectBreath();
    
  }, []);
  
  // Clean up on component unmount
  useEffect(() => {
    return () => {
      disconnectMicrophone();
    };
  }, [disconnectMicrophone]);
  
  return {
    connectMicrophone,
    disconnectMicrophone,
    isConnected,
    breathAmplitude,
    breathingRate,
    permissionDenied,
    error
  };
};

export default useMicrophoneBreath;