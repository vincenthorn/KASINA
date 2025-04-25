import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { getLocalStorage, setLocalStorage } from "../utils";

export interface Recording {
  id: string;
  type: 'audio' | 'screen';
  url: string;
  filename: string;
  kasinaType: string;
  duration: number;
  date: Date | string;
  size: number;
}

export interface RecordingState {
  recordings: Recording[];
  addRecording: (recording: Recording) => void;
  removeRecording: (id: string) => void;
  saveRecording?: (recording: Omit<Recording, "id">) => Promise<void>;
  deleteRecording?: (id: string) => void;
  downloadRecording?: (recording: Recording) => void;
}

export const useRecording = create<RecordingState>((set, get) => ({
  recordings: getLocalStorage<Recording[]>("recordings", []),
  
  addRecording: (recording: Recording) => {
    const recordings = [...get().recordings, recording];
    set({ recordings });
    setLocalStorage("recordings", recordings);
  },
  
  removeRecording: (id: string) => {
    const recordings = get().recordings.filter(rec => rec.id !== id);
    set({ recordings });
    setLocalStorage("recordings", recordings);
  }
}));

// Initialize with stored recordings
(async () => {
  try {
    // Attempt to load recordings from localStorage
    const recordings = getLocalStorage<Recording[]>("recordings", []);
    if (recordings && recordings.length > 0) {
      useRecording.setState({ recordings });
    }
  } catch (error) {
    console.error("Failed to load recordings:", error);
  }
})();
