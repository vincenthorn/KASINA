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
// Temporarily comment out Spotify hook until credentials are configured
// import { useSpotify } from '../lib/hooks/useSpotify';

const MusicalKasinaPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isBreathMode, setIsBreathMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [audioFeatures, setAudioFeatures] = useState<any>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null);
  
  // Temporary demo state until Spotify is configured
  const [demoMode, setDemoMode] = useState(true);
  const [simulatedBeats, setSimulatedBeats] = useState(0);
  
  // Temporary demo functions
  const connectSpotify = () => {
    alert('Please configure Spotify credentials first. For now, using demo mode with simulated music data.');
  };
  
  const isConnected = false;

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [isAdmin, navigate]);

  // Demo mode simulation
  useEffect(() => {
    if (demoMode) {
      // Simulate demo audio features
      setAudioFeatures({
        energy: 0.7,
        valence: 0.6,
        tempo: 120,
        key: 5,
        mode: 1
      });
      
      // Simulate demo track
      setCurrentTrack({
        name: "Demo Track - Musical Kasina",
        artists: [{ name: "KASINA" }],
        id: "demo"
      });
      
      // Simulate beats for demo
      const beatInterval = setInterval(() => {
        setSimulatedBeats(prev => prev + 1);
      }, 500); // Beat every 500ms
      
      return () => clearInterval(beatInterval);
    }
  }, [demoMode]);

  const handlePlayPause = () => {
    if (isConnected) {
      // Will be implemented when Spotify is connected
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (isConnected) {
      // Will be implemented when Spotify is connected
    }
  };

  const handlePrevious = () => {
    if (isConnected) {
      // Will be implemented when Spotify is connected
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
                      onClick={() => {}}
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