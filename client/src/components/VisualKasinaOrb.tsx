import React, { useRef, useState, useEffect, useMemo } from 'react';
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
import OffscreenKasinaOrb from './OffscreenKasinaOrb';
import * as THREE from 'three';
import { getKasinaShader } from '../lib/shaders/kasinaShaders';
import { storage } from '../lib/indexedDBStorage';

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
  // Use ref to ensure initialization only happens once
  const componentInitialized = useRef(false);
  
  // CRITICAL DEBUGGING: Track component lifecycle
  useEffect(() => {
    const mountTime = new Date().toISOString();
    console.log(`[MOUNT] VisualKasinaOrb mounted at ${mountTime}`);
    localStorage.setItem('visualKasinaLastMount', mountTime);
    
    // Save to diagnostics log
    const lifecycleEvents = JSON.parse(localStorage.getItem('componentLifecycle') || '[]');
    lifecycleEvents.push({
      type: 'MOUNT',
      component: 'VisualKasinaOrb',
      timestamp: mountTime,
      sessionTime: 0
    });
    localStorage.setItem('componentLifecycle', JSON.stringify(lifecycleEvents));
    
    return () => {
      const unmountTime = new Date().toISOString();
      console.log(`[UNMOUNT] VisualKasinaOrb unmounting at ${unmountTime}`);
      localStorage.setItem('visualKasinaLastUnmount', unmountTime);
      
      // Log the duration for analysis
      const mountTimeStored = localStorage.getItem('visualKasinaLastMount');
      let duration = 0;
      if (mountTimeStored) {
        duration = (new Date().getTime() - new Date(mountTimeStored).getTime()) / 1000;
        console.log(`[UNMOUNT] Component was mounted for ${duration} seconds`);
        localStorage.setItem('visualKasinaLastDuration', duration.toString());
      }
      
      // Save unmount event to diagnostics log
      const lifecycleEvents = JSON.parse(localStorage.getItem('componentLifecycle') || '[]');
      lifecycleEvents.push({
        type: 'UNMOUNT',
        component: 'VisualKasinaOrb',
        timestamp: unmountTime,
        sessionTime: duration,
        reason: 'component_cleanup'
      });
      localStorage.setItem('componentLifecycle', JSON.stringify(lifecycleEvents));
    };
  }, []);
  
  // Simplified WebGL recovery monitoring
  useEffect(() => {
    if (componentInitialized.current) return;
    
    // Add platform-level termination detection
    const detectPlatformTermination = () => {
      // Memory pressure API (Chrome/Edge)
      if ('memory' in performance) {
        const memoryInfo = (performance as any).memory;
        if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.9) {
          console.error('🚨 MEMORY PRESSURE DETECTED:', {
            timestamp: new Date().toISOString(),
            sessionTime: meditationTime,
            usedHeap: memoryInfo.usedJSHeapSize,
            heapLimit: memoryInfo.jsHeapSizeLimit,
            likely_cause: 'browser_memory_policy'
          });
          
          const lifecycleEvents = JSON.parse(localStorage.getItem('componentLifecycle') || '[]');
          lifecycleEvents.push({
            type: 'MEMORY_PRESSURE',
            component: 'VisualKasinaOrb',
            timestamp: new Date().toISOString(),
            sessionTime: meditationTime,
            reason: 'browser_memory_policy_enforcement'
          });
          localStorage.setItem('componentLifecycle', JSON.stringify(lifecycleEvents));
        }
      }

      // Page lifecycle API detection
      if ('onfreeze' in document) {
        document.addEventListener('freeze', () => {
          console.error('🚨 PAGE FREEZE DETECTED:', {
            timestamp: new Date().toISOString(),
            sessionTime: meditationTime,
            likely_cause: 'browser_tab_management'
          });
          
          const lifecycleEvents = JSON.parse(localStorage.getItem('componentLifecycle') || '[]');
          lifecycleEvents.push({
            type: 'PAGE_FREEZE',
            component: 'VisualKasinaOrb',
            timestamp: new Date().toISOString(),
            sessionTime: meditationTime,
            reason: 'browser_tab_lifecycle_management'
          });
          localStorage.setItem('componentLifecycle', JSON.stringify(lifecycleEvents));
        });
      }

      // Visibility state monitoring for background tab policies
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          console.log('🔍 Tab became hidden - potential policy enforcement point:', {
            timestamp: new Date().toISOString(),
            sessionTime: meditationTime
          });
          
          const stateChanges = JSON.parse(localStorage.getItem('stateChanges') || '[]');
          stateChanges.push({
            type: 'TAB_HIDDEN',
            timestamp: new Date().toISOString(),
            sessionTime: meditationTime,
            component: 'VisualKasinaOrb'
          });
          localStorage.setItem('stateChanges', JSON.stringify(stateChanges));
        }
      });
    };

    detectPlatformTermination();
    
    return () => {
      clearTimeout(timeoutId);
    };
    
    console.log('🚀 VisualKasinaOrb component loading - crash detection and proactive reset active');
    
    // Global error handlers for catching hidden exceptions
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('🚨 Unhandled error in visual kasina:', event.error);
      const errorData = {
        timestamp: new Date().toISOString(),
        sessionTime: 0, // Will be updated when meditationTime is available
        error: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        },
        type: 'unhandled_error'
      };
      
      (async () => {
        try {
          await storage.setItemSafe('diagnostics', 'lastError', errorData);
        } catch (e) {
          localStorage.setItem('lastError', JSON.stringify(errorData));
        }
      })();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled promise rejection in visual kasina:', event.reason);
      const errorData = {
        timestamp: new Date().toISOString(),
        sessionTime: 0, // Will be updated when meditationTime is available
        error: {
          reason: event.reason?.toString(),
          stack: event.reason?.stack
        },
        type: 'unhandled_rejection'
      };
      
      (async () => {
        try {
          await storage.setItemSafe('diagnostics', 'lastError', errorData);
        } catch (e) {
          localStorage.setItem('lastError', JSON.stringify(errorData));
        }
      })();
    };

    // Add global error listeners
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    localStorage.setItem('visualModeActive', 'true');
    localStorage.setItem('visualModeStartTime', Date.now().toString());
    componentInitialized.current = true;
    
    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  const { selectedKasina, setSelectedKasina } = useKasina();
  const { currentColor } = useColor();
  const navigate = useNavigate();
  const { logSession } = useSessionLogger();
  const { enableWakeLock, disableWakeLock } = useWakeLock();
  
  // State for UI controls (moved before error handlers)
  const [meditationTime, setMeditationTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sizeMultiplier, setSizeMultiplier] = useState(0.3); // Start at 30%
  const [safeMode, setSafeMode] = useState(false); // Fallback to simple rendering
  const [sceneKey, setSceneKey] = useState(0); // For seamless scene recreation
  const [useOffscreenCanvas, setUseOffscreenCanvas] = useState(true); // Default to worker-based rendering
  
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
  const meditationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meditationStartRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionInitializedRef = useRef<boolean>(false);
  
  // Kasina usage tracking
  const kasinaUsageRef = useRef<{ [kasina: string]: number }>({});
  const currentKasinaStartRef = useRef<number>(Date.now());
  
  // Comprehensive crash monitoring
  useEffect(() => {
    console.log('🔍 Visual mode session started, crash monitoring active');
    
    // Immediate localStorage marker to detect hard crashes
    localStorage.setItem('visualModeActive', 'true');
    localStorage.setItem('visualModeStartTime', Date.now().toString());
    
    // Track session for debugging
    const sessionData = {
      startTime: new Date().toISOString(),
      kasina: selectedKasina,
      size: sizeMultiplier,
      userAgent: navigator.userAgent,
      memoryInfo: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : 'not available'
    };
    localStorage.setItem('visualModeSession', JSON.stringify(sessionData));
    
    const handleError = (event: ErrorEvent) => {
      const crashData = {
        timestamp: new Date().toISOString(),
        meditationTime,
        selectedKasina,
        sizeMultiplier,
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        userAgent: navigator.userAgent,
        memoryAtCrash: (performance as any).memory ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
        } : 'not available',
        webglState: 'error_occurred_during_session',
        lastPerformanceSnapshot: localStorage.getItem('performanceSnapshots') ? 
          JSON.parse(localStorage.getItem('performanceSnapshots') || '[]').slice(-1)[0] : null
      };
      
      localStorage.setItem('visualModeCrash', JSON.stringify(crashData));
      console.error('Visual mode crash logged:', crashData);
      
      // Also save to a persistent crash log file that survives logout
      const crashLog = localStorage.getItem('persistentCrashLog') || '[]';
      const crashes = JSON.parse(crashLog);
      crashes.push({
        ...crashData,
        sessionId: sessionIdRef.current,
        crashType: 'javascript_error'
      });
      // Keep only last 10 crashes to prevent storage bloat
      if (crashes.length > 10) crashes.shift();
      localStorage.setItem('persistentCrashLog', JSON.stringify(crashes));
      
      if (meditationTime >= 60) {
        endMeditation().catch(() => {});
      }
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const crashData = {
        timestamp: new Date().toISOString(),
        meditationTime,
        selectedKasina,
        type: 'promise_rejection',
        reason: event.reason?.toString() || 'Unknown promise rejection',
        memoryAtCrash: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : 'not available'
      };
      
      localStorage.setItem('visualModePromiseRejection', JSON.stringify(crashData));
      console.error('Promise rejection logged:', crashData);
    };
    
    // Removed aggressive memory monitoring
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // WebGL recovery will be handled by the centralized system
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      // Removed memory monitoring cleanup
      
      // Clean up WebGL event listeners
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleWebGLContextLoss);
        canvas.removeEventListener('webglcontextrestored', handleWebGLContextRestored);
      }
      
      // Mark clean exit
      localStorage.removeItem('visualModeActive');
      localStorage.removeItem('visualModeStartTime');
      console.log('Visual mode session ended cleanly, crash monitoring stopped');
    };
  }, []); // Run only once on mount
  
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
      
      // CRITICAL FIX: Force infinite timer mode for visual kasina sessions
      // This ensures any cached timer state is overridden
      const { useSimpleTimer } = await import('../lib/stores/useSimpleTimer');
      useSimpleTimer.getState().setInfiniteMode();
      console.log('🔄 Forced infinite timer mode for visual kasina session');
      
      // TESTING: Platform timeout bypass temporarily disabled to test crash theory
      // const isProduction = window.location.hostname !== 'localhost';
      // if (isProduction) {
      //   console.log('🏭 Production environment detected - implementing timeout bypass');
      //   const platformTimeoutBypass = setInterval(() => {
      //     try {
      //       localStorage.setItem('lastActivity', Date.now().toString());
      //       console.log('🔄 Platform timeout bypass refresh executed');
      //     } catch (e) {
      //       console.warn('Platform timeout bypass failed:', e);
      //     }
      //   }, 120000);
      //   (window as any).platformTimeoutBypass = platformTimeoutBypass;
      // }
      
      // TESTING: Session recovery temporarily disabled to test crash theory
      // sessionIdRef.current = sessionRecovery.startSession(selectedKasina as any);
      
      console.log('🧘 Visual kasina meditation session started');
      
      // Enable wake lock to prevent screen from sleeping
      enableWakeLock();
      console.log("🔒 Wake lock enabled - screen will stay awake during meditation");
      
      // Implement aggressive timeout prevention with multiple strategies
      const activitySignal = setInterval(() => {
        // Multiple DOM interactions to signal activity
        document.body.style.transform = 'translateZ(0)';
        document.body.offsetHeight; // Force reflow
        document.body.style.transform = '';
        
        // Create and remove a small element to trigger DOM activity
        const tempEl = document.createElement('div');
        tempEl.style.position = 'absolute';
        tempEl.style.left = '-9999px';
        document.body.appendChild(tempEl);
        setTimeout(() => {
          if (tempEl.parentNode) {
            tempEl.parentNode.removeChild(tempEl);
          }
        }, 1);
        
        // Update localStorage and sessionStorage
        try {
          const timestamp = Date.now().toString();
          localStorage.setItem('meditation_active', timestamp);
          sessionStorage.setItem('session_heartbeat', timestamp);
        } catch (e) {
          // Silent fail for storage issues
        }
        
        // Post message to self to maintain message loop activity
        window.postMessage({ type: 'meditation_heartbeat', timestamp: Date.now() }, '*');
      }, 15000); // Every 15 seconds (more frequent)
      
      (window as any).meditationActivitySignal = activitySignal;
      
      // Auto-enter fullscreen for meditation session
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
          console.log("📺 Entered fullscreen for Visual Kasina meditation session");
        }
      } catch (error) {
        console.log("📺 Fullscreen request failed:", error);
      }
      
      // Mark as initialized
      sessionInitializedRef.current = true;
    };

    initializeSession();

    // Start meditation timer with safety limits
    meditationIntervalRef.current = setInterval(() => {
      setMeditationTime(prev => {
        const newTime = prev + 1;
        
        // Safety limit: Auto-end session after 60 minutes to prevent crashes
        if (newTime >= 3600) {
          console.warn('Session reached 60-minute safety limit, ending to prevent crashes');
          localStorage.setItem('visualModeSessionLimit', JSON.stringify({
            timestamp: new Date().toISOString(),
            duration: newTime,
            reason: 'safety_limit_60min'
          }));
          setTimeout(() => endMeditation(), 1000);
          return newTime;
        }
        

        
        // Simple session tracking every 60 seconds
        if (newTime > 0 && newTime % 60 === 0) {
          console.log(`🔄 Session checkpoint: ${newTime}s elapsed`);
        }
        

        

        

        
        // Removed critical window monitoring
        
        // Removed GPU reset logic - it was causing context loss crashes
        
        return newTime;
      });
    }, 1000);

    // Cleanup function
    return () => {
      if (meditationIntervalRef.current) {
        clearInterval(meditationIntervalRef.current);
      }
      
      // TESTING: Session recovery cleanup disabled during crash testing
      // if (sessionIdRef.current) {
      //   console.log('🛡️ Clearing session recovery on component unmount');
      //   sessionRecovery.clearSession();
      //   sessionIdRef.current = null;
      // }
      
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

  // Listen for fullscreen changes and WebGL context loss
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // WebGL context loss detection
    const handleContextLoss = (event: Event) => {
      console.error('🚨 WebGL context lost detected!', {
        timestamp: new Date().toISOString(),
        sessionTime: meditationTime,
        event: event
      });
      
      // Save critical data immediately
      const contextLossData = {
        timestamp: new Date().toISOString(),
        sessionTime: meditationTime,
        kasina: selectedKasina,
        cause: 'webgl_context_loss',
        userAgent: navigator.userAgent
      };
      localStorage.setItem('webglContextLoss', JSON.stringify(contextLossData));
      
      // Prevent default behavior to see if we can handle it gracefully
      event.preventDefault();
    };

    const handleContextRestored = (event: Event) => {
      console.log('✅ WebGL context restored', {
        timestamp: new Date().toISOString(),
        sessionTime: meditationTime
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Add WebGL context event listeners to all canvas elements
    const addWebGLListeners = () => {
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        canvas.addEventListener('webglcontextlost', handleContextLoss);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
      });
    };

    // Add listeners immediately and after a short delay for dynamic canvases
    addWebGLListeners();
    const timeoutId = setTimeout(addWebGLListeners, 1000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      // Remove WebGL listeners
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        canvas.removeEventListener('webglcontextlost', handleContextLoss);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      });
      
      clearTimeout(timeoutId);
      
      // Clean up activity signal
      if ((window as any).meditationActivitySignal) {
        clearInterval((window as any).meditationActivitySignal);
        delete (window as any).meditationActivitySignal;
      }
    };
  }, [meditationTime, selectedKasina]);

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
    
    // Clean up platform timeout bypass if it exists
    if ((window as any).platformTimeoutBypass) {
      clearInterval((window as any).platformTimeoutBypass);
      delete (window as any).platformTimeoutBypass;
      console.log('🏭 Platform timeout bypass cleaned up');
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

  // Use unified background color function with memoization
  const backgroundColor = useMemo(() => {
    return getKasinaBackgroundColor(selectedKasina);
  }, [selectedKasina]);

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
    
    // Chapter state for visual progression
    const [currentChapter, setCurrentChapter] = useState(0);
    const [chapterTransition, setChapterTransition] = useState(false);
    
    // Listen for chapter transitions
    useEffect(() => {
      const handleChapterTransition = (event: Event) => {
        const customEvent = event as CustomEvent;
        setChapterTransition(true);
        console.log(`🎭 Visual transition to Chapter ${customEvent.detail.chapter}`);
        
        // Fade out, change chapter, fade in
        setTimeout(() => {
          setCurrentChapter(customEvent.detail.chapter);
          setTimeout(() => {
            setChapterTransition(false);
          }, 500);
        }, 500);
      };
      
      window.addEventListener('kasina-chapter-transition', handleChapterTransition);
      return () => window.removeEventListener('kasina-chapter-transition', handleChapterTransition);
    }, []);
    
    // Remove interval-based monitoring to prevent memory leaks

    useFrame((state) => {
      // More aggressive periodic yielding to prevent platform timeout detection
      const frameCount = state.clock.getElapsedTime() * 60; // Approximate frame count
      if (Math.floor(frameCount) % 180 === 0) { // Every 3 seconds
        // Brief yield to let browser process other tasks
        setTimeout(() => {}, 0);
        // Additional yield with requestIdleCallback if available
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {});
        }
      }
      
      try {
        if (meshRef.current) {
          const time = state.clock.getElapsedTime();
          
          // Chapter-based visual modifications
          const chapterIntensity = 1 + (currentChapter * 0.2); // Gradually increase intensity
          const chapterSpeed = 1 + (currentChapter * 0.1); // Gradually increase speed
          
          // Different rotation behaviors for different kasinas
          if (selectedKasina === KASINA_TYPES.WATER) {
            // Water kasina gets flowing motion instead of uniform rotation
            meshRef.current.rotation.y = Math.sin(time * 0.3 * chapterSpeed) * 0.1 * chapterIntensity + time * 0.05;
            meshRef.current.rotation.x = Math.cos(time * 0.2 * chapterSpeed) * 0.05 * chapterIntensity;
          } else if (selectedKasina === KASINA_TYPES.SPACE || selectedKasina === KASINA_TYPES.LIGHT) {
            // Space and Light kasinas have subtle pulsing that intensifies with chapters
            const pulse = Math.sin(time * chapterSpeed) * 0.1 * chapterIntensity;
            meshRef.current.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
            meshRef.current.rotation.y = 0;
            meshRef.current.rotation.x = 0;
            meshRef.current.rotation.z = 0;
          } else {
            // Other elemental kasinas get rotation that evolves with chapters
            meshRef.current.rotation.y = time * 0.15 * chapterSpeed;
          }
          
          // Apply size multiplier
          const targetScale = sizeMultiplier;
          meshRef.current.scale.setScalar(targetScale);
        }
      } catch (error) {
        console.error('Error in mesh animation frame:', error);
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

      // Throttle shader time updates - only update every few frames to reduce computational load
      try {
        const rawTime = state.clock.getElapsedTime();
        const wrappedTime = rawTime % 1000; // Reset time every 1000 seconds to prevent overflow
        const frameCount = Math.floor(rawTime * 60); // Approximate frame count
        
        // Update shader uniforms only every 3rd frame to reduce computational load
        if (frameCount % 3 === 0) {
          if (waterMaterialRef.current) {
            waterMaterialRef.current.uniforms.time.value = wrappedTime;
          }
          if (fireMaterialRef.current) {
            fireMaterialRef.current.uniforms.time.value = wrappedTime;
          }
          if (airMaterialRef.current) {
            airMaterialRef.current.uniforms.time.value = wrappedTime;
          }
          if (earthMaterialRef.current) {
            earthMaterialRef.current.uniforms.time.value = wrappedTime;
          }
          if (spaceMaterialRef.current) {
            spaceMaterialRef.current.uniforms.time.value = wrappedTime;
          }
          if (lightMaterialRef.current) {
            lightMaterialRef.current.uniforms.time.value = wrappedTime;
          }
        }
      } catch (error) {
        console.error('Error updating shader uniforms:', error);
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

    // Elemental kasinas with optimized shaders for stability
    const elementalKasinas = [
      KASINA_TYPES.WATER, KASINA_TYPES.FIRE, KASINA_TYPES.AIR, 
      KASINA_TYPES.EARTH, KASINA_TYPES.SPACE, KASINA_TYPES.LIGHT
    ];
    
    if (elementalKasinas.includes(selectedKasina)) {
      const shader = getKasinaShader(selectedKasina);
      const materialRef = selectedKasina === KASINA_TYPES.WATER ? waterMaterialRef :
                         selectedKasina === KASINA_TYPES.FIRE ? fireMaterialRef :
                         selectedKasina === KASINA_TYPES.AIR ? airMaterialRef :
                         selectedKasina === KASINA_TYPES.EARTH ? earthMaterialRef :
                         selectedKasina === KASINA_TYPES.SPACE ? spaceMaterialRef :
                         lightMaterialRef;
                         
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 32, 32]} />
          <shaderMaterial
            ref={materialRef}
            uniforms={shader.uniforms}
            vertexShader={shader.vertexShader}
            fragmentShader={shader.fragmentShader}
            transparent={true}
          />
        </mesh>
      );
    }

    const baseColor = KASINA_COLORS[selectedKasina] || currentColor || '#4A90E2';
    
    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color={baseColor} 
          depthWrite={true}
          depthTest={true}
        />
      </mesh>
    );
  };

  return (
    <div 
      className={`kasina-container h-screen w-screen relative overflow-hidden ${!showCursor ? 'cursor-none' : ''}`}
      style={{ 
        '--kasina-bg-color': backgroundColor,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1
      } as React.CSSProperties & { '--kasina-bg-color': string }}
    >
      {useOffscreenCanvas ? (
        <OffscreenKasinaOrb
          selectedKasina={selectedKasina}
          currentColor={currentColor}
          size={sizeMultiplier}
          onReady={() => {
            console.log('🎯 OffscreenCanvas worker ready - platform timeout protection active');
          }}
          onError={(error) => {
            console.log('OffscreenCanvas not supported, falling back to main thread rendering');
            setUseOffscreenCanvas(false);
          }}
        />
      ) : (
        <Canvas 
          key={sceneKey} // Force scene recreation when key changes
          camera={{ position: [0, 0, 4], fov: 50 }}
          gl={{ 
            antialias: false,
            powerPreference: "default", // Use default instead of low-power
            failIfMajorPerformanceCaveat: false, // Allow all GPU configurations
            preserveDrawingBuffer: false,
            alpha: true, // Allow transparency to show background colors
            depth: true,
            stencil: false,
            // Force stable context creation
            premultipliedAlpha: false
          }}
          dpr={[1, 1.5]}
          performance={{ min: 0.3 }}
          frameloop="always"
        onCreated={(state) => {
          // Limit frame rate to reduce GPU stress
          state.setFrameloop('always');
          state.clock.start();
          // Add WebGL context error handling
          const gl = state.gl.getContext();
          
          // Comprehensive WebGL diagnostics
          const diagnostics = {
            timestamp: new Date().toISOString(),
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
            maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
            maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
            maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
            extensions: gl.getSupportedExtensions(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            memory: (performance as any).memory ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
            } : null
          };
          
          console.log('WebGL Diagnostics:', diagnostics);
          localStorage.setItem('webglDiagnostics', JSON.stringify(diagnostics));
          
          // Add context lost/restored handlers with automatic recovery
          state.gl.domElement.addEventListener('webglcontextlost', (event) => {
            console.error('WebGL context lost - attempting recovery:', event);
            event.preventDefault(); // Prevent default handling to enable recovery
            
            // Log context loss to persistent crash log
            const crashLog = localStorage.getItem('persistentCrashLog') || '[]';
            const crashes = JSON.parse(crashLog);
            crashes.push({
              timestamp: new Date().toISOString(),
              crashType: 'webgl_context_lost',
              message: 'WebGL context was lost - recovery attempted',
              userAgent: navigator.userAgent,
              meditationTime
            });
            if (crashes.length > 10) crashes.shift();
            localStorage.setItem('persistentCrashLog', JSON.stringify(crashes));
          });
          
          state.gl.domElement.addEventListener('webglcontextrestored', (event) => {
            console.log('WebGL context restored successfully:', event);
            
            // Force re-render to restore all materials and shaders
            state.invalidate();
            
            // Log successful recovery
            const crashLog = localStorage.getItem('persistentCrashLog') || '[]';
            const crashes = JSON.parse(crashLog);
            crashes.push({
              timestamp: new Date().toISOString(),
              crashType: 'webgl_context_restored',
              message: 'WebGL context restored successfully',
              userAgent: navigator.userAgent,
              meditationTime
            });
            if (crashes.length > 10) crashes.shift();
            localStorage.setItem('persistentCrashLog', JSON.stringify(crashes));
          });
        }}
        onError={(error) => {
          console.error('Canvas error:', error);
          
          // Log Canvas errors to persistent crash log
          const crashLog = localStorage.getItem('persistentCrashLog') || '[]';
          const crashes = JSON.parse(crashLog);
          crashes.push({
            timestamp: new Date().toISOString(),
            crashType: 'canvas_error',
            message: 'Canvas initialization error',
            error: error.toString(),
            userAgent: navigator.userAgent
          });
          if (crashes.length > 10) crashes.shift();
          localStorage.setItem('persistentCrashLog', JSON.stringify(crashes));
        }}
      >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <VisualKasinaOrbMesh />
        </Canvas>
      )}

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