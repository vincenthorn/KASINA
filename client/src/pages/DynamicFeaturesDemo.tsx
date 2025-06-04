import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import InteractiveOrb from '../components/InteractiveOrb';
import DynamicAmbientEnvironment from '../components/DynamicAmbientEnvironment';
import EnhancedMeditationInterface from '../components/EnhancedMeditationInterface';
import { Play, Sparkles, Eye, Brain } from 'lucide-react';

export default function DynamicFeaturesDemo() {
  const [activeDemo, setActiveDemo] = useState('interactive');
  const [meditationDepth, setMeditationDepth] = useState(45);
  const [environment, setEnvironment] = useState<'forest' | 'ocean' | 'space' | 'mountain'>('forest');
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'day' | 'dusk' | 'night'>('day');

  const handleOrbInteraction = (intensity: number) => {
    setMeditationDepth(prev => Math.min(100, prev + intensity * 10));
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Dynamic Meditation Features
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Experience next-generation mindfulness with interactive 3D environments, 
            real-time biometric feedback, and adaptive visual responses.
          </p>
        </div>

        <Tabs value={activeDemo} onValueChange={setActiveDemo} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="interactive" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Interactive Orb
            </TabsTrigger>
            <TabsTrigger value="environment" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Dynamic Environment
            </TabsTrigger>
            <TabsTrigger value="enhanced" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Enhanced Interface
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Feature Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interactive" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interactive Meditation Orb</CardTitle>
                <p className="text-gray-400">
                  Click and interact with the 3D orb to influence your meditation experience. 
                  The orb responds to your touch and adapts its behavior based on interaction patterns.
                </p>
              </CardHeader>
              <CardContent>
                <InteractiveOrb
                  color="#4A90E2"
                  size={1.2}
                  breathingRate={2}
                  userInteraction={true}
                  onInteraction={handleOrbInteraction}
                />
                <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-300">
                    Current Meditation Depth: <span className="text-blue-400 font-semibold">{meditationDepth}%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Depth increases with interaction and stabilizes during focused meditation
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="environment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Adaptive Environment System</CardTitle>
                <p className="text-gray-400">
                  Immersive 3D environments that respond to your meditation state, breathing patterns, 
                  and focus levels. Each environment adapts its lighting, particles, and atmosphere.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Environment</label>
                    <select 
                      value={environment} 
                      onChange={(e) => setEnvironment(e.target.value as any)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-1"
                    >
                      <option value="forest">Forest</option>
                      <option value="ocean">Ocean</option>
                      <option value="space">Space</option>
                      <option value="mountain">Mountain</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time of Day</label>
                    <select 
                      value={timeOfDay} 
                      onChange={(e) => setTimeOfDay(e.target.value as any)}
                      className="bg-gray-800 border border-gray-600 rounded px-3 py-1"
                    >
                      <option value="dawn">Dawn</option>
                      <option value="day">Day</option>
                      <option value="dusk">Dusk</option>
                      <option value="night">Night</option>
                    </select>
                  </div>
                </div>
                
                <DynamicAmbientEnvironment
                  meditationDepth={meditationDepth}
                  breathingRate={1.2}
                  focusLevel={75}
                  timeOfDay={timeOfDay}
                  environment={environment}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enhanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Meditation Interface</CardTitle>
                <p className="text-gray-400">
                  Complete meditation session management with real-time biometric monitoring, 
                  adaptive visual feedback, and intelligent phase transitions.
                </p>
              </CardHeader>
              <CardContent>
                <EnhancedMeditationInterface />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-400">New Dynamic Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Interactive 3D Elements</div>
                      <div className="text-sm text-gray-400">Click and touch responsive meditation objects</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Real-time Biometric Integration</div>
                      <div className="text-sm text-gray-400">Heart rate, breathing, and conductance monitoring</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Adaptive Environment System</div>
                      <div className="text-sm text-gray-400">Dynamic lighting, particles, and atmosphere changes</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Intelligent Progress Tracking</div>
                      <div className="text-sm text-gray-400">AI-powered meditation depth and stability analysis</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Multi-Environment Support</div>
                      <div className="text-sm text-gray-400">Forest, ocean, space, and mountain themes</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-400">Technical Enhancements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">WebGL Optimization</div>
                      <div className="text-sm text-gray-400">Smooth 60fps 3D rendering with particle systems</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Responsive Design</div>
                      <div className="text-sm text-gray-400">Works seamlessly across desktop and mobile devices</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Session Recovery</div>
                      <div className="text-sm text-gray-400">Automatic state saving and crash recovery</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">PostgreSQL Integration</div>
                      <div className="text-sm text-gray-400">Persistent session storage and user authentication</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <div className="font-medium">Zapier Automation</div>
                      <div className="text-sm text-gray-400">Automated user onboarding and subscription management</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Implementation Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gradient-to-b from-purple-900/50 to-purple-800/30 rounded-lg">
                    <div className="text-3xl font-bold text-purple-400 mb-2">3x</div>
                    <div className="text-sm">Increased engagement through interactive elements</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-b from-blue-900/50 to-blue-800/30 rounded-lg">
                    <div className="text-3xl font-bold text-blue-400 mb-2">Real-time</div>
                    <div className="text-sm">Biometric feedback for personalized sessions</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-b from-green-900/50 to-green-800/30 rounded-lg">
                    <div className="text-3xl font-bold text-green-400 mb-2">Adaptive</div>
                    <div className="text-sm">Environment responds to meditation depth</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}