import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Play, Pause, Square, Settings, Volume2 } from 'lucide-react';

interface BiometricData {
  heartRate?: number;
  breathingRate?: number;
  skinConductance?: number;
  eyeMovement?: { x: number; y: number };
}

interface MeditationState {
  phase: 'preparation' | 'deepening' | 'maintenance' | 'completion';
  depth: number;
  stability: number;
  focus: number;
  duration: number;
}

function AdaptiveVisualField({ state, biometrics }: { state: MeditationState; biometrics: BiometricData }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((frameState) => {
    if (groupRef.current) {
      const time = frameState.clock.getElapsedTime();
      
      // Rotate based on meditation depth
      const rotationSpeed = 0.1 + (state.depth / 100) * 0.2;
      groupRef.current.rotation.y = time * rotationSpeed;
      
      // Scale breathing effect based on biometric data
      const breathingScale = biometrics.breathingRate ? 
        1 + Math.sin(time * (biometrics.breathingRate / 10)) * 0.1 : 
        1 + Math.sin(time * 2) * 0.1;
      groupRef.current.scale.setScalar(breathingScale);
    }

    if (particlesRef.current) {
      const time = frameState.clock.getElapsedTime();
      const geometry = particlesRef.current.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position;
      
      if (positions) {
        const array = positions.array as Float32Array;
        for (let i = 0; i < array.length; i += 3) {
          const originalY = array[i + 1];
          array[i + 1] = originalY + Math.sin(time + i) * state.stability * 0.01;
        }
        positions.needsUpdate = true;
      }
    }
  });

  // Generate particle field based on meditation state
  const particleCount = Math.floor(100 + state.focus * 2);
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );
  }

  const getPhaseColor = () => {
    switch (state.phase) {
      case 'preparation': return '#ffd43b';
      case 'deepening': return '#51cf66';
      case 'maintenance': return '#4c6ef5';
      case 'completion': return '#9775fa';
      default: return '#74c0fc';
    }
  };

  return (
    <group ref={groupRef}>
      <Sphere args={[2, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={getPhaseColor()}
          transparent
          opacity={0.3 + state.depth * 0.007}
          emissive={getPhaseColor()}
          emissiveIntensity={0.1 + state.focus * 0.003}
        />
      </Sphere>
      
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={new Float32Array(particles)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05 + state.stability * 0.001}
          color={getPhaseColor()}
          transparent
          opacity={0.8}
        />
      </points>
      
      <Text
        position={[0, -3, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {state.phase.charAt(0).toUpperCase() + state.phase.slice(1)}
      </Text>
    </group>
  );
}

function BiometricMonitor({ biometrics, onUpdate }: { 
  biometrics: BiometricData; 
  onUpdate: (data: BiometricData) => void;
}) {
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate biometric data updates
      const newData: BiometricData = {
        heartRate: 60 + Math.random() * 40,
        breathingRate: 12 + Math.random() * 8,
        skinConductance: Math.random() * 100,
        eyeMovement: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        }
      };
      onUpdate(newData);
    }, 2000);

    return () => clearInterval(interval);
  }, [onUpdate]);

  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="bg-gray-800 p-3 rounded">
        <div className="text-red-400 font-semibold">Heart Rate</div>
        <div className="text-2xl">{biometrics.heartRate?.toFixed(0) || '--'} bpm</div>
      </div>
      <div className="bg-gray-800 p-3 rounded">
        <div className="text-blue-400 font-semibold">Breathing</div>
        <div className="text-2xl">{biometrics.breathingRate?.toFixed(1) || '--'} /min</div>
      </div>
      <div className="bg-gray-800 p-3 rounded">
        <div className="text-green-400 font-semibold">Conductance</div>
        <div className="text-2xl">{biometrics.skinConductance?.toFixed(0) || '--'}%</div>
      </div>
      <div className="bg-gray-800 p-3 rounded">
        <div className="text-purple-400 font-semibold">Eye Focus</div>
        <div className="text-2xl">
          {biometrics.eyeMovement ? 
            `${biometrics.eyeMovement.x.toFixed(1)}, ${biometrics.eyeMovement.y.toFixed(1)}` : 
            '--'
          }
        </div>
      </div>
    </div>
  );
}

