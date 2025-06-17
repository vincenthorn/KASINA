import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/stores/useAuth';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Music, ArrowLeft, Play, Pause, SkipForward, SkipBack, List } from 'lucide-react';
import MusicalKasinaOrb from '../components/MusicalKasinaOrb';
import { useSpotify } from '../lib/hooks/useSpotify';

const MusicalKasinaPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);
  const [isBreathMode, setIsBreathMode] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showPlaylistSelection, setShowPlaylistSelection] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('');
  const [audioFeatures, setAudioFeatures] = useState<any>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null);
  const [startingPlaylist, setStartingPlaylist] = useState(false);

  const {
    isConnected,
    player,
    currentTrack,
    playlists,
    connectSpotify,
    getUserPlaylists,
    playPlaylist,
    playTrack,
    pauseTrack,
    nextTrack,
    previousTrack,
    getAudioFeatures,
    getAudioAnalysis,
    accessToken,
    deviceId
  } = useSpotify();

  // Check for Spotify callback before authentication redirect
  const hasSpotifyCallback = window.location.search.includes('code=');
  
  // Debug authentication state
  useEffect(() => {
    console.log('🎵 Musical Kasina Auth Debug:', {
      user: !!user,
      isAdmin,
      userEmail: user?.email,
      hasSpotifyCallback,
      search: window.location.search
    });
  }, [user, isAdmin, hasSpotifyCallback]);

  // Load playlists when Spotify connects and show mode selection
  useEffect(() => {
    if (isConnected) {
      console.log('🎵 Spotify connected, loading playlists and showing mode selection');
      getUserPlaylists();
      setShowModeSelection(true);
    }
  }, [isConnected, getUserPlaylists]);

  // Debug playlist data when it loads
  useEffect(() => {
    if (playlists.length > 0) {
      console.log('🎵 Playlists loaded, checking image data:', 
        playlists.map(p => ({
          name: p.name,
          hasImages: !!p.images?.length,
          imageUrl: p.images?.[0]?.url,
          imageCount: p.images?.length || 0
        }))
      );
    }
  }, [playlists]);

  // Auto-advance to mode selection after successful Spotify callback
  useEffect(() => {
    if (hasSpotifyCallback && isConnected && !showModeSelection) {
      console.log('🎵 Spotify callback processed successfully, advancing to mode selection');
      setShowModeSelection(true);
    }
  }, [hasSpotifyCallback, isConnected, showModeSelection]);

  // Update audio analysis when track changes
  useEffect(() => {
    if (currentTrack?.id) {
      const loadAudioData = async () => {
        const features = await getAudioFeatures(currentTrack.id);
        const analysis = await getAudioAnalysis(currentTrack.id);
        setAudioFeatures(features);
        setAudioAnalysis(analysis);
      };
      loadAudioData();
    }
  }, [currentTrack, getAudioFeatures, getAudioAnalysis]);

  const handleConnectSpotify = async () => {
    setConnecting(true);
    try {
      await connectSpotify();
    } catch (error) {
      console.error('Failed to connect to Spotify:', error);
    } finally {
      setConnecting(false);
    }
  };

  // Allow Spotify callback to process, then redirect if not authenticated
  if (!hasSpotifyCallback && (!user || !isAdmin)) {
    return <Navigate to="/login" replace />;
  }

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
                setShowPlaylistSelection(true);
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
                setShowPlaylistSelection(true);
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

  // Show playlist selection
  if (showPlaylistSelection) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
          <div className="container mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-5xl font-bold text-white mb-2">Choose Your Music</h1>
                <p className="text-xl text-slate-300">
                  Click any playlist to start your {isBreathMode ? 'breath meditation' : 'visual meditation'}
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowPlaylistSelection(false);
                  setShowModeSelection(true);
                }}
                variant="outline"
                size="lg"
                className="border-slate-600 bg-slate-800/50 backdrop-blur-sm text-slate-300 hover:bg-slate-700/80 hover:border-slate-500"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Modes
              </Button>
            </div>
            
            {/* Playlists Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
              {playlists.map((playlist) => (
                <Card 
                  key={playlist.id}
                  className={`group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl ${
                    selectedPlaylist === playlist.id 
                      ? 'ring-4 ring-green-500/70 bg-gradient-to-br from-green-600/30 via-slate-800/90 to-green-700/30 border-green-400/70 shadow-green-500/25' 
                      : 'bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-800/60 border-slate-600/50 hover:border-slate-500/70'
                  } backdrop-blur-lg`}
                  onClick={async () => {
                    try {
                      console.log('🎵 Playlist clicked, starting immediately:', playlist.name, playlist.id);
                      setSelectedPlaylist(playlist.id);
                      setStartingPlaylist(true);
                      
                      await playPlaylist(playlist.id);
                      console.log('🎵 Playlist started, transitioning to meditation view');
                      setShowMeditation(true);
                      setShowPlaylistSelection(false);
                    } catch (error: any) {
                      console.error('🎵 Failed to start playlist:', error);
                      alert(`Failed to start playlist: ${error?.message || 'Unknown error'}`);
                    } finally {
                      setStartingPlaylist(false);
                    }
                  }}
                >
                  <CardContent className="p-0">
                    {/* Album Art */}
                    <div className="relative w-full h-48 bg-gradient-to-br from-slate-700 to-slate-800 rounded-t-lg overflow-hidden">
                      {playlist.images?.[0]?.url ? (
                        <img 
                          src={`/api/spotify/image-proxy?url=${encodeURIComponent(playlist.images[0].url)}`}
                          alt={playlist.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onLoad={() => {
                            console.log('✅ Image loaded successfully:', playlist.name);
                          }}
                          onError={(e) => {
                            console.error('❌ Image failed to load:', {
                              playlist: playlist.name,
                              originalUrl: playlist.images[0].url,
                              proxyUrl: `/api/spotify/image-proxy?url=${encodeURIComponent(playlist.images[0].url)}`,
                              error: e
                            });
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.classList.remove('hidden');
                              fallback.classList.add('flex');
                            }
                          }}
                        />
                      ) : null}
                      <div className={`${playlist.images?.[0]?.url ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center bg-gradient-to-br from-purple-600/30 to-blue-600/30`}>
                        <Music className="w-16 h-16 text-slate-300" />
                      </div>
                      
                      {/* Selection Indicator */}
                      {selectedPlaylist === playlist.id && (
                        <div className="absolute top-3 right-3 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-pulse shadow-lg border-2 border-white">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Hover Play Icon */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    
                    {/* Playlist Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-300 transition-colors overflow-hidden">
                        <span className="block truncate">
                          {playlist.name}
                        </span>
                      </h3>
                      <p className="text-slate-400 text-sm mb-3 flex items-center">
                        <List className="w-4 h-4 mr-1" />
                        {playlist.tracks.total} tracks
                      </p>
                      {playlist.description && (
                        <p className="text-slate-500 text-sm leading-relaxed overflow-hidden">
                          <span className="block" style={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {playlist.description}
                          </span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Loading Indicator */}
            {startingPlaylist && (
              <div className="mt-12 flex justify-center">
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-4 px-12 text-lg rounded-lg shadow-2xl flex items-center">
                  <div className="w-6 h-6 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Starting Playlist...
                </div>
              </div>
            )}
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
            onClick={async () => {
              console.log('🎵 Going back - pausing music');
              try {
                await pauseTrack();
                console.log('🎵 Music paused successfully');
              } catch (error) {
                console.error('🎵 Failed to pause music:', error);
              }
              setShowMeditation(false);
              setShowModeSelection(true);
            }}
            variant="outline"
            className="border-slate-600 bg-slate-800/80 backdrop-blur-sm text-slate-300 hover:bg-slate-700/80"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex-1"></div>

          <Button
            onClick={async () => {
              console.log('🎵 Ending session - pausing music');
              try {
                await pauseTrack();
                console.log('🎵 Music paused successfully');
              } catch (error) {
                console.error('🎵 Failed to pause music:', error);
              }
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
          <div className="w-full h-full">
            <MusicalKasinaOrb 
              isBreathMode={isBreathMode}
              isPlaying={Boolean(currentTrack && !currentTrack.paused)}
              currentTrack={currentTrack}
              audioFeatures={audioFeatures}
              audioAnalysis={audioAnalysis}
            />
          </div>
        </div>

        {/* Bottom Status Bar with Music Controls */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 rounded-lg p-4">
            {currentTrack ? (
              <div className="flex items-center justify-between">
                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{currentTrack.name}</p>
                  <p className="text-gray-400 text-sm truncate">
                    {currentTrack.artists.map(artist => artist.name).join(', ')}
                  </p>
                </div>
                
                {/* Music Controls */}
                <div className="flex items-center space-x-4 mx-6">
                  <Button
                    onClick={previousTrack}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    onClick={currentTrack.paused ? playTrack : pauseTrack}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    {currentTrack.paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  </Button>
                  
                  <Button
                    onClick={nextTrack}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Mode Info */}
                <div className="text-right">
                  <p className="text-sm text-gray-400">Mode</p>
                  <p className="text-white font-medium">{isBreathMode ? 'Breath + Music' : 'Visual + Music'}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-400">Mode</p>
                  <p className="text-white font-medium">{isBreathMode ? 'Breath + Music' : 'Visual + Music'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-white font-medium">Loading...</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Type</p>
                  <p className="text-white font-medium">Musical Kasina</p>
                </div>
              </div>
            )}
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