import React, { useState } from "react";
import { useRecording } from "../lib/stores/useRecording";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Trash2, Download, ExternalLink, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";

const RecordingList: React.FC = () => {
  const { recordings, deleteRecording, downloadRecording } = useRecording();
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (recordings.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Your Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-gray-400 mb-2">You don't have any recordings yet</p>
            <p className="text-gray-500 text-sm">
              Start a freestyle meditation session and record it to see your recordings here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = (id: string) => {
    setSelectedRecordingId(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRecordingId) {
      deleteRecording(selectedRecordingId);
      toast.success("Recording deleted successfully");
    }
    setIsConfirmOpen(false);
  };

  const handleDownload = (id: string) => {
    const recording = recordings.find(rec => rec.id === id);
    if (recording) {
      downloadRecording(recording);
      toast.success("Download started");
    } else {
      toast.error("Recording not found");
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Your Recordings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recordings.map((recording) => (
            <div 
              key={recording.id} 
              className="flex flex-col bg-gray-800 rounded-lg overflow-hidden"
            >
              <div className="p-4 flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-white font-medium">{recording.kasinaName} Meditation</h3>
                  <div className="flex items-center text-gray-400 text-sm mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{formatDistanceToNow(new Date(recording.timestamp))} ago</span>
                    <span className="mx-2">•</span>
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatTime(recording.duration)}</span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(recording.id)}
                    title="Download recording"
                  >
                    <Download className="h-4 w-4 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const videoUrl = URL.createObjectURL(recording.blob);
                      window.open(videoUrl, '_blank');
                    }}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(recording.id)}
                    title="Delete recording"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="w-full h-40 bg-black">
                <video 
                  src={URL.createObjectURL(recording.blob)} 
                  controls 
                  className="w-full h-full"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this recording? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RecordingList;
