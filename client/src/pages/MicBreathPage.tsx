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
    breathPhase,
    breathingRate,
    isListening,
    startListening,
    stopListening,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
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
    
    // Navigate to Reflection page
    navigate('/reflection');
  };
  
  // Handle microphone device change
  const handleDeviceChange = async (deviceId: string) => {
    console.log('Switching to microphone device:', deviceId);
    
    // Stop current listening if active
    const wasListening = isListening;
    if (wasListening) {
      stopListening();
    }
    
    // Update the selected device
    setSelectedDeviceId(deviceId);
    
    // If we were listening before, restart with the new device
    if (wasListening) {
      try {
        await startListening(deviceId);
        console.log('Successfully switched to new microphone');
      } catch (error) {
        console.error('Failed to switch microphone:', error);
      }
    }
  };
  
  // Handle refreshing device list
  const handleRefreshDevices = async () => {
    try {
      console.log('Refreshing microphone devices...');
      const newDevices = await refreshDevices();
      console.log('Found devices:', newDevices);
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  };

  // Auto-refresh devices when page loads
  useEffect(() => {
    handleRefreshDevices();
  }, []);
  
  return (
    <>
      {showFocusMode ? (
        <FocusMode onClose={handleEndSession} fullScreen>
          <div className="w-full h-full flex flex-col items-center justify-center bg-black">
            <BreathKasinaOrb 
              breathAmplitude={breathAmplitude}
              breathPhase={breathPhase}
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
                onClick={handleStartSession}
                className="w-64 h-14 text-xl font-semibold bg-green-600 hover:bg-green-700"
              >
                Start Breath Meditation
              </Button>
            </div>
          </div>
        </Layout>
      ) : (
        <Layout>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white">Breath Kasina</h1>
            
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="w-full max-w-2xl">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-xl p-8 text-center">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                      <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">🎤 Microphone Breath Detection</h2>
                    <p className="text-gray-300 mb-6">
                      Use your device's microphone to detect breathing patterns and create responsive visual meditation.
                    </p>
                  </div>

                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <span className="text-green-400 text-xl">🎤</span>
                        </div>
                        <p className="text-sm text-gray-400">Microphone selection</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <span className="text-blue-400 text-xl">⚙️</span>
                        </div>
                        <p className="text-sm text-gray-400">Smart calibration</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <span className="text-purple-400 text-xl">🫁</span>
                        </div>
                        <p className="text-sm text-gray-400">Pattern detection</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <span className="text-orange-400 text-xl">🔮</span>
                        </div>
                        <p className="text-sm text-gray-400">Visual meditation</p>
                      </div>
                    </div>

                    <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-6">
                      <div className="flex items-center mb-2">
                        <span className="text-green-400 mr-2">✨</span>
                        <h3 className="font-semibold text-white">Smart Calibration</h3>
                      </div>
                      <p className="text-sm text-gray-300">
                        Automatically adjusts sensitivity for your microphone and breathing style in just 20 seconds.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg mb-4">
                      <h3 className="font-semibold text-red-300 mb-2">Microphone Error</h3>
                      <p className="text-red-400 text-sm">{error}</p>
                      <p className="text-red-400 text-sm mt-2">
                        Please grant microphone permissions to this website.
                      </p>
                    </div>
                  )}
                  
                  {/* Microphone selection */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Select Microphone:
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedDeviceId || ''}
                          onChange={(e) => handleDeviceChange(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="" disabled>Select a microphone...</option>
                          {devices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                              {device.isDefault && " (Default)"}
                            </option>
                          ))}
                        </select>
                        <Button 
                          variant="outline" 
                          onClick={handleRefreshDevices}
                          className="border-slate-600 text-slate-300 hover:bg-slate-800"
                        >
                          Refresh
                        </Button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {devices.length === 0 
                          ? "No microphones detected. Please connect a microphone and click refresh." 
                          : `${devices.length} microphone(s) available`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <Button 
                      onClick={handleStartSession}
                      disabled={isListening}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Start Calibration
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/breath')}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      )}
    </>
  );
};

export default MicBreathPage;