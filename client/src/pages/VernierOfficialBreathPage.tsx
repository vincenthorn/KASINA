import React from 'react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';
import BreathKasinaOrb from '../components/BreathKasinaOrb';

export default function VernierOfficialBreathPage() {
  const navigate = useNavigate();
  const [showMeditation, setShowMeditation] = React.useState(false);
  const [forceStayOnPage, setForceStayOnPage] = React.useState(false);
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

  // Block automatic navigation when calibration completes
  React.useEffect(() => {
    if (calibrationComplete && !forceStayOnPage) {
      console.log('🛑 BLOCKING AUTO-NAVIGATION: Calibration complete, forcing stay on page');
      setForceStayOnPage(true);
      
      // Prevent any automatic navigation
      const blockNavigation = (e: PopStateEvent) => {
        console.log('🛑 BLOCKED navigation attempt!');
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      };
      
      window.addEventListener('popstate', blockNavigation);
      window.history.pushState(null, '', window.location.href);
      
      return () => {
        window.removeEventListener('popstate', blockNavigation);
      };
    }
  }, [calibrationComplete, forceStayOnPage]);

  const handleStartSession = async () => {
    console.log('handleStartSession called - isConnected:', isConnected, 'calibrationComplete:', calibrationComplete);
    if (!isConnected) {
      await connectDevice();
    } else if (!calibrationComplete) {
      console.log('About to call startCalibration...');
      await startCalibration();
    } else {
      // Show meditation orb directly on this page - NO NAVIGATION!
      console.log('🎯 STARTING MEDITATION: User clicked Begin Meditation button!');
      console.log('Showing meditation orb with Vernier data:', { 
        breathAmplitude,
        breathPhase,
        calibrationProfile
      });
      setShowMeditation(true);
    }
  };

  const getButtonText = () => {
    console.log('Button state check:', { isConnecting, isConnected, isCalibrating, calibrationComplete, calibrationProgress });
    if (isConnecting) return 'Connecting...';
    if (!isConnected) return 'Connect Vernier Belt (Official)';
    if (isCalibrating) return `Calibrating... ${Math.round(calibrationProgress * 100)}%`;
    if (!calibrationComplete) return 'Start Calibration';
    console.log('Button should show: Begin Meditation');
    return 'Begin Meditation';
  };

  const getInstructions = () => {
    if (!isConnected) {
      return 'Click to connect to your Vernier GDX Respiration Belt using the official Vernier library.';
    }
    if (isCalibrating) {
      return 'Breathe normally while we calibrate your respiration belt. This will take about 30 seconds.';
    }
    if (!calibrationComplete) {
      return 'Connection successful! Now we need to calibrate the belt to your breathing patterns.';
    }
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
        {/* Exit button */}
        <Button
          onClick={() => setShowMeditation(false)}
          className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
          variant="outline"
        >
          Exit Meditation
        </Button>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Vernier Respiration Belt</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Official Vernier GoDirect library implementation for precise breathing detection
            </p>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Controls Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔬 Device Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
                    <AlertDescription className="text-red-800 dark:text-red-200">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Status: <span className={isConnected ? 'text-green-600' : 'text-gray-500'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </p>
                  
                  {isConnected && (
                    <>
                      <p className="text-sm">
                        Current Force: <span className="font-mono">{currentForce.toFixed(2)} N</span>
                      </p>
                      
                      {calibrationProfile && (
                        <div className="text-sm space-y-1">
                          <p>Baseline: {calibrationProfile.baselineForce.toFixed(2)} N</p>
                          <p>Range: {calibrationProfile.forceRange.toFixed(2)} N</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm mb-4">{getInstructions()}</p>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        console.log('Button clicked! Current state:', { isConnected, calibrationComplete, isCalibrating });
                        handleStartSession();
                      }}
                      disabled={isConnecting || isCalibrating}
                      className={`flex-1 text-lg font-bold py-4 ${calibrationComplete ? 'bg-green-600 hover:bg-green-700 animate-pulse border-4 border-green-400' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                      {calibrationComplete ? '🎯 BEGIN MEDITATION 🎯' : getButtonText()}
                    </Button>
                    
                    {isConnected && (
                      <Button 
                        variant="outline" 
                        onClick={disconnectDevice}
                      >
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>

                {isCalibrating && (
                  <div className="space-y-2">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${calibrationProgress * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-center">
                      Calibration Progress: {Math.round(calibrationProgress * 100)}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Breathing Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Live Breathing Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-96 bg-black rounded-lg overflow-hidden">
                  {isConnected && calibrationComplete ? (
                    <BreathKasinaOrb 
                      breathAmplitude={breathAmplitude}
                      breathPhase={breathPhase}
                      isListening={true}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      {!isConnected ? (
                        <p>Connect your belt to see visualization</p>
                      ) : !calibrationComplete ? (
                        <p>Complete calibration to see visualization</p>
                      ) : (
                        <p>Loading...</p>
                      )}
                    </div>
                  )}
                </div>
                
                {isConnected && calibrationComplete && (
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Amplitude</p>
                      <p className="font-mono text-lg">{(breathAmplitude * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Phase</p>
                      <p className="font-medium capitalize">{breathPhase}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Rate</p>
                      <p className="font-mono text-lg">{breathingRate}/min</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Back Button */}
          <div className="text-center mt-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/breath')}
            >
              ← Back to Breath Options
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}