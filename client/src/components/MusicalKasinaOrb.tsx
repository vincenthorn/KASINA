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
      
      // Base color with subtle music influence
      vec3 baseColor = color;
      
      // Energy affects brightness subtly
      float energyBoost = musicEnergy * 0.2;
      
      // Valence affects color temperature
      vec3 warmColor = vec3(0.9, 0.6, 0.4); // Warm for high valence
      vec3 coolColor = vec3(0.4, 0.6, 0.9); // Cool for low valence
      vec3 valenceTint = mix(coolColor, warmColor, musicValence);
      
      // Mix base color with valence tint (very subtle)
      vec3 musicalColor = mix(baseColor, valenceTint, 0.15);
      
      // Gentle spherical gradient like color kasinas
      float brightness = 1.0 - smoothstep(0.45, 0.5, d);
      
      // Beat pulse effect (very subtle)
      float pulse = 1.0 + beatPulse * 0.1;
      
      // Lighting
      vec3 lightDir = vec3(0.0, 0.0, 1.0);
      float lightFactor = max(0.85, dot(vNormal, lightDir));
      
      vec3 result = musicalColor * (brightness + energyBoost) * lightFactor * intensity * pulse;
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

// Background ripple effect for beats
const BeatRipple = ({ trigger, audioFeatures }: { trigger: number; audioFeatures: any }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const [rippleTime, setRippleTime] = useState(0);

  useEffect(() => {
    if (trigger > 0) {
      setRippleTime(0);
    }
  }, [trigger]);

  useFrame((state, delta) => {
    if (materialRef.current && rippleTime < 2.0) {
      setRippleTime(prev => prev + delta);
      materialRef.current.opacity = Math.max(0, 1.0 - rippleTime / 2.0);
      materialRef.current.uniforms.time.value = rippleTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <planeGeometry args={[20, 20]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={{
          time: { value: 0 },
          center: { value: new THREE.Vector2(0, 0) },
          intensity: { value: audioFeatures?.energy || 0.5 }
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
          uniform vec2 center;
          uniform float intensity;
          varying vec2 vUv;
          
          void main() {
            vec2 uv = vUv - 0.5;
            float dist = length(uv);
            
            float ripple = sin(dist * 20.0 - time * 10.0) * exp(-dist * 3.0);
            float alpha = ripple * intensity * 0.3;
            
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
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
  beatTrigger 
}: { 
  isBreathMode: boolean; 
  breathAmplitude: number; 
  audioFeatures: any; 
  beatTrigger: number; 
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
      
      // Apply music features
      if (audioFeatures) {
        materialRef.current.musicEnergy = audioFeatures.energy || 0.5;
        materialRef.current.musicValence = audioFeatures.valence || 0.5;
        
        // Color based on musical key and mode
        const hue = (audioFeatures.key || 0) / 12.0;
        const saturation = audioFeatures.mode || 0.5;
        const lightness = 0.6 + (audioFeatures.valence || 0.5) * 0.2;
        
        materialRef.current.color.setHSL(hue, saturation, lightness);
      }
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
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
            
            // Enhanced color mapping based on valence (PRD requirement)
            vec3 lowValenceColor = vec3(0.05, 0.05, 0.25);  // Deep blue/violet for low mood
            vec3 midValenceColor = vec3(0.15, 0.1, 0.2);    // Purple for neutral
            vec3 highValenceColor = vec3(0.3, 0.2, 0.05);   // Warm peach/gold for high mood
            
            vec3 baseColor;
            if (valence < 0.5) {
              baseColor = mix(lowValenceColor, midValenceColor, valence * 2.0);
            } else {
              baseColor = mix(midValenceColor, highValenceColor, (valence - 0.5) * 2.0);
            }
            
            // Section-based color variations
            vec3 sectionColorShift = vec3(
              sin(sectionKey * 6.28) * 0.1,
              cos(sectionKey * 6.28) * 0.1,
              sin(sectionKey * 3.14) * 0.1
            );
            baseColor += sectionColorShift * sectionMode;
            
            // Energy affects brightness and saturation (PRD requirement)
            float brightness = 0.2 + energy * 0.5;
            float saturation = 0.8 + energy * 0.2;
            vec3 energizedColor = baseColor * brightness * saturation;
            
            // Section transition effect
            float transitionEffect = sectionTransition * sin(length(uv) * 10.0 - time * 5.0) * 0.1;
            energizedColor += transitionEffect;
            
            // Subtle movement when playing
            float wave = sin(length(uv) * 3.0 - time * 0.3) * 0.05 * isPlaying;
            energizedColor += wave;
            
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
}

const MusicalKasinaOrb: React.FC<MusicalKasinaOrbProps> = ({
  isBreathMode,
  isPlaying,
  currentTrack,
  audioFeatures,
  audioAnalysis
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

  // Beat detection and section change monitoring
  useEffect(() => {
    if (!isPlaying) return;

    if (audioAnalysis && audioAnalysis.beats && audioAnalysis.beats.length > 0) {
      // Real Spotify beat detection with section monitoring
      const detectBeats = () => {
        const currentTime = currentPositionRef.current;
        
        // Beat detection
        const currentBeat = audioAnalysis.beats.find((beat: any) => 
          Math.abs(beat.start - currentTime) < 0.1 && 
          beat.start > lastBeatTimeRef.current
        );
        
        if (currentBeat) {
          setBeatTrigger(prev => prev + 1);
          lastBeatTimeRef.current = currentBeat.start;
        }
        
        // Section change detection
        if (audioAnalysis.sections) {
          const currentSectionData = audioAnalysis.sections.find((section: any) =>
            currentTime >= section.start && currentTime < (section.start + section.duration)
          );
          
          if (currentSectionData && currentSectionData !== lastSectionRef.current) {
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
          />
        </group>
      </Canvas>
    </div>
  );
};

export default MusicalKasinaOrb;