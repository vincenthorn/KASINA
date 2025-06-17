import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioFeatures {
  tempo: number;
  energy: number;
  valence: number;
  key: number;
  mode: number;
  danceability: number;
  duration_ms: number;
}

interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  volume: number;
  dominantFrequency: number;
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
}

export const useAudioAnalysis = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio context and nodes
  const initializeAudioContext = useCallback(async () => {
    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    // Create analyser node
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyserNodeRef.current = analyser;

    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNodeRef.current = gainNode;

    // Connect nodes: source -> gain -> analyser -> destination
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);

    // Initialize data arrays
    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    timeDataRef.current = new Uint8Array(analyser.fftSize);

    return audioContext;
  }, []);

  // Load MP3 file and decode
  const loadAudioFile = useCallback(async (file: File) => {
    console.log('🎵 Loading audio file:', file.name, 'Size:', file.size, 'bytes');
    
    try {
      const audioContext = await initializeAudioContext();
      
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Decode audio data
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      
      // Analyze audio features
      const features = analyzeAudioFeatures(buffer);
      setAudioFeatures(features);
      
      console.log('🎵 Audio loaded successfully:', {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        features
      });
      
      return buffer;
    } catch (error) {
      console.error('🎵 Error loading audio file:', error);
      throw new Error('Failed to load audio file. Please ensure it\'s a valid MP3.');
    }
  }, [initializeAudioContext]);

  // Basic audio feature analysis from buffer
  const analyzeAudioFeatures = useCallback((buffer: AudioBuffer): AudioFeatures => {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const duration = buffer.duration;
    
    // Calculate basic features
    let sum = 0;
    let energy = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.abs(channelData[i]);
      sum += sample;
      energy += sample * sample;
    }
    
    const avgAmplitude = sum / channelData.length;
    const rmsEnergy = Math.sqrt(energy / channelData.length);
    
    // Estimate tempo using autocorrelation (simplified)
    const tempo = estimateTempo(channelData, sampleRate);
    
    return {
      tempo,
      energy: Math.min(rmsEnergy * 10, 1), // Normalize to 0-1
      valence: Math.min(avgAmplitude * 15, 1), // Rough happiness estimate
      key: Math.floor(Math.random() * 12), // Random for now
      mode: Math.random() > 0.5 ? 1 : 0, // Random major/minor
      danceability: Math.min(rmsEnergy * 8, 1),
      duration_ms: duration * 1000
    };
  }, []);

  // Simple tempo estimation
  const estimateTempo = useCallback((channelData: Float32Array, sampleRate: number): number => {
    // This is a simplified tempo detection - in production you'd use more sophisticated algorithms
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
    const hopSize = Math.floor(windowSize / 4);
    const beats: number[] = [];
    
    // Detect onset peaks
    for (let i = windowSize; i < channelData.length - windowSize; i += hopSize) {
      let windowEnergy = 0;
      for (let j = 0; j < windowSize; j++) {
        windowEnergy += Math.abs(channelData[i + j]);
      }
      
      // Simple peak detection
      if (windowEnergy > 0.01) {
        beats.push(i / sampleRate);
      }
    }
    
    if (beats.length < 2) return 120; // Default tempo
    
    // Calculate average interval between beats
    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const tempo = 60 / avgInterval;
    
    // Clamp to reasonable range
    return Math.max(60, Math.min(200, tempo));
  }, []);

  // Play audio
  const playAudio = useCallback(async () => {
    if (!audioBuffer || !audioContextRef.current || !analyserNodeRef.current || !gainNodeRef.current) {
      throw new Error('Audio not loaded');
    }

    const audioContext = audioContextRef.current;
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Stop any existing source
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }

    // Create new source node
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    sourceNodeRef.current = source;

    // Connect source -> gain -> analyser -> destination
    source.connect(gainNodeRef.current);

    // Handle end of playback
    source.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      pauseTimeRef.current = 0;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    // Start playback
    const offset = pauseTimeRef.current;
    source.start(0, offset);
    startTimeRef.current = audioContext.currentTime - offset;
    setIsPlaying(true);

    // Start analysis loop
    startAnalysis();

    console.log('🎵 Audio playback started');
  }, [audioBuffer]);

  // Pause audio
  const pauseAudio = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current && isPlaying) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
      
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      console.log('🎵 Audio playback paused');
    }
  }, [isPlaying]);

  // Stop audio
  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    setIsPlaying(false);
    setCurrentTime(0);
    pauseTimeRef.current = 0;
    startTimeRef.current = 0;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    console.log('🎵 Audio playback stopped');
  }, []);

  // Start real-time analysis
  const startAnalysis = useCallback(() => {
    if (!analyserNodeRef.current || !frequencyDataRef.current || !timeDataRef.current) {
      return;
    }

    const analyser = analyserNodeRef.current;
    const frequencyData = frequencyDataRef.current;
    const timeData = timeDataRef.current;

    const analyze = () => {
      if (!isPlaying || !audioContextRef.current) return;

      // Update current time
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
      setCurrentTime(elapsed);

      // Get frequency and time domain data
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeData);

      // Continue analysis
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [isPlaying]);

  // Get current analysis data
  const getAnalysisData = useCallback((): AudioAnalysisData | null => {
    if (!frequencyDataRef.current || !timeDataRef.current || !isPlaying) {
      return null;
    }

    const frequencyData = frequencyDataRef.current;
    const timeData = timeDataRef.current;

    // Calculate volume (RMS of time domain data)
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const normalized = (timeData[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const volume = Math.sqrt(sum / timeData.length);

    // Find dominant frequency
    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i];
        maxIndex = i;
      }
    }
    const dominantFrequency = (maxIndex * (audioContextRef.current?.sampleRate || 44100)) / (2 * frequencyData.length);

    // Calculate energy in different frequency bands
    const third = Math.floor(frequencyData.length / 3);
    let bassEnergy = 0, midEnergy = 0, trebleEnergy = 0;
    
    for (let i = 0; i < third; i++) bassEnergy += frequencyData[i];
    for (let i = third; i < 2 * third; i++) midEnergy += frequencyData[i];
    for (let i = 2 * third; i < frequencyData.length; i++) trebleEnergy += frequencyData[i];
    
    bassEnergy /= (third * 255);
    midEnergy /= (third * 255);
    trebleEnergy /= (third * 255);

    return {
      frequencyData: new Uint8Array(frequencyData),
      timeData: new Uint8Array(timeData),
      volume,
      dominantFrequency,
      bassEnergy,
      midEnergy,
      trebleEnergy
    };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    // State
    isPlaying,
    audioBuffer,
    audioFeatures,
    currentTime,
    duration,
    
    // Actions
    loadAudioFile,
    playAudio,
    pauseAudio,
    stopAudio,
    getAnalysisData
  };
};