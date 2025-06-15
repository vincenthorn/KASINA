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
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
            <div className="max-w-md mx-auto text-center">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Musical Kasina
                </h1>
                <p className="text-lg text-gray-300 mb-6">
                  Synchronize your meditation with music through real-time audio analysis and visual feedback.
                </p>
              </div>

              {/* Connection Card */}
              <Card className="bg-gray-900/80 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-center space-x-2">
                    <Music className="w-6 h-6 text-purple-400" />
                    <span>Spotify Premium Required</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Connect your Spotify Premium account to access music-synchronized meditation with:
                  </p>
                  
                  <ul className="text-gray-300 text-sm space-y-2 text-left">
                    <li>• Real-time audio analysis</li>
                    <li>• Beat-synchronized visuals</li>
                    <li>• Playlist selection</li>
                    <li>• Breath mode integration</li>
                  </ul>

                  <Button 
                    onClick={handleConnectSpotify}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
                    size="lg"
                  >
                    <Music className="w-5 h-5 mr-2" />
                    Connect Spotify Premium
                  </Button>
                  
                  <p className="text-xs text-gray-400">
                    This feature requires Spotify Premium for playback control.
                  </p>
                </CardContent>
              </Card>
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
          
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
            <div className="max-w-2xl mx-auto text-center">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Choose Your Mode
                </h1>
                <p className="text-lg text-gray-300 mb-6">
                  Select how you'd like to experience music-synchronized meditation.
                </p>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card 
                  className="bg-gray-900/80 border-gray-700 backdrop-blur-sm cursor-pointer hover:border-purple-500 transition-colors"
                  onClick={() => handleModeSelect('visual')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <Music className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-white">Visual Mode</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Music-synchronized visual meditation with color changes responding to audio analysis.
                    </p>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      Start Visual Mode
                    </Button>
                  </CardContent>
                </Card>

                <Card 
                  className="bg-gray-900/80 border-gray-700 backdrop-blur-sm cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => handleModeSelect('breath')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white rounded-full animate-pulse" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-white">Breath Mode</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Combine breath meditation with music - orb expands and contracts with your breathing.
                    </p>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Start Breath Mode
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Button 
                onClick={() => setShowModeSelection(false)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Back to Connection
              </Button>
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