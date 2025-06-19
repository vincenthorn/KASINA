import React from 'react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';
import BreathKasinaOrb from '../components/BreathKasinaOrb';
import KasinaSelectionInterface from '../components/KasinaSelectionInterface';
import { sessionRecovery } from '../lib/sessionRecovery';

export default function VernierOfficialBreathPage() {
  const navigate = useNavigate();
  const [showMeditation, setShowMeditation] = React.useState(false);
  const [showKasinaSelection, setShowKasinaSelection] = React.useState(false);
  const [selectedKasina, setSelectedKasina] = React.useState('white');
  const [selectedKasinaSeries, setSelectedKasinaSeries] = React.useState<string | null>('COLOR');
  const [kasinaSelectionStep, setKasinaSelectionStep] = React.useState<'series' | 'kasina'>('series');
  const [forceStayOnPage, setForceStayOnPage] = React.useState(false);
  
  // Debug effect to monitor state changes
  React.useEffect(() => {
    console.log('🔍 VERNIER PAGE - State changed:', { 
      showKasinaSelection, 
      showMeditation, 
      selectedKasina,
      isConnected,
      calibrationComplete 
    });
  }, [showKasinaSelection, showMeditation, selectedKasina, isConnected, calibrationComplete]);

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

  // Handle kasina selection
  const handleSeriesSelection = (series: string) => {
    console.log('🔍 VERNIER PAGE - Series selected:', series);
    setSelectedKasinaSeries(series);
    setKasinaSelectionStep('kasina');
  };

  const handleKasinaSelection = (kasina: string) => {
    console.log('🔍 VERNIER PAGE - Kasina selected:', kasina);
    setSelectedKasina(kasina);
    setShowKasinaSelection(false);
    setShowMeditation(true);
  };

  const handleStartSession = async () => {
    console.log('handleStartSession called - isConnected:', isConnected, 'calibrationComplete:', calibrationComplete);
    if (!isConnected) {
      await connectDevice();
    } else if (!calibrationComplete) {
      console.log('About to call startCalibration...');
      await startCalibration();
    } else {
      // Show kasina selection first
      console.log('🎯 STARTING KASINA SELECTION: User clicked Begin Meditation button!');
      setShowKasinaSelection(true);
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

  // If kasina selection is active, show full-screen kasina selection
  if (showKasinaSelection) {
    console.log('🔍 VERNIER PAGE - Rendering kasina selection interface');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(8px)'
      }}>
        <KasinaSelectionInterface
          showKasinaSelection={showKasinaSelection}
          kasinaSelectionStep={kasinaSelectionStep}
          selectedKasinaSeries={selectedKasinaSeries}
          onSeriesSelection={handleSeriesSelection}
          onKasinaSelection={handleKasinaSelection}
          onBackToSeries={() => setKasinaSelectionStep('series')}
          onCancel={() => setShowKasinaSelection(false)}
        />
      </div>
    );
  }

  // If meditation mode is active, show full-screen breathing orb
  if (showMeditation) {
    console.log('🔍 VERNIER PAGE - Rendering meditation interface with kasina:', selectedKasina);
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <BreathKasinaOrb 
          useVernier={true}
          breathAmplitude={breathAmplitude}
          breathPhase={breathPhase}
          isListening={isConnected}
          selectedKasina={selectedKasina}
        />
        {/* Exit button */}
        <Button
          onClick={() => {
            setShowMeditation(false);
            navigate('/reflection');
          }}
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
            <h1 className="text-3xl font-bold mb-4 text-white">Breath Meditation</h1>
            <p className="text-gray-300">
              Connect your Vernier GDX Respiration Belt via Bluetooth for accurate breathing detection with official Vernier library for precise breath monitoring algorithms
            </p>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Controls Panel */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  🌀 Vernier Respiration Belt
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

                <div className="border-t border-gray-600 pt-4">
                  <p className="text-sm mb-4 text-gray-300">{getInstructions()}</p>
                  
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
              </CardContent>
            </Card>

            {/* Breathing Visualization */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">🫁 Live Breathing Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-96 bg-black rounded-lg overflow-hidden">
                  {isConnected ? (
                    <BreathKasinaOrb 
                      useVernier={false}
                      breathAmplitude={breathAmplitude}
                      breathPhase={breathPhase}
                      isListening={true}
                      selectedKasina={selectedKasina}
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
                      <p className="text-sm text-gray-400">Amplitude</p>
                      <p className="font-mono text-lg text-blue-400">{(breathAmplitude * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Phase</p>
                      <p className="font-medium capitalize text-green-400">{breathPhase}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Rate</p>
                      <p className="font-mono text-lg text-purple-400">{breathingRate}/min</p>
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