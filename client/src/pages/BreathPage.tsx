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
    if (!isConnected) return 'Connect your Respiration Belt via Bluetooth for precise breath detection.';
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



      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-white">Breath Kasina</h1>
        
        <div className="flex items-start justify-center pt-8">
          <div className="w-full max-w-2xl">
            <div className="bg-gradient-to-br from-purple-800/50 to-blue-800/50 backdrop-blur-sm border border-purple-600 rounded-xl p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    <circle cx="12" cy="12" r="4" strokeWidth={2} />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">🌀 Vernier Respiration Belt</h2>
                <div className="flex gap-2 justify-center mb-4">
                  <span className="text-sm bg-blue-600 text-white px-3 py-1 rounded-full">Premium</span>
                  <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full">Official</span>
                </div>
                <p className="text-gray-300 mb-6">
                  {getInstructions()}
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-400 text-xl">💻</span>
                    </div>
                    <p className="text-sm text-gray-400">Bluetooth connection</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-400 text-xl">⚙️</span>
                    </div>
                    <p className="text-sm text-gray-400">Auto-calibration</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-400 text-xl">🫁</span>
                    </div>
                    <p className="text-sm text-gray-400">Force detection</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-orange-400 text-xl">🔮</span>
                    </div>
                    <p className="text-sm text-gray-400">Visual meditation</p>
                  </div>
                </div>

                <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <span className="text-blue-400 mr-2">🔬</span>
                    <h3 className="font-semibold text-white">Professional Grade Accuracy</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Uses actual respiratory force measurements (Newtons) for unprecedented precision.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-red-300 mb-2">Connection Error</h3>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Connection Status */}
                {hasPremiumAccess && (
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
                            <p className="text-green-400 text-sm mt-1">
                              Current Force: {currentForce.toFixed(2)} N
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={disconnectDevice}
                            className="border-green-500/30 text-green-300 hover:bg-green-500/10"
                          >
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-700/30 border border-slate-600/50 p-4 rounded-lg">
                        <p className="text-gray-300">💻 Ready to connect to your Vernier GDX device</p>
                      </div>
                    )}

                    {/* Live Breathing Preview */}
                    {isConnected && (
                      <div className="bg-slate-700/30 border border-slate-600/50 p-4 rounded-lg">
                        <h4 className="text-white font-medium mb-3">Live Breath Preview:</h4>
                        <div className="relative h-32 bg-black rounded-lg overflow-hidden mb-3">
                          <BreathKasinaOrb 
                            useVernier={false}
                            breathAmplitude={breathAmplitude}
                            breathPhase={breathPhase}
                            isListening={true}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-blue-400">
                              {(breathAmplitude * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-400">Amplitude</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-green-400 capitalize">
                              {breathPhase}
                            </div>
                            <div className="text-xs text-gray-400">Phase</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-purple-400">
                              {breathingRate}
                            </div>
                            <div className="text-xs text-gray-400">Rate/min</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <Button 
                  onClick={handleStartSession}
                  disabled={isConnecting || !hasPremiumAccess}
                  className={`flex-1 text-white font-semibold ${isConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {getButtonText()}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BreathPage;