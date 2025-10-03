import { create } from 'zustand';
import { GuidedMeditationConfig } from '../guidedMeditations';

interface GuidedMeditationState {
  // Audio state
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  audioElement: HTMLAudioElement | null;
  selectedMeditation: GuidedMeditationConfig | null;
  
  // Actions
  loadMeditation: (config: GuidedMeditationConfig) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setAudioElement: (element: HTMLAudioElement) => void;
  updateTime: (time: number) => void;
  setDuration: (duration: number) => void;
  cleanup: () => void;
}

export const useGuidedMeditation = create<GuidedMeditationState>((set, get) => ({
  // Initial state
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  audioElement: null,
  selectedMeditation: null,

  // Load a meditation configuration
  loadMeditation: (config: GuidedMeditationConfig) => {
    set({ 
      selectedMeditation: config,
      currentTime: 0,
      isPlaying: false,
      isPaused: false
    });
  },

  // Play audio
  play: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.play().then(() => {
        set({ isPlaying: true, isPaused: false });
      }).catch(error => {
        console.error('Failed to play audio:', error);
      });
    }
  },

  // Pause audio
  pause: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
      set({ isPlaying: false, isPaused: true });
    }
  },

  // Toggle play/pause
  togglePlayPause: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  // Seek to specific time
  seek: (time: number) => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.currentTime = time;
      set({ currentTime: time });
    }
  },

  // Set audio element reference
  setAudioElement: (element: HTMLAudioElement) => {
    set({ audioElement: element });
    
    // Set up event listeners
    if (element) {
      // Update duration when metadata loads
      element.addEventListener('loadedmetadata', () => {
        set({ duration: element.duration });
      });

      // Update current time during playback
      element.addEventListener('timeupdate', () => {
        set({ currentTime: element.currentTime });
      });

      // Handle play event
      element.addEventListener('play', () => {
        set({ isPlaying: true, isPaused: false });
      });

      // Handle pause event
      element.addEventListener('pause', () => {
        set({ isPlaying: false, isPaused: true });
      });

      // Handle ended event
      element.addEventListener('ended', () => {
        set({ isPlaying: false, isPaused: false, currentTime: 0 });
      });
    }
  },

  // Update current time
  updateTime: (time: number) => {
    set({ currentTime: time });
  },

  // Set duration
  setDuration: (duration: number) => {
    set({ duration });
  },

  // Cleanup on unmount
  cleanup: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    set({
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      audioElement: null,
      selectedMeditation: null
    });
  }
}));