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
  
  // Determine which breathing data to use
  const activeBreathAmplitude = useVernier ? vernierData.breathAmplitude : breathAmplitude;
  const activeBreathPhase = useVernier ? vernierData.breathPhase : breathPhase;
  const activeIsListening = useVernier ? vernierData.isConnected : isListening;
  const orbRef = useRef<HTMLDivElement>(null);
  const [orbSize, setOrbSize] = useState(150);
  const [glowIntensity, setGlowIntensity] = useState(15);
  
  // Update the orb size based on breath amplitude
  useEffect(() => {
    if (!activeIsListening) return;
    
    // Dramatic breathing size range for powerful visualization
    const minSize = 100;  // Very small for complete exhales
    const maxSize = 600;  // Large and satisfying for deep inhales
    const sizeRange = maxSize - minSize;
    
    // Use amplitude directly without additional magnification
    // The breathing algorithm already provides the right scaling
    const clampedAmplitude = Math.max(0, Math.min(1, breathAmplitude));
    const newSize = Math.floor(minSize + (sizeRange * clampedAmplitude));
    
    // More dramatic glow effect that scales with breathing
    const newGlowIntensity = Math.floor(25 + (breathAmplitude * 150));
    
    // Update state to trigger re-render
    setOrbSize(newSize);
    setGlowIntensity(newGlowIntensity);
    
    // Also directly modify the DOM for immediate visual feedback
    if (orbRef.current) {
      orbRef.current.style.width = `${newSize}px`;
      orbRef.current.style.height = `${newSize}px`;
      orbRef.current.style.boxShadow = `0 0 ${newGlowIntensity}px ${Math.floor(newGlowIntensity/2)}px rgba(77, 143, 255, 0.8)`;
    }
    
    // Log the size for debugging
    console.log(`Breath amplitude: ${breathAmplitude}, clamped: ${clampedAmplitude.toFixed(2)}, orb size: ${newSize}px, glow: ${newGlowIntensity}`);
  }, [breathAmplitude, isListening]);

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
          backgroundColor: 'rgba(77, 143, 255, 0.7)',
          boxShadow: `0 0 ${glowIntensity}px ${Math.floor(glowIntensity/2)}px rgba(77, 143, 255, 0.8)`,
          transition: 'all 0.2s ease-out',
          position: 'relative',
          overflow: 'hidden',
          transform: `scale(${isListening ? 1 : 0.9})`,
          opacity: isListening ? 1 : 0.7
        }}
      >
        {/* Particle effect inside the orb */}
        <div className="orb-particles"></div>
        
        {/* Radial gradient overlay */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(77, 143, 255, 0.3) 0%, rgba(77, 143, 255, 0.9) 80%)',
            opacity: 0.8
          }}
        />
        
        {/* Extra inner glow for depth */}
        <div 
          style={{
            position: 'absolute',
            top: '15%',
            left: '15%',
            width: '70%',
            height: '70%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(77, 143, 255, 0) 70%)',
            opacity: 0.6,
            filter: 'blur(5px)'
          }}
        />
      </div>
      

    </div>
  );
};

export default BreathKasinaOrb;