import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MeditationSession {
  startTime: number;
  duration: number;
  breathingPattern: number[];
  focusLevel: number;
  deepestState: number;
  interruptions: number;
}

interface ProgressTrackerProps {
  isActive: boolean;
  sessionData?: MeditationSession;
  onStateChange?: (state: 'shallow' | 'medium' | 'deep') => void;
}

function BreathingVisualization({ breathingPattern }: { breathingPattern: number[] }) {
  const lineRef = useRef<THREE.Line>(null);

  useFrame((state) => {
    if (lineRef.current) {
      const time = state.clock.getElapsedTime();
      const geometry = lineRef.current.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position;
      
      if (positions) {
        for (let i = 0; i < positions.count; i++) {
          const x = (i / positions.count) * 8 - 4;
          const breathingIntensity = breathingPattern[i % breathingPattern.length] || 1;
          const y = Math.sin(x * 0.5 + time * 2) * breathingIntensity * 0.3;
          positions.setY(i, y);
        }
        positions.needsUpdate = true;
      }
    }
  });

  const points = [];
  for (let i = 0; i <= 50; i++) {
    const x = (i / 50) * 8 - 4;
    points.push(new THREE.Vector3(x, 0, 0));
  }

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#4A90E2" />
    </line>
  );
}

function MeditationDepthIndicator({ depth }: { depth: number }) {
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (orbRef.current) {
      const time = state.clock.getElapsedTime();
      const pulseIntensity = 0.8 + Math.sin(time * depth) * 0.2;
      orbRef.current.scale.setScalar(pulseIntensity);
      
      // Color shifts based on depth
      const material = orbRef.current.material as THREE.MeshStandardMaterial;
      const hue = (depth * 0.6) % 1; // Cycle through colors based on depth
      material.color.setHSL(hue, 0.8, 0.6);
    }
  });

  return (
    <mesh ref={orbRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial transparent opacity={0.7} />
    </mesh>
  );
}

export default function MeditationProgressTracker({ 
  isActive, 
  sessionData,
  onStateChange 
}: ProgressTrackerProps) {
  const [currentDepth, setCurrentDepth] = useState(0);
  const [breathingRate, setBreathingRate] = useState(1);
  const [focusStability, setFocusStability] = useState(50);
  const [sessionMetrics, setSessionMetrics] = useState({
    totalTime: 0,
    deepStateTime: 0,
    averageDepth: 0,
    consistency: 0
  });

  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        // Simulate dynamic meditation state tracking
        const newDepth = Math.random() * 100;
        const newBreathingRate = 0.8 + Math.random() * 0.4;
        const stability = Math.max(0, focusStability + (Math.random() - 0.5) * 10);
        
        setCurrentDepth(newDepth);
        setBreathingRate(newBreathingRate);
        setFocusStability(Math.min(100, stability));

        // Update session metrics
        setSessionMetrics(prev => ({
          totalTime: prev.totalTime + 1,
          deepStateTime: prev.deepStateTime + (newDepth > 70 ? 1 : 0),
          averageDepth: (prev.averageDepth * prev.totalTime + newDepth) / (prev.totalTime + 1),
          consistency: Math.min(100, prev.consistency + (stability > 70 ? 1 : -0.5))
        }));

        // Notify state changes
        if (newDepth > 80) onStateChange?.('deep');
        else if (newDepth > 50) onStateChange?.('medium');
        else onStateChange?.('shallow');
        
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, focusStability, onStateChange]);

  const getDepthColor = (depth: number) => {
    if (depth > 80) return 'text-purple-400';
    if (depth > 60) return 'text-blue-400';
    if (depth > 40) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getDepthLabel = (depth: number) => {
    if (depth > 80) return 'Deep Meditation';
    if (depth > 60) return 'Focused State';
    if (depth > 40) return 'Relaxed State';
    return 'Surface Level';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Meditation Progress</span>
            <div className={`text-sm ${getDepthColor(currentDepth)}`}>
              {getDepthLabel(currentDepth)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Real-time depth visualization */}
          <div className="h-32">
            <Canvas camera={{ position: [0, 0, 3] }}>
              <ambientLight intensity={0.6} />
              <pointLight position={[5, 5, 5]} intensity={0.8} />
              <MeditationDepthIndicator depth={currentDepth / 20} />
              <BreathingVisualization breathingPattern={[breathingRate, breathingRate * 1.2, breathingRate * 0.8]} />
            </Canvas>
          </div>

          {/* Progress bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Meditation Depth</span>
                <span>{Math.round(currentDepth)}%</span>
              </div>
              <Progress value={currentDepth} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Focus Stability</span>
                <span>{Math.round(focusStability)}%</span>
              </div>
              <Progress value={focusStability} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Breathing Rhythm</span>
                <span>{breathingRate.toFixed(1)} Hz</span>
              </div>
              <Progress value={(breathingRate - 0.8) * 250} className="h-2" />
            </div>
          </div>

          {/* Session metrics */}
          {isActive && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {Math.floor(sessionMetrics.totalTime / 60)}:{(sessionMetrics.totalTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-400">Total Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {Math.round(sessionMetrics.averageDepth)}%
                </div>
                <div className="text-xs text-gray-400">Avg Depth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {Math.floor(sessionMetrics.deepStateTime / 60)}:{(sessionMetrics.deepStateTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-400">Deep State</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {Math.round(sessionMetrics.consistency)}%
                </div>
                <div className="text-xs text-gray-400">Consistency</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}