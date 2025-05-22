import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { AlertTriangle, Mic, Info } from 'lucide-react';
import BreathKasinaOrb from '../components/BreathKasinaOrb';
import { useAuth } from '../lib/stores/useAuth';
import useMicrophoneBreath from '../lib/useMicrophoneBreath';
import { KasinaType } from '../types/kasina';
import FocusMode from '../components/FocusMode';

/**
 * MicBreathPage - A page for breath kasina meditation using microphone input
 */
const MicBreathPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  // Check if user has premium access
  const hasPremiumAccess = isAdmin || (user && user.subscription === 'premium');
  
  // Kasina state
  const [selectedKasina, setSelectedKasina] = useState<KasinaType>('blue');
  const [effectType, setEffectType] = useState<'expand-contract' | 'brighten-darken' | 'color-shift'>('expand-contract');
  
  // Focus mode state
  const [focusModeActive, setFocusModeActive] = useState(false);
  
  // Get microphone breath detection hook
  const {
    connectMicrophone,
    disconnectMicrophone,
    isConnected,
    breathAmplitude,
    breathingRate,
    permissionDenied,
    error
  } = useMicrophoneBreath();
  
  // Redirect non-premium users to an upgrade page
  useEffect(() => {
    if (!hasPremiumAccess) {
      navigate('/breath');
    }
  }, [hasPremiumAccess, navigate]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectMicrophone();
    };
  }, [disconnectMicrophone]);
  
  // If not premium, don't render the actual page
  if (!hasPremiumAccess) {
    return null;
  }
  
  // Enter/exit focus mode
  const toggleFocusMode = () => {
    setFocusModeActive(!focusModeActive);
  };
  
  // Start meditation with microphone
  const startMeditation = async () => {
    try {
      await connectMicrophone();
    } catch (err) {
      console.error('Failed to start meditation:', err);
    }
  };
  
  // Stop meditation
  const stopMeditation = () => {
    disconnectMicrophone();
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-center mb-8">Breath Kasina</h1>
      
      {focusModeActive ? (
        <FocusMode onExit={toggleFocusMode}>
          <div className="w-full h-full flex items-center justify-center">
            <BreathKasinaOrb
              type={selectedKasina}
              breathAmplitude={breathAmplitude}
              breathingRate={breathingRate}
              effectType={effectType}
            />
          </div>
        </FocusMode>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Visualization */}
          <div className="md:col-span-2 flex flex-col items-center">
            <Card className="w-full aspect-square flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-black to-slate-900">
              <BreathKasinaOrb
                type={selectedKasina}
                breathAmplitude={breathAmplitude}
                breathingRate={breathingRate}
                effectType={effectType}
              />
            </Card>
            
            {permissionDenied && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Microphone Access Denied</AlertTitle>
                <AlertDescription>
                  Please allow microphone access in your browser settings and refresh the page.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="mt-6 w-full">
              <div className="flex justify-center gap-4">
                {!isConnected ? (
                  <Button 
                    onClick={startMeditation} 
                    className="px-8"
                    size="lg"
                  >
                    <Mic className="mr-2 h-5 w-5" />
                    Connect Microphone
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={stopMeditation} 
                      variant="outline"
                      className="px-8"
                      size="lg"
                    >
                      Disconnect
                    </Button>
                    
                    <Button 
                      onClick={toggleFocusMode} 
                      className="px-8"
                      size="lg"
                    >
                      Enter Focus Mode
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Right column - Settings */}
          <div className="md:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Kasina Settings</h2>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Effect Type:</h3>
                <Tabs 
                  defaultValue="expand-contract" 
                  value={effectType}
                  onValueChange={(value) => setEffectType(value as any)}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-1 mb-2">
                    <TabsTrigger value="expand-contract">Expand & Contract</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-1 mb-2">
                    <TabsTrigger value="brighten-darken">Brighten & Darken</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-1">
                    <TabsTrigger value="color-shift">Color Shift</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Connection Status:</h3>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Breath Data:</h3>
                <p className="text-sm text-gray-500">
                  {breathingRate} breaths per minute
                </p>
              </div>
              
              <Alert className="mt-6">
                <Info className="h-4 w-4" />
                <AlertTitle>About Breath Kasina</AlertTitle>
                <AlertDescription className="text-sm">
                  This feature uses your microphone to detect breathing patterns and 
                  visualize them through the kasina orb. For the best experience, 
                  position your device where it can clearly capture your breath.
                </AlertDescription>
              </Alert>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default MicBreathPage;