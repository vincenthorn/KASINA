import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import '../styles/kasina-animations.css';
import '../styles/breath-kasina.css';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';
import { useSessionLogger } from '../lib/stores/useSessionLogger';
import { useKasina } from '../lib/stores/useKasina';
import { sessionRecovery } from '../lib/sessionRecovery';
import useWakeLock from '../lib/useWakeLock';
import { KASINA_TYPES, KASINA_NAMES, KASINA_EMOJIS, KASINA_SERIES, KASINA_COLORS, KASINA_BACKGROUNDS } from '../lib/constants';
import UnifiedSessionInterface from './UnifiedSessionInterface';
import KasinaSelectionInterface from './KasinaSelectionInterface';
import WhiteAKasina from './WhiteAKasina';
import WhiteAThigle from './WhiteAThigle';
import OmKasina from './OmKasina';
import AhKasina from './AhKasina';
import HumKasina from './HumKasina';
import RainbowKasina from './RainbowKasina';
import * as THREE from 'three';
import { getKasinaShader } from '../lib/shaders/kasinaShaders';
import { calculateKasinaScale, calculateBreathKasinaSize, logKasinaScaling, getKasinaConfig } from '../lib/kasinaConfig';

// Browser detection utility
function isChromeBasedBrowser(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  console.log('Browser detection - User Agent:', userAgent);
  
  // Check for Safari specifically (it contains 'safari' but not 'chrome')
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    console.log('Detected Safari browser - not Chrome-based');
    return false;
  }
  
  // Check for Firefox
  if (userAgent.includes('firefox')) {
    console.log('Detected Firefox browser - not Chrome-based');
    return false;
  }
  
  // Check for Chrome-based browsers
  const isChromeBased = (
    userAgent.includes('chrome') ||
    userAgent.includes('chromium') ||
    userAgent.includes('edge') ||
    userAgent.includes('brave') ||
    userAgent.includes('opera') ||
    userAgent.includes('vivaldi')
  );
  
  console.log('Browser detection result:', isChromeBased ? 'Chrome-based' : 'Not Chrome-based');
  return isChromeBased;
}

// Shader materials for the elemental kasinas (copied from main KasinaOrb component)
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
      gl_FragColor = vec4(finalColor, 0.7);
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
      
      // Center dark effect for black orb
      float d = length(uv - vec2(0.5, 0.5));
      
      // Subtle purple edge glow for the black orb
      float edgeGlow = smoothstep(0.45, 0.5, d);
      vec3 edgeColor = vec3(0.16, 0.0, 0.33); // Dark purple tint
      
      // Add very subtle ripple effect
      float ripple = sin(d * 20.0 - time * 0.2) * 0.02;
      float intensity = smoothstep(0.0, 0.5, d + ripple);
      
      // Mix with a subtle deep purple at the edges
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
      
      // Much more gentle falloff at edges, keeping most of the orb bright
      float brightness = 1.0 - smoothstep(0.45, 0.5, d);
      
      // Gentle pulsing effect
      float pulse = 0.05 * sin(time * 1.5);
      
      // Calculate lighting factor based on normal
      // This makes the light source always come from the viewer's direction
      vec3 lightDir = vec3(0.0, 0.0, 1.0); // Light from camera direction
      float lightFactor = max(0.85, dot(vNormal, lightDir)); // Minimum 85% brightness
      
      // Add extra brightness to the whole orb with lightFactor to eliminate dark side
      vec3 finalColor = color * (brightness + pulse + 0.25) * lightFactor;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

interface BreathKasinaOrbProps {
  breathAmplitude?: number;
  breathPhase?: 'inhale' | 'exhale' | 'pause';
  isListening?: boolean;
  useVernier?: boolean;
}

/**
 * A component that displays an orb that pulses with the user's breath
 * The orb size changes based on the breath amplitude
 */
