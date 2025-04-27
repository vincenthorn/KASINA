// Global type definitions

// Add the whiteKasinaTimer to the Window interface
interface Window {
  whiteKasinaTimer?: {
    start: () => void;
    stop: () => void;
    setTime: (seconds: number) => void;
  };
  __whiteKasinaTimerInitialized?: boolean;
}