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
  
  // Musical Kasina session state
  const [meditationTime, setMeditationTime] = useState(0);
  const [orbSize, setOrbSize] = useState(0.3); // Match Visual Kasina default size
  const [showUIControls, setShowUIControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

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
    forceReauth,
    accessToken,
    deviceId
  } = useSpotify();

  // Check for Spotify callback before authentication redirect
  const hasSpotifyCallback = window.location.search.includes('code=');
  
  // Auto-show mode selection when Spotify connects successfully (only once)
  useEffect(() => {
    if (isConnected && !showModeSelection && !showMeditation && !showPlaylistSelection) {
      console.log('🎵 Spotify connected, showing mode selection');
      setShowModeSelection(true);
    }
  }, [isConnected, showModeSelection, showMeditation, showPlaylistSelection]);
  
  // Debug authentication state
  useEffect(() => {
    console.log('🎵 Musical Kasina Auth Debug:', {
      user: !!user,
      isAdmin,
      userEmail: user?.email,
      hasSpotifyCallback,
      isConnected,
      search: window.location.search
    });
  }, [user, isAdmin, hasSpotifyCallback, isConnected]);

  // Timer for meditation session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showMeditation) {
      interval = setInterval(() => {
        setMeditationTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showMeditation]);

  // Auto-hide UI controls
  const resetHideTimeout = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    setShowUIControls(true);
    const newTimeout = setTimeout(() => {
      setShowUIControls(false);
    }, 3000);
    setHideTimeout(newTimeout);
  };

  // Initialize auto-hide when meditation starts
  useEffect(() => {
    if (showMeditation) {
      resetHideTimeout();
    }
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [showMeditation]);

  // Reset auto-hide on mouse movement
  useEffect(() => {
    if (!showMeditation) return;

    const handleMouseMove = () => {
      resetHideTimeout();
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        resetHideTimeout();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [showMeditation]);

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Fetch audio features and analysis when track changes
  useEffect(() => {
    const fetchAudioData = async () => {
      if (currentTrack && currentTrack.id && isConnected) {
        try {
          console.log('🎵 Fetching audio data for track:', currentTrack.name, currentTrack.id);
          
          // Fetch audio features (valence, energy, tempo, key, mode)
          const features = await getAudioFeatures(currentTrack.id);
          if (features) {
            console.log('🎵 Audio features:', {
              energy: features.energy,
              valence: features.valence,
              tempo: features.tempo,
              key: features.key,
              mode: features.mode === 1 ? 'major' : 'minor',
              danceability: features.danceability
            });
            setAudioFeatures(features);
          }
          
          // Fetch audio analysis (beats, sections, segments)
          const analysis = await getAudioAnalysis(currentTrack.id);
          if (analysis) {
            console.log('🎵 Audio analysis:', {
              beats: analysis.beats?.length || 0,
              sections: analysis.sections?.length || 0,
              segments: analysis.segments?.length || 0
            });
            setAudioAnalysis(analysis);
          }
        } catch (error: any) {
          console.error('🎵 Failed to fetch audio data:', error);
          
          // Check if it's a 403 error (insufficient permissions)
          if (error?.message?.includes('403')) {
            console.log('🎵 Insufficient permissions detected, triggering re-authentication');
            // Show a user-friendly message and trigger re-auth
            if (confirm('The app needs additional Spotify permissions to show visual effects synced with music. Re-authenticate now?')) {
              forceReauth();
            }
          }
        }
      }
    };

    fetchAudioData();
  }, [currentTrack?.id, isConnected, getAudioFeatures, getAudioAnalysis]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
    console.log('🎵 Connect Spotify button clicked');
    console.log('🎵 Current auth state:', { isConnected, accessToken: !!accessToken, deviceId });
    
    setConnecting(true);
    try {
      console.log('🎵 Calling connectSpotify...');
      await connectSpotify();
      console.log('🎵 connectSpotify completed successfully');
    } catch (error: any) {
      console.error('🎵 Failed to connect to Spotify:', error);
      alert(`Failed to connect to Spotify: ${error?.message || 'Unknown error'}`);
    } finally {
      setConnecting(false);
    }
  };

  // Allow Spotify callback to process, then redirect if not authenticated
  // Also allow if Spotify is connected (user completed OAuth flow)
  if (!hasSpotifyCallback && !isConnected && (!user || !isAdmin)) {
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
                console.log('🎵 Visual Mode clicked, transitioning to playlist selection');
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
        <div className="min-h-screen bg-black">
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
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Timer and End button - Upper Left */}
        <div 
          className={`absolute top-4 left-4 z-30 flex items-center space-x-3 transition-opacity duration-300 ${showUIControls ? 'opacity-100' : 'opacity-0'}`}
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <span className="text-white font-mono text-lg font-bold">
            {formatTime(meditationTime)}
          </span>
          <button
            onClick={async () => {
              console.log('🎵 Ending session - pausing music');
              try {
                await pauseTrack();
                console.log('🎵 Music paused successfully');
              } catch (error) {
                console.error('🎵 Failed to pause music:', error);
              }
              setShowMeditation(false);
              setShowModeSelection(true);
              setMeditationTime(0);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            End
          </button>
        </div>

        {/* Size Slider - Top Center */}
        <div 
          className={`absolute top-4 left-1/2 transform -translate-x-1/2 z-30 transition-opacity duration-300 ${showUIControls ? 'opacity-100' : 'opacity-0'}`}
          style={{
            padding: '12px 20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '25px',
            backdropFilter: 'blur(10px)',
            minWidth: '200px'
          }}
        >
          <div className="flex items-center space-x-3">
            <span className="text-white text-sm font-medium">Size</span>
            <input
              type="range"
              min="5"
              max="100"
              value={Math.round(((orbSize - 0.05) / (1.5 - 0.05)) * 100)}
              onChange={(e) => {
                const percentage = parseFloat(e.target.value);
                const actualSize = 0.05 + (percentage / 100) * (1.5 - 0.05);
                setOrbSize(actualSize);
              }}
              className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${Math.round(((orbSize - 0.05) / (1.5 - 0.05)) * 100)}%, #475569 ${Math.round(((orbSize - 0.05) / (1.5 - 0.05)) * 100)}%, #475569 100%)`
              }}
            />
            <span className="text-white text-sm font-medium min-w-[3ch]">
              {Math.round(((orbSize - 0.05) / (1.5 - 0.05)) * 100)}%
            </span>
          </div>
        </div>

        {/* Fullscreen Button - Upper Right */}
        <div 
          className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${showUIControls ? 'opacity-100' : 'opacity-0'}`}
          style={{
            padding: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>

        {/* Central Orb */}
        <div className="flex-1 flex items-center justify-center relative">
          <MusicalKasinaOrb
            isBreathMode={isBreathMode}
            isPlaying={Boolean(currentTrack && !currentTrack.paused)}
            currentTrack={currentTrack}
            audioFeatures={audioFeatures}
            audioAnalysis={audioAnalysis}
            size={orbSize}
          />
        </div>

        {/* Music Controls - Bottom Center */}
        <div 
          className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 transition-opacity duration-300 ${showUIControls ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            padding: '16px',
            minWidth: '300px'
          }}
        >
          <div className="flex items-center justify-center space-x-4">
            {/* Music Controls */}
            <button
              onClick={previousTrack}
              className="text-slate-300 hover:text-white transition-colors p-2"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={currentTrack?.paused ? playTrack : pauseTrack}
              className="text-slate-300 hover:text-white transition-colors p-3 bg-slate-700/50 rounded-full hover:bg-slate-600/50"
            >
              {currentTrack?.paused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
            </button>
            
            <button
              onClick={nextTrack}
              className="text-slate-300 hover:text-white transition-colors p-2"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
          
          {/* Current Track Info */}
          {currentTrack && (
            <div className="mt-3 text-center">
              <p className="text-white font-medium text-sm truncate">
                {currentTrack.name}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {currentTrack.artists?.map(artist => artist.name).join(', ')}
              </p>
            </div>
          )}
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