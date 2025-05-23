import React, { useEffect, useRef, useState } from 'react';
import '../styles/kasina-animations.css';
import '../styles/breath-kasina.css';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';

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
  const lastAmplitudeRef = useRef(activeBreathAmplitude);
  
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
  
  // Update the orb size based on breath amplitude with hold detection
  useEffect(() => {
    if (!activeIsListening) return;
    
    // Adjusted breathing size range with scroll-based scaling
    const baseMinSize = 1;
    const baseMaxSize = 700;
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
        zIndex: 10
      }}
    >
      <div 
        ref={orbRef}
        className="breath-kasina-orb"
        style={{
          width: `${orbSize}px`,
          height: `${orbSize}px`,
          borderRadius: '50%',
          backgroundColor: '#4d8fff', // Pure blue color
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
      

    </div>
  );
};

export default BreathKasinaOrb;