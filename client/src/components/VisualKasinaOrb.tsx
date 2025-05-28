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

// Same shader materials as breath kasinas for consistency
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
    setSelectedKasina(kasina);
    setGlobalSelectedKasina(kasina as any);
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
        setIsInFocusMode(true);
        
        // Start meditation timer when entering focus mode
        if (!meditationStartRef.current) {
          meditationStartRef.current = Date.now();
          
          // Start session recovery tracking
          sessionIdRef.current = sessionRecovery.startSession('breath');
          console.log("🛡️ Started session recovery tracking for visual meditation");
          
          meditationIntervalRef.current = setInterval(() => {
            if (meditationStartRef.current) {
              const elapsed = Math.floor((Date.now() - meditationStartRef.current) / 1000);
              setMeditationTime(elapsed);
              
              // Update session recovery with current duration
              sessionRecovery.updateSession(elapsed);
            }
          }, 1000);
        }
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
      
      // If exiting fullscreen during an active meditation session, save session state
      if (wasFullscreen && !nowFullscreen && meditationStartRef.current && meditationTime > 0) {
        console.log(`🛡️ Exiting fullscreen during meditation - saving session state (${meditationTime}s)`);
        
        // Force an immediate session recovery update
        if (sessionIdRef.current) {
          sessionRecovery.updateSession(meditationTime);
        }
        
        // Create emergency checkpoint
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

  // Simple visual kasina orb component
  const VisualKasinaOrbMesh = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
      if (meshRef.current) {
        // Gentle rotation
        meshRef.current.rotation.y += 0.01;
        meshRef.current.rotation.x += 0.005;
      }
    });

    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial 
          color={KASINA_COLORS[selectedKasina] || '#4a90e2'} 
          shininess={100}
          transparent
          opacity={0.9}
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
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} />
        <VisualKasinaOrbMesh />
      </Canvas>
      
      {/* Kasina selection overlay - matches breath kasina design exactly */}
      {showKasinaSelection && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 20
          }}
        >
          {/* Back button */}
          <button
            onClick={() => navigate('/kasinas')}
            className="absolute top-4 left-4 z-30 text-white hover:text-gray-300 transition-colors text-lg"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ← Back to Kasinas
          </button>
          
          <div className="max-w-4xl mx-auto p-8 text-center">
            {kasinaSelectionStep === 'series' ? (
              // Series Selection
              <div>
                <h1 className="text-4xl font-bold mb-8 text-white">Choose a Kasina Series</h1>
                <div className="grid gap-6 max-w-2xl mx-auto">
                  {/* Color Kasinas */}
                  <div 
                    onClick={() => handleSeriesSelection('COLOR')}
                    className="bg-gray-800 rounded-lg p-8 cursor-pointer hover:bg-gray-700 transition-all transform hover:scale-105 border border-gray-600"
                  >
                    <div className="text-4xl mb-4">🌈</div>
                    <h2 className="text-2xl font-bold mb-2 text-white">Color Kasinas</h2>
                    <p className="text-gray-300">Pure color meditation objects for concentration practice</p>
                  </div>

                  {/* Elemental Kasinas */}
                  <div 
                    onClick={() => handleSeriesSelection('ELEMENTAL')}
                    className="bg-gray-800 rounded-lg p-8 cursor-pointer hover:bg-gray-700 transition-all transform hover:scale-105 border border-gray-600"
                  >
                    <div className="text-4xl mb-4">🌍</div>
                    <h2 className="text-2xl font-bold mb-2 text-white">Elemental Kasinas</h2>
                    <p className="text-gray-300">Earth, water, fire, air, and space meditation objects</p>
                  </div>

                  {/* Vajrayana Kasinas */}
                  <div 
                    onClick={() => isPremium ? handleSeriesSelection('VAJRAYANA') : null}
                    className={`rounded-lg p-8 border ${
                      isPremium 
                        ? 'bg-gray-800 cursor-pointer hover:bg-gray-700 transition-all transform hover:scale-105 border-gray-600' 
                        : 'bg-gray-900 border-gray-700 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-4xl mb-4">🕉️</div>
                    <h2 className="text-2xl font-bold mb-2 text-white">
                      Vajrayana Kasinas {!isPremium && <span className="text-yellow-400 text-sm">✦ Premium</span>}
                    </h2>
                    <p className="text-gray-300">Advanced Tibetan meditation objects and mantras</p>
                    {!isPremium && (
                      <div className="mt-4">
                        <p className="text-yellow-400 text-sm mb-3">Premium subscription required</p>
                        <a 
                          href="https://www.contemplative.technology/subscribe" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-6 rounded-full text-sm font-medium shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Upgrade to Premium
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Individual Kasina Selection
              <div>
                <button 
                  onClick={() => setKasinaSelectionStep('series')}
                  className="mb-6 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  ← Back to Series
                </button>
                <h1 className="text-3xl font-bold mb-8 text-white">
                  Choose Your {selectedKasinaSeries === 'COLOR' ? 'Color' : selectedKasinaSeries === 'ELEMENTAL' ? 'Elemental' : 'Vajrayana'} Kasina
                </h1>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {getKasinasForSeries(selectedKasinaSeries).map((kasina) => (
                    <div
                      key={kasina}
                      onClick={() => handleKasinaSelection(kasina)}
                      className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700 transition-all transform hover:scale-105 border border-gray-600 text-center"
                      style={{
                        background: `linear-gradient(135deg, ${KASINA_COLORS[kasina] || '#4a5568'}, rgba(0,0,0,0.3))`
                      }}
                    >
                      <div className="text-3xl mb-3">{KASINA_EMOJIS[kasina]}</div>
                      <h3 className="text-lg font-semibold text-white">{KASINA_NAMES[kasina]}</h3>
                    </div>
                  ))}
                </div>
              </div>
            )}
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