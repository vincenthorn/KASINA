import React, { useEffect, useState } from 'react';
import { KasinaType } from '../types/kasina';

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
  const [opacity, setOpacity] = useState(0.8);
  const [hue, setHue] = useState(240); // Default blue hue (240 degrees in HSL)
  
  // Apply breathing effect based on the chosen effect type
  useEffect(() => {
    // Map the breath amplitude to the desired visual effect
    switch (effectType) {
      case 'expand-contract':
        // Map amplitude to scale (0.5 to 1.7)
        // Making the effect more dramatic as requested
        const newScale = 0.7 + (breathAmplitude * 1.5);
        setScale(newScale);
        setOpacity(0.8);
        setHue(240); // Keep blue
        break;
        
      case 'brighten-darken':
        // Map amplitude to opacity (0.3 to 1)
        const newOpacity = 0.3 + (breathAmplitude * 0.7);
        setOpacity(newOpacity);
        setScale(1.2); // Keep a moderate fixed size
        setHue(240); // Keep blue
        break;
        
      case 'color-shift':
        // Map amplitude to hue (180 to 240 degrees - cyan to blue)
        const newHue = 180 + (breathAmplitude * 60);
        setHue(newHue);
        setScale(1.2); // Keep a moderate fixed size
        setOpacity(0.8); // Keep moderate opacity
        break;
    }
  }, [breathAmplitude, effectType]);
  
  // Base color for the kasina
  let baseColor = '';
  let glowColor = '';
  
  // Color based on kasina type
  switch (type) {
    case 'blue':
      baseColor = `hsla(${hue}, 100%, 50%, ${opacity})`;
      glowColor = `hsla(${hue}, 100%, 70%, ${opacity * 0.7})`;
      break;
    default:
      baseColor = `hsla(${hue}, 100%, 50%, ${opacity})`;
      glowColor = `hsla(${hue}, 100%, 70%, ${opacity * 0.7})`;
  }
  
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Timer display if remaining time is provided */}
      {remainingTime !== undefined && remainingTime !== null && (
        <div className="absolute top-4 left-0 right-0 text-center text-white text-2xl font-semibold z-10">
          {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
        </div>
      )}
      
      {/* Background glow effect */}
      <div 
        className="absolute rounded-full"
        style={{
          width: `${300 * scale}px`,
          height: `${300 * scale}px`,
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
          transition: 'all 0.5s ease-in-out'
        }}
      />
      
      {/* Main orb */}
      <div 
        className="rounded-full shadow-xl relative overflow-hidden"
        style={{
          width: `${200 * scale}px`,
          height: `${200 * scale}px`,
          background: baseColor,
          boxShadow: `0 0 60px 20px ${glowColor}`,
          transition: 'all 0.5s ease-in-out'
        }}
      >
        {/* Inner light reflections */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '50%',
            height: '50%',
            top: '10%',
            left: '10%',
            background: `radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)`,
          }}
        />
        
        {/* Subtle pulsing inner core */}
        <div 
          className="absolute rounded-full"
          style={{
            width: '70%',
            height: '70%',
            top: '15%',
            left: '15%',
            background: `radial-gradient(circle, ${baseColor} 30%, rgba(0,0,0,0) 70%)`,
            animation: `pulse ${60 / breathingRate}s infinite alternate ease-in-out`,
          }}
        />
      </div>
      
      {/* Breathing rate indicator (subtle text at bottom) */}
      <div className="absolute bottom-4 text-white text-sm opacity-60">
        {breathingRate} breaths per minute
      </div>
      
      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default BreathKasinaOrb;