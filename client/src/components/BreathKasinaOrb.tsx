import React, { useEffect, useRef } from 'react';
import { KasinaType, BreathEffectType } from '../types/kasina';
import '../styles/kasina-animations.css';

interface BreathKasinaOrbProps {
  type: KasinaType;
  breathAmplitude: number; // 0 to 1 normalized breath amplitude
  breathingRate: number; // breaths per minute 
  effectType: BreathEffectType;
  remainingTime?: number | null; // For timer integration
}

/**
 * BreathKasinaOrb - A visual representation of breathing patterns
 * 
 * This component creates a colorful orb that responds to breathing data,
 * changing size, brightness, or color based on the breath amplitude and rate.
 */
const BreathKasinaOrb: React.FC<BreathKasinaOrbProps> = ({
  type = 'blue',
  breathAmplitude = 0,
  breathingRate = 0,
  effectType = 'expand-contract',
  remainingTime = null
}) => {
  const orbRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  // Get base color based on kasina type
  const getBaseColor = () => {
    switch (type) {
      case 'blue': return '#0088ff';
      case 'red': return '#ff3300';
      case 'green': return '#00cc66';
      case 'yellow': return '#ffcc00';
      case 'white': return '#ffffff';
      case 'rainbow': return '#0088ff'; // Start with blue for rainbow
      default: return '#0088ff';
    }
  };

  // Apply breathing effects to the orb
  useEffect(() => {
    if (!orbRef.current) return;
    
    const orbElement = orbRef.current;
    const baseSize = 200; // Base size in pixels
    const baseColor = getBaseColor();
    
    // Apply effects based on breath amplitude and effect type
    switch (effectType) {
      case 'expand-contract':
        // Scale from 100% to 200% based on breath amplitude
        const newSize = baseSize + (baseSize * breathAmplitude);
        orbElement.style.width = `${newSize}px`;
        orbElement.style.height = `${newSize}px`;
        break;
        
      case 'brighten-darken':
        // Adjust brightness/opacity based on breath amplitude
        const opacity = 0.5 + (breathAmplitude * 0.5);
        orbElement.style.opacity = opacity.toString();
        orbElement.style.boxShadow = `0 0 ${30 + (breathAmplitude * 70)}px ${baseColor}`;
        break;
        
      case 'color-shift':
        // Shift color based on breath amplitude
        if (type === 'rainbow') {
          // Create rainbow effect by shifting hue
          const hue = (breathAmplitude * 360) % 360;
          orbElement.style.backgroundColor = `hsl(${hue}, 80%, 60%)`;
          orbElement.style.boxShadow = `0 0 50px hsl(${hue}, 80%, 60%)`;
        } else {
          // Shift between base color and white
          orbElement.style.backgroundColor = baseColor;
          orbElement.style.filter = `brightness(${1 + breathAmplitude})`;
        }
        break;
    }
    
    // Update particles effect
    if (particlesRef.current) {
      const particlesElement = particlesRef.current;
      particlesElement.style.opacity = breathAmplitude.toFixed(2);
      
      // Adjust particle animation speed based on breathing rate
      const animationDuration = breathingRate > 0 
        ? Math.max(60 / breathingRate, 3) // Convert breaths per minute to seconds
        : 5; // Default to 5 seconds
        
      particlesElement.style.animationDuration = `${animationDuration}s`;
    }
  }, [breathAmplitude, breathingRate, effectType, type]);

  return (
    <div className="breath-kasina-container">
      {/* Main orb */}
      <div 
        ref={orbRef}
        className="breath-kasina-orb"
        style={{
          backgroundColor: getBaseColor(),
          transition: 'all 0.3s ease-out',
        }}
      >
        {/* Particles overlay */}
        <div 
          ref={particlesRef}
          className="breath-particles"
          style={{
            opacity: 0,
            background: `radial-gradient(circle at center, transparent 30%, ${getBaseColor()}40 70%, transparent 100%)`,
          }}
        />
      </div>
      
      {/* Optional timer display */}
      {remainingTime !== null && (
        <div className="breath-timer">
          {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
        </div>
      )}
      
      {/* Optional breathing rate display */}
      {breathingRate > 0 && (
        <div className="breath-rate">
          {breathingRate.toFixed(1)} BPM
        </div>
      )}
    </div>
  );
};

export default BreathKasinaOrb;