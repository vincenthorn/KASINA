import React, { useEffect, useRef, useState } from 'react';
import '../styles/kasina-animations.css';
import '../styles/breath-kasina.css';

interface BreathKasinaOrbProps {
  breathAmplitude: number;
  isListening: boolean;
}

/**
 * A component that displays an orb that pulses with the user's breath
 * The orb size changes based on the breath amplitude
 */
const BreathKasinaOrb: React.FC<BreathKasinaOrbProps> = ({ 
  breathAmplitude,
  isListening
}) => {
  const orbRef = useRef<HTMLDivElement>(null);
  const [orbSize, setOrbSize] = useState(150);
  const [glowIntensity, setGlowIntensity] = useState(15);
  
  // Update the orb size based on breath amplitude
  useEffect(() => {
    if (!isListening) return;
    
    // Calculate the size based on breath amplitude with more dramatic effect
    // Min size: 100px, Max size: 500px for much more dramatic effect
    const minSize = 100;
    const maxSize = 500;
    const sizeRange = maxSize - minSize;
    
    // Apply much stronger magnification factor to make changes very dramatic
    // Higher exponent (0.3) makes even tiny breaths visible
    // Much higher multiplier (8.0) creates big, obvious changes
    const magnifiedAmplitude = Math.pow(breathAmplitude, 0.3) * 8.0; 
    const clampedAmplitude = Math.min(1, magnifiedAmplitude);
    const newSize = Math.floor(minSize + (sizeRange * clampedAmplitude));
    
    // Also adjust the glow effect based on breath amplitude
    const newGlowIntensity = Math.floor(15 + (breathAmplitude * 80));
    
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
    console.log(`Breath amplitude: ${breathAmplitude}, magnified: ${magnifiedAmplitude.toFixed(2)}, orb size: ${newSize}px, glow: ${newGlowIntensity}`);
  }, [breathAmplitude, isListening]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
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
      
      <div className="mt-8 text-center text-white">
        {isListening ? (
          <>
            <p className="text-lg mb-2">Listening to your breath...</p>
            <p className="text-sm text-blue-300">Breathe normally and the orb will expand and contract with your breath</p>
          </>
        ) : (
          <p>Microphone is not active</p>
        )}
      </div>
    </div>
  );
};

export default BreathKasinaOrb;