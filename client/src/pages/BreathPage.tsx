import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../lib/stores/useAuth';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';
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
    calibrationProgress,
    startCalibration,
    calibrationComplete,
    currentForce,
    calibrationProfile
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

      <div className="min-h-screen bg-black flex flex-col items-center justify-start p-4 pt-16">
        {/* Main Interface Card */}
        <div className="w-full max-w-4xl">
          {/* Page Title */}
          <h1 className="text-4xl font-bold text-white mb-8 text-left">Breath Kasina</h1>
          <div 
            className="rounded-2xl p-8 shadow-2xl border border-purple-500/30"
            style={{
              background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 25%, #6d28d9 50%, #7c3aed 75%, #8b5cf6 100%)',
              boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
            }}
          >
            {/* Header Section - Horizontal Layout */}
            <div className="flex items-center gap-8 mb-6">
              {/* Device Icon */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Title and Description */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">
                    🌀 Vernier Respiration Belt
                  </h2>
                  <span className="bg-blue-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                    Premium
                  </span>
                  <span className="bg-green-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                    Official
                  </span>
                </div>
                
                <p className="text-purple-100 text-sm leading-relaxed">
                  Connect your Vernier GDX Respiration Belt via Bluetooth for precise breathing detection.
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Feature Icons Grid - Horizontal Layout */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <div className="text-xl mb-1">📱</div>
                <p className="text-white text-xs font-medium">Bluetooth connection</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <div className="text-xl mb-1">⚙️</div>
                <p className="text-white text-xs font-medium">Auto-calibration</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <div className="text-xl mb-1">🫁</div>
                <p className="text-white text-xs font-medium">Force detection</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <div className="text-xl mb-1">🧘</div>
                <p className="text-white text-xs font-medium">Visual meditation</p>
              </div>
            </div>

            {/* Professional Grade Section - Full Width */}
            <div className="mb-6">
              <div className="p-4 bg-white/5 rounded-lg border border-purple-300/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏆</span>
                  <h3 className="text-white font-semibold">Professional Grade Accuracy</h3>
                </div>
                <p className="text-purple-100 text-sm">
                  Uses actual respiratory force measurements (Newtons) for unprecedented precision in breath tracking.
                </p>
              </div>
            </div>

            {/* Live Preview (when connected) */}
            {isConnected && (
              <div className="mb-6">
                <div className="relative h-32 bg-black/30 rounded-lg overflow-hidden border border-purple-300/20">
                  <BreathKasinaOrb 
                    useVernier={false}
                    breathAmplitude={breathAmplitude}
                    breathPhase={breathPhase}
                    isListening={true}
                  />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-4 text-xs">
                    <div className="text-center">
                      <p className="text-purple-200">Amplitude</p>
                      <p className="font-mono text-blue-300">{(breathAmplitude * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-200">Phase</p>
                      <p className="font-medium capitalize text-green-300">{breathPhase}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-200">Rate</p>
                      <p className="font-mono text-purple-300">{breathingRate}/min</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Action Button */}
            <div className="space-y-3">
              <Button 
                onClick={handleStartSession}
                disabled={isConnecting || !hasPremiumAccess}
                className={`w-full py-4 text-lg font-bold rounded-xl transition-all duration-300 ${
                  isConnected 
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                }`}
                style={{
                  boxShadow: isConnected 
                    ? '0 10px 30px rgba(34, 197, 94, 0.3)' 
                    : '0 10px 30px rgba(59, 130, 246, 0.3)'
                }}
              >
                {getButtonText()}
              </Button>
              
              {isConnected && (
                <Button 
                  variant="outline" 
                  onClick={disconnectDevice}
                  className="w-full py-3 border-purple-300/30 text-purple-100 hover:bg-white/10 rounded-xl"
                >
                  Disconnect Device
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BreathPage;