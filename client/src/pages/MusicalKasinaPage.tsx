import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Play, Pause, SkipBack, SkipForward, Music, List, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/stores/useAuth';
import MusicalKasinaOrb from '../components/MusicalKasinaOrb';
import { useSpotify } from '../lib/hooks/useSpotify';

const MusicalKasinaPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);
  const [isBreathMode, setIsBreathMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [audioFeatures, setAudioFeatures] = useState<any>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  
  const {
    isConnected,
    player,
    deviceId,
    playlists,
    connectSpotify,
    playTrack,
    pauseTrack,
    nextTrack,
    previousTrack,
    playPlaylist
  } = useSpotify();

  const [connecting, setConnecting] = useState(false);

  const handleConnectSpotify = async () => {
    setConnecting(true);
    try {
      await connectSpotify();
    } finally {
      setConnecting(false);
    }
  };

  // Check admin access
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  // Show Spotify connection landing page
  if (!isConnected) {
    return (
      <Layout>
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="relative h-full overflow-auto">
            <div className="p-6 ml-48 mr-6">
              <h1 className="text-4xl font-bold text-white mb-8">Musical Kasina</h1>
            
            <div className="grid gap-6 max-w-4xl">
              {/* Main Feature Card */}
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-xs text-gray-300">Real-time audio analysis</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-xs text-gray-300">Beat-synchronized visuals</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-xs text-gray-300">Playlist selection</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="w-3 h-3 bg-pink-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-xs text-gray-300">Breath mode integration</p>
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
        </div>
      </Layout>
    );
  }

  // Show mode selection after connection
  if (showModeSelection) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="p-6">
            <h1 className="text-4xl font-bold text-white mb-8">Choose Your Mode</h1>
            
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
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Music className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">Visual Mode</h3>
                  <p className="text-gray-300 text-lg mb-6">
                    Music-synchronized visual meditation with color changes responding to audio analysis and beat detection.
                  </p>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3">
                    Start Visual Mode
                  </Button>
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
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-white rounded-full animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">Breath Mode</h3>
                  <p className="text-gray-300 text-lg mb-6">
                    Combine breath meditation with music - orb expands and contracts with your breathing rhythm.
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3">
                    Start Breath Mode
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show meditation interface
  if (showMeditation) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="p-6">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-white">
                {isBreathMode ? 'Breath Mode' : 'Visual Mode'}
              </h1>
              <Button
                onClick={() => {
                  setShowMeditation(false);
                  setShowModeSelection(true);
                }}
                variant="outline"
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                Change Mode
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Playlist Selection */}
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <List className="w-5 h-5" />
                    Select Playlist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Choose a playlist" />
                    </SelectTrigger>
                    <SelectContent>
                      {playlists.map((playlist: any) => (
                        <SelectItem key={playlist.id} value={playlist.id}>
                          {playlist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedPlaylist && (
                    <Button
                      onClick={() => playPlaylist(selectedPlaylist)}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Playlist
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Meditation Orb */}
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

              {/* Music Controls */}
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Music Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Button
                      onClick={previousTrack}
                      variant="outline"
                      size="icon"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      onClick={isPlaying ? pauseTrack : playTrack}
                      size="icon"
                      className="bg-green-600 hover:bg-green-700 text-white w-12 h-12"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </Button>
                    
                    <Button
                      onClick={nextTrack}
                      variant="outline"
                      size="icon"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  {currentTrack && (
                    <div className="text-center text-white">
                      <p className="font-semibold">{currentTrack.name}</p>
                      <p className="text-gray-300 text-sm">{currentTrack.artists?.[0]?.name}</p>
                    </div>
                  )}

                  {isBreathMode && (
                    <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="breath-mode" className="text-white">
                          Breath Mode
                        </Label>
                        <Switch
                          id="breath-mode"
                          checked={isBreathMode}
                          onCheckedChange={setIsBreathMode}
                        />
                      </div>
                      <p className="text-gray-300 text-sm">
                        The orb will expand and contract with your breathing rhythm
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Default: Show mode selection
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="p-6">
          <h1 className="text-4xl font-bold text-white mb-8">Musical Kasina</h1>
          
          <div className="text-center">
            <Button
              onClick={() => setShowModeSelection(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 text-lg"
            >
              Begin Musical Meditation
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MusicalKasinaPage;