export default function EnhancedMeditationInterface() {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [meditationState, setMeditationState] = useState<MeditationState>({
    phase: 'preparation',
    depth: 0,
    stability: 50,
    focus: 30,
    duration: 0
  });
  const [biometrics, setBiometrics] = useState<BiometricData>({});
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setMeditationState(prev => {
          const newDuration = prev.duration + 1;
          let newPhase = prev.phase;
          
          // Automatic phase transitions based on duration and biometrics
          if (newDuration > 300) newPhase = 'maintenance';
          else if (newDuration > 120) newPhase = 'deepening';
          else if (newDuration > 30) newPhase = 'preparation';
          
          // Adaptive depth calculation based on biometric stability
          const heartRateStability = biometrics.heartRate ? 
            Math.max(0, 100 - Math.abs(biometrics.heartRate - 70)) : 50;
          const breathingStability = biometrics.breathingRate ? 
            Math.max(0, 100 - Math.abs(biometrics.breathingRate - 16)) : 50;
          
          const newDepth = adaptiveMode ? 
            (heartRateStability + breathingStability) / 2 : 
            Math.min(100, prev.depth + (Math.random() - 0.3));
          
          const newStability = Math.max(0, Math.min(100, 
            prev.stability + (Math.random() - 0.4) * 5
          ));
          
          const newFocus = Math.max(0, Math.min(100, 
            prev.focus + (newDepth > prev.depth ? 2 : -1) + (Math.random() - 0.5) * 3
          ));

          return {
            phase: newPhase,
            depth: newDepth,
            stability: newStability,
            focus: newFocus,
            duration: newDuration
          };
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPaused, biometrics, adaptiveMode]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setMeditationState({
      phase: 'preparation',
      depth: 0,
      stability: 50,
      focus: 30,
      duration: 0
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Enhanced Meditation Experience</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdaptiveMode(!adaptiveMode)}
              >
                <Settings className="h-4 w-4 mr-1" />
                {adaptiveMode ? 'Adaptive' : 'Manual'}
              </Button>
              <Volume2 className="h-4 w-4 text-gray-400" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 3D Visualization */}
          <div className="h-96 bg-black rounded-lg overflow-hidden">
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
              <ambientLight intensity={0.4} />
              <pointLight position={[10, 10, 10]} intensity={0.8} />
              <pointLight position={[-10, -10, -10]} intensity={0.4} color="#9775fa" />
              
              <AdaptiveVisualField state={meditationState} biometrics={biometrics} />
              
              <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate={isActive}
                autoRotateSpeed={0.5}
              />
            </Canvas>
          </div>

          {/* Session Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isActive ? (
                <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-1" />
                  Start Session
                </Button>
              ) : (
                <>
                  <Button onClick={handlePause} variant="outline">
                    <Pause className="h-4 w-4 mr-1" />
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button onClick={handleStop} variant="destructive">
                    <Square className="h-4 w-4 mr-1" />
                    End Session
                  </Button>
                </>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400">
                {formatTime(meditationState.duration)}
              </div>
              <div className="text-sm text-gray-400">Session Time</div>
            </div>
          </div>

          {/* State Indicators */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-800 rounded">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round(meditationState.depth)}%
              </div>
              <div className="text-sm text-gray-400">Depth</div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <div className="text-2xl font-bold text-green-400">
                {Math.round(meditationState.stability)}%
              </div>
              <div className="text-sm text-gray-400">Stability</div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <div className="text-2xl font-bold text-blue-400">
                {Math.round(meditationState.focus)}%
              </div>
              <div className="text-sm text-gray-400">Focus</div>
            </div>
          </div>

          {/* Biometric Monitor */}
          {adaptiveMode && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Biometric Feedback</h3>
              <BiometricMonitor biometrics={biometrics} onUpdate={setBiometrics} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}