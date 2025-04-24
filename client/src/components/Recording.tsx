import { useState, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import KasinaOrb from "../lib/kasina-orbs/KasinaOrb";
import { KasinaType, getOrbConfig } from "../lib/types";
import { useKasina } from "../lib/stores/useKasina";
import { useRecording } from "../lib/stores/useRecording";
import { Mic, Video, AlertCircle, Download, Trash2 } from "lucide-react";

const Recording = () => {
  const { selectedKasina } = useKasina();
  const { recordings, addRecording, removeRecording } = useRecording();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeTab, setActiveTab] = useState("record");
  const [recordingType, setRecordingType] = useState<"audio" | "screen">("audio");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const orbConfig = getOrbConfig(selectedKasina);

  useEffect(() => {
    // Cleanup function
    return () => {
      stopRecording();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    chunksRef.current = [];
    
    try {
      if (recordingType === "audio") {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        streamRef.current = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            displaySurface: "browser",
            frameRate: 30
          }, 
          audio: true 
        });
      }
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      
      mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });
      
      mediaRecorderRef.current.addEventListener("stop", () => {
        const recordingBlob = new Blob(chunksRef.current, { 
          type: recordingType === "audio" ? "audio/webm" : "video/webm" 
        });
        
        const now = new Date();
        const filename = `kasina_${selectedKasina}_${now.toISOString().split("T")[0]}.webm`;
        const url = URL.createObjectURL(recordingBlob);
        
        addRecording({
          id: Date.now().toString(),
          type: recordingType,
          url,
          filename,
          kasinaType: selectedKasina,
          duration: recordingTime,
          date: now,
          size: recordingBlob.size
        });
        
        toast.success(`${recordingType === "audio" ? "Audio" : "Screen"} recording saved!`);
        
        // Reset
        setRecordingTime(0);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      });
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clear timer
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this recording?")) {
      removeRecording(id);
      toast.success("Recording deleted");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Recording Studio</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="record">Record Session</TabsTrigger>
          <TabsTrigger value="library">Your Recordings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="record" className="mt-0">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <Card className="bg-gray-800 text-white border-gray-700 mb-6">
                <CardHeader>
                  <CardTitle>Recording Controls</CardTitle>
                  <CardDescription className="text-gray-300">
                    Create audio or screen recordings of your meditation sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Button 
                      variant={recordingType === "audio" ? "default" : "outline"} 
                      onClick={() => setRecordingType("audio")}
                      disabled={isRecording}
                      className="flex gap-2"
                    >
                      <Mic size={18} />
                      Audio Only
                    </Button>
                    <Button 
                      variant={recordingType === "screen" ? "default" : "outline"} 
                      onClick={() => setRecordingType("screen")}
                      disabled={isRecording}
                      className="flex gap-2"
                    >
                      <Video size={18} />
                      Screen + Audio
                    </Button>
                  </div>
                  
                  {isRecording && (
                    <div className="flex items-center mb-6">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
                      <span>Recording: {formatTime(recordingTime)}</span>
                    </div>
                  )}
                  
                  <Alert className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Remember</AlertTitle>
                    <AlertDescription>
                      {recordingType === "audio" 
                        ? "Audio recording will capture your voice and background sounds."
                        : "Screen recording will capture this browser tab and your audio."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  {!isRecording ? (
                    <Button 
                      onClick={startRecording} 
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      Start Recording
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopRecording} 
                      variant="outline" 
                      className="w-full"
                    >
                      Stop Recording
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
            
            <div className="h-[400px] bg-black rounded-lg overflow-hidden">
              <Canvas>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={0.8} />
                <KasinaOrb
                  type={selectedKasina}
                  color={orbConfig.color}
                  speed={orbConfig.speed}
                  complexity={orbConfig.complexity}
                />
                <OrbitControls enableZoom={true} enablePan={false} zoomSpeed={0.08} />
              </Canvas>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="library" className="mt-0">
          <h2 className="text-2xl font-semibold mb-6">Your Recordings</h2>
          
          {recordings.length === 0 ? (
            <Card className="bg-gray-800 text-white border-gray-700 p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium mb-2">No recordings yet</h3>
              <p className="text-gray-400">
                Create your first recording in the Record Session tab.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {recordings.map((recording) => (
                <Card key={recording.id} className="bg-gray-800 text-white border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {recording.type === "audio" ? (
                        <Mic className="mr-2 h-5 w-5" />
                      ) : (
                        <Video className="mr-2 h-5 w-5" />
                      )}
                      {recording.kasinaType.charAt(0).toUpperCase() + recording.kasinaType.slice(1)} Kasina
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {new Date(recording.date).toLocaleDateString()} • {formatTime(recording.duration)} • {formatFileSize(recording.size)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recording.type === "audio" ? (
                      <audio controls className="w-full">
                        <source src={recording.url} type="audio/webm" />
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <video controls className="w-full rounded">
                        <source src={recording.url} type="video/webm" />
                        Your browser does not support the video element.
                      </video>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(recording.url, recording.filename)}
                      className="flex gap-2"
                    >
                      <Download size={16} />
                      Download
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(recording.id)}
                      className="text-red-400 hover:text-red-300 flex gap-2"
                    >
                      <Trash2 size={16} />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Recording;
