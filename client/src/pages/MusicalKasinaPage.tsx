import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/stores/useAuth';
import { useSpotify } from '../lib/hooks/useSpotify';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Music, ArrowLeft } from 'lucide-react';
import { MusicalKasinaOrb } from '../components/MusicalKasinaOrb';

const MusicalKasinaPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const {
    isConnected,
    isPlaying,
    currentTrack,
    audioFeatures,
    audioAnalysis,
    connectSpotify,
    connecting
  } = useSpotify();

  const [showModeSelection, setShowModeSelection] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);
  const [isBreathMode, setIsBreathMode] = useState(false);

  // Redirect non-admin users
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleConnectSpotify = async () => {
    const success = await connectSpotify();
    if (success) {
      setShowModeSelection(true);
    }
  };

  // Show Spotify connection landing page
  if (!isConnected) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white">Musical Kasina</h1>
          
          <div className="max-w-4xl">
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <Music className="w-8 h-8 text-green-500 mr-3" />
                  <h2 className="text-2xl font-bold text-white">Spotify Premium Required</h2>
                </div>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  Synchronize your meditation with music through real-time audio analysis and immersive visual feedback
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Music className="w-6 h-6 text-green-500" />
                  </div>
                  <h4 className="text-white font-medium mb-2">Real-time audio analysis</h4>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Music className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 className="text-white font-medium mb-2">Beat-synchronized visuals</h4>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Music className="w-6 h-6 text-purple-500" />
                  </div>
                  <h4 className="text-white font-medium mb-2">Playlist selection</h4>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Music className="w-6 h-6 text-pink-500" />
                  </div>
                  <h4 className="text-white font-medium mb-2">Breath mode integration</h4>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleConnectSpotify}
                  disabled={connecting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
                >
                  <Music className="w-5 h-5" />
                  {connecting ? "Connecting..." : "Connect Spotify Premium"}
                </button>
                
                <p className="text-xs text-gray-400 mt-4">
                  Premium-only feature • Requires active Spotify Premium subscription
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show mode selection after connection
  if (showModeSelection) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white">Choose Your Mode</h1>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
            <Card 
              className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-400 transition-all duration-300"
              onClick={() => {
                setIsBreathMode(false);
                setShowMeditation(true);
                setShowModeSelection(false);
              }}
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Visual Mode</h3>
                <p className="text-gray-300">
                  Immerse yourself with music-synchronized visual meditation that responds to audio features and beat detection
                </p>
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-sm border border-blue-500/30 rounded-xl cursor-pointer hover:border-blue-400 transition-all duration-300"
              onClick={() => {
                setIsBreathMode(true);
                setShowMeditation(true);
                setShowModeSelection(false);
              }}
            >
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Breath Mode</h3>
                <p className="text-gray-300">
                  Combine breath awareness with musical meditation for a synchronized breathing and listening experience
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Show meditation interface
  if (showMeditation) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-white">
              {isBreathMode ? 'Breath Mode' : 'Visual Mode'}
            </h1>
            <Button
              onClick={() => {
                setShowMeditation(false);
                setShowModeSelection(true);
              }}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Mode Selection
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Music Control</h3>
                {currentTrack ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Now Playing</p>
                      <p className="text-white font-medium">{currentTrack.name}</p>
                      <p className="text-gray-300 text-sm">{currentTrack.artists?.[0]?.name}</p>
                    </div>
                    {audioFeatures && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">Energy:</span>
                          <span className="text-white ml-1">{Math.round(audioFeatures.energy * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Valence:</span>
                          <span className="text-white ml-1">{Math.round(audioFeatures.valence * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">No track playing. Start music in Spotify.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 lg:col-span-2">
              <CardContent className="p-8">
                <div className="relative h-96 flex items-center justify-center">
                  <MusicalKasinaOrb
                    isBreathMode={isBreathMode}
                    isPlaying={isPlaying}
                    currentTrack={currentTrack}
                    audioFeatures={audioFeatures}
                    audioAnalysis={audioAnalysis}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 lg:col-span-3">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Session Information</h3>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{isBreathMode ? 'Breath + Music' : 'Visual + Music'}</p>
                    <p className="text-gray-400">Mode</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{isPlaying ? 'Active' : 'Paused'}</p>
                    <p className="text-gray-400">Status</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">Musical</p>
                    <p className="text-gray-400">Kasina Type</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button
              onClick={() => {
                setShowMeditation(false);
                setShowModeSelection(false);
              }}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              End Session
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Default return (should not reach here)
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-white">Musical Kasina</h1>
        <p className="text-gray-300">Loading...</p>
      </div>
    </Layout>
  );
};

export default MusicalKasinaPage;