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
          // Dramatically enhance the visual response for even the tiniest readings
          const baseScale = 0.9; // Larger base size so the orb is still clearly visible when small
          const maxExpansion = 1.5; // Much more reasonable expansion range
          
          // Apply a much more moderate amplification that won't cause the orb to get too huge
          // Based on the screenshot, we need to reduce the amplification considerably
          
          // Start with base amplification
          let amplifiedAmplitude = breathAmplitude;
          
          // Much gentler amplification for all ranges
          if (breathAmplitude > 0 && breathAmplitude < 0.1) {
            // Tiny readings (0.01-0.1N): moderate amplification
            amplifiedAmplitude = 0.1 + (breathAmplitude * 2); 
            console.log(`Amplifying small reading: ${breathAmplitude} → ${amplifiedAmplitude}`);
          } 
          else if (breathAmplitude >= 0.1 && breathAmplitude < 1.0) {
            // Medium readings (0.1-1.0N): slight amplification
            amplifiedAmplitude = 0.2 + (breathAmplitude * 0.8);
            console.log(`Amplifying medium reading: ${breathAmplitude} → ${amplifiedAmplitude}`);
          }
          else if (breathAmplitude >= 1.0) {
            // Larger readings (>1.0N): very minimal amplification
            amplifiedAmplitude = 0.3 + (breathAmplitude * 0.2);
            console.log(`Amplifying large reading: ${breathAmplitude} → ${amplifiedAmplitude}`);
          }
          
          // Apply much gentler scaling to avoid the orb getting too large
          // We need a subtle animation rather than dramatic expansion
          const emphasisFactor = Math.pow(amplifiedAmplitude, 0.5);
          const targetScale = baseScale + (maxExpansion * emphasisFactor * intensity) * 0.3; // Reduce by 70%
          
          // Slower interpolation for smoother, less dramatic changes
          setScale(prev => prev + (targetScale - prev) * 0.2); // Lower value = gentler response
          
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
          
          // IMPORTANT: Apply the same amplitude amplification here as in the expand-contract case
          let amplifiedAmplitude = breathAmplitude;
          
          // For very small readings (0.01-0.1), dramatically amplify the visual effect
          if (breathAmplitude > 0 && breathAmplitude < 0.1) {
            // Exponentially amplify small readings 
            amplifiedAmplitude = 0.3 + (breathAmplitude * 5); // Boost tiny readings to visible range
          }
          
          // Calculate scale with custom emphasis on the amplitude
          const emphasisFactor = Math.pow(amplifiedAmplitude, 0.5); // Make changes more visible
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