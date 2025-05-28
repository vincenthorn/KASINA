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
import { KASINA_TYPES, KASINA_NAMES, KASINA_EMOJIS, KASINA_SERIES, KASINA_COLORS, KASINA_BACKGROUNDS } from '../lib/constants';
import WhiteAKasina from './WhiteAKasina';
import WhiteAThigle from './WhiteAThigle';
import OmKasina from './OmKasina';
import AhKasina from './AhKasina';
import HumKasina from './HumKasina';
import RainbowKasina from './RainbowKasina';
import * as THREE from 'three';

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
  const { selectedKasina: globalSelectedKasina, setSelectedKasina: setGlobalSelectedKasina } = useKasina();
  
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
  const lastAmplitudeRef = useRef(activeBreathAmplitude);
  const calibrationStartRef = useRef<number | null>(null);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const meditationStartRef = useRef<number | null>(null);
  const meditationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const diagnosticsRef = useRef<{
    startTime: number;
    memoryChecks: Array<{time: number, memory: number}>;
    networkChecks: Array<{time: number, online: boolean}>;
    errors: Array<{time: number, error: string, stack?: string}>;
    performanceChecks: Array<{time: number, fps: number}>;
  } | null>(null);
  
  // State for Changing Color kasina - cycles through rainbow colors with breath
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [nextColorIndex, setNextColorIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [lastBreathState, setLastBreathState] = useState<'peak' | 'valley' | 'middle'>('middle');
  const rainbowColors = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff'];
  const transitionDurationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Better breath detection using recent amplitude history
  const breathHistoryRef = useRef<number[]>([]);
  const peakBreathTimeRef = useRef({ duration: 0, transitionStartTime: null as number | null });
  const [breathDirection, setBreathDirection] = useState<'rising' | 'falling' | 'stable'>('stable');
  
  // Helper function to blend two hex colors
  const blendColors = (color1: string, color2: string, ratio: number): string => {
    const hex = (color: string) => parseInt(color.slice(1), 16);
    const r1 = (hex(color1) >> 16) & 255;
    const g1 = (hex(color1) >> 8) & 255;
    const b1 = hex(color1) & 255;
    const r2 = (hex(color2) >> 16) & 255;
    const g2 = (hex(color2) >> 8) & 255;
    const b2 = hex(color2) & 255;
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };
  
  // Handle wheel scroll to adjust breathing range scale (perfectly balanced smooth)
  useEffect(() => {
    const handleWheel = (e: any) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.001 : 0.001; // 100x slower: 0.1 → 0.001 for perfectly balanced, smooth adjustments
      setSizeScale(prev => Math.max(0.025, Math.min(3.0, prev + delta))); // Range: 0.025x to 3.0x (2x smaller minimum zoom-out)
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, []);

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
      if (transitionDurationRef.current) {
        clearTimeout(transitionDurationRef.current);
      }
      
      // Log diagnostics on cleanup if session was active
      if (diagnosticsRef.current && meditationStartRef.current) {
        logDiagnostics();
      }
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen;
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      
      // If exiting fullscreen during an active meditation session, save session state
      if (wasFullscreen && !nowFullscreen && meditationStartRef.current && meditationTime > 0) {
        console.log(`🛡️ Exiting fullscreen during meditation - saving session state (${meditationTime}s)`);
        
        // Force an immediate session recovery update
        if (sessionIdRef.current) {
          sessionRecovery.updateSession(meditationTime);
        }
        
        // Also create a backup checkpoint in case of immediate browser shutdown
        try {
          const checkpointData = {
            sessionId: sessionIdRef.current,
            kasinaType: selectedKasina,
            duration: meditationTime,
            timestamp: new Date().toISOString(),
            reason: 'fullscreen_exit'
          };
          localStorage.setItem('kasina_emergency_checkpoint', JSON.stringify(checkpointData));
          console.log(`💾 Emergency checkpoint saved on fullscreen exit`);
        } catch (error) {
          console.error('Failed to save emergency checkpoint:', error);
        }
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
    
    // Complete session recovery tracking
    if (sessionIdRef.current) {
      const recoverySuccess = await sessionRecovery.completeSession(durationInSeconds);
      console.log(`🛡️ Session recovery completion: ${recoverySuccess ? 'success' : 'failed'}`);
    }
    
    // Only log if there was at least 1 minute of meditation
    if (durationInMinutes >= 1) {
      console.log(`🧘 Ending meditation session: ${durationInSeconds}s (${durationInMinutes} minutes)`);
      
      try {
        // Create a more descriptive kasina name that includes the specific kasina used
        const kasinaName = `Breath Kasina (${KASINA_NAMES[selectedKasina]})`;
        const kasinaEmoji = KASINA_EMOJIS[selectedKasina];
        
        await logSession({
          kasinaType: 'breath' as any, // Use 'breath' as the kasina type
          duration: durationInMinutes * 60, // Convert back to seconds for logging
          showToast: true
        });
        console.log(`✅ ${kasinaName} session logged: ${durationInMinutes} minute(s) with ${kasinaEmoji}`);
        
      } catch (error) {
        console.error('Failed to log meditation session:', error);
      }
    } else {
      console.log(`⏱️ Session too short (${durationInSeconds}s) - not logging`);
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
  
  // Special logic for Change kasina - slow, gradual color transitions during sustained peak breathing
  useEffect(() => {
    if (!activeIsListening || selectedKasina !== 'custom') return;
    
    const peakThreshold = 0.85; // Consider 85%+ as peak breathing
    const timeAtPeak = peakBreathTimeRef.current;
    
    if (activeBreathAmplitude >= peakThreshold) {
      // Track how long we've been at peak breathing
      timeAtPeak.duration += 50; // Add ~50ms per update (20Hz = 50ms intervals)
      
      // Only start transition after being at peak for at least 500ms (sustained deep breath)
      if (timeAtPeak.duration >= 500 && !isTransitioning) {
        const nextIndex = (currentColorIndex + 1) % rainbowColors.length;
        setNextColorIndex(nextIndex);
        setIsTransitioning(true);
        setTransitionProgress(0);
        timeAtPeak.transitionStartTime = timeAtPeak.duration;
        
        console.log(`🎨 Change kasina: Starting gradual chakra transition from ${rainbowColors[currentColorIndex]} to ${rainbowColors[nextIndex]} after sustained peak breathing`);
      }
      
      // If we're transitioning, progress very slowly over 2-3 seconds
      if (isTransitioning && timeAtPeak.transitionStartTime !== null) {
        const transitionDuration = 2500; // 2.5 seconds for full transition
        const timeInTransition = timeAtPeak.duration - timeAtPeak.transitionStartTime;
        const progress = Math.min(1, timeInTransition / transitionDuration);
        
        setTransitionProgress(progress);
        
        console.log(`🌈 Slow chakra transition: ${(progress * 100).toFixed(1)}% (${timeInTransition}ms of ${transitionDuration}ms)`);
        
        // Complete transition after full duration
        if (progress >= 1.0) {
          console.log(`🎨 Completing gradual chakra transition after ${transitionDuration}ms`);
          setCurrentColorIndex(nextColorIndex);
          setIsTransitioning(false);
          setTransitionProgress(0);
          timeAtPeak.transitionStartTime = null;
        }
      }
      
    } else {
      // Reset peak time when not at peak
      timeAtPeak.duration = 0;
      timeAtPeak.transitionStartTime = null;
      
      // Complete any active transition when dropping below peak
      if (isTransitioning) {
        console.log(`🎨 Completing chakra transition as breath drops below peak`);
        setCurrentColorIndex(nextColorIndex);
        setIsTransitioning(false);
        setTransitionProgress(0);
      }
    }
  }, [activeBreathAmplitude, activeIsListening, selectedKasina, currentColorIndex, nextColorIndex, isTransitioning, rainbowColors]);

  // Update the orb size based on breath amplitude with hold detection
  useEffect(() => {
    if (!activeIsListening) return;
    
    // Special handling for Changing Color kasina - maintain constant size
    if (selectedKasina === 'custom') {
      // For Changing Color kasina, keep size constant (controlled by scroll wheel only)
      return;
    }
    
    // Adjusted breathing size range with scroll-based scaling - expanded range for better breathing comfort
    const baseMinSize = 0.000390625 * 0.5; // Much smaller minimum - kasina shrinks to nearly nothing on exhale
    const baseMaxSize = 10000 * 1.1; // 10% larger maximum - kasina expands more on inhale
    const minSize = Math.floor(baseMinSize * sizeScale);
    const calculatedMaxSize = Math.floor(baseMaxSize * sizeScale);
    const maxSize = Math.min(calculatedMaxSize, 3000); // Even higher cap for vajrayana immersion
    const sizeRange = maxSize - minSize;
    
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
    
    // Apply scaling to make exhales 2-3x smaller and adjust the curve
    let scaledAmplitude = finalAmplitude;
    
    // For lower amplitudes (exhales), compress the range to make them much smaller
    if (finalAmplitude < 0.5) {
      // Make exhales 3x smaller by compressing the lower range
      scaledAmplitude = finalAmplitude * 0.33;
    } else {
      // For inhales (upper range), apply gentler scaling
      scaledAmplitude = 0.165 + ((finalAmplitude - 0.5) * 0.67); // Maps 0.5-1.0 to 0.165-0.5
    }
    
    // Apply breathing rate intensity scaling
    scaledAmplitude = scaledAmplitude * intensityMultiplier;
    
    const clampedAmplitude = Math.max(0, Math.min(1, scaledAmplitude));
    const calculatedSize = Math.floor(minSize + (sizeRange * clampedAmplitude));
    // Cap at the perfect immersion moment to prevent black screens
    const newSize = Math.min(calculatedSize, 1200);
    
    // Update state to trigger re-render
    setOrbSize(newSize);
    
    // Also directly modify the DOM for immediate visual feedback
    if (orbRef.current) {
      orbRef.current.style.width = `${newSize}px`;
      orbRef.current.style.height = `${newSize}px`;
      orbRef.current.style.boxShadow = 'none'; // Remove all glow effects
    }
    
    // Log the size and rate data for debugging
    console.log(`Scale: ${sizeScale.toFixed(1)}x, rate: ${activeBreathingRate}bpm, intensity: ${(intensityMultiplier * 100).toFixed(0)}%, range: ${minSize}-${maxSize}px, current: ${newSize}px`);
  }, [activeBreathAmplitude, activeIsListening, heldExhaleStart, activeBreathingRate, sizeScale]);

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
      // Cap orbSize at expanded range especially for vajrayana kasinas
      const cappedOrbSize = Math.min(orbSize, 3000);
      
      // Add very subtle easing to reduce jerky movements while keeping responsiveness
      const baseScale = cappedOrbSize / 150; // 150px = 1.0 scale baseline
      
      // Apply easing that slows overall movement while keeping initial response
      const subtleEase = (t: number) => {
        // Keep initial response fast, then gradually slow down the movement
        return t < 0.15 
          ? t * t * 4.4  // Quick initial response (same responsiveness)
          : t > 0.9 
          ? 1 - (1 - t) * (1 - t) * 8  // Slow gentle finish
          : 0.15 + (t - 0.15) * 0.75; // Slower middle section (75% speed)
      };
      
      // Apply minimal easing to maintain responsiveness
      const normalizedScale = Math.max(0, Math.min(1, baseScale / 6));
      const easedScale = subtleEase(normalizedScale) * 6;
      const scale = Math.max(0.001, easedScale); // Allow orb to nearly vanish completely
      
      // Calculate immersion level based on capped orb size - start very early for all kasinas
      const immersionThreshold = 300; // Start background much earlier to prevent black screens
      const maxImmersion = 3000; // Full immersion at expanded size for all kasinas
      const immersionLevel = Math.max(0, Math.min(1, (cappedOrbSize - immersionThreshold) / (maxImmersion - immersionThreshold)));
      
      if (groupRef.current) {
        // Scale the main orb, but cap it to prevent it from getting too large
        const cappedScale = immersionLevel > 0 ? Math.min(scale, 6) : scale;
        groupRef.current.scale.setScalar(cappedScale);
        
        // Fade out the main orb as we approach full immersion
        const orbOpacity = Math.max(0.3, 1 - immersionLevel * 0.7);
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
      
      if (meshRef.current) {
        // For basic kasinas, also apply scale and opacity
        const cappedScale = immersionLevel > 0 ? Math.min(scale, 6) : scale;
        meshRef.current.scale.setScalar(cappedScale);
        
        const orbOpacity = Math.max(0.3, 1 - immersionLevel * 0.7);
        if (meshRef.current.material && !Array.isArray(meshRef.current.material)) {
          const material = meshRef.current.material as any;
          material.transparent = true;
          material.opacity = orbOpacity;
        }
      }
      
      // Update immersion background
      if (immersionBackgroundRef.current) {
        // Make the background visible and scale it with breathing
        const backgroundScale = 200; // Even larger sphere to ensure full coverage
        immersionBackgroundRef.current.scale.setScalar(backgroundScale);
        
        // Set opacity based on immersion level - ensure it's visible when needed
        if (immersionBackgroundRef.current.material && !Array.isArray(immersionBackgroundRef.current.material)) {
          const material = immersionBackgroundRef.current.material as any;
          material.transparent = true;
          material.depthWrite = false; // Prevent depth issues
          material.depthTest = false; // Ensure it renders behind everything
          // Show background with full brightness for perfect immersion
          material.opacity = immersionLevel > 0.01 ? 1.0 : 0;
          material.visible = immersionLevel > 0.001; // Show immediately when any immersion starts
        }
      }
      
      // Update shader time uniforms for all elemental kasinas
      const time = clock.getElapsedTime();
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
      // Basic color kasinas and Changing Color kasina
      let kasinaColor: string;
      
      if (selectedKasina === 'custom') {
        if (isTransitioning) {
          // Blend current and next colors during transition
          kasinaColor = blendColors(
            rainbowColors[currentColorIndex], 
            rainbowColors[nextColorIndex], 
            transitionProgress
          );
        } else {
          kasinaColor = rainbowColors[currentColorIndex];
        }
      } else {
        kasinaColor = getKasinaColor(selectedKasina);
      }
        
      return (
        <>
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
        </>
      );
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: KASINA_BACKGROUNDS[selectedKasina] || '#000000',
        width: '100vw',
        height: '100vh',
        zIndex: 10,
        cursor: showCursor ? 'default' : 'none'
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
      
      {/* Meditation timer and controls - upper left corner */}
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

      {/* Kasina selection (shows on mouse movement, auto-hides after 3 seconds) */}
      {showControls && (
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30"
          style={{
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '12px',
            transition: 'all 0.3s ease-out'
          }}
        >
          <div className="text-center mb-3">
            <div className="text-white text-sm font-medium mb-2">
              Choose your kasina
            </div>
            
            {/* Kasina series selection */}
            <div className="flex space-x-2 mb-3">
              {Object.entries(KASINA_SERIES).map(([seriesKey, kasinas]) => (
                <button
                  key={seriesKey}
                  onClick={() => {
                    setSelectedKasinaSeries(seriesKey);
                    // Set first kasina of this series as selected
                    setSelectedKasina(kasinas[0]);
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    selectedKasinaSeries === seriesKey
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {seriesKey}
                </button>
              ))}
            </div>
            
            {/* Individual kasina selection */}
            {selectedKasinaSeries && (
              <div className="flex flex-wrap justify-center gap-2">
                {(KASINA_SERIES as any)[selectedKasinaSeries].map((kasinaType: string) => (
                  <button
                    key={kasinaType}
                    onClick={() => {
                      setSelectedKasina(kasinaType);
                      setGlobalSelectedKasina(kasinaType as any); // Update global kasina store
                    }}
                    className={`px-2 py-1 rounded text-xs transition-all ${
                      selectedKasina === kasinaType
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                    title={KASINA_NAMES[kasinaType]}
                  >
                    {KASINA_EMOJIS[kasinaType]} {KASINA_NAMES[kasinaType].split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen control - upper right corner */}
      {showControls && (
        <div 
          className="absolute top-4 right-4 z-30 cursor-pointer"
          onClick={toggleFullscreen}
          style={{
            padding: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            transition: 'all 0.3s ease-out'
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

      {/* Kasina selection overlay */}
      {showKasinaSelection && (
        <div 
          className="absolute inset-0 z-50 flex items-end justify-center pb-20"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)'
          }}
        >
          {kasinaSelectionStep === 'series' ? (
            <div 
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '32px',
                borderRadius: '16px',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '20px'
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
                Choose Your Kasina Series
              </div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
                Select the type of meditation object you'd like to focus on
              </div>
              
              <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
                <button
                  onClick={() => handleSeriesSelection('COLOR')}
                  style={{
                    backgroundColor: '#4F46E5',
                    color: 'white',
                    border: 'none',
                    padding: '24px 32px',
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '180px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#3730A3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#4F46E5';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
                  <div>Color Kasinas</div>
                </button>
                
                <button
                  onClick={() => handleSeriesSelection('ELEMENTAL')}
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '24px 32px',
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '180px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#047857';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#059669';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌊</div>
                  <div>Elemental Kasinas</div>
                </button>
                
                <button
                  onClick={() => handleSeriesSelection('VAJRAYANA')}
                  style={{
                    backgroundColor: '#DC2626',
                    color: 'white',
                    border: 'none',
                    padding: '24px 32px',
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '180px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#B91C1C';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#DC2626';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔮</div>
                  <div>Vajrayana Kasinas</div>
                </button>
              </div>
            </div>
          ) : (
            <div 
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '32px',
                borderRadius: '16px',
                textAlign: 'center',
                maxWidth: '800px',
                margin: '20px'
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
                Choose Your {selectedKasinaSeries === 'COLOR' ? 'Color' : selectedKasinaSeries === 'ELEMENTAL' ? 'Elemental' : 'Vajrayana'} Kasina
              </div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
                Select the specific kasina that resonates with your practice
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {getKasinasForSeries(selectedKasinaSeries || '').map((kasina) => (
                  <button
                    key={kasina}
                    onClick={() => handleKasinaSelection(kasina)}
                    style={{
                      ...(kasina === 'custom' ? {
                        background: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
                        backgroundSize: '400% 400%',
                        animation: 'rainbowShift 3s ease-in-out infinite'
                      } : {
                        backgroundColor: kasina === KASINA_TYPES.WHITE_A_KASINA ? '#4B5563' : getKasinaColor(kasina)
                      }),
                      color: kasina === 'white' || kasina === 'yellow' || kasina === 'light' || kasina === 'air' || kasina === 'om_kasina' || kasina === 'white_a_thigle' ? '#000' : '#fff',
                      border: '2px solid rgba(255,255,255,0.3)',
                      padding: '16px 12px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease-out',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                      {KASINA_EMOJIS[kasina]}
                    </div>
                    <div>{KASINA_NAMES[kasina]}</div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setKasinaSelectionStep('series');
                  setSelectedKasinaSeries(null);
                }}
                style={{
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ← Back to Series
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connection help overlay */}
      {showConnectionHelp && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'left',
              maxWidth: '500px',
              margin: '20px'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
              Vernier Belt Connection Issue
            </div>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
              We're not receiving data from your Vernier Respiration Belt. Try these steps:
            </div>
            
            <div style={{ fontSize: '14px', color: '#444', lineHeight: '1.6', marginBottom: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>1. Check Physical Connection:</strong>
                <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                  <li>• Ensure belt is snug but comfortable around your chest</li>
                  <li>• Make sure sensor is positioned over your sternum</li>
                  <li>• Check that all cable connections are secure</li>
                </ul>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>2. Bluetooth Connection:</strong>
                <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                  <li>• Verify Vernier device is powered on</li>
                  <li>• Check if device appears in your Bluetooth settings</li>
                  <li>• Try disconnecting and reconnecting</li>
                </ul>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>3. Breathing Test:</strong>
                <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                  <li>• Take a few deep, deliberate breaths</li>
                  <li>• Ensure you're breathing with your chest/diaphragm</li>
                  <li>• The belt should expand and contract visibly</li>
                </ul>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConnectionHelp(false)}
                style={{
                  backgroundColor: '#0000FF',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calibration message overlay */}
      {showCalibrationMessage && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ zIndex: 20 }}
        >
          <div 
            className="bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg text-center"
            style={{ 
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            <div>Calibrating Breath Detection</div>
            <div className="text-lg mt-2 opacity-80">
              Breathe naturally for {calibrationTimeRemaining} more seconds
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BreathKasinaOrb;