import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Music, Headphones, Eye, Waves, Play, Pause, Upload, Volume2, Clock, SkipForward, SkipBack, FileAudio } from 'lucide-react';
import MusicalKasinaOrb from '@/components/MusicalKasinaOrb';
import { useAudioAnalysis } from '@/lib/hooks/useAudioAnalysis';
import { useAuth } from '@/lib/stores/useAuth';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';

type ViewState = 'landing' | 'upload' | 'mode-selection' | 'meditation';
type MeditationMode = 'visual' | 'breath';

export default function MusicalKasinaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [selectedMode, setSelectedMode] = useState<MeditationMode>('visual');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [breathMode, setBreathMode] = useState(false);
  
  // Meditation controls state (always declared)
  const [showControls, setShowControls] = useState(true);
  const [orbSize, setOrbSize] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isPlaying,
    audioBuffer,
    audioFeatures,
    currentTime,
    duration,
    loadAudioFile,
    playAudio,
    pauseAudio,
    stopAudio,
    getAnalysisData
  } = useAudioAnalysis();

  // Helper functions (always declared)
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  }, []);

  const getSessionDuration = useCallback(() => {
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  }, [sessionStartTime]);

  const formatSessionTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Check if user has access
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.subscriptionType !== 'admin') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('audio/') && !file.name.toLowerCase().endsWith('.mp3')) {
      setError('Please select a valid MP3 audio file.');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB.');
      return;
    }

    try {
      setError('');
      console.log('🎵 Loading uploaded file:', file.name);
      
      await loadAudioFile(file);
      setUploadedFile(file);
      setViewState('mode-selection');
      
      console.log('🎵 File loaded successfully, showing mode selection');
    } catch (err) {
      console.error('🎵 Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audio file');
    }
  }, [loadAudioFile]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => 
      file.type.includes('audio/') || file.name.toLowerCase().endsWith('.mp3')
    );
    
    if (audioFile && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(audioFile);
      fileInputRef.current.files = dt.files;
      
      // Trigger the change event
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
    }
  }, []);

  // Start meditation
  const startMeditation = useCallback(async () => {
    if (!audioBuffer) return;
    
    try {
      setViewState('meditation');
      await playAudio();
      console.log('🎵 Meditation started with uploaded track');
    } catch (err) {
      console.error('🎵 Error starting meditation:', err);
      setError('Failed to start audio playback');
    }
  }, [audioBuffer, playAudio]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Landing page
  if (viewState === 'landing') {
    return (
      <Layout>
        <div className="min-h-screen bg-black">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12">
              
              {/* Header */}
              <div className="space-y-6">
                <div className="flex items-center justify-center space-x-4 mb-8">
                  <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                    <Music className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-5xl font-bold text-white tracking-tight">Musical Kasina</h1>
                </div>
                
                <p className="text-2xl text-gray-300 max-w-3xl leading-relaxed">
                  Upload your own MP3 files and experience immersive audio-reactive meditation with synchronized visual effects.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl">
                <Card className="bg-gray-900/50 border-gray-700 text-white hover:bg-gray-900/70 transition-colors">
                  <CardHeader className="text-center pb-4">
                    <FileAudio className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                    <CardTitle className="text-xl">Your Music</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 leading-relaxed">
                      Upload any MP3 file from your collection for a personalized meditation experience.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700 text-white hover:bg-gray-900/70 transition-colors">
                  <CardHeader className="text-center pb-4">
                    <Waves className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <CardTitle className="text-xl">Real-time Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 leading-relaxed">
                      Advanced Web Audio API analysis creates dynamic visual effects synchronized to your music.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700 text-white hover:bg-gray-900/70 transition-colors">
                  <CardHeader className="text-center pb-4">
                    <Eye className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                    <CardTitle className="text-xl">Visual Meditation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 leading-relaxed">
                      Choose between visual-only mode or breath-synchronized meditation with musical guidance.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* CTA Button */}
              <Button 
                onClick={() => setViewState('upload')}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <Upload className="w-6 h-6 mr-3" />
                Upload Your Music
              </Button>

              {/* Admin Notice */}
              <div className="text-sm text-gray-500 max-w-md">
                <p>Musical Kasina is currently available for admin users only.</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Upload page
  if (viewState === 'upload') {
    return (
      <Layout>
        <div className="min-h-screen bg-black">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
              
              {/* Back Button */}
              <div className="w-full max-w-2xl">
                <Button 
                  variant="ghost" 
                  onClick={() => setViewState('landing')}
                  className="text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  ← Back to Musical Kasina
                </Button>
              </div>

              {/* Upload Area */}
              <Card className="w-full max-w-2xl bg-gray-900/70 border-gray-700">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl text-white">Upload Your Music</CardTitle>
                  <CardDescription className="text-gray-300 text-lg">
                    Select an MP3 file to begin your musical meditation session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  
                  {/* Drag & Drop Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-gray-600 rounded-xl p-16 text-center hover:border-purple-500 hover:bg-gray-800/30 transition-all cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-16 h-16 mx-auto mb-6 text-gray-400 group-hover:text-purple-400 transition-colors" />
                    <p className="text-xl text-white mb-3 group-hover:text-purple-300 transition-colors">Drop your MP3 file here</p>
                    <p className="text-gray-400 group-hover:text-gray-300 transition-colors">or click to browse</p>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* File Requirements */}
                  <div className="text-gray-400 space-y-2 bg-gray-800/50 p-4 rounded-lg">
                    <p className="font-medium text-gray-300 mb-2">Requirements:</p>
                    <p>• Supported format: MP3</p>
                    <p>• Maximum file size: 50MB</p>
                    <p>• Your audio stays private and is processed locally</p>
                  </div>

                  {/* Error Display */}
                  {error && (
                    <Alert className="bg-red-900/30 border-red-600">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Mode Selection
  if (viewState === 'mode-selection' && uploadedFile && audioFeatures) {
    return (
      <Layout>
        <div className="min-h-screen bg-black">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
              
              {/* Back Button */}
              <div className="w-full max-w-4xl">
                <Button 
                  variant="ghost" 
                  onClick={() => setViewState('upload')}
                  className="text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  ← Upload Different Track
                </Button>
              </div>

              {/* Track Info */}
              <Card className="w-full max-w-4xl bg-gray-900/70 border-gray-700">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl text-white">Track Loaded</CardTitle>
                  <CardDescription className="text-gray-300 text-lg">
                    {uploadedFile.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  
                  {/* Audio Features */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center bg-gray-800/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-white">{Math.round(audioFeatures.tempo)}</div>
                      <div className="text-sm text-gray-400">BPM</div>
                    </div>
                    <div className="text-center bg-gray-800/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-white">{formatTime(duration)}</div>
                      <div className="text-sm text-gray-400">Duration</div>
                    </div>
                    <div className="text-center bg-gray-800/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-white">{Math.round(audioFeatures.energy * 100)}%</div>
                      <div className="text-sm text-gray-400">Energy</div>
                    </div>
                    <div className="text-center bg-gray-800/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-white">{Math.round(audioFeatures.valence * 100)}%</div>
                      <div className="text-sm text-gray-400">Positivity</div>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Mode Selection */}
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-white text-center">Choose Your Meditation Mode</h3>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                      
                      {/* Visual Mode */}
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all hover:scale-105",
                          selectedMode === 'visual' 
                            ? "bg-purple-900/40 border-purple-500" 
                            : "bg-gray-800/50 border-gray-600 hover:bg-gray-800/70"
                        )}
                        onClick={() => setSelectedMode('visual')}
                      >
                        <CardHeader className="text-center">
                          <Eye className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                          <CardTitle className="text-white text-xl">Visual Mode</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-300 text-center leading-relaxed">
                            Immersive visual meditation with audio-reactive effects synchronized to your music.
                          </p>
                        </CardContent>
                      </Card>

                      {/* Breath Mode */}
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all hover:scale-105",
                          selectedMode === 'breath' 
                            ? "bg-green-900/40 border-green-500" 
                            : "bg-gray-800/50 border-gray-600 hover:bg-gray-800/70"
                        )}
                        onClick={() => setSelectedMode('breath')}
                      >
                        <CardHeader className="text-center">
                          <Waves className="w-12 h-12 mx-auto mb-4 text-green-400" />
                          <CardTitle className="text-white text-xl">Breath Mode</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-300 text-center leading-relaxed">
                            Guided breathing meditation where the orb expands and contracts with your breath rhythm.
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Breath Mode Toggle (when breath mode selected) */}
                    {selectedMode === 'breath' && (
                      <div className="flex items-center justify-center space-x-4 pt-4 bg-gray-800/30 rounded-lg p-4">
                        <span className="text-gray-300">Breath Synchronization:</span>
                        <Button
                          variant={breathMode ? "default" : "outline"}
                          onClick={() => setBreathMode(!breathMode)}
                          className={breathMode 
                            ? "bg-green-600 hover:bg-green-700 text-white" 
                            : "border-gray-600 text-gray-300 hover:bg-gray-700"
                          }
                        >
                          {breathMode ? "ON" : "OFF"}
                        </Button>
                      </div>
                    )}

                    {/* Start Button */}
                    <div className="text-center pt-6">
                      <Button 
                        onClick={startMeditation}
                        size="lg"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-5 text-xl font-semibold rounded-full"
                      >
                        <Play className="w-6 h-6 mr-3" />
                        Start Meditation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Meditation View
  if (viewState === 'meditation') {

    return (
      <div className="fixed inset-0 bg-black overflow-hidden">
        
        {/* Musical Kasina Orb */}
        <div className="absolute inset-0">
          <MusicalKasinaOrb
            audioFeatures={audioFeatures}
            getAnalysisData={getAnalysisData}
            isPlaying={isPlaying}
            currentTime={currentTime}
            useBreathMode={selectedMode === 'breath' && breathMode}
            orbSize={orbSize}
          />
        </div>

        {/* Controls Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowControls(!showControls)}
          className="absolute top-4 right-4 z-20 text-white/60 hover:text-white hover:bg-white/10"
        >
          {showControls ? 'Hide Controls' : 'Show Controls'}
        </Button>

        {/* Controls Overlay */}
        {showControls && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <Card className="bg-black/70 backdrop-blur-sm border-white/20">
              <CardContent className="p-6 space-y-4">
                
                {/* Session Info */}
                <div className="text-center space-y-2">
                  <div className="text-white text-lg font-medium">{uploadedFile?.name}</div>
                  <div className="flex justify-center space-x-6 text-sm text-white/80">
                    <div>
                      <span className="text-white/60">Track: </span>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                    <div>
                      <span className="text-white/60">Session: </span>
                      {formatSessionTime(getSessionDuration())}
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                {/* Playback Controls */}
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isPlaying ? pauseAudio : playAudio}
                    className="text-white hover:bg-white/10"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopAudio}
                    className="text-white hover:bg-white/10"
                  >
                    Stop
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/10"
                  >
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </Button>
                </div>

                <Separator className="bg-white/20" />

                {/* Orb Size Control */}
                <div className="space-y-2">
                  <label className="text-white/80 text-sm">Kasina Size</label>
                  <div className="flex items-center space-x-4">
                    <span className="text-white/60 text-xs">Small</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={orbSize}
                      onChange={(e) => setOrbSize(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-white/20 rounded-lg appearance-none slider"
                      style={{
                        background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${(orbSize - 0.5) / 1.5 * 100}%, rgba(255,255,255,0.2) ${(orbSize - 0.5) / 1.5 * 100}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                    <span className="text-white/60 text-xs">Large</span>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                {/* Mode Indicator */}
                <div className="text-center">
                  <Badge variant="outline" className="border-white/30 text-white">
                    {selectedMode === 'breath' && breathMode ? 'Breath Mode' : 'Visual Mode'}
                  </Badge>
                </div>

                <Separator className="bg-white/20" />

                {/* Exit Button */}
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      stopAudio();
                      setViewState('mode-selection');
                    }}
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    End Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>
    );
  }

  return null;
}