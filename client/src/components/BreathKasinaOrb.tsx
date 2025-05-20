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
    if (bpm <= 4) return 0.1; // Minimal intensity at 4 bpm or lower
    if (bpm >= 12) return 1.0; // Full intensity at 12 bpm or higher
    
    // Linear scaling between 4 and 12 bpm
    return 0.1 + ((bpm - 4) / 8) * 0.9;
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
          const baseScale = 1.0; // Base size
          const maxExpansion = 0.3; // Maximum additional scale factor
          const targetScale = baseScale + (maxExpansion * breathAmplitude * intensity);
          
          // Smooth interpolation for scale changes
          setScale(prev => prev + (targetScale - prev) * 0.1);
          break;
        }
          
        // Future effect types will be implemented here
        case 'brighten-darken':
        case 'color-shift':
        default: {
          // Default to expand-contract for now
          const baseScale = 1.0; // Base size
          const maxExpansion = 0.3; // Maximum additional scale factor
          const defaultScale = baseScale + (maxExpansion * breathAmplitude * intensity);
          setScale(prev => prev + (defaultScale - prev) * 0.1);
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