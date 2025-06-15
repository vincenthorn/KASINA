import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    disconnectSpotify,
    getCurrentTrack,
    getAudioFeatures,
    getAudioAnalysis,
    getUserPlaylists,
    playPlaylist,
    playTrack,
    pauseTrack,
    nextTrack,
    previousTrack
  } = useSpotify();

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [isAdmin, navigate]);

  // Track current playing state
  useEffect(() => {
    if (!isConnected || !player) return;

    const updateCurrentTrack = async () => {
      try {
        const track = await getCurrentTrack();
        if (track) {
          setCurrentTrack(track);
          setIsPlaying(!track.paused);
          
          // Fetch audio features and analysis for new tracks
          if (!audioFeatures || audioFeatures.id !== track.id) {
            const features = await getAudioFeatures(track.id);
            const analysis = await getAudioAnalysis(track.id);
            setAudioFeatures(features);
            setAudioAnalysis(analysis);
          }
        }
      } catch (error) {
        console.error('Error updating current track:', error);
      }
    };

    // Update immediately
    updateCurrentTrack();

    // Set up interval to check for track changes
    const interval = setInterval(updateCurrentTrack, 1000);

    return () => clearInterval(interval);
  }, [isConnected, player, getCurrentTrack, getAudioFeatures, getAudioAnalysis, audioFeatures]);

  // Show mode selection when connected (PRD requirement)
  useEffect(() => {
    if (isConnected && !showModeSelection && !showMeditation) {
      setShowModeSelection(true);
      getUserPlaylists();
    }
  }, [isConnected, showModeSelection, showMeditation, getUserPlaylists]);

  // Handle playlist selection (PRD requirement)
  const handlePlaylistSelect = async (playlistId: string) => {
    if (!playlistId) return;
    
    setLoadingPlaylist(true);
    setSelectedPlaylist(playlistId);
    
    try {
      await playPlaylist(playlistId);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing playlist:', error);
    } finally {
      setLoadingPlaylist(false);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pauseTrack();
      } else {
        await playTrack();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleNext = async () => {
    try {
      await nextTrack();
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await previousTrack();
    } catch (error) {
      console.error('Error skipping to previous track:', error);
    }
  };

  const handleConnectSpotify = async () => {
    try {
      await connectSpotify();
    } catch (error) {
      console.error('Error connecting to Spotify:', error);
    }
  };

  const handleModeSelect = (mode: 'visual' | 'breath') => {
    setIsBreathMode(mode === 'breath');
    setShowModeSelection(false);
    setShowMeditation(true);
  };

  if (!isAdmin) {
    return null; // Component will redirect, but prevent flash
  }

  // Show Spotify connection landing page
  if (!isConnected) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden -mx-6 -my-6 md:-mx-8 md:-my-8">
          {/* Multiple gradient layers for full coverage */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-800/50 via-blue-800/50 to-indigo-800/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/30 via-transparent to-blue-900/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-indigo-900/20" />
          
          {/* Content container with padding restored */}
          <div className="relative z-10 min-h-screen flex flex-col p-6 md:p-8">
            {/* Header Section - Expanded */}
            <div className="flex-[2] flex flex-col items-center justify-center text-center px-8 pt-16">
            <h1 className="text-6xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Musical Kasina
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-4xl leading-relaxed">
              Synchronize your meditation with music through real-time audio analysis and immersive visual feedback
            </p>
          </div>

            {/* Connection Section - Much Smaller */}
            <div className="flex-1 flex items-start justify-center px-8 pt-8">
              <div className="w-full max-w-2xl">
              <Card className="bg-gray-900/95 border-gray-600/50 backdrop-blur-lg shadow-xl mx-auto">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl text-white flex items-center justify-center space-x-2">
                      <Music className="w-6 h-6 text-purple-400" />
                      <span>Spotify Premium Required</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-6 pb-6">
                    <p className="text-base text-gray-300 text-center">
                      Connect your Spotify Premium account to unlock music-synchronized meditation with advanced audio analysis
                    </p>
                    
                    {/* Features Grid - Horizontal */}
                    <div className="flex justify-center space-x-6 my-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <span className="text-gray-300 text-xs">Real-time audio analysis</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-gray-300 text-xs">Beat-synchronized visuals</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300 text-xs">Playlist selection</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                        <span className="text-gray-300 text-xs">Breath mode integration</span>
                      </div>
                    </div>

                    <div className="max-w-xs mx-auto">
                      <Button 
                        onClick={handleConnectSpotify}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base"
                        size="default"
                      >
                        <Music className="w-5 h-5 mr-2" />
                        Connect Spotify Premium
                      </Button>
                    </div>
                    
                    <p className="text-xs text-gray-400 text-center">
                      Spotify Premium is required for playback control and audio analysis features
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

          {/* Footer Section - Compact */}
          <div className="flex-[0.5] flex items-end justify-center pb-8">
            <div className="text-center text-gray-400">
              <p className="text-sm">
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
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Full screen mode selection */}
          <div className="relative z-10 min-h-screen flex flex-col">
            {/* Header Section */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Choose Your Mode
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl leading-relaxed mb-8">
                Select how you'd like to experience music-synchronized meditation
              </p>
            </div>

            {/* Mode Selection Section */}
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="w-full max-w-4xl">
                <div className="grid md:grid-cols-2 gap-8">
                  <Card 
                    className="bg-gray-900/90 border-gray-600 backdrop-blur-md cursor-pointer hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 transform hover:scale-105"
                    onClick={() => handleModeSelect('visual')}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                        <Music className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Visual Mode</h3>
                      <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                        Music-synchronized visual meditation with color changes responding to audio analysis and beat detection.
                      </p>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 text-lg">
                        Start Visual Mode
                      </Button>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-gray-900/90 border-gray-600 backdrop-blur-md cursor-pointer hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:scale-105"
                    onClick={() => handleModeSelect('breath')}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <div className="w-8 h-8 border-3 border-white rounded-full animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Breath Mode</h3>
                      <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                        Combine breath meditation with music - orb expands and contracts with your breathing rhythm.
                      </p>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-lg">
                        Start Breath Mode
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="flex-1 flex items-end justify-center pb-12">
              <div className="text-center">
                <Button 
                  onClick={() => setShowModeSelection(false)}
                  variant="outline"
                  className="border-gray-500 text-gray-300 hover:bg-gray-800 px-8 py-3"
                  size="lg"
                >
                  Back to Connection
                </Button>
                <p className="text-gray-400 mt-4 italic">
                  "Choose the path that resonates with your practice"
                </p>
              </div>
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
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
          {/* Header Controls */}
          <div className="absolute top-6 left-6 z-50">
            <Card className="bg-gray-900/80 border-gray-700 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Breath Mode Toggle */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="breath-mode"
                      checked={isBreathMode}
                      onCheckedChange={setIsBreathMode}
                    />
                    <Label htmlFor="breath-mode" className="text-sm font-medium">
                      Breath Mode
                    </Label>
                  </div>
                  
                  {/* Back to Mode Selection */}
                  <Button 
                    onClick={() => {
                      setShowMeditation(false);
                      setShowModeSelection(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Change Mode
                  </Button>

                  {/* Playlist Selection (PRD requirement) */}
                  {isConnected && playlists.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <List className="w-4 h-4 text-purple-400" />
                      <Select value={selectedPlaylist} onValueChange={handlePlaylistSelect}>
                        <SelectTrigger className="w-48 bg-gray-800/80 border-gray-600">
                          <SelectValue placeholder="Select playlist..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-600">
                          {playlists.map((playlist) => (
                            <SelectItem key={playlist.id} value={playlist.id}>
                              {playlist.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {loadingPlaylist && (
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Music Controls */}
          {isConnected && currentTrack && (
            <div className="absolute top-6 right-6 z-50">
              <Card className="bg-gray-900/80 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-3">
                    {/* Track Info */}
                    <div className="text-center max-w-xs">
                      <div className="text-sm font-medium truncate">
                        {currentTrack.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {currentTrack.artists?.map((a: any) => a.name).join(', ')}
                      </div>
                    </div>
                    
                    {/* Playback Controls */}
                    <div className="flex items-center justify-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handlePrevious}
                      >
                        <SkipBack className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={handlePlayPause}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleNext}
                      >
                        <SkipForward className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Kasina Display */}
          <div className="flex items-center justify-center min-h-screen">
            <MusicalKasinaOrb
              isBreathMode={isBreathMode}
              isPlaying={isPlaying}
              currentTrack={currentTrack}
              audioFeatures={audioFeatures}
              audioAnalysis={audioAnalysis}
            />
          </div>

          {/* Tagline */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="text-center text-gray-400 text-sm">
              "Breathe with the music—or let the music alone color your awareness."
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Fallback return (should not reach here)
  return null;
};

export default MusicalKasinaPage;