import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../lib/stores/useAuth';
import { useVernierBreathOfficial } from '../lib/useVernierBreathFixed';
import BreathKasinaOrb from '../components/BreathKasinaOrb';
import Layout from '../components/Layout';

// Browser detection utility
function isChromeBasedBrowser(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  console.log('🔍 BREATH PAGE - Browser detection - User Agent:', userAgent);
  
  // Check for Safari specifically (it contains 'safari' but not 'chrome')
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    console.log('🔍 BREATH PAGE - Detected Safari browser - not Chrome-based');
    return false;
  }
  
  // Check for Firefox
  if (userAgent.includes('firefox')) {
    console.log('🔍 BREATH PAGE - Detected Firefox browser - not Chrome-based');
    return false;
  }
  
  // Check for Chrome-based browsers
  const isChromeBased = (
    userAgent.includes('chrome') ||
    userAgent.includes('chromium') ||
    userAgent.includes('edge') ||
    userAgent.includes('brave') ||
    userAgent.includes('opera') ||
    userAgent.includes('vivaldi')
  );
  
  console.log('🔍 BREATH PAGE - Browser detection result:', isChromeBased ? 'Chrome-based' : 'Not Chrome-based');
  return isChromeBased;
}

const BreathPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [showMeditation, setShowMeditation] = React.useState(false);
  const [forceStayOnPage, setForceStayOnPage] = React.useState(false);
  
  // Browser compatibility state
  const [showBrowserWarning, setShowBrowserWarning] = React.useState(false);
  const [isChromeBased] = React.useState(() => {
    const result = isChromeBasedBrowser();
    console.log('🔍 BREATH PAGE - Initial browser detection on page load:', result);
    return result;
  });
  
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
    startCalibration
  } = useVernierBreathOfficial();
  
  // Check if user has premium access
  const hasPremiumAccess = user?.subscription === 'premium' || isAdmin;

  // Show browser warning on non-Chrome browsers
  React.useEffect(() => {
    console.log('🚨 BREATH PAGE - Browser warning check:', { isChromeBased });
    if (!isChromeBased) {
      console.log('🚨 BREATH PAGE - Showing browser warning for Safari/Firefox');
      setShowBrowserWarning(true);
    }
  }, [isChromeBased]);

  // Handle starting a session - connect and meditate (no calibration step)
  const handleStartSession = async () => {
    if (!hasPremiumAccess) return;
    
    if (!isConnected) {
      await connectDevice();
    } else {
      // Start meditation directly - breathing will auto-adjust during session
      setShowMeditation(true);
    }
  };

  const getButtonText = () => {
    if (!hasPremiumAccess) return 'Premium Feature';
    if (isConnecting) return 'Connecting...';
    if (!isConnected) return 'Connect Vernier Belt';
    return '🎯 Begin Meditation';
  };

  const getInstructions = () => {
    if (!hasPremiumAccess) return 'Premium subscription required for Vernier belt integration.';
    if (!isConnected) return 'Connect your Vernier GDX Respiration Belt via Bluetooth for precise breathing detection.';
    return 'Connected! Your breathing will automatically sync during meditation.';
  };

  // If meditation mode is active, show full-screen breathing orb
  if (showMeditation) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <BreathKasinaOrb 
          useVernier={isConnected}
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
      {/* Browser Compatibility Warning */}
      {showBrowserWarning && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <div 
            className="bg-red-600 text-white p-8 rounded-lg shadow-2xl max-w-lg mx-4 animate-pulse"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.98)',
              border: '3px solid rgba(239, 68, 68, 1)',
              boxShadow: '0 0 30px rgba(220, 38, 38, 0.5)'
            }}
          >
            <div className="flex items-start space-x-4">
              <div className="text-4xl" style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))' }}>⚠️</div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-3">Browser Not Compatible</h3>
                <p className="text-base mb-4">
                  Breath Mode with Vernier sensors requires a Chrome-based browser for Bluetooth connectivity.
                </p>
                <p className="text-base mb-4">
                  <strong>Supported browsers:</strong><br />
                  • Google Chrome<br />
                  • Microsoft Edge<br />
                  • Brave Browser<br />
                  • Opera<br />
                  • Vivaldi
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowBrowserWarning(false)}
                    className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    Continue Anyway
                  </button>
                  <button
                    onClick={() => window.open('https://www.google.com/chrome/', '_blank')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    Download Chrome
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-white">Breath Kasina</h1>
        
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

              {isConnecting && (
                <Alert className="border-blue-500 bg-blue-900/20">
                  <AlertDescription className="text-blue-200">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <span>Connecting to Vernier belt... Please select your device from the Bluetooth dialog.</span>
                    </div>
                    <p className="text-xs mt-2 text-blue-300">
                      If the connection dialog doesn't appear, try clicking Cancel and ensure your belt is powered on.
                    </p>
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
                    <p className="text-sm text-gray-300">
                      Status: <span className="font-mono text-green-400">Active</span>
                    </p>
                  )}
                </div>
              )}

              {/* Live Breathing Preview */}
              {isConnected && (
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
                disabled={isConnecting || !hasPremiumAccess}
                className={`flex-1 text-lg font-bold py-4 ${isConnected ? 'bg-green-600 hover:bg-green-700 animate-pulse border-4 border-green-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {getButtonText()}
              </Button>
              
              {(isConnected || isConnecting) && (
                <Button 
                  variant="outline" 
                  onClick={isConnecting ? () => window.location.reload() : disconnectDevice}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {isConnecting ? 'Cancel' : 'Disconnect'}
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