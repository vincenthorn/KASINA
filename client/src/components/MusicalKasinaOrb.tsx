import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';

// Musical Kasina Orb Shader Material - Based on color kasina design
const MusicalOrbMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.6, 0.3, 0.9), // Purple as base musical color
    intensity: 1.0,
    breathScale: 1.0,
    musicEnergy: 0.5,
    musicValence: 0.5,
    beatPulse: 0.0,
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    uniform float breathScale;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      
      // Apply breath scaling if in breath mode
      vec3 scaledPosition = position * breathScale;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    uniform float intensity;
    uniform float musicEnergy;
    uniform float musicValence;
    uniform float beatPulse;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      // Calculate distance from center for spherical gradient
      float d = length(vPosition);
      
      // Base color (now set dynamically from musical key)
      vec3 baseColor = color;
      
      // Energy affects brightness dramatically
      float energyBoost = musicEnergy * 0.8; // Much more pronounced
      
      // Valence affects color temperature more dramatically
      vec3 warmColor = vec3(1.0, 0.7, 0.4); // Warmer for high valence
      vec3 coolColor = vec3(0.3, 0.5, 1.0); // Cooler for low valence
      vec3 valenceTint = mix(coolColor, warmColor, musicValence);
      
      // Mix base color with valence tint (more pronounced)
      vec3 musicalColor = mix(baseColor, valenceTint, 0.4 * musicEnergy);
      
      // Enhanced spherical gradient with energy response
      float coreRadius = 0.3 + musicEnergy * 0.2; // Energy affects core size
      float brightness = 1.0 - smoothstep(coreRadius, coreRadius + 0.2, d);
      brightness = brightness * (0.8 + musicEnergy * 0.4); // Energy brightens core
      
      // Dramatic beat pulse effect
      float pulseIntensity = 1.0 + beatPulse * (0.3 + musicEnergy * 0.5);
      float pulseGlow = beatPulse * musicEnergy * 0.4; // Additional glow on beats
      
      // Energy-based rim lighting
      float rimLight = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      rimLight *= musicEnergy * 0.3;
      
      // Enhanced lighting with energy response
      vec3 lightDir = vec3(0.0, 0.0, 1.0);
      float lightFactor = max(0.7, dot(vNormal, lightDir));
      lightFactor += musicEnergy * 0.2; // Energy makes it brighter
      
      // Combine all effects
      vec3 result = musicalColor * (brightness + energyBoost + pulseGlow + rimLight) * lightFactor * intensity * pulseIntensity;
      
      // High energy tracks get extra glow
      if (musicEnergy > 0.7) {
        result += baseColor * (musicEnergy - 0.7) * 0.8 * beatPulse;
      }
      
      gl_FragColor = vec4(result, 1.0);
    }
  `
);

extend({ MusicalOrbMaterial });

// Type declaration for the custom material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      musicalOrbMaterial: any;
    }
  }
}

// Enhanced beat ripple effect for more prominent visual feedback
const BeatRipple = ({ trigger, audioFeatures }: { trigger: number; audioFeatures: any }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const [rippleTime, setRippleTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger > 0) {
      setRippleTime(0);
      setIsActive(true);
    }
  }, [trigger]);

  useFrame((state, delta) => {
    if (materialRef.current && isActive) {
      setRippleTime(prev => prev + delta * 1.5); // Faster ripple animation
      
      if (rippleTime >= 1.5) {
        setIsActive(false);
        setRippleTime(0);
      } else {
        const progress = rippleTime / 1.5;
        materialRef.current.opacity = Math.max(0, (1.0 - progress) * 0.8); // More visible
        materialRef.current.uniforms.time.value = rippleTime;
        materialRef.current.uniforms.progress.value = progress;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -1]} scale={[1.5, 1.5, 1]}>
      <planeGeometry args={[30, 30]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={{
          time: { value: 0 },
          progress: { value: 0 },
          center: { value: new THREE.Vector2(0, 0) },
          intensity: { value: audioFeatures?.energy || 0.5 },
          valence: { value: audioFeatures?.valence || 0.5 }
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          uniform float progress;
          uniform vec2 center;
          uniform float intensity;
          uniform float valence;
          varying vec2 vUv;
          
          void main() {
            vec2 uv = vUv - 0.5;
            float dist = length(uv);
            
            // Multiple ripple waves for richer effect
            float wave1 = sin(dist * 15.0 - time * 8.0) * exp(-dist * 2.0);
            float wave2 = sin(dist * 25.0 - time * 12.0) * exp(-dist * 3.5);
            float wave3 = cos(dist * 10.0 - time * 6.0) * exp(-dist * 1.5);
            
            float combinedWave = (wave1 + wave2 * 0.5 + wave3 * 0.3) * intensity;
            
            // Color based on valence (mood-responsive ripples)
            vec3 lowMoodColor = vec3(0.2, 0.3, 0.8);   // Blue for low valence
            vec3 highMoodColor = vec3(0.9, 0.6, 0.2);  // Orange/gold for high valence
            vec3 rippleColor = mix(lowMoodColor, highMoodColor, valence);
            
            float alpha = abs(combinedWave) * (1.0 - progress) * 0.6;
            
            gl_FragColor = vec4(rippleColor, alpha);
          }
        `}
      />
    </mesh>
  );
};

