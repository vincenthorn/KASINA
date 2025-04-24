import { useState, useEffect, useCallback } from "react";

interface MediaRecorderOptions {
  captureAudio: boolean;
  captureScreen: boolean;
}

interface MediaRecorderHook {
  isRecording: boolean;
  recordedBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  downloadRecording: (filename: string) => void;
}

export const useMediaRecorder = (
  options: MediaRecorderOptions
): MediaRecorderHook => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const startRecording = useCallback(async () => {
    setRecordedChunks([]);
    setRecordedBlob(null);

    try {
      const mediaStreams: MediaStream[] = [];

      // Get screen capture if enabled
      if (options.captureScreen) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "browser",
          },
          audio: false,
        });
        mediaStreams.push(screenStream);
      }

      // Get audio if enabled
      if (options.captureAudio) {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        mediaStreams.push(audioStream);
      }

      if (mediaStreams.length === 0) {
        throw new Error("No media sources selected");
      }

      // Combine all tracks from different streams
      const combinedStream = new MediaStream();
      mediaStreams.forEach(stream => {
        stream.getTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      });

      // Create the media recorder with combined stream
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm",
      });

      // Set up recorder event handlers
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        // Create a new blob from all recorded chunks
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        setRecordedBlob(blob);
        setIsRecording(false);

        // Stop and release all tracks
        combinedStream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }, [options.captureAudio, options.captureScreen, recordedChunks]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  }, [mediaRecorder]);

  const resetRecording = useCallback(() => {
    setRecordedChunks([]);
    setRecordedBlob(null);
  }, []);

  const downloadRecording = useCallback((filename: string) => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [recordedBlob]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);

  return {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    resetRecording,
    downloadRecording,
  };
};
