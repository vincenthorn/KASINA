// Global type definitions for the application

interface Window {
  __KASINA_DEBUG?: {
    selectedKasina: string;
    startTime: number;
    duration: number;
  };
  
  __DEBUG_TIMER?: {
    originalDuration: number | null;
    currentDuration: number | null;
  };
}