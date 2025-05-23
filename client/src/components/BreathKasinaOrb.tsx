import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import '../styles/kasina-animations.css';
import '../styles/breath-kasina.css';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';
import { useSessionLogger } from '../lib/stores/useSessionLogger';
import { useKasina } from '../lib/stores/useKasina';
import { KASINA_TYPES, KASINA_NAMES, KASINA_EMOJIS, KASINA_SERIES, KASINA_COLORS, KASINA_BACKGROUNDS } from '../lib/constants';
import WhiteAKasina from './WhiteAKasina';
import WhiteAThigle from './WhiteAThigle';
import OmKasina from './OmKasina';
import AhKasina from './AhKasina';
import HumKasina from './HumKasina';
import RainbowKasina from './RainbowKasina';
import ElementalKasina from '../lib/kasina-orbs/ElementalKasina';
import * as THREE from 'three';

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
  
  // Handle wheel scroll to adjust breathing range scale
  useEffect(() => {
    const handleWheel = (e: any) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1; // Scroll down = smaller, scroll up = larger
      setSizeScale(prev => Math.max(0.05, Math.min(3.0, prev + delta))); // Range: 0.05x to 3.0x (much smaller zoom-out)
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
          meditationIntervalRef.current = setInterval(() => {
            if (meditationStartRef.current) {
              const elapsed = Math.floor((Date.now() - meditationStartRef.current) / 1000);
              setMeditationTime(elapsed);
            }
          }, 1000);
        }
      }, 3000);
    };

    const handleMouseMoveWithFocus = () => {
      // Exit focus mode when mouse moves
      if (isInFocusMode) {
        setIsInFocusMode(false);
        // Pause meditation timer but don't reset
        if (meditationIntervalRef.current) {
          clearInterval(meditationIntervalRef.current);
          meditationIntervalRef.current = null;
        }
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
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
    // Calculate duration in seconds and round down to nearest minute
    const durationInSeconds = meditationTime;
    const durationInMinutes = Math.floor(durationInSeconds / 60); // Round down to nearest minute
    
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
    if (meditationIntervalRef.current) {
      clearInterval(meditationIntervalRef.current);
      meditationIntervalRef.current = null;
    }
    
    // Always navigate to Reflection page when ending session
    navigate('/reflection');
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
  
  // Update the orb size based on breath amplitude with hold detection
  useEffect(() => {
    if (!activeIsListening) return;
    
    // Adjusted breathing size range with scroll-based scaling - extended for complete screen merger
    const baseMinSize = 0.1; // Much smaller minimum for deeper exhale range
    const baseMaxSize = 4000; // Dramatically increased to ensure complete screen coverage for meditative merger
    const minSize = Math.floor(baseMinSize * sizeScale);
    const maxSize = Math.floor(baseMaxSize * sizeScale);
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
    const newSize = Math.floor(minSize + (sizeRange * clampedAmplitude));
    
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
    
    // Apply breathing animation to all kasina types
    useFrame(() => {
      if (groupRef.current) {
        // Convert orbSize (pixels) to Three.js scale
        const scale = orbSize / 150; // 150px = 1.0 scale baseline
        groupRef.current.scale.setScalar(scale);
      }
      
      if (meshRef.current) {
        // For basic kasinas, also apply scale
        const scale = orbSize / 150;
        meshRef.current.scale.setScalar(scale);
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
        <group ref={groupRef}>
          <ElementalKasina type="water" color="#3b82f6" emissive="#60a5fa" />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.AIR) {
      return (
        <group ref={groupRef}>
          <ElementalKasina type="air" color="#e5e7eb" emissive="#f3f4f6" />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.FIRE) {
      return (
        <group ref={groupRef}>
          <ElementalKasina type="fire" color="#ef4444" emissive="#f97316" />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.EARTH) {
      return (
        <group ref={groupRef}>
          <ElementalKasina type="earth" color="#a3a3a3" emissive="#d4d4d8" />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.SPACE) {
      return (
        <group ref={groupRef}>
          <ElementalKasina type="space" color="#6366f1" emissive="#8b5cf6" />
        </group>
      );
    } else if (selectedKasina === KASINA_TYPES.LIGHT) {
      return (
        <group ref={groupRef}>
          <ElementalKasina type="light" color="#fbbf24" emissive="#fde047" />
        </group>
      );
    } else {
      // Basic color kasinas
      return (
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial color={getKasinaColor(selectedKasina)} />
        </mesh>
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
                    minWidth: '140px',
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
                    minWidth: '140px',
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
                    minWidth: '140px',
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
                      backgroundColor: kasina === KASINA_TYPES.WHITE_A_KASINA ? '#4B5563' : getKasinaColor(kasina),
                      color: ['white', 'yellow', 'light'].includes(kasina) || kasina === KASINA_TYPES.WHITE_A_KASINA ? '#fff' : '#fff',
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