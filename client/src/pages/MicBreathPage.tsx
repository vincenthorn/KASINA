import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import FocusMode from '../components/FocusMode';
import BreathKasinaOrb from '../components/BreathKasinaOrb';
import { useMicrophoneBreath, AudioDevice } from '../lib/useMicrophoneBreath';
import { useSessionLogger } from '../lib/stores/useSessionLogger';
import '../styles/breath-kasina.css';

const MicBreathPage: React.FC = () => {
  const navigate = useNavigate();
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  // Use the microphone breath hook for breath detection
  const {
    breathAmplitude,
    breathingRate,
    isListening,
    startListening,
    stopListening,
    devices,
    selectedDeviceId,
    refreshDevices,
    error
  } = useMicrophoneBreath();
  
  // Session logging
  const { logSession } = useSessionLogger();
  
  // Start the session timer when focus mode is activated
  useEffect(() => {
    if (showFocusMode && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [showFocusMode, sessionStartTime]);
  
  // Handle starting focus mode and breath detection
  const handleStartSession = async () => {
    try {
      await startListening();
      setShowFocusMode(true);
    } catch (error) {
      console.error('Failed to start microphone:', error);
    }
  };
  
  // Handle ending the session
  const handleEndSession = () => {
    // Stop listening to the microphone
    stopListening();
    
    // Log the meditation session
    if (sessionStartTime) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - sessionStartTime.getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
      
      logSession({
        type: 'breath',
        kasina: 'microphone',
        startTime: sessionStartTime,
        endTime: endTime,
        duration: durationMinutes
      });
      
      setSessionStartTime(null);
    }
    
    // Exit focus mode
    setShowFocusMode(false);
  };
  
  // Handle microphone device change
  const handleDeviceChange = async (deviceId: string) => {
    try {
      await startListening(deviceId);
    } catch (error) {
      console.error('Failed to change microphone device:', error);
    }
  };
  
  // Handle refreshing device list
  const handleRefreshDevices = async () => {
    try {
      await refreshDevices();
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  };
  
  return (
    <>
      {showFocusMode ? (
        <FocusMode onClose={handleEndSession} fullScreen>
          <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            <BreathKasinaOrb 
              breathAmplitude={breathAmplitude}
              isListening={isListening}
            />
            
            {/* Breathing rate display */}
            <div className="absolute bottom-10 text-white text-center">
              <p>{breathingRate.toFixed(1)} breaths per minute</p>
            </div>
          </div>
        </FocusMode>
      ) : (
        <Layout>
          <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-6">Microphone Breath Detection</h1>
            
            <div className="mb-8">
              <p className="mb-4">
                This meditation technique uses your device's microphone to detect your
                breathing pattern and creates a visual experience that adapts to your natural rhythm.
              </p>
              
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md mb-6">
                <h2 className="font-bold mb-2">How it works:</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Select your preferred microphone from the dropdown</li>
                  <li>Position yourself so the microphone can detect your breath</li>
                  <li>Click "Start Meditation" to begin</li>
                  <li>Breathe normally and watch the visualization respond</li>
                  <li>The orb will expand as you inhale and contract as you exhale</li>
                </ol>
              </div>
              
              {error && (
                <div className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 p-4 rounded-md mb-4">
                  <p className="font-bold">Error:</p>
                  <p>{error}</p>
                  <p className="mt-2 text-sm">
                    Please make sure you've granted microphone permissions to this website.
                  </p>
                </div>
              )}
              
              {/* Microphone selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Select Microphone:
                </label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={selectedDeviceId || ''}
                    onValueChange={handleDeviceChange}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a microphone..." />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                          {device.isDefault && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleRefreshDevices}>
                    Refresh
                  </Button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {devices.length === 0 
                    ? "No microphones detected. Please connect a microphone and click refresh." 
                    : `${devices.length} microphone(s) available`}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <Button 
                onClick={handleStartSession}
                disabled={isListening}
                className="w-full md:w-auto"
              >
                Start Meditation
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/breath')}
              >
                Back
              </Button>
            </div>
          </div>
        </Layout>
      )}
    </>
  );
};

export default MicBreathPage;