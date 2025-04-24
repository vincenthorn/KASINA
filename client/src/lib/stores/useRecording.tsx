import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { getLocalStorage, setLocalStorage } from "../utils";

interface Recording {
  id: string;
  blob: Blob;
  kasinaType: string;
  kasinaName: string;
  duration: number;
  timestamp: string;
}

interface RecordingState {
  recordings: Recording[];
  saveRecording: (recording: Omit<Recording, "id">) => Promise<void>;
  deleteRecording: (id: string) => void;
  downloadRecording: (recording: Recording) => void;
}

export const useRecording = create<RecordingState>((set, get) => ({
  recordings: getLocalStorage("recordings") || [],
  
  saveRecording: async (recordingData: Omit<Recording, "id">) => {
    const recording: Recording = {
      ...recordingData,
      id: uuidv4(),
    };
    
    const recordings = [...get().recordings, recording];
    
    // Store the recordings list
    set({ recordings });
    
    // Save to local storage (excluding the blob which can't be serialized)
    const storageRecordings = recordings.map(rec => {
      // Create a new object without the blob property
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { blob, ...rest } = rec;
      return rest;
    });
    
    setLocalStorage("recordings", storageRecordings);
    
    // Also store the blob in IndexedDB for persistence
    try {
      const request = indexedDB.open("KasinaRecordings", 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("recordings")) {
          db.createObjectStore("recordings", { keyPath: "id" });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("recordings", "readwrite");
        const store = transaction.objectStore("recordings");
        
        store.put({
          id: recording.id,
          blob: recording.blob,
        });
      };
    } catch (error) {
      console.error("Failed to save recording to IndexedDB:", error);
    }
  },
  
  deleteRecording: (id: string) => {
    const recordings = get().recordings.filter(rec => rec.id !== id);
    set({ recordings });
    
    // Update local storage
    const storageRecordings = recordings.map(rec => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { blob, ...rest } = rec;
      return rest;
    });
    
    setLocalStorage("recordings", storageRecordings);
    
    // Delete from IndexedDB
    try {
      const request = indexedDB.open("KasinaRecordings", 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("recordings", "readwrite");
        const store = transaction.objectStore("recordings");
        
        store.delete(id);
      };
    } catch (error) {
      console.error("Failed to delete recording from IndexedDB:", error);
    }
  },
  
  downloadRecording: (recording: Recording) => {
    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kasina_${recording.kasinaType}_${new Date(recording.timestamp).toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
}));

// Load blobs from IndexedDB on init
(async () => {
  const storageRecordings = getLocalStorage("recordings") || [];
  
  if (storageRecordings.length > 0) {
    try {
      const loadRecordingsFromIndexedDB = () => {
        return new Promise<Recording[]>((resolve) => {
          const recordings: Recording[] = [];
          
          const request = indexedDB.open("KasinaRecordings", 1);
          
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("recordings")) {
              db.createObjectStore("recordings", { keyPath: "id" });
            }
          };
          
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("recordings", "readonly");
            const store = transaction.objectStore("recordings");
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
              const storedBlobs = getAllRequest.result;
              
              // Match blobs with metadata
              for (const recording of storageRecordings) {
                const match = storedBlobs.find(item => item.id === recording.id);
                if (match && match.blob) {
                  recordings.push({
                    ...recording,
                    blob: match.blob,
                  });
                }
              }
              
              resolve(recordings);
            };
          };
          
          request.onerror = () => {
            resolve([]);
          };
        });
      };
      
      const recordings = await loadRecordingsFromIndexedDB();
      useRecording.setState({ recordings });
    } catch (error) {
      console.error("Failed to load recordings from IndexedDB:", error);
    }
  }
})();
