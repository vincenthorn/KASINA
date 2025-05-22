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
    error,
    // Calibration system
    isCalibrating,
    calibrationProgress,
    startCalibration,
    skipCalibration,
    calibrationComplete,
    calibrationPhase,
    deepBreathCount
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
      // If not calibrated yet, start calibration first
      if (!calibrationComplete && !isCalibrating) {
        await startCalibration();
        return;
      }
      
      // If calibration is complete, start the session
      if (calibrationComplete) {
        await startListening();
        setShowFocusMode(true);
      }
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
        kasinaType: 'breath' as any, // Cast for compatibility with existing system
        duration: durationMs / 1000, // Convert ms to seconds for proper duration logging
        showToast: true
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
          </div>
        </FocusMode>
      ) : isCalibrating && !calibrationComplete ? (
        // Calibration Screen
        <Layout>
          <div className="container mx-auto py-8 px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl font-bold mb-6">Calibrating Your Breath</h1>
              
              <div className="mb-8">
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${calibrationProgress * 100}%` }}
                  ></div>
                </div>
                <p className="text-lg mb-4">
                  {Math.round(calibrationProgress * 100)}% complete
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-6 rounded-lg mb-8">
                {calibrationPhase === 'deep' ? (
                  <>
                    <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
                      Phase 1: Take 3 Deep Breaths
                    </h2>
                    <div className="mb-6">
                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                          {deepBreathCount} / 3
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          Breath cycles completed
                        </div>
                      </div>
                      <p className="text-blue-800 dark:text-blue-200">
                        Take slow, deep breaths through your nose.
                        This helps us understand your maximum breath volume.
                      </p>
                    </div>
                    <ul className="text-left space-y-2 text-blue-700 dark:text-blue-300">
                      <li>• Inhale deeply and slowly for 3 seconds</li>
                      <li>• Exhale slowly and completely</li>
                      <li>• Make each breath as full as comfortable</li>
                      <li>• Stay close to your microphone</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
                      Phase 2: Let Your Breath Settle
                    </h2>
                    <p className="mb-4 text-blue-800 dark:text-blue-200">
                      Now breathe naturally and let your breath settle into its normal rhythm.
                      This helps us calibrate for your quiet, natural breathing.
                    </p>
                    <ul className="text-left space-y-2 text-blue-700 dark:text-blue-300">
                      <li>• Breathe through your nose naturally</li>
                      <li>• Don't try to breathe deeply anymore</li>
                      <li>• Let your breathing become soft and quiet</li>
                      <li>• We'll finish calibration automatically</li>
                    </ul>
                  </>
                )}
              </div>
              
              <div className="mt-8">
                <Button 
                  onClick={startCalibration}
                  className="w-64 h-14 text-xl font-semibold"
                >
                  Start Breath Detection
                </Button>
              </div>
            </div>
          </div>
        </Layout>
      ) : calibrationComplete ? (
        // Calibration Complete - Show Success & Transition
        <Layout>
          <div className="container mx-auto py-8 px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl font-bold mb-6 text-green-600">✅ Calibration Complete!</h1>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-6 rounded-lg mb-8">
                <p className="text-lg mb-4 text-green-800 dark:text-green-200">
                  Your personal breathing baseline has been successfully established!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  The system is now calibrated to detect your unique breathing pattern.
                </p>
              </div>
              
              <Button 
                onClick={() => setShowFocusMode(true)}
                className="w-64 h-14 text-xl font-semibold bg-green-600 hover:bg-green-700"
              >
                Start Breath Meditation
              </Button>
            </div>
          </div>
        </Layout>
      ) : (
        <Layout>
          <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-6">Microphone Breath Detection</h1>
            
            <div className="mb-8">
              <p className="mb-4">
                This meditation technique uses your device's microphone to detect your
                breathing pattern and creates a visual experience that adapts to your natural rhythm.
              </p>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg mb-6 shadow-sm">
                <h2 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">How it works:</h2>
                <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="pl-2">Select your preferred microphone from the dropdown</li>
                  <li className="pl-2">Click "Start Meditation" to begin breath calibration</li>
                  <li className="pl-2">Follow the 20-second calibration to learn your breathing pattern</li>
                  <li className="pl-2">Once calibrated, breathe normally and watch the orb respond</li>
                  <li className="pl-2">The orb will expand as you inhale and contract as you exhale</li>
                </ol>
                
                <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    ✨ Smart Calibration: The system automatically adjusts sensitivity for your microphone and breathing style
                  </p>
                </div>
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