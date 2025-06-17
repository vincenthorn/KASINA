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
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
            
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white">Musical Kasina</h1>
              </div>
              
              <p className="text-xl text-white/80 max-w-2xl">
                Upload your own MP3 files and experience immersive audio-reactive meditation with synchronized visual effects.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardHeader className="text-center">
                  <FileAudio className="w-8 h-8 mx-auto mb-2 text-blue-300" />
                  <CardTitle className="text-lg">Your Music</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/80">
                    Upload any MP3 file from your collection for a personalized meditation experience.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardHeader className="text-center">
                  <Waves className="w-8 h-8 mx-auto mb-2 text-green-300" />
                  <CardTitle className="text-lg">Real-time Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/80">
                    Advanced Web Audio API analysis creates dynamic visual effects synchronized to your music.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardHeader className="text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-purple-300" />
                  <CardTitle className="text-lg">Visual Meditation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-white/80">
                    Choose between visual-only mode or breath-synchronized meditation with musical guidance.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={() => setViewState('upload')}
              size="lg"
              className="bg-white text-purple-900 hover:bg-white/90 px-8 py-4 text-lg font-semibold"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Your Music
            </Button>

            {/* Admin Notice */}
            <div className="text-sm text-white/60 max-w-md">
              <p>Musical Kasina is currently available for admin users only.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Upload page
  if (viewState === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
            
            {/* Back Button */}
            <div className="w-full max-w-2xl">
              <Button 
                variant="ghost" 
                onClick={() => setViewState('landing')}
                className="text-white hover:bg-white/10"
              >
                ← Back to Musical Kasina
              </Button>
            </div>

            {/* Upload Area */}
            <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Upload Your Music</CardTitle>
                <CardDescription className="text-white/80">
                  Select an MP3 file to begin your musical meditation session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Drag & Drop Area */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-white/30 rounded-lg p-12 text-center hover:border-white/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-white/60" />
                  <p className="text-lg text-white mb-2">Drop your MP3 file here</p>
                  <p className="text-sm text-white/60">or click to browse</p>
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
                <div className="text-sm text-white/60 space-y-1">
                  <p>• Supported format: MP3</p>
                  <p>• Maximum file size: 50MB</p>
                  <p>• Your audio stays private and is processed locally</p>
                </div>

                {/* Error Display */}
                {error && (
                  <Alert className="bg-red-500/20 border-red-500/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-white">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Mode Selection
  if (viewState === 'mode-selection' && uploadedFile && audioFeatures) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
            
            {/* Back Button */}
            <div className="w-full max-w-4xl">
              <Button 
                variant="ghost" 
                onClick={() => setViewState('upload')}
                className="text-white hover:bg-white/10"
              >
                ← Upload Different Track
              </Button>
            </div>

            {/* Track Info */}
            <Card className="w-full max-w-4xl bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-white">Track Loaded</CardTitle>
                <CardDescription className="text-white/80">
                  {uploadedFile.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Audio Features */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{Math.round(audioFeatures.tempo)}</div>
                    <div className="text-sm text-white/60">BPM</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{formatTime(duration)}</div>
                    <div className="text-sm text-white/60">Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{Math.round(audioFeatures.energy * 100)}%</div>
                    <div className="text-sm text-white/60">Energy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{Math.round(audioFeatures.valence * 100)}%</div>
                    <div className="text-sm text-white/60">Positivity</div>
                  </div>
                </div>

                <Separator className="bg-white/20" />

                {/* Mode Selection */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white text-center">Choose Your Meditation Mode</h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Visual Mode */}
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all hover:scale-105",
                        selectedMode === 'visual' 
                          ? "bg-white/20 border-white/40" 
                          : "bg-white/10 border-white/20 hover:bg-white/15"
                      )}
                      onClick={() => setSelectedMode('visual')}
                    >
                      <CardHeader className="text-center">
                        <Eye className="w-8 h-8 mx-auto mb-2 text-blue-300" />
                        <CardTitle className="text-white">Visual Mode</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-white/80 text-center">
                          Immersive visual meditation with audio-reactive effects synchronized to your music.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Breath Mode */}
                    <Card 
                      className={cn(
                        "cursor-pointer transition-all hover:scale-105",
                        selectedMode === 'breath' 
                          ? "bg-white/20 border-white/40" 
                          : "bg-white/10 border-white/20 hover:bg-white/15"
                      )}
                      onClick={() => setSelectedMode('breath')}
                    >
                      <CardHeader className="text-center">
                        <Waves className="w-8 h-8 mx-auto mb-2 text-green-300" />
                        <CardTitle className="text-white">Breath Mode</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-white/80 text-center">
                          Guided breathing meditation where the orb expands and contracts with your breath rhythm.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Breath Mode Toggle (when breath mode selected) */}
                  {selectedMode === 'breath' && (
                    <div className="flex items-center justify-center space-x-4 pt-4">
                      <span className="text-white/80">Breath Synchronization:</span>
                      <Button
                        variant={breathMode ? "default" : "outline"}
                        onClick={() => setBreathMode(!breathMode)}
                        className={breathMode ? "bg-green-600 hover:bg-green-700" : "border-white/30 text-white hover:bg-white/10"}
                      >
                        {breathMode ? "ON" : "OFF"}
                      </Button>
                    </div>
                  )}

                  {/* Start Button */}
                  <div className="text-center pt-4">
                    <Button 
                      onClick={startMeditation}
                      size="lg"
                      className="bg-white text-purple-900 hover:bg-white/90 px-8 py-4 text-lg font-semibold"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Start Meditation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
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
          />
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <Card className="bg-black/50 backdrop-blur-sm border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                
                {/* Track Info */}
                <div className="text-white text-sm">
                  <div className="font-medium">{uploadedFile?.name}</div>
                  <div className="text-white/60">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <Separator orientation="vertical" className="h-8 bg-white/20" />

                {/* Playback Controls */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isPlaying ? pauseAudio : playAudio}
                    className="text-white hover:bg-white/10"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stopAudio}
                    className="text-white hover:bg-white/10"
                  >
                    Stop
                  </Button>
                </div>

                <Separator orientation="vertical" className="h-8 bg-white/20" />

                {/* Exit Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stopAudio();
                    setViewState('mode-selection');
                  }}
                  className="text-white hover:bg-white/10"
                >
                  Exit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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