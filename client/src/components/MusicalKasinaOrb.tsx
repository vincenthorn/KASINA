import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';

interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  volume: number;
  dominantFrequency: number;
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
}

interface MusicalKasinaOrbProps {
  audioFeatures?: {
    energy: number;
    valence: number;
    tempo: number;
    key: number;
    mode: number;
    danceability: number;
  } | null;
  getAnalysisData?: () => AudioAnalysisData | null;
  isPlaying?: boolean;
  currentTime?: number;
  useBreathMode?: boolean;
}

// Musical Kasina Orb Shader Material
const MusicalOrbMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.6, 0.3, 0.9),
    intensity: 1.0,
    breathScale: 1.0,
    volume: 0.0,
    bassEnergy: 0.0,
    midEnergy: 0.0,
    trebleEnergy: 0.0,
    dominantFreq: 0.0,
    musicEnergy: 0.5,
    musicValence: 0.5,
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;
    uniform float breathScale;
    uniform float volume;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      
      // Apply breath scaling and volume-based scaling
      float dynamicScale = breathScale * (1.0 + volume * 0.3);
      vec3 scaledPosition = position * dynamicScale;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    uniform float intensity;
    uniform float volume;
    uniform float bassEnergy;
    uniform float midEnergy;
    uniform float trebleEnergy;
    uniform float dominantFreq;
    uniform float musicEnergy;
    uniform float musicValence;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // HSV to RGB conversion
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() {
      float d = length(vPosition);
      vec3 normal = normalize(vNormal);
      
      // Base color influenced by dominant frequency
      float hue = mod(dominantFreq / 1000.0, 1.0); // Map frequency to hue
      
      // Valence affects saturation and brightness
      float saturation = 0.7 + musicValence * 0.3;
      float brightness = 0.6 + musicEnergy * 0.4;
      
      // Create base color from musical properties
      vec3 baseColor = hsv2rgb(vec3(hue, saturation, brightness));
      
      // Mix with original color for stability
      baseColor = mix(color, baseColor, 0.6);
      
      // Frequency band visualization
      float bassRing = smoothstep(0.8, 1.0, d) * bassEnergy;
      float midRing = smoothstep(0.5, 0.7, d) * smoothstep(0.9, 0.7, d) * midEnergy;
      float trebleCore = smoothstep(0.0, 0.4, d) * smoothstep(0.6, 0.4, d) * trebleEnergy;
      
      // Add frequency band colors
      vec3 finalColor = baseColor;
      finalColor += vec3(1.0, 0.2, 0.2) * bassRing * 0.5; // Red for bass
      finalColor += vec3(0.2, 1.0, 0.2) * midRing * 0.5;  // Green for mids
      finalColor += vec3(0.2, 0.2, 1.0) * trebleCore * 0.5; // Blue for treble
      
      // Volume-based glow
      float glow = 1.0 - smoothstep(0.0, 1.5, d);
      finalColor += glow * volume * 0.3;
      
      // Pulsing effect based on overall volume
      float pulse = 1.0 + sin(time * 10.0) * volume * 0.2;
      finalColor *= pulse;
      
      // Inner energy glow
      float innerGlow = 1.0 - smoothstep(0.0, 0.8, d);
      finalColor += innerGlow * musicEnergy * 0.4;
      
      gl_FragColor = vec4(finalColor * intensity, 1.0);
    }
  `
);

extend({ MusicalOrbMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      musicalOrbMaterial: any;
    }
  }
}

// Background component
const MusicBackground: React.FC<{
  audioFeatures: any;
  analysisData: AudioAnalysisData | null;
}> = ({ audioFeatures, analysisData }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const material = meshRef.current.material as any;
    if (material.uniforms) {
      material.uniforms.time.value = state.clock.elapsedTime;
      
      if (analysisData) {
        material.uniforms.volume.value = analysisData.volume;
        material.uniforms.energy.value = analysisData.bassEnergy + analysisData.midEnergy + analysisData.trebleEnergy;
      }
      
      if (audioFeatures) {
        material.uniforms.valence.value = audioFeatures.valence;
      }
    }
  });

  return (
    <mesh ref={meshRef} scale={[20, 20, 1]} position={[0, 0, -10]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        uniforms={{
          time: { value: 0 },
          volume: { value: 0 },
          energy: { value: 0 },
          valence: { value: 0.5 }
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
          uniform float volume;
          uniform float energy;
          uniform float valence;
          varying vec2 vUv;
          
          void main() {
            vec2 center = vec2(0.5);
            float dist = distance(vUv, center);
            
            // Valence-based color palette
            vec3 lowValence = vec3(0.2, 0.1, 0.4);  // Dark blue
            vec3 midValence = vec3(0.4, 0.2, 0.6);  // Purple
            vec3 highValence = vec3(0.6, 0.4, 0.2); // Warm orange
            
            vec3 baseColor;
            if (valence < 0.3) {
              baseColor = lowValence;
            } else if (valence < 0.7) {
              baseColor = mix(lowValence, midValence, (valence - 0.3) / 0.4);
            } else {
              baseColor = mix(midValence, highValence, (valence - 0.7) / 0.3);
            }
            
            // Energy-based intensity
            float intensity = 0.3 + energy * 0.7;
            
            // Volume-based movement
            float movement = sin(dist * 10.0 - time * 2.0) * volume * 0.1;
            
            // Radial gradient
            float gradient = 1.0 - smoothstep(0.0, 1.0, dist);
            
            vec3 finalColor = baseColor * intensity * gradient;
            finalColor += movement;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  );
};

// Beat ripple effect
const BeatRipple: React.FC<{
  volume: number;
  bassEnergy: number;
}> = ({ volume, bassEnergy }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [ripples, setRipples] = useState<Array<{ id: number; startTime: number; intensity: number }>>([]);
  const lastBeatRef = useRef(0);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Detect beats based on bass energy
    if (bassEnergy > 0.3 && time - lastBeatRef.current > 0.2) {
      setRipples(prev => [
        ...prev.slice(-2), // Keep only last 3 ripples
        { id: Date.now(), startTime: time, intensity: bassEnergy }
      ]);
      lastBeatRef.current = time;
    }
    
    // Remove old ripples
    setRipples(prev => prev.filter(ripple => time - ripple.startTime < 2));
    
    if (meshRef.current) {
      const material = meshRef.current.material as any;
      if (material.uniforms) {
        material.uniforms.time.value = time;
        material.uniforms.ripples.value = ripples.map(ripple => [
          time - ripple.startTime,
          ripple.intensity,
          0,
          0
        ]).flat();
        material.uniforms.rippleCount.value = ripples.length;
      }
    }
  });

  return (
    <mesh ref={meshRef} scale={[10, 10, 1]} position={[0, 0, -1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        transparent
        uniforms={{
          time: { value: 0 },
          ripples: { value: new Array(12).fill(0) }, // Max 3 ripples * 4 components
          rippleCount: { value: 0 }
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
          uniform float ripples[12];
          uniform int rippleCount;
          varying vec2 vUv;
          
          void main() {
            vec2 center = vec2(0.5);
            float dist = distance(vUv, center);
            
            vec3 color = vec3(0.0);
            float alpha = 0.0;
            
            for (int i = 0; i < 3; i++) {
              if (i >= rippleCount) break;
              
              float rippleTime = ripples[i * 4];
              float intensity = ripples[i * 4 + 1];
              
              float rippleRadius = rippleTime * 0.5;
              float rippleWidth = 0.05;
              
              float rippleAlpha = smoothstep(rippleRadius - rippleWidth, rippleRadius, dist) * 
                                 smoothstep(rippleRadius + rippleWidth, rippleRadius, dist) *
                                 (1.0 - rippleTime / 2.0) * intensity;
              
              color += vec3(0.8, 0.4, 1.0) * rippleAlpha;
              alpha += rippleAlpha;
            }
            
            gl_FragColor = vec4(color, min(alpha, 1.0));
          }
        `}
      />
    </mesh>
  );
};

