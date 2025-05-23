import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../lib/stores/useAuth';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';
import BreathKasinaOrb from '../components/BreathKasinaOrb';
import Layout from '../components/Layout';

const BreathPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [showMeditation, setShowMeditation] = React.useState(false);
  const [forceStayOnPage, setForceStayOnPage] = React.useState(false);
  
  // Vernier breath data hook
  const {
    isConnected,
    isConnecting,
    breathAmplitude,
    breathPhase,
    breathingRate,
    connectDevice,
    disconnectDevice,
    error,
    isCalibrating,
    calibrationProgress,
    startCalibration,
    calibrationComplete,
    currentForce,
    calibrationProfile
  } = useVernierBreathOfficial();
  
  // Check if user has premium access
  const hasPremiumAccess = user?.subscription === 'premium' || isAdmin;

  // Handle starting a session - connect, calibrate, then meditate
  const handleStartSession = async () => {
    if (!hasPremiumAccess) return;
    
    if (!isConnected) {
      await connectDevice();
    } else if (!calibrationComplete) {
      await startCalibration();
    } else {
      // Start meditation directly on this page
      setShowMeditation(true);
    }
  };

  const getButtonText = () => {
    if (!hasPremiumAccess) return 'Premium Feature';
    if (isConnecting) return 'Connecting...';
    if (!isConnected) return 'Connect Vernier Belt';
    if (isCalibrating) return `Calibrating... ${Math.round(calibrationProgress * 100)}%`;
    if (!calibrationComplete) return 'Start Calibration';
    return '🎯 Begin Meditation';
  };

  const getInstructions = () => {
    if (!hasPremiumAccess) return 'Premium subscription required for Vernier belt integration.';
    if (!isConnected) return 'Connect your Vernier GDX Respiration Belt via Bluetooth for precise breathing detection.';
    if (isCalibrating) return 'Breathe normally while we calibrate your respiration belt...';
    if (!calibrationComplete) return 'Connection successful! Now calibrate the belt to your breathing patterns.';
    return 'Calibration complete! Your belt is ready for meditation.';
  };

  // If meditation mode is active, show full-screen breathing orb
  if (showMeditation) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <BreathKasinaOrb 
          useVernier={true}
          breathAmplitude={breathAmplitude}
          breathPhase={breathPhase}
          isListening={isConnected}
        />
        <Button
          onClick={() => {
            setShowMeditation(false);
            navigate('/reflection');
          }}
          className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
          variant="outline"
        >
          End Session
        </Button>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-white">Breath KASINAS</h1>
        
        <div className="max-w-2xl mx-auto">
          {/* Unified Vernier Respiration Belt Interface */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                🌀 Vernier Respiration Belt
                <span className="text-sm bg-blue-600 text-white px-2 py-1 rounded-full">
                  Premium
                </span>
                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                  Official
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert className="border-red-500 bg-red-900/20">
                  <AlertDescription className="text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-gray-300">
                {getInstructions()}
              </p>

              {/* Connection Status */}
              {hasPremiumAccess && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">
                    Status: <span className={isConnected ? 'text-green-400' : 'text-gray-500'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </p>
                  
                  {isConnected && (
                    <>
                      <p className="text-sm text-gray-300">
                        Current Force: <span className="font-mono text-blue-400">{currentForce.toFixed(2)} N</span>
                      </p>
                      
                      {calibrationProfile && (
                        <div className="text-sm space-y-1 text-gray-300">
                          <p>Baseline: <span className="text-blue-400">{calibrationProfile.baselineForce.toFixed(2)} N</span></p>
                          <p>Range: <span className="text-blue-400">{calibrationProfile.forceRange.toFixed(2)} N</span></p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Calibration Progress */}
              {isCalibrating && (
                <div className="space-y-2">
                  <div className="bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calibrationProgress * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-gray-300">
                    Calibration Progress: {Math.round(calibrationProgress * 100)}%
                  </p>
                </div>
              )}

              {/* Live Breathing Preview */}
              {isConnected && calibrationComplete && (
                <div className="relative h-48 bg-black rounded-lg overflow-hidden">
                  <BreathKasinaOrb 
                    useVernier={false}
                    breathAmplitude={breathAmplitude}
                    breathPhase={breathPhase}
                    isListening={true}
                  />
                  <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-gray-400">Amplitude</p>
                      <p className="font-mono text-blue-400">{(breathAmplitude * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Phase</p>
                      <p className="font-medium capitalize text-green-400">{breathPhase}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Rate</p>
                      <p className="font-mono text-purple-400">{breathingRate}/min</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button 
                onClick={handleStartSession}
                disabled={isConnecting || isCalibrating || !hasPremiumAccess}
                className={`flex-1 text-lg font-bold py-4 ${calibrationComplete ? 'bg-green-600 hover:bg-green-700 animate-pulse border-4 border-green-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {getButtonText()}
              </Button>
              
              {isConnected && (
                <Button 
                  variant="outline" 
                  onClick={disconnectDevice}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Disconnect
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default BreathPage;