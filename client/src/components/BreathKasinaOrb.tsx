import React, { useEffect, useRef, useState } from 'react';
import '../styles/kasina-animations.css';
import '../styles/breath-kasina.css';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';
import { useLocation } from 'wouter';
import { useSessionLogger } from '../lib/stores/useSessionLogger';

interface BreathKasinaOrbProps {
  breathAmplitude?: number;
  breathPhase?: 'inhale' | 'exhale' | 'pause';
  isListening?: boolean;
  useVernier?: boolean;
}

/**
 * A component that displays an orb that pulses with the user's breath
 * The orb size changes based on the breath amplitude
 */
const BreathKasinaOrb: React.FC<BreathKasinaOrbProps> = ({ 
  breathAmplitude = 0.5,
  breathPhase = 'pause',
  isListening = false,
  useVernier = false
}) => {
  const [, setLocation] = useLocation();
  const { logSession } = useSessionLogger();
  
  // Use Vernier breathing data if enabled
  const vernierData = useVernierBreathOfficial();
  
  // Log Vernier data for debugging
  console.log('🔵 BreathKasinaOrb - useVernier:', useVernier, 'vernierData:', {
    isConnected: vernierData.isConnected,
    breathAmplitude: vernierData.breathAmplitude,
    breathPhase: vernierData.breathPhase,
    currentForce: vernierData.currentForce,
    calibrationComplete: vernierData.calibrationComplete
  });
  
  // Determine which breathing data to use
  const activeBreathAmplitude = useVernier ? vernierData.breathAmplitude : breathAmplitude;
  const activeBreathPhase = useVernier ? vernierData.breathPhase : breathPhase;
  const activeIsListening = useVernier ? vernierData.isConnected : isListening;
  const activeBreathingRate = useVernier ? vernierData.breathingRate : 12; // Default to 12 BPM
  const orbRef = useRef<HTMLDivElement>(null);
  const [orbSize, setOrbSize] = useState(150);
  const [glowIntensity, setGlowIntensity] = useState(15);
  const [heldExhaleStart, setHeldExhaleStart] = useState<number | null>(null);
  const [sizeScale, setSizeScale] = useState(1.0); // Scale factor for min-max range
  const [showCalibrationMessage, setShowCalibrationMessage] = useState(false);
  const [calibrationTimeRemaining, setCalibrationTimeRemaining] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meditationTime, setMeditationTime] = useState(0); // seconds
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const lastAmplitudeRef = useRef(activeBreathAmplitude);
  const calibrationStartRef = useRef<number | null>(null);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const meditationStartRef = useRef<number | null>(null);
  const meditationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle wheel scroll to adjust breathing range scale
  useEffect(() => {
    const handleWheel = (e: any) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1; // Scroll down = smaller, scroll up = larger
      setSizeScale(prev => Math.max(0.2, Math.min(3.0, prev + delta))); // Range: 0.2x to 3.0x
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle calibration period when breathing starts
  useEffect(() => {
    if (activeIsListening && calibrationStartRef.current === null) {
      // Start calibration period
      calibrationStartRef.current = Date.now();
      setShowCalibrationMessage(true);
      setCalibrationTimeRemaining(5);
      
      // Update countdown every second
      const interval = setInterval(() => {
        const elapsed = Date.now() - calibrationStartRef.current!;
        const remaining = Math.max(0, 5 - Math.floor(elapsed / 1000));
        setCalibrationTimeRemaining(remaining);
        
        if (remaining === 0) {
          setShowCalibrationMessage(false);
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (!activeIsListening) {
      // Reset calibration when not listening
      calibrationStartRef.current = null;
      setShowCalibrationMessage(false);
      setCalibrationTimeRemaining(0);
    }
  }, [activeIsListening]);

  // Handle cursor and controls auto-hide on mouse inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowCursor(true);
      setShowControls(true);
      
      // Clear existing timeouts
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      // Set new timeouts to hide cursor and controls after 3 seconds of inactivity
      cursorTimeoutRef.current = setTimeout(() => {
        setShowCursor(false);
      }, 3000);
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setIsInFocusMode(true);
        
        // Start meditation timer when entering focus mode
        if (!meditationStartRef.current) {
          meditationStartRef.current = Date.now();
          meditationIntervalRef.current = setInterval(() => {
            if (meditationStartRef.current) {
              const elapsed = Math.floor((Date.now() - meditationStartRef.current) / 1000);
              setMeditationTime(elapsed);
            }
          }, 1000);
        }
      }, 3000);
    };

    const handleMouseMoveWithFocus = () => {
      // Exit focus mode when mouse moves
      if (isInFocusMode) {
        setIsInFocusMode(false);
        // Pause meditation timer but don't reset
        if (meditationIntervalRef.current) {
          clearInterval(meditationIntervalRef.current);
          meditationIntervalRef.current = null;
        }
      }
      handleMouseMove();
    };

    document.addEventListener('mousemove', handleMouseMoveWithFocus);
    
    // Initial timeout
    handleMouseMove();
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveWithFocus);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (meditationIntervalRef.current) {
        clearInterval(meditationIntervalRef.current);
      }
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // End meditation session
  const endMeditation = async () => {
    // Calculate final meditation time (round down to nearest minute)
    const finalMeditationTime = Math.floor(meditationTime / 60) * 60; // Round down to full minutes
    
    // Log the session if there was meaningful meditation time
    if (finalMeditationTime >= 60) { // At least 1 minute
      await logSession({
        kasinaType: 'breath' as any,
        duration: finalMeditationTime,
        showToast: true
      });
    }
    
    // Reset meditation state
    setMeditationTime(0);
    setIsInFocusMode(false);
    meditationStartRef.current = null;
    if (meditationIntervalRef.current) {
      clearInterval(meditationIntervalRef.current);
      meditationIntervalRef.current = null;
    }
    
    // Navigate to Reflection page
    setLocation('/reflection');
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Update the orb size based on breath amplitude with hold detection
  useEffect(() => {
    if (!activeIsListening) return;
    
    // Adjusted breathing size range with scroll-based scaling - extended for complete screen merger
    const baseMinSize = 1;
    const baseMaxSize = 4000; // Dramatically increased to ensure complete screen coverage for meditative merger
    const minSize = Math.floor(baseMinSize * sizeScale);
    const maxSize = Math.floor(baseMaxSize * sizeScale);
    const sizeRange = maxSize - minSize;
    
    // Detect if amplitude has changed significantly (not holding breath)
    const amplitudeChanged = Math.abs(activeBreathAmplitude - lastAmplitudeRef.current) > 0.01;
    
    let finalAmplitude = activeBreathAmplitude;
    
    // If we're in a low amplitude state and not changing much, we might be holding an exhale
    if (activeBreathAmplitude < 0.15 && !amplitudeChanged) {
      if (heldExhaleStart === null) {
        setHeldExhaleStart(Date.now());
      } else {
        // Gradually reduce amplitude during held exhale
        const holdDuration = Date.now() - heldExhaleStart;
        const shrinkRate = 0.999; // Very gradual shrinking
        const shrinkFactor = Math.pow(shrinkRate, holdDuration / 100); // Every 100ms
        finalAmplitude = activeBreathAmplitude * shrinkFactor;
      }
    } else {
      setHeldExhaleStart(null); // Reset hold detection
    }
    
    lastAmplitudeRef.current = activeBreathAmplitude;
    
    // Calculate intensity multiplier based on breathing rate (4-20 BPM)
    // At 4 BPM (deep meditation): very subtle (30% intensity)
    // At 12 BPM (normal): medium intensity (80% intensity) 
    // At 20 BPM (fast breathing): full intensity (100%)
    const normalizedRate = Math.max(4, Math.min(20, activeBreathingRate)); // Clamp to range
    const intensityMultiplier = normalizedRate <= 4 ? 0.3 : 
                               normalizedRate <= 12 ? 0.3 + ((normalizedRate - 4) / 8) * 0.5 :
                               0.8 + ((normalizedRate - 12) / 8) * 0.2;
    
    // Apply scaling to make exhales 2-3x smaller and adjust the curve
    let scaledAmplitude = finalAmplitude;
    
    // For lower amplitudes (exhales), compress the range to make them much smaller
    if (finalAmplitude < 0.5) {
      // Make exhales 3x smaller by compressing the lower range
      scaledAmplitude = finalAmplitude * 0.33;
    } else {
      // For inhales (upper range), apply gentler scaling
      scaledAmplitude = 0.165 + ((finalAmplitude - 0.5) * 0.67); // Maps 0.5-1.0 to 0.165-0.5
    }
    
    // Apply breathing rate intensity scaling
    scaledAmplitude = scaledAmplitude * intensityMultiplier;
    
    const clampedAmplitude = Math.max(0, Math.min(1, scaledAmplitude));
    const newSize = Math.floor(minSize + (sizeRange * clampedAmplitude));
    
    // Update state to trigger re-render
    setOrbSize(newSize);
    
    // Also directly modify the DOM for immediate visual feedback
    if (orbRef.current) {
      orbRef.current.style.width = `${newSize}px`;
      orbRef.current.style.height = `${newSize}px`;
      orbRef.current.style.boxShadow = 'none'; // Remove all glow effects
    }
    
    // Log the size and rate data for debugging
    console.log(`Scale: ${sizeScale.toFixed(1)}x, rate: ${activeBreathingRate}bpm, intensity: ${(intensityMultiplier * 100).toFixed(0)}%, range: ${minSize}-${maxSize}px, current: ${newSize}px`);
  }, [activeBreathAmplitude, activeIsListening, heldExhaleStart, activeBreathingRate, sizeScale]);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: '#000000',
        width: '100vw',
        height: '100vh',
        zIndex: 10,
        cursor: showCursor ? 'default' : 'none' // Auto-hide cursor after 3 seconds of inactivity
      }}
    >
      <div 
        ref={orbRef}
        className="breath-kasina-orb"
        style={{
          width: `${orbSize}px`,
          height: `${orbSize}px`,
          borderRadius: '50%',
          backgroundColor: '#0000FF', // Pure blue color
          boxShadow: 'none', // No glow effect
          transition: 'all 0.2s ease-out',
          position: 'relative',
          overflow: 'hidden',
          transform: `scale(${isListening ? 1 : 0.9})`,
          opacity: isListening ? 1 : 0.7
        }}
      >
        {/* Pure blue circle - no effects */}
      </div>
      
      {/* Meditation timer and controls - upper left corner */}
      {showControls && (
        <div 
          className="absolute top-4 left-4 z-30 flex items-center space-x-3"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            transition: 'all 0.3s ease-out'
          }}
        >
          <div 
            style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            {formatTime(meditationTime)}
          </div>
          <button
            onClick={endMeditation}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            End
          </button>
        </div>
      )}

      {/* Fullscreen control - upper right corner */}
      {showControls && (
        <div 
          className="absolute top-4 right-4 z-30 cursor-pointer"
          onClick={toggleFullscreen}
          style={{
            padding: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            transition: 'all 0.3s ease-out'
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            {isFullscreen ? (
              // Exit fullscreen icon
              <>
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </>
            ) : (
              // Enter fullscreen icon
              <>
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </>
            )}
          </svg>
        </div>
      )}

      {/* Calibration message overlay */}
      {showCalibrationMessage && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ zIndex: 20 }}
        >
          <div 
            className="bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg text-center"
            style={{ 
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            <div>Calibrating Breath Detection</div>
            <div className="text-lg mt-2 opacity-80">
              Breathe naturally for {calibrationTimeRemaining} more seconds
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BreathKasinaOrb;