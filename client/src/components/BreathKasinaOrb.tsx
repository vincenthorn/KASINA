import React, { useState, useEffect, useRef } from 'react';
import KasinaOrb from './KasinaOrb';
import { KasinaType } from '@/lib/types';

interface BreathKasinaOrbProps {
  type: KasinaType;
  breathAmplitude: number; // 0 to 1 normalized breath amplitude
  breathingRate: number; // breaths per minute 
  effectType: 'expand-contract' | 'brighten-darken' | 'color-shift';
  remainingTime?: number | null; // For timer integration
}

const BreathKasinaOrb: React.FC<BreathKasinaOrbProps> = ({ 
  type, 
  breathAmplitude, 
  breathingRate,
  effectType,
  remainingTime
}) => {
  const [scale, setScale] = useState(1);
  const requestRef = useRef<number>();
  
  // Calculate intensity based on breathing rate
  // As breathing slows down to 4 breaths per minute, visual intensity decreases
  const calculateIntensity = (bpm: number) => {
    if (bpm <= 4) return 0.3; // Increased minimum intensity for visibility
    if (bpm >= 12) return 1.0; // Full intensity at 12 bpm or higher
    
    // Linear scaling between 4 and 12 bpm
    return 0.3 + ((bpm - 4) / 8) * 0.7;
  };
  
  useEffect(() => {
    // Animation loop for smooth transitions
    const animate = () => {
      // Calculate intensity based on breathing rate
      const intensity = calculateIntensity(breathingRate);
      
      // Different effects based on the selected effect type
      switch (effectType) {
        case 'expand-contract': {
          // Calculate target scale based on breath amplitude and intensity
          const baseScale = 0.6; // Even smaller base size for maximum contrast
          const maxExpansion = 2.5; // Extreme expansion range for unmistakable visual effect
          
          // Calculate scale with custom emphasis on the amplitude
          // Apply an exponent to create more dramatic expansion
          const emphasisFactor = Math.pow(breathAmplitude, 0.7); // Make changes more visible
          const targetScale = baseScale + (maxExpansion * emphasisFactor * intensity);
          
          // Very fast interpolation for immediate visual feedback
          setScale(prev => prev + (targetScale - prev) * 0.7); // Higher value = faster response
          
          // Log out the current scale for debugging
          if (Date.now() % 1000 < 50) {
            console.log(`Orb scale: ${targetScale.toFixed(2)}, Breath amplitude: ${breathAmplitude.toFixed(2)}`);
          }
          break;
        }
          
        // Future effect types will be implemented here
        case 'brighten-darken':
        case 'color-shift':
        default: {
          // Default to expand-contract for now
          const baseScale = 0.6; // Smaller base size for maximum contrast
          const maxExpansion = 2.5; // Extreme expansion range for unmistakable visual effect
          
          // Calculate scale with custom emphasis on the amplitude
          const emphasisFactor = Math.pow(breathAmplitude, 0.7); // Make changes more visible
          const defaultScale = baseScale + (maxExpansion * emphasisFactor * intensity);
          
          // Very fast interpolation for immediate visual feedback
          setScale(prev => prev + (defaultScale - prev) * 0.7); // Higher value = faster response
        }
          break;
      }
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [breathAmplitude, breathingRate, effectType]);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transition: 'transform 0.1s ease-in-out',
      }}
    >
      <KasinaOrb
        type={type}
        enableZoom={true}
        remainingTime={remainingTime}
      />
    </div>
  );
};

export default BreathKasinaOrb;