import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { useMicrophoneBreath } from '../lib/useMicrophoneBreath';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';

// Musical Kasina Orb Shader Material
const MusicalOrbMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.5, 0.3, 1.0),
    intensity: 1.0,
    breathScale: 1.0,
    musicEnergy: 0.5,
    musicValence: 0.5,
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
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      // Calculate distance from center for spherical gradient
      float d = length(vPosition);
      
      // Music-influenced color mixing
      vec3 baseColor = color;
      vec3 energyColor = mix(baseColor, vec3(1.0, 0.8, 0.2), musicEnergy * 0.3);
      vec3 finalColor = mix(energyColor, vec3(1.0, 0.6, 0.8), musicValence * 0.2);
      
      // Gentle spherical lighting
      float brightness = 1.0 - smoothstep(0.4, 0.5, d);
      vec3 lightDir = vec3(0.0, 0.0, 1.0);
      float lightFactor = max(0.8, dot(vNormal, lightDir));
      
      vec3 result = finalColor * brightness * lightFactor * intensity;
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

// Dynamic background component
const MusicBackground = ({ audioFeatures, isPlaying }: { audioFeatures: any; isPlaying: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (materialRef.current && audioFeatures) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.energy.value = audioFeatures.energy || 0.5;
      materialRef.current.uniforms.valence.value = audioFeatures.valence || 0.5;
      materialRef.current.uniforms.isPlaying.value = isPlaying ? 1.0 : 0.0;
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
          isPlaying: { value: 0.0 }
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
          varying vec2 vUv;
          
          void main() {
            vec2 uv = vUv - 0.5;
            
            // Base color influenced by valence
            vec3 lowValenceColor = vec3(0.1, 0.1, 0.3);  // Blue/violet
            vec3 highValenceColor = vec3(0.4, 0.3, 0.1); // Peach/gold
            vec3 baseColor = mix(lowValenceColor, highValenceColor, valence);
            
            // Energy influences saturation and brightness
            float brightness = 0.3 + energy * 0.4;
            vec3 finalColor = baseColor * brightness;
            
            // Subtle movement when playing
            float wave = sin(length(uv) * 3.0 - time * 0.5) * 0.1 * isPlaying;
            finalColor += wave;
            
            gl_FragColor = vec4(finalColor, 1.0);
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
  const lastBeatTimeRef = useRef(0);
  const currentPositionRef = useRef(0);

  // Breath detection hooks
  const microphoneBreath = useMicrophoneBreath();
  const vernierBreath = useVernierBreathOfficial();

  // Use appropriate breath data
  useEffect(() => {
    if (isBreathMode) {
      if (vernierBreath.isConnected) {
        setBreathAmplitude(vernierBreath.breathAmplitude);
      } else if (microphoneBreath.isListening) {
        setBreathAmplitude(microphoneBreath.breathAmplitude);
      }
    }
  }, [isBreathMode, vernierBreath.breathAmplitude, vernierBreath.isConnected, microphoneBreath.breathAmplitude, microphoneBreath.isListening]);

  // Beat detection from Spotify audio analysis
  useEffect(() => {
    if (!audioAnalysis || !isPlaying) return;

    const detectBeats = () => {
      // Get current playback position (would need to be passed from Spotify player)
      const currentTime = currentPositionRef.current;
      
      if (audioAnalysis.beats) {
        const currentBeat = audioAnalysis.beats.find((beat: any) => 
          Math.abs(beat.start - currentTime) < 0.1 && 
          beat.start > lastBeatTimeRef.current
        );
        
        if (currentBeat) {
          setBeatTrigger(prev => prev + 1);
          lastBeatTimeRef.current = currentBeat.start;
        }
      }
    };

    const interval = setInterval(detectBeats, 50); // Check every 50ms
    return () => clearInterval(interval);
  }, [audioAnalysis, isPlaying]);

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
        <MusicBackground audioFeatures={audioFeatures} isPlaying={isPlaying} />
        
        {/* Beat ripples */}
        <BeatRipple trigger={beatTrigger} audioFeatures={audioFeatures} />
        
        {/* Main orb */}
        <MusicOrb 
          isBreathMode={isBreathMode}
          breathAmplitude={breathAmplitude}
          audioFeatures={audioFeatures}
          beatTrigger={beatTrigger}
        />
      </Canvas>
    </div>
  );
};

export default MusicalKasinaOrb;