// Main orb component
const MusicOrb: React.FC<{
  breathAmplitude: number;
  audioFeatures: any;
  analysisData: AudioAnalysisData | null;
  useBreathMode: boolean;
}> = ({ breathAmplitude, audioFeatures, analysisData, useBreathMode }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const material = meshRef.current.material as any;
    if (material.uniforms) {
      material.uniforms.time.value = state.clock.elapsedTime;
      
      // Breath scaling
      if (useBreathMode) {
        material.uniforms.breathScale.value = 0.8 + breathAmplitude * 0.4;
      } else {
        material.uniforms.breathScale.value = 1.0;
      }
      
      // Audio analysis data
      if (analysisData) {
        material.uniforms.volume.value = analysisData.volume;
        material.uniforms.bassEnergy.value = analysisData.bassEnergy;
        material.uniforms.midEnergy.value = analysisData.midEnergy;
        material.uniforms.trebleEnergy.value = analysisData.trebleEnergy;
        material.uniforms.dominantFreq.value = analysisData.dominantFrequency;
      }
      
      // Audio features
      if (audioFeatures) {
        material.uniforms.musicEnergy.value = audioFeatures.energy;
        material.uniforms.musicValence.value = audioFeatures.valence;
        
        // Musical key-based color
        const keyColors = [
          [1.0, 0.2, 0.2], // C - Red
          [1.0, 0.5, 0.2], // C# - Orange
          [1.0, 1.0, 0.2], // D - Yellow
          [0.5, 1.0, 0.2], // D# - Yellow-green
          [0.2, 1.0, 0.2], // E - Green
          [0.2, 1.0, 0.5], // F - Green-cyan
          [0.2, 1.0, 1.0], // F# - Cyan
          [0.2, 0.5, 1.0], // G - Light blue
          [0.2, 0.2, 1.0], // G# - Blue
          [0.5, 0.2, 1.0], // A - Blue-purple
          [1.0, 0.2, 1.0], // A# - Purple
          [1.0, 0.2, 0.5]  // B - Pink
        ];
        
        const keyColor = keyColors[audioFeatures.key % 12];
        material.uniforms.color.value.setRGB(keyColor[0], keyColor[1], keyColor[2]);
        
        // Mode affects brightness (major = brighter, minor = darker)
        material.uniforms.intensity.value = audioFeatures.mode === 1 ? 1.2 : 0.8;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <primitive object={new MusicalOrbMaterial()} attach="material" />
    </mesh>
  );
};

const MusicalKasinaOrb: React.FC<MusicalKasinaOrbProps> = ({
  audioFeatures = null,
  getAnalysisData,
  isPlaying = false,
  currentTime = 0,
  useBreathMode = false
}) => {
  const [breathAmplitude, setBreathAmplitude] = useState(0.5);
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const [orbScale, setOrbScale] = useState(1.0);

  // Breath detection hooks
  const vernierBreath = useVernierBreathOfficial();

  // Use Vernier breath data when in breath mode
  useEffect(() => {
    if (useBreathMode && vernierBreath.isConnected) {
      setBreathAmplitude(vernierBreath.breathAmplitude);
    } else if (!useBreathMode) {
      setBreathAmplitude(0.5);
    }
  }, [useBreathMode, vernierBreath.breathAmplitude, vernierBreath.isConnected]);

  // Real-time audio analysis
  useEffect(() => {
    if (!isPlaying || !getAnalysisData) return;

    const updateAnalysis = () => {
      const data = getAnalysisData();
      setAnalysisData(data);
    };

    const interval = setInterval(updateAnalysis, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isPlaying, getAnalysisData]);

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
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        
        {/* Dynamic background */}
        <MusicBackground 
          audioFeatures={audioFeatures} 
          analysisData={analysisData}
        />
        
        {/* Beat ripples */}
        {analysisData && (
          <BeatRipple 
            volume={analysisData.volume}
            bassEnergy={analysisData.bassEnergy}
          />
        )}
        
        {/* Main orb */}
        <group scale={[orbScale, orbScale, orbScale]}>
          <MusicOrb 
            breathAmplitude={breathAmplitude}
            audioFeatures={audioFeatures}
            analysisData={analysisData}
            useBreathMode={useBreathMode}
          />
        </group>
      </Canvas>
    </div>
  );
};

export default MusicalKasinaOrb;