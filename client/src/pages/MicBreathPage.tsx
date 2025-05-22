import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import BreathKasinaOrb from '../components/BreathKasinaOrb';
import { useMicrophoneBreath } from '../lib/useMicrophoneBreath';
import FocusMode from '../components/FocusMode';
import { KasinaType, BreathEffectType } from '../types/kasina';
import { useAuth } from '../lib/stores/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * MicBreathPage - A page for microphone-based breath detection and visualization
 */
const MicBreathPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Check if user has premium access
  const hasPremiumAccess = user?.subscription === 'premium' || isAdmin;
  
  // Redirect non-premium users
  useEffect(() => {
    if (!hasPremiumAccess) {
      toast.error('This feature requires a premium subscription');
      navigate('/breath');
    }
  }, [hasPremiumAccess, navigate]);
  
  // State for kasina settings
  const [kasinaType, setKasinaType] = useState<KasinaType>('blue');
  const [effectType, setEffectType] = useState<BreathEffectType>('expand-contract');
  const [inFocusMode, setInFocusMode] = useState(false);
  
  // Use the microphone breath hook
  const {
    isListening,
    breathAmplitude,
    breathingRate,
    startListening,
    stopListening,
    error
  } = useMicrophoneBreath();
  
  // Start listening when entering focus mode
  const handleEnterFocusMode = async () => {
    try {
      await startListening();
      setInFocusMode(true);
    } catch (err) {
      toast.error('Could not access microphone');
      console.error(err);
    }
  };
  
  // Stop listening when exiting focus mode
  const handleExitFocusMode = () => {
    stopListening();
    setInFocusMode(false);
  };
  
  // Display any errors
  useEffect(() => {
    if (error) {
      toast.error(`Microphone error: ${error}`);
    }
  }, [error]);
  
  // If not premium, don't render the content
  if (!hasPremiumAccess) {
    return null;
  }
  
  // Render the focus mode when active
  if (inFocusMode) {
    return (
      <FocusMode onExit={handleExitFocusMode}>
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
          <BreathKasinaOrb
            type={kasinaType}
            breathAmplitude={breathAmplitude}
            breathingRate={breathingRate}
            effectType={effectType}
          />
          
          {/* Status indicator */}
          <div className="mt-8 text-white text-opacity-70">
            {isListening 
              ? 'Listening to your breath...' 
              : 'Microphone not active'}
          </div>
        </div>
      </FocusMode>
    );
  }
  
  // Render the settings screen
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Breath Meditation with Microphone</h1>
      
      <Card className="p-6 mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">How it works</h2>
          <p className="text-gray-700 dark:text-gray-300">
            This feature uses your device's microphone to detect your breathing pattern.
            The orb will respond to your breath, changing size as you inhale and exhale.
            For best results:
          </p>
          <ul className="list-disc ml-6 mt-2 text-gray-700 dark:text-gray-300">
            <li>Use headphones to prevent feedback</li>
            <li>Position your microphone close to your mouth</li>
            <li>Breathe audibly enough for the microphone to detect</li>
            <li>Practice in a quiet environment</li>
          </ul>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Kasina Color</label>
            <Select
              value={kasinaType}
              onValueChange={(value) => setKasinaType(value as KasinaType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="red">Red</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="rainbow">Rainbow</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Effect Type</label>
            <Select
              value={effectType}
              onValueChange={(value) => setEffectType(value as BreathEffectType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select effect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expand-contract">Expand & Contract</SelectItem>
                <SelectItem value="brighten-darken">Brighten & Darken</SelectItem>
                <SelectItem value="color-shift">Color Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Preview */}
        <div className="flex justify-center mb-8">
          <div className="relative" style={{ width: '200px', height: '200px' }}>
            <BreathKasinaOrb
              type={kasinaType}
              breathAmplitude={0.3} // Static preview
              breathingRate={0}
              effectType={effectType}
            />
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleEnterFocusMode}
            className="px-8"
          >
            Begin Breath Meditation
          </Button>
        </div>
      </Card>
      
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
        <p>
          Note: Your privacy is important to us. Audio is processed locally on your device
          and is never recorded or sent to our servers.
        </p>
      </div>
    </div>
  );
};

export default MicBreathPage;