// Main orb component
const MusicOrb = ({ 
  isBreathMode, 
  breathAmplitude, 
  audioFeatures, 
  beatTrigger,
  size = 1.0
}: { 
  isBreathMode: boolean; 
  breathAmplitude: number; 
  audioFeatures: any; 
  beatTrigger: number;
  size?: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime;
      
      // Apply breath scaling in breath mode
      if (isBreathMode) {
        const scale = 1.0 + (breathAmplitude - 0.5) * 0.3;
        materialRef.current.breathScale = Math.max(0.7, Math.min(1.3, scale));
      } else {
        materialRef.current.breathScale = 1.0;
      }
      
      // Apply music features with more dramatic response
      if (audioFeatures) {
        materialRef.current.musicEnergy = audioFeatures.energy || 0.5;
        materialRef.current.musicValence = audioFeatures.valence || 0.5;
        
        // Enhanced color mapping based on musical key and mode
        const key = audioFeatures.key || 0;
        const mode = audioFeatures.mode || 0; // 0 = minor, 1 = major
        const valence = audioFeatures.valence || 0.5;
        
        // Map musical keys to colors more expressively
        const keyColors = [
          [0.8, 0.4, 0.9],  // C - Purple
          [0.9, 0.5, 0.4],  // C# - Orange-red
          [0.4, 0.8, 0.9],  // D - Light blue
          [0.6, 0.9, 0.4],  // D# - Green
          [0.9, 0.8, 0.4],  // E - Yellow
          [0.9, 0.4, 0.6],  // F - Pink
          [0.5, 0.4, 0.9],  // F# - Blue-purple
          [0.9, 0.6, 0.4],  // G - Orange
          [0.4, 0.9, 0.7],  // G# - Cyan-green
          [0.7, 0.4, 0.9],  // A - Violet
          [0.9, 0.4, 0.4],  // A# - Red
          [0.4, 0.6, 0.9]   // B - Blue
        ];
        
        const baseColor = keyColors[key] || [0.6, 0.3, 0.9];
        
        // Adjust for major/minor mode
        let finalColor = [...baseColor];
        if (mode === 0) { // Minor key - darker, more blue
          finalColor[0] *= 0.7; // Reduce red
          finalColor[2] *= 1.3; // Increase blue
        } else { // Major key - brighter, warmer
          finalColor[0] *= 1.2; // Increase warmth
          finalColor[1] *= 1.1; // Slight green boost
        }
        
        // Valence affects overall brightness
        const brightnessFactor = 0.7 + valence * 0.5;
        finalColor = finalColor.map(c => Math.min(1.0, c * brightnessFactor));
        
        materialRef.current.color.setRGB(finalColor[0], finalColor[1], finalColor[2]);
      }
      
      // Apply beat pulse effect
      if (beatTrigger > 0) {
        const timeSinceLastBeat = state.clock.elapsedTime - (beatTrigger * 0.1); // Rough timing
        const pulseDecay = Math.max(0, 1.0 - timeSinceLastBeat * 3.0);
        materialRef.current.beatPulse = pulseDecay * (audioFeatures?.energy || 0.5);
      } else {
        materialRef.current.beatPulse = 0.0;
      }
    }
  });

  return (
    <Sphere ref={meshRef} args={[size, 64, 64]} scale={[1, 1, 1]}>
      <musicalOrbMaterial
        ref={materialRef}
        color={new THREE.Color(0.5, 0.3, 1.0)}
        intensity={1.0}
        breathScale={1.0}
        musicEnergy={0.5}
        musicValence={0.5}
      />
    </Sphere>
  );
};

