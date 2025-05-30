import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useKasina } from '../lib/stores/useKasina';
import { useColor } from '../lib/contexts/ColorContext';
import { useSessionLogger } from '../lib/stores/useSessionLogger';
import { sessionRecovery } from '../lib/sessionRecovery';
import { KASINA_TYPES, KASINA_COLORS, KASINA_NAMES, KASINA_EMOJIS, KASINA_SERIES } from '../lib/constants';
import KasinaRenderer, { getKasinaBackgroundColor } from './KasinaRenderer';
import KasinaSelectionInterface from './KasinaSelectionInterface';
import UnifiedSessionInterface from './UnifiedSessionInterface';
import useWakeLock from '../lib/useWakeLock';
import { useAutoHide } from '../lib/useAutoHide';
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
      // Use 3D position directly instead of spherical coordinates to avoid seams
      vec3 pos = normalize(p);
      
      float flow = 0.0;
      for (float i = 1.0; i <= 4.0; i++) {
        float speed = 0.4 - 0.05 * i;
        float scale = pow(1.8, i - 1.0);
        float intensity = pow(0.7, i);
        
        // Use seamless 3D coordinates instead of spherical
        vec3 flowCoord = pos * 3.0 * scale + vec3(
          t * speed * 0.3,
          t * speed * 0.5,
          t * speed * 0.7
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
      // Use seamless 3D coordinates for ripples to avoid seams
      float ripples = sin(length(p) * 30.0 - time * 1.0) * 0.008;
      ripples += sin(p.x * 12.0 + p.y * 12.0 + p.z * 8.0 + time * 0.8) * 0.015;
      ripples += sin(p.y * 8.0 + p.z * 8.0 + p.x * 6.0 + time * 1.2) * 0.012;
      
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
    
    void main() {
      vec3 pos = vPosition;
      
      // Fire base color
      vec3 fireColor = vec3(1.0, 0.4, 0.0);
      
      // Create flame patterns similar to water but with different frequencies
      float flame1 = sin(pos.x * 10.0 + time * 4.0) * 0.4;
      float flame2 = sin(pos.y * 8.0 + time * 3.5) * 0.3;
      float flame3 = sin(pos.z * 12.0 + time * 5.0) * 0.2;
      
      vec3 flames = vec3(flame1 + 0.3, flame2 + 0.2, flame3) * 0.6;
      
      // Glow effect
      float glow = sin(time * 2.0) * 0.1 + 0.9;
      
      // Highlight
      vec3 highlight = vec3(0.3, 0.1, 0.0) * sin(time * 6.0 + pos.x * 5.0) * 0.2;
      
      vec3 finalColor = fireColor + flames + glow + highlight;
      gl_FragColor = vec4(finalColor, opacity * 0.9);
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
  const navigate = useNavigate();
  const { logSession } = useSessionLogger();
  const { enableWakeLock, disableWakeLock } = useWakeLock();
  
  // State for UI controls (copied from BreathKasinaOrb)
  const [meditationTime, setMeditationTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sizeMultiplier, setSizeMultiplier] = useState(0.3); // Start at 30%
  
  // Use universal auto-hide functionality
  const { showCursor, showControls } = useAutoHide({ 
    hideDelay: 3000, 
    hideCursor: true, 
    hideControls: true 
  });
  const [showKasinaSelection, setShowKasinaSelection] = useState(false);
  const [kasinaSelectionStep, setKasinaSelectionStep] = useState<'series' | 'kasina'>('series');
  const [selectedKasinaSeries, setSelectedKasinaSeries] = useState<string | null>(null);
  
  // Session tracking refs
  const meditationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const meditationStartRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionInitializedRef = useRef<boolean>(false);
  
  // Kasina usage tracking
  const kasinaUsageRef = useRef<{ [kasina: string]: number }>({});
  const currentKasinaStartRef = useRef<number>(Date.now());
  
  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Track kasina usage when switching kasinas
  const trackKasinaUsage = (newKasina: string) => {
    const now = Date.now();
    const timeSpent = now - currentKasinaStartRef.current;
    
    // Add time to current kasina
    if (selectedKasina) {
      kasinaUsageRef.current[selectedKasina] = (kasinaUsageRef.current[selectedKasina] || 0) + timeSpent;
    }
    
    // Start tracking new kasina
    currentKasinaStartRef.current = now;
  };

  // Get the most used kasina for session logging
  const getMostUsedKasina = () => {
    // Add current kasina time before calculating
    const now = Date.now();
    const currentTimeSpent = now - currentKasinaStartRef.current;
    const usage = { ...kasinaUsageRef.current };
    if (selectedKasina) {
      usage[selectedKasina] = (usage[selectedKasina] || 0) + currentTimeSpent;
    }

    console.log(`📊 Kasina usage breakdown:`, usage);

    // Find kasina with most time
    let mostUsedKasina = selectedKasina;
    let maxTime = 0;
    
    for (const [kasina, time] of Object.entries(usage)) {
      console.log(`  ${kasina}: ${Math.round(time / 1000)}s`);
      if (time > maxTime) {
        maxTime = time;
        mostUsedKasina = kasina;
      }
    }
    
    console.log(`🎯 Most used kasina: ${mostUsedKasina} (${Math.round(maxTime / 1000)}s)`);
    return mostUsedKasina;
  };
  
  // Initialize meditation session
  useEffect(() => {
    // Only initialize once to prevent infinite loop
    if (sessionInitializedRef.current) return;
    
    const initializeSession = async () => {
      const now = Date.now();
      meditationStartRef.current = now;
      
      // Create session recovery entry
      sessionIdRef.current = sessionRecovery.startSession(selectedKasina as any);
      
      console.log('🧘 Visual kasina meditation session started');
      
      // Enable wake lock to prevent screen from sleeping
      enableWakeLock();
      console.log("🔒 Wake lock enabled - screen will stay awake during meditation");
      
      // Fullscreen is now triggered by user interaction in KasinaSelectionInterface
      
      // Mark as initialized
      sessionInitializedRef.current = true;
    };

    initializeSession();

    // Start meditation timer
    meditationIntervalRef.current = setInterval(() => {
      setMeditationTime(prev => prev + 1);
    }, 1000);

    // Cleanup function
    return () => {
      if (meditationIntervalRef.current) {
        clearInterval(meditationIntervalRef.current);
      }
      disableWakeLock();
    };
  }, []); // Empty dependency array to only run once
  


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

  const endMeditation = async () => {
    // Calculate duration in seconds and round down to nearest minute
    const durationInSeconds = meditationTime;
    const durationInMinutes = Math.floor(durationInSeconds / 60); // Round down to nearest minute
    
    // Only log if there was at least 1 minute of meditation
    if (durationInMinutes >= 1) {
      console.log(`🧘 Ending visual kasina session: ${durationInSeconds}s (${durationInMinutes} minutes)`);
      
      try {
        // Get the most used kasina for this session
        const mostUsedKasina = getMostUsedKasina();
        const kasinaName = `Visual Kasina`; // Just use the mode name
        const kasinaEmoji = KASINA_EMOJIS[mostUsedKasina];
        
        // Get final kasina usage data
        const finalUsage = { ...kasinaUsageRef.current };
        const currentTimeSpent = Date.now() - currentKasinaStartRef.current;
        if (selectedKasina) {
          finalUsage[selectedKasina] = (finalUsage[selectedKasina] || 0) + currentTimeSpent;
        }

        await logSession({
          kasinaType: mostUsedKasina as any, // Use the most-used kasina as the type
          duration: durationInMinutes * 60, // Convert back to seconds for logging
          showToast: true,
          kasinaBreakdown: finalUsage,
          customSessionName: `Visual Kasina`
        });
        console.log(`✅ ${kasinaName} session logged: ${durationInMinutes} minute(s) with ${kasinaEmoji}`);
        
      } catch (error) {
        console.error('Failed to log meditation session:', error);
      }
    } else {
      console.log(`⏱️ Session too short (${durationInSeconds}s) - not logging`);
    }

    // Complete session recovery tracking (after our main logging to avoid duplicates)
    if (sessionIdRef.current) {
      sessionRecovery.clearSession(); // Just clear it since we already logged above
      console.log(`🛡️ Session recovery cleared`);
    }
    
    // Reset all meditation state
    setMeditationTime(0);
    meditationStartRef.current = null;
    sessionIdRef.current = null;
    if (meditationIntervalRef.current) {
      clearInterval(meditationIntervalRef.current);
      meditationIntervalRef.current = null;
    }
    
    // Release wake lock when meditation ends
    disableWakeLock();
    console.log("🔓 Wake lock released - screen can sleep normally again");
    
    // Auto-exit fullscreen when session ends
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        console.log("📺 Auto-exited fullscreen after meditation session");
      }
    } catch (error) {
      console.log("📺 Fullscreen auto-exit failed:", error);
    }
    
    // Always navigate to Reflection page when ending session
    navigate('/reflection');
  };

  // Handle mouse wheel/trackpad scroll for size adjustment
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.025 : 0.025; // Scroll down = smaller, scroll up = larger
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
    // Track usage before switching
    trackKasinaUsage(kasina);
    
    setSelectedKasina(kasina);
    setShowKasinaSelection(false);
    setKasinaSelectionStep('series');
    console.log(`🎨 Selected kasina: ${KASINA_NAMES[kasina]} (${kasina})`);
    console.log(`📈 Current kasina usage tracking:`, kasinaUsageRef.current);
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
        const time = state.clock.getElapsedTime();
        
        // Different rotation behaviors for different kasinas
        if (selectedKasina === KASINA_TYPES.WATER) {
          // Water kasina gets flowing motion instead of uniform rotation
          meshRef.current.rotation.y = Math.sin(time * 0.3) * 0.1 + time * 0.05;
          meshRef.current.rotation.x = Math.cos(time * 0.2) * 0.05;
        } else if (selectedKasina === KASINA_TYPES.SPACE || selectedKasina === KASINA_TYPES.LIGHT) {
          // Space and Light kasinas have no rotation to avoid shadow artifacts
          meshRef.current.rotation.y = 0;
          meshRef.current.rotation.x = 0;
          meshRef.current.rotation.z = 0;
        } else {
          // Other elemental kasinas get smooth, continuous rotation
          meshRef.current.rotation.y = time * 0.15; // Slightly slower rotation
        }
        
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
        const normalizedScale = sizeMultiplier * 1.4; // Increase scale to better match sphere kasinas
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
      className={`h-screen w-screen relative overflow-hidden ${!showCursor ? 'cursor-none' : ''}`}
      style={{ backgroundColor: getBackgroundColor() }}
    >
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <VisualKasinaOrbMesh />
      </Canvas>

      {/* Unified Session Interface */}
      {!showKasinaSelection && (
        <UnifiedSessionInterface
          meditationTime={meditationTime}
          onEndSession={endMeditation}
          sizeMultiplier={sizeMultiplier}
          onSizeChange={(size) => setSizeMultiplier(size)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onChangeKasina={() => setShowKasinaSelection(true)}
          showControls={showControls}
          mode="visual"
        />
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