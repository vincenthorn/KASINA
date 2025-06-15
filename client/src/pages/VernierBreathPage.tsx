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
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-white">Breath Kasina</h1>
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-2xl">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-xl p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    <circle cx="12" cy="12" r="4" strokeWidth={2} />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">🔬 Vernier Respiration Belt</h2>
                <p className="text-gray-300 mb-6">
                  Connect your Vernier GDX Respiration Belt via Bluetooth for precise breathing detection.
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-400 text-xl">📱</span>
                    </div>
                    <p className="text-sm text-gray-400">Bluetooth connection</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-400 text-xl">⚙️</span>
                    </div>
                    <p className="text-sm text-gray-400">Force calibration</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-400 text-xl">🫁</span>
                    </div>
                    <p className="text-sm text-gray-400">Breath detection</p>
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
                    <span className="text-purple-400 mr-2">🔬</span>
                    <h3 className="font-semibold text-white">Professional Grade Accuracy</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Uses actual respiratory force measurements (Newtons) for unprecedented precision in breath tracking.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold text-red-300 mb-2">Connection Error</h3>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              
              {/* Device Status */}
              <div className="space-y-4">
                {isConnecting ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                    <p className="text-yellow-300 font-medium">🔍 Connecting to Vernier device...</p>
                  </div>
                ) : isConnected ? (
                  <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-green-300 font-semibold">✅ Connected to Vernier Belt</p>
                        {calibrationProfile && (
                          <p className="text-green-400 text-sm mt-1">
                            Force range: {calibrationProfile.minForce.toFixed(2)}N - {calibrationProfile.maxForce.toFixed(2)}N
                          </p>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDisconnect}
                        className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-700/30 border border-slate-600/50 p-4 rounded-lg">
                    <p className="text-gray-300">📱 Ready to connect to your Vernier GDX device</p>
                  </div>
                )}
                
                {/* Calibration Status */}
                {isConnected && (
                  <div>
                    {isCalibrating ? (
                      <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-blue-300">
                            <span>Calibrating breathing range...</span>
                            <span>{Math.round(calibrationProgress * 100)}%</span>
                          </div>
                          <div className="w-full bg-blue-900/30 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${calibrationProgress * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <p className="text-blue-400 text-sm">
                          Take deep breaths, then breathe normally. This helps us learn your force range.
                        </p>
                      </div>
                    ) : calibrationComplete ? (
                      <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                        <p className="text-green-300 font-semibold">✅ Calibration Complete</p>
                        <p className="text-green-400 text-sm">Ready for meditation session</p>
                      </div>
                    ) : (
                      <div className="bg-slate-700/30 border border-slate-600/50 p-4 rounded-lg">
                        <p className="text-gray-300">⚙️ Calibration needed before starting meditation</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Live Data Display */}
                {isConnected && !showFocusMode && (
                  <div className="bg-slate-700/30 border border-slate-600/50 p-4 rounded-lg">
                    <h4 className="text-white font-medium mb-3">Live Breath Data:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-blue-400">
                          {(breathAmplitude * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400">Breath Amplitude</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-purple-400">
                          {breathPhase}
                        </div>
                        <div className="text-xs text-gray-400">Breath Phase</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-400">
                          {breathingRate}
                        </div>
                        <div className="text-xs text-gray-400">Breaths/min</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <Button 
                  onClick={handleStartSession}
                  disabled={isConnecting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {!isConnected ? "Connect Vernier Belt" : 
                   !calibrationComplete ? "Start Calibration" : 
                   "Start Breath Meditation"}
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
  );
};

export default VernierBreathPage;