const BreathKasinaOrb: React.FC<BreathKasinaOrbProps> = ({ 
  breathAmplitude = 0.5,
  breathPhase = 'pause',
  isListening = false,
  useVernier = false
}) => {
  // Use Vernier breathing data if enabled
  const vernierData = useVernierBreathOfficial();
  const { logSession } = useSessionLogger();
  const navigate = useNavigate();
  const { selectedKasina: globalSelectedKasina, setSelectedKasina: setGlobalSelectedKasina, customColor } = useKasina();
  const { enableWakeLock, disableWakeLock } = useWakeLock();
  
  // Log Vernier data for debugging
  console.log('🔵 BreathKasinaOrb - useVernier:', useVernier, 'vernierData:', {
    isConnected: vernierData.isConnected,
    breathAmplitude: vernierData.breathAmplitude,
    breathPhase: vernierData.breathPhase,
    currentForce: vernierData.currentForce,
    calibrationComplete: vernierData.calibrationComplete
  });
  
  // Determine which breathing data to use
  const activeBreathAmplitude = useVernier ? vernierData.breathAmplitude : breathAmplitude;
  const activeBreathPhase = useVernier ? vernierData.breathPhase : breathPhase;
  const activeIsListening = useVernier ? vernierData.isConnected : isListening;
  const activeBreathingRate = useVernier ? vernierData.breathingRate : 12; // Default to 12 BPM
  const orbRef = useRef<HTMLDivElement>(null);
  const [orbSize, setOrbSize] = useState(150);
  const [glowIntensity, setGlowIntensity] = useState(15);
  const [heldExhaleStart, setHeldExhaleStart] = useState<number | null>(null);
  const [sizeScale, setSizeScale] = useState(0.05); // Scale factor for min-max range (minimal default size)
  const [showCalibrationMessage, setShowCalibrationMessage] = useState(false);
  const [calibrationTimeRemaining, setCalibrationTimeRemaining] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meditationTime, setMeditationTime] = useState(0); // seconds
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const [showConnectionHelp, setShowConnectionHelp] = useState(false);
  const [showKasinaSelection, setShowKasinaSelection] = useState(true);
  const [selectedKasinaSeries, setSelectedKasinaSeries] = useState<string | null>('COLOR');
  const [selectedKasina, setSelectedKasina] = useState<string>(globalSelectedKasina || KASINA_TYPES.BLUE);
  const [kasinaSelectionStep, setKasinaSelectionStep] = useState<'series' | 'kasina'>('series');
  const [sizeMultiplier, setSizeMultiplier] = useState(0.3); // Start at 30% - Control the expansion range (0.2 = 20% size, 2.0 = 200% size)
  const lastAmplitudeRef = useRef(activeBreathAmplitude);
  const calibrationStartRef = useRef<number | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meditationStartRef = useRef<number | null>(null);
  const meditationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  
  // Kasina usage tracking
  const kasinaUsageRef = useRef<{ [kasina: string]: number }>({});
  const currentKasinaStartRef = useRef<number>(Date.now());
  const diagnosticsRef = useRef<{
    startTime: number;
    memoryChecks: Array<{time: number, memory: number}>;
    networkChecks: Array<{time: number, online: boolean}>;
    errors: Array<{time: number, error: string, stack?: string}>;
    performanceChecks: Array<{time: number, fps: number}>;
  } | null>(null);
  
  // Custom color kasina now uses user's selected color and behaves like other color kasinas
  
  // Background sync state
  const [backgroundIntensity, setBackgroundIntensity] = useState(0.4);
  const [currentBackgroundColor, setCurrentBackgroundColor] = useState('#2a2a2a');
  
  // Browser compatibility state - force detection immediately
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);
  const [isChromeBased] = useState(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    console.log('🔍 BROWSER DETECTION - User Agent:', userAgent);
    
    // Simple Safari detection
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const isFirefox = userAgent.includes('firefox');
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
    const isEdge = userAgent.includes('edge');
    
    console.log('🔍 BROWSER FLAGS:', { isSafari, isFirefox, isChrome, isEdge });
    
    const result = !isSafari && !isFirefox;
    console.log('🔍 FINAL DETECTION RESULT:', result ? 'Chrome-based' : 'Not Chrome-based');
    return result;
  });
  
  // Better breath detection using recent amplitude history
  const breathHistoryRef = useRef<number[]>([]);
  const peakBreathTimeRef = useRef({ duration: 0, transitionStartTime: null as number | null });
  const [breathDirection, setBreathDirection] = useState<'rising' | 'falling' | 'stable'>('stable');
  
  // Helper function to detect if a color is dark
  const isColorDark = (hexColor: string): boolean => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate perceived brightness using standard formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128; // Dark if brightness is less than 50%
  };

  // Helper function to create a light background version of a color
  const createLightBackground = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Create a light version by mixing with white (90% white, 10% original color)
    const lightR = Math.round(255 * 0.9 + r * 0.1);
    const lightG = Math.round(255 * 0.9 + g * 0.1);
    const lightB = Math.round(255 * 0.9 + b * 0.1);
    
    return `rgb(${lightR}, ${lightG}, ${lightB})`;
  };

  // Helper function to create a dark background version of a color
  const createDarkBackground = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Create a dark version by mixing with black (90% black, 10% original color)
    const darkR = Math.round(0 * 0.9 + r * 0.1);
    const darkG = Math.round(0 * 0.9 + g * 0.1);
    const darkB = Math.round(0 * 0.9 + b * 0.1);
    
    return `rgb(${darkR}, ${darkG}, ${darkB})`;
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

    // Find kasina with most time
    let mostUsedKasina = selectedKasina;
    let maxTime = 0;
    
    for (const [kasina, time] of Object.entries(usage)) {
      if (time > maxTime) {
        maxTime = time;
        mostUsedKasina = kasina;
      }
    }
    
    return mostUsedKasina;
  };
  
  // Handle wheel scroll to adjust size multiplier (smooth adjustment)
  useEffect(() => {
    const handleWheel = (e: any) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.025 : 0.025; // Scroll down = smaller, scroll up = larger
      setSizeMultiplier(prev => Math.max(0.05, Math.min(5.0, prev + delta))); // Range: 5% to 500%
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

  // Check browser compatibility and show warning on non-Chrome browsers
  useEffect(() => {
    console.log('🚨 BROWSER WARNING CHECK:', { useVernier, isChromeBased, pathname: window.location.pathname });
    
    // Always show warning on non-Chrome browsers in Breath mode
    if (!isChromeBased) {
      console.log('🚨 SHOWING BROWSER WARNING - Safari/Firefox detected');
      setShowBrowserWarning(true);
    } else {
      console.log('✅ Chrome-based browser - no warning needed');
      setShowBrowserWarning(false);
    }
  }, [useVernier, isChromeBased]);
  
  // Debug effect to track state changes
  useEffect(() => {
    console.log('🔄 STATE UPDATE:', { showBrowserWarning, isChromeBased });
  }, [showBrowserWarning, isChromeBased]);

  // Handle calibration period when breathing starts
  useEffect(() => {
    if (activeIsListening && calibrationStartRef.current === null) {
      // Start calibration period
      calibrationStartRef.current = Date.now();
      setShowCalibrationMessage(true);
      setCalibrationTimeRemaining(5);
      
      // Update countdown every second
      const interval = setInterval(() => {
        const elapsed = Date.now() - calibrationStartRef.current!;
        const remaining = Math.max(0, 5 - Math.floor(elapsed / 1000));
        setCalibrationTimeRemaining(remaining);
        
        if (remaining === 0) {
          setShowCalibrationMessage(false);
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (!activeIsListening) {
      // Reset calibration when not listening
      calibrationStartRef.current = null;
      setShowCalibrationMessage(false);
      setCalibrationTimeRemaining(0);
    }
  }, [activeIsListening]);

  // Handle cursor and controls auto-hide on mouse inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowCursor(true);
      setShowControls(true);
      
      // Clear existing timeouts
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      // Set new timeouts to hide cursor and controls after 3 seconds of inactivity
      cursorTimeoutRef.current = setTimeout(() => {
        setShowCursor(false);
      }, 3000);
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setIsInFocusMode(true);
        
        // Start meditation timer when entering focus mode
        if (!meditationStartRef.current) {
          meditationStartRef.current = Date.now();
          
          // Initialize diagnostics tracking
          diagnosticsRef.current = {
            startTime: Date.now(),
            memoryChecks: [],
            networkChecks: [],
            errors: [],
            performanceChecks: []
          };
          
          // Start session recovery tracking
          sessionIdRef.current = sessionRecovery.startSession('breath');
          console.log("🛡️ Started session recovery tracking for breath meditation");
          
          // Request wake lock to prevent screen sleep during meditation
          enableWakeLock();
          console.log("🔒 Wake lock requested to prevent screen sleep during meditation");
          
          // Fullscreen is now triggered by user interaction in KasinaSelectionInterface
          
          meditationIntervalRef.current = setInterval(() => {
            if (meditationStartRef.current) {
              const elapsed = Math.floor((Date.now() - meditationStartRef.current) / 1000);
              setMeditationTime(elapsed);
              
              // Update session recovery with current duration
              sessionRecovery.updateSession(elapsed);
              
              // Collect diagnostics every 30 seconds
              if (elapsed % 30 === 0 && diagnosticsRef.current) {
                collectDiagnostics();
              }
            }
          }, 1000);
        }
      }, 3000);
    };

    const handleMouseMoveWithFocus = () => {
      // Exit focus mode when mouse moves
      if (isInFocusMode) {
        setIsInFocusMode(false);
        // Keep meditation timer running even when out of focus mode
        // This ensures session recovery works even if user exits fullscreen
        // Don't clear the meditation timer - let it continue tracking
      }
      handleMouseMove();
    };

    document.addEventListener('mousemove', handleMouseMoveWithFocus);
    
    // Initial timeout
    handleMouseMove();
    
    // Add global error handler to catch any JavaScript errors during meditation
    const handleGlobalError = (event: ErrorEvent) => {
      if (diagnosticsRef.current && meditationStartRef.current) {
        diagnosticsRef.current.errors.push({
          time: Date.now(),
          error: `Global Error: ${event.message}`,
          stack: event.error?.stack
        });
        console.error('🚨 Global error during meditation:', event);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (diagnosticsRef.current && meditationStartRef.current) {
        diagnosticsRef.current.errors.push({
          time: Date.now(),
          error: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack
        });
        console.error('🚨 Unhandled promise rejection during meditation:', event);
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveWithFocus);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (meditationIntervalRef.current) {
        clearInterval(meditationIntervalRef.current);
      }
      // Cleanup removed - transitionDurationRef no longer used
      
      // Log diagnostics on cleanup if session was active
      if (diagnosticsRef.current && meditationStartRef.current) {
        logDiagnostics();
      }
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      try {
        const wasFullscreen = isFullscreen;
        const nowFullscreen = !!document.fullscreenElement;
        setIsFullscreen(nowFullscreen);
        
        // If exiting fullscreen during an active meditation session, just show cursor/controls
        if (wasFullscreen && !nowFullscreen && meditationStartRef.current && meditationTime > 0) {
          console.log(`🛡️ Exiting fullscreen during meditation - timer continues running`);
          
          // Show cursor and controls when exiting fullscreen
          setShowCursor(true);
          setShowControls(true);
        }
      } catch (error) {
        console.error('Error in fullscreen change handler:', error);
        // Ensure we don't crash on fullscreen errors
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen, meditationTime, selectedKasina]);

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // End meditation session
  const endMeditation = async () => {
    // Log diagnostics before ending session
    logDiagnostics();
    
    // Calculate duration in seconds and round down to nearest minute
    const durationInSeconds = meditationTime;
    const durationInMinutes = Math.floor(durationInSeconds / 60); // Round down to nearest minute
    
    // Only log if there was at least 1 minute of meditation
    if (durationInMinutes >= 1) {
      console.log(`🧘 Ending meditation session: ${durationInSeconds}s (${durationInMinutes} minutes)`);
      
      try {
        // Get the most used kasina for this session
        const mostUsedKasina = getMostUsedKasina();
        const kasinaName = `Breath Kasina`; // Just use the mode name
        const kasinaEmoji = KASINA_EMOJIS[mostUsedKasina];
        
        // Get final kasina usage data
        const finalUsage = { ...kasinaUsageRef.current };
        const currentTimeSpent = Date.now() - currentKasinaStartRef.current;
        if (selectedKasina) {
          finalUsage[selectedKasina] = (finalUsage[selectedKasina] || 0) + currentTimeSpent;
        }

        await logSession({
          kasinaType: mostUsedKasina as any, // Use the most-used kasina as the type for emoji
          duration: durationInMinutes * 60, // Convert back to seconds for logging
          showToast: true,
          kasinaBreakdown: finalUsage,
          customSessionName: `Breath Kasina`
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
    setIsInFocusMode(false);
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
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        console.log("📺 Auto-exited fullscreen after meditation session");
      }).catch((error) => {
        console.log("📺 Fullscreen auto-exit failed:", error);
      });
    }
    
    // Always navigate to Reflection page when ending session
    navigate('/reflection');
  };

  // Collect system diagnostics for failure analysis
  const collectDiagnostics = () => {
    if (!diagnosticsRef.current) return;
    
    const now = Date.now();
    
    try {
      // Memory usage (if available)
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        diagnosticsRef.current.memoryChecks.push({
          time: now,
          memory: memInfo.usedJSHeapSize / 1024 / 1024 // MB
        });
      }
      
      // Network connectivity
      diagnosticsRef.current.networkChecks.push({
        time: now,
        online: navigator.onLine
      });
      
      // Basic performance check (frame rate approximation)
      const startTime = performance.now();
      requestAnimationFrame(() => {
        const endTime = performance.now();
        const frameDuration = endTime - startTime;
        const approximateFPS = frameDuration > 0 ? Math.round(1000 / frameDuration) : 0;
        
        if (diagnosticsRef.current) {
          diagnosticsRef.current.performanceChecks.push({
            time: now,
            fps: approximateFPS
          });
        }
      });
      
      console.log(`📊 Diagnostics collected at ${Math.floor((now - diagnosticsRef.current.startTime) / 1000)}s`);
      
    } catch (error) {
      console.error('Error collecting diagnostics:', error);
      if (diagnosticsRef.current) {
        diagnosticsRef.current.errors.push({
          time: now,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
  };

  // Log diagnostics when session ends (successful or failed)
  const logDiagnostics = () => {
    if (!diagnosticsRef.current) return;
    
    const totalDuration = Date.now() - diagnosticsRef.current.startTime;
    const diagnosticsReport = {
      sessionId: sessionIdRef.current,
      totalDuration: Math.floor(totalDuration / 1000),
      kasinaType: selectedKasina,
      memoryChecks: diagnosticsRef.current.memoryChecks,
      networkChecks: diagnosticsRef.current.networkChecks,
      errors: diagnosticsRef.current.errors,
      performanceChecks: diagnosticsRef.current.performanceChecks,
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory || 'unknown'
      }
    };
    
    // Store diagnostics in localStorage for analysis
    try {
      const existingDiagnostics = JSON.parse(localStorage.getItem('kasina_session_diagnostics') || '[]');
      existingDiagnostics.push(diagnosticsReport);
      
      // Keep only last 10 sessions to prevent storage bloat
      if (existingDiagnostics.length > 10) {
        existingDiagnostics.splice(0, existingDiagnostics.length - 10);
      }
      
      localStorage.setItem('kasina_session_diagnostics', JSON.stringify(existingDiagnostics));
      console.log(`📋 Session diagnostics stored for analysis:`, diagnosticsReport);
      
    } catch (error) {
      console.error('Failed to store diagnostics:', error);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle kasina series selection
  const handleSeriesSelection = (series: string) => {
    setSelectedKasinaSeries(series);
    setKasinaSelectionStep('kasina');
  };

  // Handle individual kasina selection
  const handleKasinaSelection = (kasina: string) => {
    // Track usage before switching
    trackKasinaUsage(kasina);
    
    setSelectedKasina(kasina);
    setGlobalSelectedKasina(kasina as any); // Update global kasina store
    setShowKasinaSelection(false);
    console.log(`🎨 Selected kasina: ${KASINA_NAMES[kasina]} (${kasina})`);
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

  // Calculate background color that syncs with orb kasina color
  const calculateBackgroundColor = (kasinaColor: string, intensity: number): string => {
    // Parse the kasina color
    const result = kasinaColor.slice(1).match(/.{2}/g);
    if (!result) return '#2a2a2a';
    
    const [r, g, b] = result.map(c => parseInt(c, 16));
    
    // Create a much more visible background version of the kasina color
    const baseIntensity = 0.3; // Much more visible base color
    const breathIntensity = intensity * 0.2; // More noticeable breathing effect
    const totalIntensity = baseIntensity + breathIntensity;
    
    const newR = Math.round(r * totalIntensity);
    const newG = Math.round(g * totalIntensity);
    const newB = Math.round(b * totalIntensity);
    
    console.log(`🎨 Background color: ${kasinaColor} -> rgb(${newR}, ${newG}, ${newB}) intensity: ${totalIntensity.toFixed(2)}`);
    
    return `rgb(${newR}, ${newG}, ${newB})`;
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

  // Monitor connection and show help if needed
  useEffect(() => {
    if (!useVernier) return;

    // Check for connection issues
    const checkConnection = () => {
      // If we're supposed to be listening but getting no data for 10 seconds
      if (activeIsListening && activeBreathAmplitude === 0) {
        connectionCheckRef.current = setTimeout(() => {
          if (activeBreathAmplitude === 0) {
            setShowConnectionHelp(true);
          }
        }, 10000); // 10 seconds
      } else {
        // Clear timeout if we're getting data
        if (connectionCheckRef.current) {
          clearTimeout(connectionCheckRef.current);
          connectionCheckRef.current = null;
        }
        // Hide help if connection is working
        if (activeBreathAmplitude > 0) {
          setShowConnectionHelp(false);
        }
      }
    };

    checkConnection();

    return () => {
      if (connectionCheckRef.current) {
        clearTimeout(connectionCheckRef.current);
      }
    };
  }, [useVernier, activeIsListening, activeBreathAmplitude]);
  
  // Removed complex color-changing logic for custom kasina
  // Custom kasina now uses user's selected color like other color kasinas

  // Initialize and update background color whenever kasina changes
  useEffect(() => {
    let newBackgroundColor: string;
    
    if (selectedKasina === 'custom') {
      // Smart background for custom colors: dark tint for light colors, light tint for dark colors
      if (isColorDark(customColor)) {
        newBackgroundColor = createLightBackground(customColor);
      } else {
        newBackgroundColor = createDarkBackground(customColor);
      }
    } else {
      const currentKasinaColor = getKasinaColor(selectedKasina);
      newBackgroundColor = calculateBackgroundColor(currentKasinaColor, backgroundIntensity);
    }
    
    console.log(`🔄 Updating background for kasina: ${selectedKasina}, color: ${newBackgroundColor}`);
    setCurrentBackgroundColor(newBackgroundColor);
  }, [selectedKasina, customColor, backgroundIntensity]);

  // Initialize background color on component mount
  useEffect(() => {
    let initialBackgroundColor: string;
    
    if (selectedKasina === 'custom') {
      // Smart background for custom colors: dark tint for light colors, light tint for dark colors
      if (isColorDark(customColor)) {
        initialBackgroundColor = createLightBackground(customColor);
      } else {
        initialBackgroundColor = createDarkBackground(customColor);
      }
    } else {
      const initialKasinaColor = getKasinaColor(selectedKasina);
      initialBackgroundColor = calculateBackgroundColor(initialKasinaColor, backgroundIntensity);
    }
    
    setCurrentBackgroundColor(initialBackgroundColor);
    console.log(`🚀 Initial background color set: ${initialBackgroundColor} for kasina: ${selectedKasina}`);
  }, [selectedKasina, customColor]);

  // Update the orb size based on breath amplitude with hold detection
  useEffect(() => {
    if (!activeIsListening) return;
    
    // Custom kasina now breathes like other color kasinas
    
    // Detect if amplitude has changed significantly (not holding breath)
    const amplitudeChanged = Math.abs(activeBreathAmplitude - lastAmplitudeRef.current) > 0.01;
    
    let finalAmplitude = activeBreathAmplitude;
    
    // If we're in a low amplitude state and not changing much, we might be holding an exhale
    if (activeBreathAmplitude < 0.15 && !amplitudeChanged) {
      if (heldExhaleStart === null) {
        setHeldExhaleStart(Date.now());
      } else {
        // Gradually reduce amplitude during held exhale
        const holdDuration = Date.now() - heldExhaleStart;
        const shrinkRate = 0.999; // Very gradual shrinking
        const shrinkFactor = Math.pow(shrinkRate, holdDuration / 100); // Every 100ms
        finalAmplitude = activeBreathAmplitude * shrinkFactor;
      }
    } else {
      setHeldExhaleStart(null); // Reset hold detection
    }
    
    lastAmplitudeRef.current = activeBreathAmplitude;
    
    // Calculate intensity multiplier based on breathing rate (4-20 BPM)
    // At 4 BPM (deep meditation): very subtle (30% intensity)
    // At 12 BPM (normal): medium intensity (80% intensity) 
    // At 20 BPM (fast breathing): full intensity (100%)
    const normalizedRate = Math.max(4, Math.min(20, activeBreathingRate)); // Clamp to range
    const intensityMultiplier = normalizedRate <= 4 ? 0.3 : 
                               normalizedRate <= 12 ? 0.3 + ((normalizedRate - 4) / 8) * 0.5 :
                               0.8 + ((normalizedRate - 12) / 8) * 0.2;
    
    // Direct, smooth amplitude mapping that follows breathing naturally
    // Remove all complex scaling to prevent jerky movement
    let scaledAmplitude = finalAmplitude;
    
    // Add slight smoothing to reduce jerkiness while maintaining responsiveness
    const smoothingFactor = 0.85; // Light smoothing
    const lastSmoothedAmplitude = lastAmplitudeRef.current || finalAmplitude;
    scaledAmplitude = (lastSmoothedAmplitude * smoothingFactor) + (finalAmplitude * (1 - smoothingFactor));
    
    // Apply breathing rate intensity scaling
    scaledAmplitude = scaledAmplitude * intensityMultiplier;
    
    // Use unified breath kasina sizing system for consistent behavior across all types
    const breathSizing = calculateBreathKasinaSize(selectedKasina, scaledAmplitude, sizeScale, sizeMultiplier);
    const { size: newSize, minSize, maxSize, immersionLevel } = breathSizing;
    
    // Update state to trigger re-render
    setOrbSize(newSize);
    
    // Also directly modify the DOM for immediate visual feedback
    try {
      if (orbRef.current) {
        orbRef.current.style.width = `${newSize}px`;
        orbRef.current.style.height = `${newSize}px`;
        orbRef.current.style.boxShadow = 'none'; // Remove all glow effects
      }
    } catch (error) {
      console.error('Error updating orb DOM styles:', error);
    }
    
    // Update background intensity sync with breathing
    // scaledAmplitude represents breath state: higher = inhale (larger orb), lower = exhale (smaller orb)
    const breathIntensity = scaledAmplitude * 0.8;
    
    let finalBackgroundIntensity;
    
    if (selectedKasina === 'custom') {
      // Custom kasina: check if background is dark or light
      if (isColorDark(customColor)) {
        // Dark background: lighten on inhale, darken on exhale (same as standard)
        finalBackgroundIntensity = 0.1 + breathIntensity * 0.8;
      } else {
        // Light background: darken on inhale, lighten on exhale (opposite effect)
        const baseIntensity = 0.8; // Start with lighter base for light backgrounds
        finalBackgroundIntensity = baseIntensity - breathIntensity * 0.8; // Subtract breath intensity
        finalBackgroundIntensity = Math.max(0.1, Math.min(0.9, finalBackgroundIntensity)); // Clamp to reasonable range
      }
    } else {
      // Standard color kasinas: lighten on inhale, darken on exhale
      if (selectedKasina === 'water') {
        finalBackgroundIntensity = 0.02 + breathIntensity * 0.12; // Much darker: base 0.02 + breathing adds up to 0.14
      } else {
        finalBackgroundIntensity = 0.1 + breathIntensity * 0.8; // Normal: base 0.1 + breathing adds up to 0.9
      }
    }
    
    setBackgroundIntensity(finalBackgroundIntensity);
    
    // Calculate and update background color based on current kasina
    let newBackgroundColor: string;
    if (selectedKasina === 'custom') {
      // For custom kasinas, create breathing-modulated backgrounds
      const hex = customColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      if (isColorDark(customColor)) {
        // Dark custom color gets light background, modulated by breathing intensity
        const whiteMix = 0.6 + (finalBackgroundIntensity * 0.35); // Strong breathing effect
        const colorMix = 1 - whiteMix;
        const lightR = Math.round(255 * whiteMix + r * colorMix);
        const lightG = Math.round(255 * whiteMix + g * colorMix);
        const lightB = Math.round(255 * whiteMix + b * colorMix);
        newBackgroundColor = `rgb(${lightR}, ${lightG}, ${lightB})`;
      } else {
        // Light custom color gets dark background, modulated by breathing intensity
        const blackMix = 0.6 + (finalBackgroundIntensity * 0.35); // Strong breathing effect
        const colorMix = 1 - blackMix;
        const darkR = Math.round(0 * blackMix + r * colorMix);
        const darkG = Math.round(0 * blackMix + g * colorMix);
        const darkB = Math.round(0 * blackMix + b * colorMix);
        newBackgroundColor = `rgb(${darkR}, ${darkG}, ${darkB})`;
      }
    } else {
      const currentKasinaColor = getKasinaColor(selectedKasina);
      newBackgroundColor = calculateBackgroundColor(currentKasinaColor, finalBackgroundIntensity);
    }
    
    setCurrentBackgroundColor(newBackgroundColor);
    
    // Log the size and rate data for debugging
    console.log(`Scale: ${sizeScale.toFixed(1)}x, rate: ${activeBreathingRate}bpm, intensity: ${(intensityMultiplier * 100).toFixed(0)}%, current: ${newSize}px`);
  }, [activeBreathAmplitude, activeIsListening, heldExhaleStart, activeBreathingRate, sizeScale, selectedKasina, customColor, isColorDark, getKasinaColor, calculateBackgroundColor]);

  // Modern kasina breathing orb component using Three.js
  const BreathingKasinaOrb = () => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const waterMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const fireMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const airMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const earthMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const spaceMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const lightMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const immersionBackgroundRef = useRef<THREE.Mesh>(null);
    
    // Apply breathing animation with easing and update shader uniforms
    useFrame(({ clock }) => {
      try {
        // Apply natural breathing easing that follows actual breathing rhythm
        const naturalBreathingEase = (t: number) => {
          // Use a sine-wave based easing that feels more like natural breathing
          return Math.sin(t * Math.PI * 0.5);
        };
        
        // Use unified scaling system for consistent behavior across all kasinas
        const scalingResult = calculateKasinaScale(selectedKasina, orbSize, 0, naturalBreathingEase);
        const { scale, cappedScale, immersionLevel, config } = scalingResult;
      
      // Apply breath-responsive scaling based on kasina type
      const kasConfig = getKasinaConfig(selectedKasina);
      let finalScale = cappedScale;
      
      // Debug kasina type detection
      console.log(`🔍 Kasina: ${selectedKasina}, Type: ${kasConfig.type}, orbSize: ${orbSize}px`);
      
      if (kasConfig.type === 'color') {
        finalScale = cappedScale * 0.008; // Scale for color kasinas
        console.log(`🎯 Color kasina ${selectedKasina} scaled from ${cappedScale.toFixed(3)} to ${finalScale.toFixed(3)}`);
      } else if (kasConfig.type === 'elemental') {
        // Elemental kasinas need breath-responsive scaling based on orbSize
        finalScale = (orbSize / 150) * 1.5; // Increased multiplier to match Color kasina scale
        console.log(`🔥 Elemental kasina ${selectedKasina} scaled to ${finalScale.toFixed(3)} (orbSize: ${orbSize}px)`);
      } else {
        // Default scaling for other types
        finalScale = cappedScale * 0.008;
        console.log(`⚙️ Default kasina ${selectedKasina} (type: ${kasConfig.type}) scaled to ${finalScale.toFixed(3)}`);
      }

      // Apply scaling to group or mesh depending on kasina type
      if (groupRef.current) {
        // Debug logging using unified system for color kasinas
        if (selectedKasina === 'blue' || selectedKasina === 'red' || selectedKasina === 'white' || selectedKasina === 'yellow') {
          logKasinaScaling(selectedKasina, orbSize, scale, cappedScale);
        }
        
        groupRef.current.scale.setScalar(finalScale);
        
        // Optimize opacity updates - only update when there's a meaningful change
        const orbOpacity = Math.max(0.3, 1 - immersionLevel * 0.7);
        const opacityChanged = Math.abs(orbOpacity - (groupRef.current.userData.lastOpacity || 1)) > 0.01;
        
        if (opacityChanged) {
          groupRef.current.userData.lastOpacity = orbOpacity;
          groupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              const material = child.material as any;
              if (material.uniforms && material.uniforms.opacity) {
                material.uniforms.opacity.value = orbOpacity;
              } else if (material.transparent !== undefined) {
                material.transparent = true;
                material.opacity = orbOpacity;
              }
            }
          });
        }
      } else if (meshRef.current) {
        // For Elemental kasinas and other mesh-based kasinas, apply scaling and opacity
        meshRef.current.scale.setScalar(finalScale);
        
        // Optimize material updates - only update when opacity changes significantly
        const orbOpacity = Math.max(0.3, 1 - immersionLevel * 0.7);
        const lastMeshOpacity = meshRef.current.userData.lastOpacity || 1;
        
        if (Math.abs(orbOpacity - lastMeshOpacity) > 0.01) {
          meshRef.current.userData.lastOpacity = orbOpacity;
          if (meshRef.current.material && !Array.isArray(meshRef.current.material)) {
            const material = meshRef.current.material as any;
            material.transparent = true;
            material.opacity = orbOpacity;
          }
        }
      }
      
      // Update immersion background - optimize updates
      if (immersionBackgroundRef.current) {
        // Make the background visible and scale it with breathing
        const backgroundScale = 200; // Even larger sphere to ensure full coverage
        immersionBackgroundRef.current.scale.setScalar(backgroundScale);
        
        // Optimize background material updates
        const targetOpacity = immersionLevel > 0.01 ? 1.0 : 0;
        const targetVisible = immersionLevel > 0.001;
        const lastBgOpacity = immersionBackgroundRef.current.userData.lastOpacity || 0;
        const lastBgVisible = immersionBackgroundRef.current.userData.lastVisible || false;
        
        if (Math.abs(targetOpacity - lastBgOpacity) > 0.01 || targetVisible !== lastBgVisible) {
          immersionBackgroundRef.current.userData.lastOpacity = targetOpacity;
          immersionBackgroundRef.current.userData.lastVisible = targetVisible;
          
          if (immersionBackgroundRef.current.material && !Array.isArray(immersionBackgroundRef.current.material)) {
            const material = immersionBackgroundRef.current.material as any;
            material.transparent = true;
            material.depthWrite = false; // Prevent depth issues
            material.depthTest = false; // Ensure it renders behind everything
            material.opacity = targetOpacity;
            material.visible = targetVisible;
          }
        }
      }
      
      // Throttle shader time updates - only update every few frames to reduce load
      const time = clock.getElapsedTime();
      const frameCount = Math.floor(time * 60); // Approximate frame count
      
      // Update shader uniforms only every 3rd frame to reduce computational load
      if (frameCount % 3 === 0) {
        if (waterMaterialRef.current) waterMaterialRef.current.uniforms.time.value = time;
        if (fireMaterialRef.current) fireMaterialRef.current.uniforms.time.value = time;
        if (airMaterialRef.current) airMaterialRef.current.uniforms.time.value = time;
        if (earthMaterialRef.current) earthMaterialRef.current.uniforms.time.value = time;
        if (spaceMaterialRef.current) spaceMaterialRef.current.uniforms.time.value = time;
        if (lightMaterialRef.current) lightMaterialRef.current.uniforms.time.value = time;
        
        // Update background shader uniforms too
        if (immersionBackgroundRef.current && immersionBackgroundRef.current.material) {
          const material = immersionBackgroundRef.current.material as any;
          if (material.uniforms) {
            material.uniforms.time.value = time;
          }
        }
      }
      } catch (error) {
        console.error('Error in useFrame animation loop:', error);
        // Prevent crashes by gracefully handling animation errors
      }
    });

    // Render the appropriate kasina component based on selection
    if (selectedKasina === KASINA_TYPES.WHITE_A_KASINA) {
      return (
        <group ref={groupRef}>
          <WhiteAKasina />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.WHITE_A_THIGLE) {
      return (
        <group ref={groupRef}>
          <WhiteAThigle />
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
    } else if (selectedKasina === KASINA_TYPES.WATER) {
      return (
        <>
          {/* Main orb */}
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
          {/* Immersion background - inside-out sphere */}
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={waterShader.uniforms}
              vertexShader={waterShader.vertexShader}
              fragmentShader={waterShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide} // Render inside faces
            />
          </mesh>
        </>
      );
    } else if (selectedKasina === KASINA_TYPES.AIR) {
      return (
        <>
          {/* Main orb */}
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
          {/* Immersion background - inside-out sphere */}
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={airShader.uniforms}
              vertexShader={airShader.vertexShader}
              fragmentShader={airShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      );
    } else if (selectedKasina === KASINA_TYPES.FIRE) {
      return (
        <>
          {/* Main orb */}
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
          {/* Immersion background - inside-out sphere */}
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={fireShader.uniforms}
              vertexShader={fireShader.vertexShader}
              fragmentShader={fireShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      );
    } else if (selectedKasina === KASINA_TYPES.EARTH) {
      return (
        <>
          {/* Main orb */}
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
          {/* Immersion background - inside-out sphere */}
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={earthShader.uniforms}
              vertexShader={earthShader.vertexShader}
              fragmentShader={earthShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      );
    } else if (selectedKasina === KASINA_TYPES.SPACE) {
      return (
        <>
          {/* Main orb */}
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
          {/* Immersion background - inside-out sphere */}
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={spaceShader.uniforms}
              vertexShader={spaceShader.vertexShader}
              fragmentShader={spaceShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      );
    } else if (selectedKasina === KASINA_TYPES.LIGHT) {
      return (
        <>
          {/* Main orb */}
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
          {/* Immersion background - inside-out sphere */}
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={lightShader.uniforms}
              vertexShader={lightShader.vertexShader}
              fragmentShader={lightShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      );
    } else {
      // Basic color kasinas and custom color kasina
      let kasinaColor: string;
      
      if (selectedKasina === 'custom') {
        kasinaColor = customColor; // Use user's selected custom color
      } else {
        kasinaColor = getKasinaColor(selectedKasina);
      }
        
      return (
        <group ref={groupRef}>
          {/* Main orb */}
          <mesh ref={meshRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial color={kasinaColor} />
          </mesh>
          {/* Immersion background - inside-out sphere */}
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial 
              color={kasinaColor} 
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        </group>
      );
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: currentBackgroundColor,
        width: '100vw',
        height: '100vh',
        zIndex: 10,
        cursor: showCursor ? 'default' : 'none',
        transition: 'background-color 0.1s ease-out' // Smooth color transitions
      }}
    >
      {/* Three.js Canvas with modern kasina components */}
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 3], fov: 75 }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} />
        <BreathingKasinaOrb />
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
          mode="breath"
          breathingRate={activeBreathingRate}
        />
      )}



      {/* Browser Compatibility Warning - Force show for testing */}
      {(!isChromeBased || showBrowserWarning) && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <div 
            className="bg-red-600 text-white p-8 rounded-lg shadow-2xl max-w-lg mx-4 animate-pulse"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.98)',
              border: '3px solid rgba(239, 68, 68, 1)',
              boxShadow: '0 0 30px rgba(220, 38, 38, 0.5)'
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="text-4xl" style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))' }}>⚠️</div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-3">Browser Not Compatible</h3>
                <p className="text-base mb-4">
                  Breath Mode with Vernier sensors requires a Chrome-based browser for Bluetooth connectivity.
                </p>
                <p className="text-base mb-4">
                  <strong>Supported browsers:</strong><br />
                  • Google Chrome<br />
                  • Microsoft Edge<br />
                  • Brave Browser<br />
                  • Opera<br />
                  • Vivaldi
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowBrowserWarning(false)}
                    className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    Continue Anyway
                  </button>
                  <button
                    onClick={() => window.open('https://www.google.com/chrome/', '_blank')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    Download Chrome
                  </button>
                </div>
              </div>
            </div>
          </div>
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
            mode="breath"
          />
        </div>
      )}
    </div>
  );
};

export default BreathKasinaOrb;
