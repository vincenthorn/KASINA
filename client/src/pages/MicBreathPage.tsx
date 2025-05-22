import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import FocusMode from '../components/FocusMode';
import { useMicrophoneBreath, AudioDevice } from '../lib/useMicrophoneBreath';
import { toast } from 'sonner';
import { useAuth } from '../lib/stores/useAuth';
import { useSessionLogger } from '../lib/stores/useSessionLogger';
import BreathKasinaOrb from '../components/BreathKasinaOrb';
import { KasinaOption } from '../types/kasina';

const MicBreathPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [inFocusMode, setInFocusMode] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const { logSession } = useSessionLogger();
  
  // Microphone breathing hook
  const {
    isListening,
    breathAmplitude,
    breathingRate,
    startListening,
    stopListening,
    error,
    devices,
    selectedDeviceId,
    refreshDevices
  } = useMicrophoneBreath();
  
  // Check if user has premium access
  const hasPremiumAccess = user?.subscription === 'premium' || isAdmin;
  
  // Request access when component mounts
  useEffect(() => {
    // Refresh device list on mount
    const loadDevices = async () => {
      await refreshDevices();
    };
    
    loadDevices();
    
    // Clean up
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, []);
  
  // Handle device selection change
  const handleDeviceChange = async (deviceId: string) => {
    if (isListening) {
      stopListening();
    }
    
    try {
      await startListening(deviceId);
      toast.success('Microphone connected');
    } catch (err) {
      toast.error('Failed to connect to microphone');
    }
  };
  
  const startMeditationSession = async () => {
    try {
      await startListening();
      setInFocusMode(true);
      setSessionStartTime(new Date());
      toast.success('Breath meditation started');
    } catch (err) {
      toast.error('Failed to access microphone');
    }
  };
  
  const endMeditationSession = () => {
    stopListening();
    setInFocusMode(false);
    
    // Log the session if it was started
    if (sessionStartTime) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - sessionStartTime.getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      
      // Only log if meditation was at least 1 minute
      if (durationMinutes >= 1) {
        logSession({
          kasinaType: 'breath-mic', // Unique identifier for microphone breath meditation
          duration: durationMinutes * 60, // Convert minutes to seconds
          showToast: false // Don't show the default toast
        });
        
        toast.success(`Breath meditation completed: ${durationMinutes} minutes`);
      }
    }
  };
  
  // If user doesn't have premium access, redirect to Breath page
  if (!hasPremiumAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Premium Feature</h1>
        <p className="mb-4">
          Microphone-based breath detection is a premium feature.
          Please upgrade your account to access this feature.
        </p>
        <Button onClick={() => navigate('/breath')}>
          Go Back
        </Button>
      </div>
    );
  }
  
  // Premium user view
  return (
    <>
      {inFocusMode ? (
        <FocusMode onExit={endMeditationSession}>
          <div className="h-full w-full flex flex-col items-center justify-center bg-black">
            <BreathKasinaOrb 
              breathAmplitude={breathAmplitude} 
              isListening={isListening} 
            />
            
            {/* Display breathing rate if detected */}
            {breathingRate > 0 && (
              <div className="text-white mt-4 text-lg">
                {breathingRate.toFixed(1)} breaths per minute
              </div>
            )}
          </div>
        </FocusMode>
      ) : (
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold mb-6">Microphone Breath Meditation</h1>
          
          <div className="mb-8">
            <p className="mb-4">
              This meditation uses your microphone to detect your breathing pattern and
              creates a visual that expands and contracts with your breath.
            </p>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                <p>{error}</p>
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">1. Select Microphone</h3>
              
              <div className="flex items-center gap-4">
                <Select 
                  value={selectedDeviceId || ''} 
                  onValueChange={handleDeviceChange}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={() => refreshDevices()}>
                  Refresh
                </Button>
              </div>
              
              {devices.length === 0 && (
                <p className="text-yellow-600 mt-2">
                  No microphones detected. Please ensure your microphone is connected and browser permissions are granted.
                </p>
              )}
            </div>
            
            <h3 className="text-lg font-medium mb-2">2. Start Meditation</h3>
            <p className="mb-4">
              Click the button below to start the meditation session. 
              The orb will expand and contract with your breathing pattern.
            </p>
            
            <Button 
              onClick={startMeditationSession}
              disabled={devices.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Meditation
            </Button>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">How it works</h3>
            <p>
              The microphone detects the sound of your breath and analyzes the pattern.
              For best results, meditate in a quiet environment and breathe audibly enough
              for your microphone to pick up the sound.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default MicBreathPage;