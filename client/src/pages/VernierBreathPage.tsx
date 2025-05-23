import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import FocusMode from '../components/FocusMode';
import BreathKasinaOrb from '../components/BreathKasinaOrb';
import { useVernierBreath } from '../lib/useVernierBreath';
import { useSessionLogger } from '../lib/stores/useSessionLogger';
import '../styles/breath-kasina.css';

const VernierBreathPage: React.FC = () => {
  const navigate = useNavigate();
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  // Use the Vernier breath hook for breath detection
  const {
    isConnected,
    isConnecting,
    breathAmplitude,
    breathPhase,
    breathingRate,
    connectDevice,
    disconnectDevice,
    error,
    // Calibration system
    isCalibrating,
    calibrationProgress,
    startCalibration,
    calibrationComplete,
    calibrationProfile
  } = useVernierBreath();
  
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
      // If not connected, connect first
      if (!isConnected) {
        await connectDevice();
        return;
      }
      
      // If not calibrated yet, start calibration first
      if (!calibrationComplete && !isCalibrating) {
        await startCalibration();
        return;
      }
      
      // If calibration is complete, start the session
      if (calibrationComplete) {
        setShowFocusMode(true);
      }
    } catch (error) {
      console.error('Failed to start Vernier session:', error);
    }
  };
  
  // Handle ending the session
  const handleEndSession = () => {
    // Log the meditation session
    if (sessionStartTime) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - sessionStartTime.getTime();
      
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

  // Handle disconnecting device
  const handleDisconnect = () => {
    disconnectDevice();
    setShowFocusMode(false);
  };

  return showFocusMode ? (
    <FocusMode onExit={handleEndSession}>
      <div className="breath-kasina-container">
        <BreathKasinaOrb 
          breathAmplitude={breathAmplitude}
          breathPhase={breathPhase}
          isListening={isConnected}
        />
      </div>
    </FocusMode>
  ) : (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Vernier Respiration Belt Meditation</h1>
        
        <div className="mb-8">
          <p className="mb-4">
            This advanced meditation technique uses your Vernier GDX Respiration Belt to detect your
            breathing pattern with medical-grade accuracy and creates a visual experience that perfectly
            syncs with your natural respiratory rhythm.
          </p>
          
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg mb-6 shadow-sm">
            <h2 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">How it works:</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-gray-300">
              <li className="pl-2">Connect your Vernier GDX Respiration Belt via Bluetooth</li>
              <li className="pl-2">Wear the belt comfortably around your chest</li>
              <li className="pl-2">Start calibration to learn your breathing force range</li>
              <li className="pl-2">Once calibrated, breathe normally and watch the orb respond</li>
              <li className="pl-2">The orb expands with inhale force and contracts with exhale</li>
            </ol>
            
            <div className="mt-4 p-4 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-md">
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                🔬 Professional Grade: Uses actual respiratory force measurements (Newtons) for unprecedented accuracy
              </p>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Connection Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          
          {/* Connection Status */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Device Status:</h3>
            {isConnecting ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-4 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200">🔍 Connecting to Vernier device...</p>
              </div>
            ) : isConnected ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-green-800 dark:text-green-200 font-semibold">✅ Connected to Vernier Belt</p>
                    {calibrationProfile && (
                      <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                        Force range: {calibrationProfile.minForce.toFixed(2)}N - {calibrationProfile.maxForce.toFixed(2)}N
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">📱 Ready to connect to your Vernier GDX device</p>
              </div>
            )}
          </div>
          
          {/* Calibration Status */}
          {isConnected && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Calibration Status:</h3>
              {isCalibrating ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-4 rounded-lg">
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-blue-800 dark:text-blue-200">
                      <span>Calibrating breathing range...</span>
                      <span>{Math.round(calibrationProgress * 100)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${calibrationProgress * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Take deep breaths, then breathe normally. This helps us learn your force range.
                  </p>
                </div>
              ) : calibrationComplete ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 font-semibold">✅ Calibration Complete</p>
                  <p className="text-green-700 dark:text-green-300 text-sm">Ready for meditation session</p>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300">⚙️ Calibration needed before starting meditation</p>
                </div>
              )}
            </div>
          )}
          
          {/* Live Data Display */}
          {isConnected && !showFocusMode && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Live Breath Data:</h3>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {(breathAmplitude * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Breath Amplitude</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {breathPhase}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Breath Phase</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {breathingRate}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Breaths/min</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-4">
          <Button 
            onClick={handleStartSession}
            disabled={isConnecting}
            className="w-full md:w-auto bg-purple-600 hover:bg-purple-700"
          >
            {!isConnected ? "Connect Vernier Belt" : 
             !calibrationComplete ? "Start Calibration" : 
             "Start Breath Meditation"}
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
  );
};

export default VernierBreathPage;