import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useKasina } from '../lib/stores/useKasina';
import { useColor } from '../lib/contexts/ColorContext';
import { KASINA_TYPES, KASINA_COLORS, KASINA_NAMES, KASINA_EMOJIS, KASINA_SERIES } from '../lib/constants';
import KasinaRenderer, { getKasinaBackgroundColor } from './KasinaRenderer';
import KasinaSelectionInterface from './KasinaSelectionInterface';
import useWakeLock from '../lib/useWakeLock';
import * as THREE from 'three';

// Text kasina components
import WhiteAKasina from './WhiteAKasina';
import WhiteAThigle from './WhiteAThigle';
import OmKasina from './OmKasina';
import AhKasina from './AhKasina';
import HumKasina from './HumKasina';
import RainbowKasina from './RainbowKasina';

// Shader materials for elemental kasinas (copied from BreathKasinaOrb.tsx)
const waterShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#0065b3") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      vec3 pos = position;
      float deformAmount = 0.025;
      pos += normal * sin(position.x * 2.0 + position.y * 3.0 + time * 0.7) * deformAmount;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }
    
    float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      
      float n = p.x + p.y * 57.0 + p.z * 113.0;
      return mix(
        mix(
          mix(hash(n), hash(n + 1.0), f.x),
          mix(hash(n + 57.0), hash(n + 58.0), f.x),
          f.y),
        mix(
          mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x),
          f.y),
        f.z);
    }
    
    float waterFlow(vec3 p, float t) {
      float radius = length(p);
      float theta = acos(p.z / radius);
      float phi = atan(p.y, p.x);
      
      float flow = 0.0;
      for (float i = 1.0; i <= 4.0; i++) {
        float speed = 0.4 - 0.05 * i;
        float scale = pow(1.8, i - 1.0);
        float intensity = pow(0.7, i);
        
        vec3 flowCoord = vec3(
          phi * 2.5 * scale + t * speed * sin(theta),
          theta * 2.5 * scale + t * speed * 0.5,
          radius * scale + t * speed
        );
        
        flow += noise(flowCoord) * intensity;
      }
      
      return flow * 0.6;
    }
    
    void main() {
      float flowValue = waterFlow(vPosition, time);
      
      vec3 deepOceanBlue = vec3(0.0, 0.2, 0.5);
      vec3 midnightBlue = vec3(0.05, 0.25, 0.6);
      vec3 azureBlue = vec3(0.1, 0.4, 0.75);
      vec3 caribbeanBlue = vec3(0.0, 0.5, 0.8);
      vec3 tropicalBlue = vec3(0.2, 0.65, 0.9);
      
      vec3 p = normalize(vPosition);
      float waves = 0.0;
      waves += sin(p.x * 8.0 + p.y * 4.0 + time * 0.8) * 0.08;
      waves += sin(p.y * 7.0 - p.z * 5.0 + time * 0.6) * 0.06;
      waves += sin(p.z * 6.0 + p.x * 3.0 + time * 0.4) * 0.04;
      
      flowValue += waves;
      
      vec3 waterColor;
      if (flowValue < 0.25) {
        float t = flowValue / 0.25;
        waterColor = mix(deepOceanBlue, midnightBlue, t);
      } else if (flowValue < 0.5) {
        float t = (flowValue - 0.25) / 0.25;
        waterColor = mix(midnightBlue, azureBlue, t);
      } else if (flowValue < 0.75) {
        float t = (flowValue - 0.5) / 0.25;
        waterColor = mix(azureBlue, caribbeanBlue, t);
      } else {
        float t = (flowValue - 0.75) / 0.25;
        waterColor = mix(caribbeanBlue, tropicalBlue, t);
      }
      
      float fresnel = pow(1.0 - max(0.0, dot(normalize(vPosition), vec3(0.0, 0.0, 1.0))), 2.0);
      float ripples = sin(length(p) * 40.0 - time * 1.0) * 0.01;
      ripples += sin(p.x * 15.0 + p.y * 15.0 + time * 0.8) * sin(p.y * 10.0 + p.z * 10.0 + time * 1.2) * 0.025;
      
      float glow = pow(1.0 - length(vPosition) * 0.5, 2.0) * 0.15;
      float highlight = fresnel * 0.15;
      
      vec3 finalColor = waterColor + ripples + glow + highlight;
      gl_FragColor = vec4(finalColor, opacity * 0.9);
    }
  `
};

const fireShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#ff6600") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    
    void main() {
      vec3 nPos = normalize(vPosition);
      
      vec3 emberColor = vec3(0.6, 0.05, 0.0);
      vec3 fireRed = vec3(1.0, 0.2, 0.0);
      vec3 fireOrange = vec3(1.0, 0.4, 0.0);
      vec3 fireYellow = vec3(1.0, 0.7, 0.1);
      vec3 hotYellow = vec3(1.0, 0.9, 0.3);
      
      float height = nPos.y * 0.5 + 0.5;
      float distFromCenter = length(vec2(nPos.x, nPos.z));
      float baseShape = 1.0 - smoothstep(0.0, 0.8, distFromCenter);
      
      float flames = 0.0;
      vec2 largeFlameCoord = vec2(nPos.x * 2.0 + sin(time * 0.7) * 0.2, nPos.y * 2.0 + time * 0.8);
      flames += fbm(largeFlameCoord) * 0.6;
      
      vec2 medFlameCoord = vec2(nPos.x * 4.0 + sin(time * 1.2 + nPos.z) * 0.3, nPos.y * 3.0 + time * 1.5);
      flames += fbm(medFlameCoord) * 0.3;
      
      flames *= smoothstep(-0.2, 0.8, nPos.y);
      
      float flicker = (noise(vec2(time * 1.5, 0.0)) * 0.5 + 0.5) * (noise(vec2(time * 3.0, 0.5)) * 0.3 + 0.7);
      float fireIntensity = clamp((baseShape * 0.6 + flames * 0.8) * flicker, 0.0, 1.0);
      
      vec3 fireColor;
      if (fireIntensity > 0.6) {
        fireColor = mix(fireOrange, fireYellow, (fireIntensity - 0.6) * 2.5);
      } else if (fireIntensity > 0.3) {
        fireColor = mix(fireRed, fireOrange, (fireIntensity - 0.3) * 3.33);
      } else {
        fireColor = mix(emberColor, fireRed, fireIntensity * 3.33);
      }
      
      float verticalGradient = smoothstep(-1.0, 1.0, nPos.y);
      fireColor *= mix(0.7, 1.3, verticalGradient);
      fireColor = pow(fireColor, vec3(0.6));
      
      gl_FragColor = vec4(fireColor, max(fireIntensity * 0.95, 0.8));
    }
  `
};

const airShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#d3f0ff") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    void main() {
      vec2 p = -1.0 + 2.0 * vUv;
      float a = time * 0.05;
      float s = sin(a * 2.0);
      float c = cos(a * 2.0);
      
      float d = pow(1.0 - length(p), 2.0);
      vec2 q = vec2(p.x * c - p.y * s, p.x * s + p.y * c) * d;
      
      float f = 0.0;
      for(float i = 1.0; i < 6.0; i++) {
        float t = time * (0.1 + 0.05 * i);
        f += sin(q.x * i + t) * sin(q.y * i + t);
      }
      
      vec3 finalColor = color + 0.15 * sin(f);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const earthShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#CC6633") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float worleyNoise(vec2 uv, float scale) {
      vec2 id = floor(uv * scale);
      vec2 lv = fract(uv * scale);
      
      float minDist = 1.0;
      
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 pos = offset + 0.5 + 0.3 * vec2(
            sin(rand(id + offset) * 6.28),
            cos(rand(id + offset + vec2(1.0, 2.0)) * 6.28)
          );
          float dist = length(pos - lv);
          minDist = min(minDist, dist);
        }
      }
      
      return minDist;
    }
    
    void main() {
      vec3 baseColor = color;
      
      float clayTexture = 0.0;
      float large = worleyNoise(vUv * 2.0, 4.0);
      float medium = worleyNoise(vUv * 4.0, 8.0);
      float small = worleyNoise(vUv * 8.0, 16.0);
      
      clayTexture = large * 0.6 + medium * 0.3 + small * 0.1;
      clayTexture += sin(time * 0.05) * 0.02;
      
      float d = length(vUv - vec2(0.5, 0.5));
      float lightIntensity = 1.0 - smoothstep(0.0, 0.8, d);
      float normalShading = 0.5 + 0.5 * dot(vNormal, vec3(0.5, 0.5, 0.5));
      
      vec3 darkClay = baseColor * 0.7;
      vec3 lightClay = baseColor * 1.3;
      vec3 clayColor = mix(darkClay, lightClay, clayTexture);
      
      clayColor *= 0.7 + 0.3 * normalShading + 0.2 * lightIntensity;
      clayColor *= 0.97 + rand(vUv * 100.0) * 0.05;
      
      gl_FragColor = vec4(clayColor, 1.0);
    }
  `
};

const spaceShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#000000") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      vec3 baseColor = color;
      
      float d = length(uv - vec2(0.5, 0.5));
      
      float edgeGlow = smoothstep(0.45, 0.5, d);
      vec3 edgeColor = vec3(0.16, 0.0, 0.33);
      
      float ripple = sin(d * 20.0 - time * 0.2) * 0.02;
      float intensity = smoothstep(0.0, 0.5, d + ripple);
      
      vec3 finalColor = mix(baseColor, edgeColor, intensity * edgeGlow);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const lightShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#fffaf0") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vec2 uv = vUv;
      float d = length(uv - vec2(0.5, 0.5));
      
      float brightness = 1.0 - smoothstep(0.45, 0.5, d);
      float pulse = 0.05 * sin(time * 1.5);
      
      vec3 lightDir = vec3(0.0, 0.0, 1.0);
      float lightFactor = max(0.85, dot(vNormal, lightDir));
      
      vec3 finalColor = color * (brightness + pulse + 0.25) * lightFactor;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

interface VisualKasinaOrbProps {}

export default function VisualKasinaOrb(props: VisualKasinaOrbProps) {
  const { selectedKasina, setSelectedKasina } = useKasina();
  const { currentColor } = useColor();
  
  // State for UI controls (copied from BreathKasinaOrb)
  const [meditationTime, setMeditationTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [sizeMultiplier, setSizeMultiplier] = useState(1.0);
  const [showKasinaSelection, setShowKasinaSelection] = useState(false);
  const [kasinaSelectionStep, setKasinaSelectionStep] = useState<'series' | 'kasina'>('series');
  const [selectedKasinaSeries, setSelectedKasinaSeries] = useState<string | null>(null);
  
  // Wake lock for preventing screen sleep
  useWakeLock();
  
  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Timer increment
  useEffect(() => {
    const timer = setInterval(() => {
      setMeditationTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const hideTimer = setTimeout(() => {
      if (Date.now() - lastActivityTime > 3000) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(hideTimer);
  }, [lastActivityTime]);

  // Handle mouse/touch activity
  const handleActivity = () => {
    setLastActivityTime(Date.now());
    setShowControls(true);
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const endMeditation = () => {
    // Navigate back or close
    window.history.back();
  };

  // Handle mouse wheel/trackpad scroll for size adjustment
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05; // Scroll down = smaller, scroll up = larger
      setSizeMultiplier(prev => {
        const newSize = Math.max(0.05, Math.min(5.0, prev + delta));
        return newSize;
      });
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  // Use unified background color function
  const getBackgroundColor = () => {
    return getKasinaBackgroundColor(selectedKasina);
  };

  // Handle series selection
  const handleSeriesSelection = (series: string) => {
    setSelectedKasinaSeries(series);
    setKasinaSelectionStep('kasina');
  };

  // Handle kasina selection
  const handleKasinaSelection = (kasina: string) => {
    setSelectedKasina(kasina);
    setShowKasinaSelection(false);
    setKasinaSelectionStep('series');
  };

  // Get kasinas for the selected series
  const getKasinasForSeries = (series: string) => {
    switch (series) {
      case 'COLOR':
        return KASINA_SERIES.COLOR;
      case 'ELEMENTAL':
        return KASINA_SERIES.ELEMENTAL;
      case 'VAJRAYANA':
        return KASINA_SERIES.VAJRAYANA;
      default:
        return [];
    }
  };

  // Get color for selected kasina - use the official KASINA_COLORS
  const getKasinaColor = (kasina: string) => {
    return KASINA_COLORS[kasina] || KASINA_COLORS[KASINA_TYPES.BLUE];
  };

  // Get additional styles for kasina
  const getKasinaStyles = (kasina: string) => {
    if (kasina === KASINA_TYPES.RAINBOW_KASINA) {
      return {
        background: 'linear-gradient(45deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #9400D3)',
        backgroundSize: '200% 200%',
        animation: 'rainbow-rotate 3s ease-in-out infinite'
      };
    }
    return {};
  };

  // Visual kasina orb component with animated shaders for elemental kasinas
  const VisualKasinaOrbMesh = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const waterMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const fireMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const airMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const earthMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const spaceMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const lightMaterialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
      if (meshRef.current) {
        // Gentle rotation
        meshRef.current.rotation.y += 0.002;
        
        // Apply size multiplier
        const targetScale = sizeMultiplier;
        meshRef.current.scale.setScalar(targetScale);
      }
      
      // Handle text-based kasinas scaling (including Rainbow, Vajrayana, and White A kasinas)
      if (groupRef.current && (
        selectedKasina === KASINA_TYPES.RAINBOW_KASINA ||
        selectedKasina === KASINA_TYPES.WHITE_A_THIGLE ||
        selectedKasina === KASINA_TYPES.WHITE_A_KASINA ||
        selectedKasina === KASINA_TYPES.OM_KASINA ||
        selectedKasina === KASINA_TYPES.AH_KASINA ||
        selectedKasina === KASINA_TYPES.HUM_KASINA
      )) {
        // Apply size multiplier to the group with normalization factor
        // Text-based kasinas need a smaller scale factor to match elemental kasinas
        const normalizedScale = sizeMultiplier * 0.4; // Reduce scale to match sphere kasinas
        groupRef.current.scale.setScalar(normalizedScale);
      }

      // Update shader time uniforms for elemental kasinas
      const time = state.clock.getElapsedTime();
      
      if (waterMaterialRef.current) {
        waterMaterialRef.current.uniforms.time.value = time;
      }
      if (fireMaterialRef.current) {
        fireMaterialRef.current.uniforms.time.value = time;
      }
      if (airMaterialRef.current) {
        airMaterialRef.current.uniforms.time.value = time;
      }
      if (earthMaterialRef.current) {
        earthMaterialRef.current.uniforms.time.value = time;
      }
      if (spaceMaterialRef.current) {
        spaceMaterialRef.current.uniforms.time.value = time;
      }
      if (lightMaterialRef.current) {
        lightMaterialRef.current.uniforms.time.value = time;
      }
    });

    // Text-based kasinas
    if (selectedKasina === KASINA_TYPES.WHITE_A_THIGLE) {
      return (
        <group ref={groupRef}>
          <WhiteAThigle />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.WHITE_A_KASINA) {
      return (
        <group ref={groupRef}>
          <WhiteAKasina />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.OM_KASINA) {
      return (
        <group ref={groupRef}>
          <OmKasina />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.AH_KASINA) {
      return (
        <group ref={groupRef}>
          <AhKasina />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.HUM_KASINA) {
      return (
        <group ref={groupRef}>
          <HumKasina />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.RAINBOW_KASINA) {
      return (
        <group ref={groupRef}>
          <RainbowKasina />
        </group>
      );
    }

    // Elemental kasinas with animated shaders
    if (selectedKasina === KASINA_TYPES.WATER) {
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={waterMaterialRef}
            uniforms={waterShader.uniforms}
            vertexShader={waterShader.vertexShader}
            fragmentShader={waterShader.fragmentShader}
            transparent={true}
          />
        </mesh>
      );
    } else if (selectedKasina === KASINA_TYPES.FIRE) {
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={fireMaterialRef}
            uniforms={fireShader.uniforms}
            vertexShader={fireShader.vertexShader}
            fragmentShader={fireShader.fragmentShader}
            transparent={true}
          />
        </mesh>
      );
    } else if (selectedKasina === KASINA_TYPES.AIR) {
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={airMaterialRef}
            uniforms={airShader.uniforms}
            vertexShader={airShader.vertexShader}
            fragmentShader={airShader.fragmentShader}
            transparent={true}
          />
        </mesh>
      );
    } else if (selectedKasina === KASINA_TYPES.EARTH) {
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={earthMaterialRef}
            uniforms={earthShader.uniforms}
            vertexShader={earthShader.vertexShader}
            fragmentShader={earthShader.fragmentShader}
            transparent={true}
          />
        </mesh>
      );
    } else if (selectedKasina === KASINA_TYPES.SPACE) {
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={spaceMaterialRef}
            uniforms={spaceShader.uniforms}
            vertexShader={spaceShader.vertexShader}
            fragmentShader={spaceShader.fragmentShader}
            transparent={true}
          />
        </mesh>
      );
    } else if (selectedKasina === KASINA_TYPES.LIGHT) {
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={lightMaterialRef}
            uniforms={lightShader.uniforms}
            vertexShader={lightShader.vertexShader}
            fragmentShader={lightShader.fragmentShader}
            transparent={true}
          />
        </mesh>
      );
    }

    // For color and other kasinas, use simple sphere
    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color={KASINA_COLORS[selectedKasina]} />
      </mesh>
    );
  };

  return (
    <div 
      className="h-screen w-screen relative overflow-hidden"
      style={{ backgroundColor: getBackgroundColor() }}
      onMouseMove={handleActivity}
      onTouchStart={handleActivity}
      onClick={handleActivity}
    >
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <VisualKasinaOrbMesh />
      </Canvas>

      {/* Fullscreen button */}
      {showControls && (
        <div 
          className="absolute top-4 right-4 z-30 cursor-pointer"
          onClick={toggleFullscreen}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '12px',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            {isFullscreen ? (
              // Exit fullscreen icon
              <>
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </>
            ) : (
              // Enter fullscreen icon
              <>
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </>
            )}
          </svg>
        </div>
      )}

      {/* Timer and End button */}
      {showControls && (
        <div 
          className="absolute top-4 left-4 z-30 flex items-center space-x-3"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            transition: 'all 0.3s ease-out'
          }}
        >
          <div 
            style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            {formatTime(meditationTime)}
          </div>
          <button
            onClick={endMeditation}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            End
          </button>
        </div>
      )}

      {/* Change Kasina button at bottom */}
      {!showKasinaSelection && showControls && (
        <div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        >
          <button
            onClick={() => setShowKasinaSelection(true)}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }}
          >
            Change Kasina
          </button>
        </div>
      )}

      {/* Size control - top center */}
      {showControls && !showKasinaSelection && (
        <div 
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30"
          style={{
            padding: '16px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <span>Size:</span>
          <input
            type="range"
            min="0.05"
            max="5.0"
            step="0.01"
            value={sizeMultiplier}
            onChange={(e) => setSizeMultiplier(parseFloat(e.target.value))}
            style={{
              width: '120px',
              height: '4px',
              background: '#374151',
              borderRadius: '2px',
              outline: 'none',
              appearance: 'none'
            }}
          />
          <span>{Math.round(sizeMultiplier * 100)}%</span>
        </div>
      )}

      {/* Kasina Selection Overlay */}
      {showKasinaSelection && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <KasinaSelectionInterface
            showKasinaSelection={showKasinaSelection}
            kasinaSelectionStep={kasinaSelectionStep}
            selectedKasinaSeries={selectedKasinaSeries}
            onSeriesSelection={handleSeriesSelection}
            onKasinaSelection={handleKasinaSelection}
            onBackToSeries={() => setKasinaSelectionStep('series')}
            onCancel={() => setShowKasinaSelection(false)}
          />
        </div>
      )}
    </div>
  );
}