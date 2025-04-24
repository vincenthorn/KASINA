import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useMediaRecorder } from "../hooks/useMediaRecorder";
import { useTimer } from "../lib/stores/useTimer";
import { useKasina } from "../lib/stores/useKasina";
import { Mic, MicOff, Video, VideoOff, Square, Save, Trash2 } from "lucide-react";
import { useRecording } from "../lib/stores/useRecording";
import { toast } from "sonner";
import { KASINA_NAMES } from "../lib/constants";

const RecordingControls: React.FC = () => {
  const [captureAudio, setCaptureAudio] = useState(true);
  const [captureScreen, setCaptureScreen] = useState(true);
  const { selectedKasina } = useKasina();
  const { elapsedTime, isRunning } = useTimer();
  const { saveRecording } = useRecording();
  
  const {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    resetRecording,
    downloadRecording,
  } = useMediaRecorder({ captureAudio, captureScreen });

  const handleStartRecording = async () => {
    if (!captureAudio && !captureScreen) {
      toast.error("Please select at least one capture method");
      return;
    }
    
    try {
      await startRecording();
      toast.success("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to start recording. Please check permissions and try again.");
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    toast.success("Recording completed");
  };

  const handleSaveRecording = async () => {
    if (!recordedBlob) {
      toast.error("No recording to save");
      return;
    }
    
    try {
      await saveRecording({
        blob: recordedBlob,
        duration: elapsedTime,
        kasinaType: selectedKasina,
        kasinaName: KASINA_NAMES[selectedKasina],
        timestamp: new Date().toISOString(),
      });
      
      toast.success("Recording saved successfully");
      resetRecording();
    } catch (error) {
      console.error("Failed to save recording:", error);
      toast.error("Failed to save recording");
    }
  };

  const handleDownload = () => {
    if (!recordedBlob) {
      toast.error("No recording to download");
      return;
    }
    
    downloadRecording(`kasina_${selectedKasina}_${new Date().toISOString()}.webm`);
    toast.success("Download started");
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardContent className="pt-6 space-y-6">
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl text-white font-semibold">Recording Options</h2>
          
          <div className="flex space-x-4">
            <Button
              variant={captureAudio ? "default" : "outline"}
              onClick={() => setCaptureAudio(!captureAudio)}
              disabled={isRecording}
              className={`flex-1 ${captureAudio ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
            >
              {captureAudio ? <Mic className="mr-2 h-4 w-4" /> : <MicOff className="mr-2 h-4 w-4" />}
              {captureAudio ? "Audio On" : "Audio Off"}
            </Button>
            
            <Button
              variant={captureScreen ? "default" : "outline"}
              onClick={() => setCaptureScreen(!captureScreen)}
              disabled={isRecording}
              className={`flex-1 ${captureScreen ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
            >
              {captureScreen ? <Video className="mr-2 h-4 w-4" /> : <VideoOff className="mr-2 h-4 w-4" />}
              {captureScreen ? "Screen On" : "Screen Off"}
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col space-y-4">
          <h2 className="text-xl text-white font-semibold">Recording Controls</h2>
          
          <div className="flex space-x-4">
            {!isRecording ? (
              <Button 
                onClick={handleStartRecording} 
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={(!captureAudio && !captureScreen) || !isRunning}
              >
                <span className="flex items-center">
                  <span className="h-3 w-3 rounded-full bg-white mr-2 animate-pulse"></span>
                  Start Recording
                </span>
              </Button>
            ) : (
              <Button 
                onClick={handleStopRecording} 
                className="flex-1 bg-gray-600 hover:bg-gray-700"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop Recording
              </Button>
            )}
          </div>
        </div>
        
        {recordedBlob && (
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl text-white font-semibold">Recording Actions</h2>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleSaveRecording} 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Recording
              </Button>
              
              <Button 
                onClick={handleDownload} 
                variant="outline" 
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Download
              </Button>
              
              <Button 
                onClick={resetRecording} 
                variant="destructive" 
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Discard
              </Button>
            </div>
            
            <div className="py-2">
              <div className="w-full h-48 bg-black rounded overflow-hidden">
                <video 
                  src={URL.createObjectURL(recordedBlob)} 
                  controls 
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecordingControls;
