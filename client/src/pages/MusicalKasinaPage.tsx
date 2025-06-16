import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/stores/useAuth';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Music, ArrowLeft } from 'lucide-react';

const MusicalKasinaPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);
  const [isBreathMode, setIsBreathMode] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Redirect non-admin users
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleConnectSpotify = async () => {
    setConnecting(true);
    // Simulate connection process
    setTimeout(() => {
      setConnecting(false);
      setShowModeSelection(true);
    }, 2000);
  };

  // Show mode selection after connection
  if (showModeSelection) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-white">Choose Your Mode</h1>
            <Button
              onClick={() => setShowModeSelection(false)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          
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
                  Music-synchronized visual meditation that responds to audio features and beat detection
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
                  Combine breath awareness with musical meditation for synchronized breathing and listening
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // Show meditation interface - full screen experience
  if (showMeditation) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col">
        {/* Header Controls */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
          <Button
            onClick={() => {
              setShowMeditation(false);
              setShowModeSelection(true);
            }}
            variant="outline"
            className="border-slate-600 bg-slate-800/80 backdrop-blur-sm text-slate-300 hover:bg-slate-700/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              Musical Kasina - {isBreathMode ? 'Breath Mode' : 'Visual Mode'}
            </h1>
          </div>

          <Button
            onClick={() => {
              setShowMeditation(false);
              setShowModeSelection(false);
            }}
            variant="destructive"
            className="bg-red-600/80 backdrop-blur-sm hover:bg-red-700/80"
          >
            End Session
          </Button>
        </div>

        {/* Main Meditation Area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-64 h-64 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-purple-500/30 shadow-lg shadow-purple-500/20">
              <Music className="w-32 h-32 text-purple-400 animate-pulse" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Musical Kasina</h2>
            <p className="text-xl text-gray-300 mb-6">
              {isBreathMode ? 'Breath-synchronized meditation with music' : 'Visual meditation synchronized with music'}
            </p>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-gray-300 mb-4">Connect Spotify Premium to begin</p>
              <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                <Music className="w-5 h-5 inline mr-2" />
                Connect Spotify Premium
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-400">Mode</p>
                <p className="text-white font-medium">{isBreathMode ? 'Breath + Music' : 'Visual + Music'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-white font-medium">Ready</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Type</p>
                <p className="text-white font-medium">Musical Kasina</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Spotify connection landing page
  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-white">Musical Kasina</h1>
        
        <div className="flex items-start justify-center pt-8">
          <div className="w-full max-w-2xl">
            <div className="bg-gradient-to-br from-purple-800/50 to-blue-800/50 backdrop-blur-sm border border-purple-600 rounded-xl p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                  <span className="text-4xl">🎹</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">🎵 Spotify Premium Required</h2>
                <p className="text-gray-300 mb-6">
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
      </div>
    </Layout>
  );
};

export default MusicalKasinaPage;