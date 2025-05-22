import React, { useEffect, useRef } from 'react';
import '../styles/kasina-animations.css';

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
  
  // Update the orb size based on breath amplitude
  useEffect(() => {
    if (!orbRef.current) return;
    
    // Calculate the size based on breath amplitude
    // Min size: 100px, Max size: 300px
    const minSize = 150;
    const maxSize = 400;
    const sizeRange = maxSize - minSize;
    const newSize = minSize + (sizeRange * breathAmplitude);
    
    // Apply the new size
    orbRef.current.style.width = `${newSize}px`;
    orbRef.current.style.height = `${newSize}px`;
    
    // Also adjust the glow effect
    const glowIntensity = 10 + (breathAmplitude * 30);
    orbRef.current.style.boxShadow = `0 0 ${glowIntensity}px ${glowIntensity/2}px rgba(77, 143, 255, 0.8)`;
  }, [breathAmplitude]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div 
        ref={orbRef}
        className="breath-kasina-orb"
        style={{
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          backgroundColor: 'rgba(77, 143, 255, 0.8)',
          boxShadow: '0 0 10px 5px rgba(77, 143, 255, 0.6)',
          transition: 'all 0.2s ease-out',
          position: 'relative',
          overflow: 'hidden'
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
            background: 'radial-gradient(circle, rgba(77, 143, 255, 0.4) 0%, rgba(77, 143, 255, 0.9) 70%)',
            opacity: 0.8
          }}
        />
      </div>
      
      <div className="mt-8 text-center text-white">
        {isListening ? 'Listening to your breath...' : 'Microphone is not active'}
      </div>
    </div>
  );
};

export default BreathKasinaOrb;