// Enhanced background component with section changes
const MusicBackground = ({ 
  audioFeatures, 
  audioAnalysis, 
  isPlaying, 
  currentSection 
}: { 
  audioFeatures: any; 
  audioAnalysis: any; 
  isPlaying: boolean; 
  currentSection: any; 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const [sectionTransition, setSectionTransition] = useState(0);

  // Handle section changes with smooth transitions
  useEffect(() => {
    if (currentSection) {
      setSectionTransition(1);
      const timeout = setTimeout(() => setSectionTransition(0), 2000);
      return () => clearTimeout(timeout);
    }
  }, [currentSection]);

  useFrame((state) => {
    if (materialRef.current && audioFeatures) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.energy.value = audioFeatures.energy || 0.5;
      materialRef.current.uniforms.valence.value = audioFeatures.valence || 0.5;
      materialRef.current.uniforms.isPlaying.value = isPlaying ? 1.0 : 0.0;
      materialRef.current.uniforms.sectionTransition.value = sectionTransition;
      
      // Section-based color shifts
      if (currentSection) {
        materialRef.current.uniforms.sectionKey.value = (currentSection.key || 0) / 12.0;
        materialRef.current.uniforms.sectionMode.value = currentSection.mode || 0.5;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <planeGeometry args={[50, 50]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          time: { value: 0 },
          energy: { value: 0.5 },
          valence: { value: 0.5 },
          isPlaying: { value: 0.0 },
          sectionTransition: { value: 0.0 },
          sectionKey: { value: 0.0 },
          sectionMode: { value: 0.5 }
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          uniform float energy;
          uniform float valence;
          uniform float isPlaying;
          uniform float sectionTransition;
          uniform float sectionKey;
          uniform float sectionMode;
          varying vec2 vUv;
          
          void main() {
            vec2 uv = vUv - 0.5;
            float dist = length(uv);
            
            // Enhanced color mapping based on valence with more dramatic shifts
            vec3 lowValenceColor = vec3(0.02, 0.08, 0.35);   // Deep blue/violet for low mood
            vec3 midValenceColor = vec3(0.12, 0.05, 0.25);   // Rich purple for neutral
            vec3 highValenceColor = vec3(0.45, 0.25, 0.08);  // Warm gold/peach for high mood
            
            vec3 baseColor;
            if (valence < 0.3) {
              // Very sad/dark music - deep blues
              baseColor = mix(vec3(0.01, 0.05, 0.4), lowValenceColor, valence / 0.3);
            } else if (valence < 0.7) {
              // Neutral range - purples and magentas
              baseColor = mix(lowValenceColor, midValenceColor, (valence - 0.3) / 0.4);
            } else {
              // Happy/energetic music - warm colors
              baseColor = mix(midValenceColor, highValenceColor, (valence - 0.7) / 0.3);
            }
            
            // Energy creates more dramatic visual changes
            float energyMultiplier = 0.3 + energy * 1.2; // Much more dramatic range
            float brightness = energyMultiplier;
            
            // Section-based color variations - more pronounced
            vec3 sectionColorShift = vec3(
              sin(sectionKey * 6.28 + time * 0.5) * 0.2,
              cos(sectionKey * 6.28 + time * 0.3) * 0.2,
              sin(sectionKey * 3.14 + time * 0.7) * 0.15
            );
            baseColor += sectionColorShift * sectionMode * energy;
            
            // Apply energy-based brightness and saturation
            vec3 energizedColor = baseColor * brightness;
            
            // Section transition effect - more visible
            float transitionPulse = sectionTransition * sin(dist * 8.0 - time * 6.0) * 0.3;
            energizedColor += transitionPulse * vec3(1.0, 0.8, 0.6);
            
            // Dynamic movement when playing - responds to energy
            float wave1 = sin(dist * 4.0 - time * (0.5 + energy * 1.5)) * energy * 0.1;
            float wave2 = cos(dist * 6.0 + time * (0.3 + energy * 1.0)) * energy * 0.08;
            float movementEffect = (wave1 + wave2) * isPlaying;
            energizedColor += movementEffect;
            
            // Radial gradient for depth
            float radialGradient = 1.0 - smoothstep(0.0, 1.5, dist);
            energizedColor *= radialGradient * (0.7 + energy * 0.3);
            
            // Final color intensity boost for high energy tracks
            if (energy > 0.7) {
              energizedColor += vec3(0.1, 0.05, 0.0) * (energy - 0.7) * 3.0;
            }
            
            gl_FragColor = vec4(energizedColor, 1.0);
          }
        `}
      />
    </mesh>
  );
};

interface MusicalKasinaOrbProps {
  isBreathMode: boolean;
  isPlaying: boolean;
  currentTrack: any;
  audioFeatures: any;
  audioAnalysis: any;
  size?: number; // Size multiplier from 0.05 to 5.0, matching Visual Kasina
}

const MusicalKasinaOrb: React.FC<MusicalKasinaOrbProps> = ({
  isBreathMode,
  isPlaying,
  currentTrack,
  audioFeatures,
  audioAnalysis,
  size = 0.3 // Default size matching Visual Kasina
}) => {
  const [beatTrigger, setBeatTrigger] = useState(0);
  const [breathAmplitude, setBreathAmplitude] = useState(0.5);
  const [orbScale, setOrbScale] = useState(1.0);
  const [currentSection, setCurrentSection] = useState<any>(null);
  const lastBeatTimeRef = useRef(0);
  const currentPositionRef = useRef(0);
  const lastSectionRef = useRef<any>(null);

  // Breath detection hooks (Vernier only for Musical Kasina)
  const vernierBreath = useVernierBreathOfficial();

  // Use Vernier breath data only (no microphone for Musical Kasina)
  useEffect(() => {
    if (isBreathMode && vernierBreath.isConnected) {
      setBreathAmplitude(vernierBreath.breathAmplitude);
    } else if (!isBreathMode) {
      setBreathAmplitude(0.5); // Static amplitude for Visual Mode
    }
  }, [isBreathMode, vernierBreath.breathAmplitude, vernierBreath.isConnected]);

  // Track position updates from Spotify player
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    const updatePosition = () => {
      currentPositionRef.current = currentTrack.position / 1000; // Convert to seconds
    };

    const interval = setInterval(updatePosition, 100); // Update every 100ms for smooth tracking
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  // Beat detection and section change monitoring
  useEffect(() => {
    if (!isPlaying) return;

    if (audioAnalysis && audioAnalysis.beats && audioAnalysis.beats.length > 0) {
      // Real Spotify beat detection with section monitoring
      const detectBeats = () => {
        const currentTime = currentPositionRef.current;
        
        // Beat detection - look for beats within 100ms window
        const currentBeat = audioAnalysis.beats.find((beat: any) => 
          Math.abs(beat.start - currentTime) < 0.1 && 
          beat.start > lastBeatTimeRef.current
        );
        
        if (currentBeat) {
          console.log('🥁 Beat detected at:', currentBeat.start, 'current time:', currentTime);
          setBeatTrigger(prev => prev + 1);
          lastBeatTimeRef.current = currentBeat.start;
        }
        
        // Section change detection
        if (audioAnalysis.sections) {
          const currentSectionData = audioAnalysis.sections.find((section: any) =>
            currentTime >= section.start && currentTime < (section.start + section.duration)
          );
          
          if (currentSectionData && currentSectionData !== lastSectionRef.current) {
            console.log('🎵 Section change detected:', currentSectionData);
            setCurrentSection(currentSectionData);
            lastSectionRef.current = currentSectionData;
          }
        }
      };

      const interval = setInterval(detectBeats, 50);
      return () => clearInterval(interval);
    } else if (audioFeatures || currentTrack) {
      // Fallback: simulate beats based on tempo for tracks without analysis
      const tempo = audioFeatures?.tempo || 120;
      const beatInterval = (60 / tempo) * 1000; // Convert BPM to milliseconds
      
      console.log('🥁 Using fallback beat detection, tempo:', tempo, 'interval:', beatInterval);
      
      const interval = setInterval(() => {
        setBeatTrigger(prev => prev + 1);
      }, beatInterval);
      
      return () => clearInterval(interval);
    }
  }, [audioAnalysis, audioFeatures, currentTrack, isPlaying]);

  // Mouse wheel scaling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
      setOrbScale(prev => Math.max(0.1, Math.min(5, prev * scaleFactor)));
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        
        {/* Dynamic background */}
        <MusicBackground 
          audioFeatures={audioFeatures} 
          audioAnalysis={audioAnalysis}
          isPlaying={isPlaying} 
          currentSection={currentSection}
        />
        
        {/* Beat ripples */}
        <BeatRipple trigger={beatTrigger} audioFeatures={audioFeatures} />
        
        {/* Main orb */}
        <group scale={[orbScale, orbScale, orbScale]}>
          <MusicOrb 
            isBreathMode={isBreathMode}
            breathAmplitude={breathAmplitude}
            audioFeatures={audioFeatures}
            beatTrigger={beatTrigger}
            size={size}
          />
        </group>
      </Canvas>
    </div>
  );
};

export default MusicalKasinaOrb;