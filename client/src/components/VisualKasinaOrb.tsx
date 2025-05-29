import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import '../styles/kasina-animations.css';
import '../styles/breath-kasina.css';
import { useSessionLogger } from '../lib/stores/useSessionLogger';
import { useKasina } from '../lib/stores/useKasina';
import { useAuth } from '../lib/stores/useAuth';
import { sessionRecovery } from '../lib/sessionRecovery';
import { KASINA_TYPES, KASINA_NAMES, KASINA_EMOJIS, KASINA_SERIES, KASINA_COLORS, KASINA_BACKGROUNDS } from '../lib/constants';
import WhiteAKasina from './WhiteAKasina';
import WhiteAThigle from './WhiteAThigle';
import OmKasina from './OmKasina';
import AhKasina from './AhKasina';
import HumKasina from './HumKasina';
import RainbowKasina from './RainbowKasina';

import * as THREE from 'three';

// Shader materials copied exactly from original KasinaOrb component
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
      
      float n = p.x + p.y * 57.0 + 113.0 * p.z;
      return mix(
        mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
            mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
        mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
    }
    
    void main() {
      vec3 worldPos = vPosition + vec3(time * 0.1);
      float n = noise(worldPos * 3.0);
      
      vec3 finalColor = color + vec3(n * 0.1);
      float alpha = opacity * (0.8 + n * 0.2);
      
      gl_FragColor = vec4(finalColor, alpha);
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

interface VisualKasinaOrbProps {}

const VisualKasinaOrb: React.FC<VisualKasinaOrbProps> = () => {
  const { logSession } = useSessionLogger();
  const navigate = useNavigate();
  const { selectedKasina: globalSelectedKasina, setSelectedKasina: setGlobalSelectedKasina } = useKasina();
  const { email, subscriptionType } = useAuth();
  
  // Check if user has premium access
  const isPremium = subscriptionType === "premium" || subscriptionType === "admin" || email === "admin@kasina.app";
  
  // State for kasina selection flow
  const [showKasinaSelection, setShowKasinaSelection] = useState(true);
  const [selectedKasinaSeries, setSelectedKasinaSeries] = useState('');
  const [kasinaSelectionStep, setKasinaSelectionStep] = useState<'series' | 'kasina'>('series');
  const [selectedKasina, setSelectedKasina] = useState(globalSelectedKasina || KASINA_TYPES.BLUE);
  
  // Custom color picker state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#8A2BE2'); // Default purple
  
  // Visual meditation state
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meditationTime, setMeditationTime] = useState(0);

  // Refs for session tracking
  const meditationStartRef = useRef<number | null>(null);
  const meditationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle kasina series selection
  const handleSeriesSelection = (series: string) => {
    setSelectedKasinaSeries(series);
    setKasinaSelectionStep('kasina');
  };

  // Handle individual kasina selection
  const handleKasinaSelection = (kasina: string) => {
    if (kasina === KASINA_TYPES.CUSTOM) {
      // Show color picker for custom kasina
      setShowColorPicker(true);
      setShowKasinaSelection(false);
    } else {
      setSelectedKasina(kasina);
      setGlobalSelectedKasina(kasina as any);
      setShowKasinaSelection(false);
      startMeditation();
      console.log(`🎨 Selected kasina: ${KASINA_NAMES[kasina]} (${kasina})`);
    }
  };

  // Handle custom color selection
  const handleCustomColorSelection = (color: string) => {
    setCustomColor(color);
    setSelectedKasina(KASINA_TYPES.CUSTOM);
    setGlobalSelectedKasina(KASINA_TYPES.CUSTOM);
    
    // Update the custom color in the constants temporarily
    KASINA_COLORS[KASINA_TYPES.CUSTOM] = color;
    
    setShowColorPicker(false);
    startMeditation();
    console.log(`🎨 Selected custom color: ${color}`);
  };

  // Start meditation timer - simplified and reliable
  const startMeditation = () => {
    if (meditationStartRef.current) return; // Already started
    
    const startTime = Date.now();
    meditationStartRef.current = startTime;
    
    // Generate session ID for recovery
    sessionIdRef.current = `session_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🧘 Starting visual meditation session: ${sessionIdRef.current}`);
    
    // Start ONE timer interval - this is the only timer
    meditationIntervalRef.current = setInterval(() => {
      if (meditationStartRef.current) {
        const elapsed = Math.floor((Date.now() - meditationStartRef.current) / 1000);
        setMeditationTime(elapsed);
        
        // Save checkpoint every 30 seconds
        if (elapsed > 0 && elapsed % 30 === 0) {
          console.log(`🔄 Timer checkpoint: ${elapsed}s elapsed`);
        }
      }
    }, 1000);
    
    // Show controls initially, then auto-hide after 3 seconds
    setShowControls(true);
    setShowCursor(true);
    startCursorTimeout();
  };

  // Start cursor and controls timeout
  const startCursorTimeout = () => {
    // Clear existing timeouts
    if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    // Show cursor and controls
    setShowCursor(true);
    setShowControls(true);
    
    // Hide cursor after 3 seconds
    cursorTimeoutRef.current = setTimeout(() => {
      setShowCursor(false);
    }, 3000);
    
    // Hide controls after 3 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
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

  // Mouse movement and focus mode handling
  useEffect(() => {
    const handleMouseMove = () => {
      setShowCursor(true);
      setShowControls(true);
      
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      // Set new timeouts to hide cursor and controls after 3 seconds
      cursorTimeoutRef.current = setTimeout(() => {
        setShowCursor(false);
      }, 3000);
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);

    };

    const handleMouseMoveWithFocus = () => {
      // Exit focus mode when mouse moves, but keep timer running
      if (isInFocusMode) {
        setIsInFocusMode(false);
      }
      handleMouseMove();
    };

    document.addEventListener('mousemove', handleMouseMoveWithFocus);
    
    // Initial timeout
    handleMouseMove();
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveWithFocus);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (meditationIntervalRef.current) {
        clearInterval(meditationIntervalRef.current);
      }
    };
  }, [isInFocusMode]);

  // Handle fullscreen changes with emergency checkpoint
  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen;
      const nowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nowFullscreen);
      
      // If exiting fullscreen during an active meditation session, just show cursor/controls
      if (wasFullscreen && !nowFullscreen && meditationStartRef.current && meditationTime > 0) {
        console.log(`🛡️ Exiting fullscreen during meditation - timer continues running`);
        
        // Show cursor and controls when exiting fullscreen
        startCursorTimeout();
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
    // Complete session recovery tracking
    if (sessionIdRef.current) {
      const recoverySuccess = await sessionRecovery.completeSession(meditationTime);
      console.log(`🛡️ Session recovery completion: ${recoverySuccess ? 'success' : 'failed'}`);
    }

    // Calculate duration and round down to nearest minute
    const durationInSeconds = meditationTime;
    const durationInMinutes = Math.floor(durationInSeconds / 60);
    
    // Only log if there was at least 1 minute of meditation
    if (durationInMinutes >= 1) {
      console.log(`🧘 Ending visual meditation session: ${durationInSeconds}s (${durationInMinutes} minutes)`);
      
      try {
        const kasinaName = `Visual Kasina (${KASINA_NAMES[selectedKasina]})`;
        
        await logSession({
          kasinaType: 'visual' as any,
          duration: durationInMinutes * 60,
          showToast: true
        });
        console.log(`✅ ${kasinaName} session logged: ${durationInMinutes} minute(s)`);
        
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
    
    navigate('/reflection');
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Visual kasina orb component - now uses the same advanced rendering as breath kasinas
  const VisualKasinaOrbMesh = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const waterMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const fireMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const airMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const earthMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const spaceMaterialRef = useRef<THREE.ShaderMaterial>(null);
    const lightMaterialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
      const time = state.clock.getElapsedTime();
      
      if (meshRef.current) {
        // Gentle rotation
        meshRef.current.rotation.y += 0.01;
        meshRef.current.rotation.x += 0.005;
      }
      
      // Update shader uniforms for all elemental kasinas
      if (waterMaterialRef.current) waterMaterialRef.current.uniforms.time.value = time;
      if (fireMaterialRef.current) fireMaterialRef.current.uniforms.time.value = time;
      if (airMaterialRef.current) airMaterialRef.current.uniforms.time.value = time;
      if (earthMaterialRef.current) earthMaterialRef.current.uniforms.time.value = time;
      if (spaceMaterialRef.current) spaceMaterialRef.current.uniforms.time.value = time;
      if (lightMaterialRef.current) lightMaterialRef.current.uniforms.time.value = time;
    });

    // Check if this is a Vajrayana kasina or special kasina needing Three.js rendering
    const isVajrayanaKasina = (
      selectedKasina === 'white_a_thigle' ||
      selectedKasina === 'white_a_kasina' ||
      selectedKasina === 'om_kasina' ||
      selectedKasina === 'ah_kasina' ||
      selectedKasina === 'hum_kasina' ||
      selectedKasina === 'rainbow_kasina' ||
      selectedKasina === 'light' ||
      selectedKasina === 'clear_light_thigle'
    );

    // For Vajrayana kasinas, render the special components
    if (isVajrayanaKasina) {
      return (
        <>
          {/* Invisible sphere to maintain ref compatibility */}
          <mesh ref={meshRef} visible={false}>
            <sphereGeometry args={[1, 64, 64]} />
          </mesh>
          
          {/* Render the appropriate Vajrayana component */}
          {selectedKasina === 'white_a_thigle' && <WhiteAThigle />}
          {selectedKasina === 'white_a_kasina' && <WhiteAKasina />}
          {selectedKasina === 'om_kasina' && <OmKasina />}
          {selectedKasina === 'ah_kasina' && <AhKasina />}
          {selectedKasina === 'hum_kasina' && <HumKasina />}
          {selectedKasina === 'rainbow_kasina' && <RainbowKasina />}
          {(selectedKasina === 'light' || selectedKasina === 'clear_light_thigle') && <WhiteAThigle />}
        </>
      );
    }

    // Elemental kasinas with Three.js shaders
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

    // For regular kasinas, use the simple sphere
    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial 
          color={KASINA_COLORS[selectedKasina] || '#4a90e2'} 
        />
      </mesh>
    );
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
      {/* Three.js Canvas with kasina orb - always visible in background */}
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 3], fov: 75 }}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.5}
          panSpeed={0.5}
          rotateSpeed={0.5}
          minDistance={1}
          maxDistance={10}
        />
        <VisualKasinaOrbMesh />
      </Canvas>
      
      {/* Kasina selection overlay - EXACT copy from breath kasinas */}
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
                  onClick={() => isPremium ? handleSeriesSelection('VAJRAYANA') : null}
                  style={{
                    backgroundColor: isPremium ? '#DC2626' : '#9CA3AF',
                    color: 'white',
                    border: 'none',
                    padding: '24px 32px',
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: isPremium ? 'pointer' : 'not-allowed',
                    width: '180px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease-out',
                    opacity: isPremium ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (isPremium) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.backgroundColor = '#B91C1C';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isPremium) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = '#DC2626';
                    }
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔮</div>
                  <div>Vajrayana Kasinas</div>
                  {!isPremium && (
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#FCD34D' }}>Premium Required</div>
                  )}
                </button>
              </div>
              
              {!isPremium && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    Vajrayana kasinas require premium subscription
                  </div>
                  <a 
                    href="https://www.contemplative.technology/subscribe" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background: 'linear-gradient(to right, #4F46E5, #7C3AED)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Upgrade to Premium
                  </a>
                </div>
              )}
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
                {getKasinasForSeries(selectedKasinaSeries).map((kasina) => (
                  <button
                    key={kasina}
                    onClick={() => handleKasinaSelection(kasina)}
                    style={{
                      backgroundColor: kasina === 'white_a_kasina' || kasina === 'white_a_thigle' ? '#4B5563' : KASINA_COLORS[kasina] || '#4B5563',
                      color: kasina === 'white' || kasina === 'yellow' || kasina === 'light' || kasina === 'air' || kasina === 'om_kasina' ? '#000' : '#fff',
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
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{KASINA_EMOJIS[kasina]}</div>
                    <div>{KASINA_NAMES[kasina]}</div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setKasinaSelectionStep('series')}
                style={{
                  backgroundColor: 'transparent',
                  color: '#4F46E5',
                  border: '2px solid #4F46E5',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4F46E5';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#4F46E5';
                }}
              >
                ← Back to Series
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Color Picker Modal */}
      {showColorPicker && (
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
              textAlign: 'center',
              maxWidth: '500px',
              margin: '20px'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
              Choose Your Custom Color
            </div>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
              Select a color or enter a hex code for your personalized kasina
            </div>
            
            {/* Color preview and picker combined */}
            <div style={{ marginBottom: '24px' }}>
              <div 
                style={{
                  position: 'relative',
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 16px',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('color-picker')?.click()}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: customColor,
                    borderRadius: '50%',
                    border: '3px solid #ddd',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
                <input
                  id="color-picker"
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '80px',
                    height: '80px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
            
            {/* Hex Code Input */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                Or enter hex code:
              </label>
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.match(/^#[0-9A-F]{0,6}$/i) || value === '') {
                    setCustomColor(value.startsWith('#') ? value : '#' + value);
                  }
                }}
                placeholder="#8A2BE2"
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  textAlign: 'center',
                  width: '150px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowColorPicker(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '2px solid #ddd',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Go Back
              </button>
              
              <button
                onClick={() => handleCustomColorSelection(customColor)}
                style={{
                  backgroundColor: '#4F46E5',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3730A3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4F46E5';
                }}
              >
                Start Meditation
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Meditation timer and controls - only show when not selecting kasina */}
      {!showKasinaSelection && showControls && (
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
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            End Session
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

      {/* Fullscreen toggle - only show when not selecting kasina */}
      {!showKasinaSelection && showControls && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-30"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            padding: '8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {isFullscreen ? '⛶' : '⛶'}
        </button>
      )}
    </div>
  );
};

export default VisualKasinaOrb;