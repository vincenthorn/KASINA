import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { useAuth } from '../lib/stores/useAuth';
import MusicalKasinaOrb from '../components/MusicalKasinaOrb';
import { useSpotify } from '../lib/hooks/useSpotify';

const MusicalKasinaPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isBreathMode, setIsBreathMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [audioFeatures, setAudioFeatures] = useState<any>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null);
  
  const {
    isConnected,
    player,
    deviceId,
    connectSpotify,
    disconnectSpotify,
    getCurrentTrack,
    getAudioFeatures,
    getAudioAnalysis,
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

  if (!isAdmin) {
    return null; // Component will redirect, but prevent flash
  }

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
                
                {/* Spotify Connection */}
                {!isConnected ? (
                  <Button 
                    onClick={connectSpotify}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Music className="w-4 h-4 mr-2" />
                    Connect Spotify
                  </Button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 text-sm">Connected</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={disconnectSpotify}
                    >
                      Disconnect
                    </Button>
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
};

export default MusicalKasinaPage;