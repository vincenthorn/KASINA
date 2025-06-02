import React, { useRef, useEffect, useState } from 'react';
import { KASINA_COLORS, KASINA_TYPES } from '../lib/constants';

interface OffscreenKasinaOrbProps {
  selectedKasina: string;
  currentColor?: string;
  size?: number;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export default function OffscreenKasinaOrb({ 
  selectedKasina, 
  currentColor, 
  size = 1,
  onReady,
  onError 
}: OffscreenKasinaOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check OffscreenCanvas support immediately since canvas should be mounted
    const canvas = canvasRef.current;
    
    if (!canvas) {
      console.log('Canvas element not found');
      setIsSupported(false);
      onError?.('Canvas element not found');
      return;
    }

    // Check browser support
    const hasOffscreenCanvas = 'OffscreenCanvas' in window;
    const hasTransferControl = typeof canvas.transferControlToOffscreen === 'function';
    
    if (!hasOffscreenCanvas || !hasTransferControl) {
      console.log('OffscreenCanvas not supported:', {
        hasOffscreenCanvas,
        hasTransferControl,
        canvasElement: !!canvas,
        userAgent: navigator.userAgent,
        chromeVersion: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]
      });
      setIsSupported(false);
      onError?.('OffscreenCanvas not supported');
      return;
    }
    
    console.log('OffscreenCanvas support confirmed, initializing worker...');
    initializeWorker();
  }, []);

  const initializeWorker = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSupported(true);
    
    // Initialize worker
    try {
      workerRef.current = new Worker(
        new URL('../workers/kasinaWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Set up worker message handling
      workerRef.current.onmessage = (event) => {
        const { type, error } = event.data;
        
        switch (type) {
          case 'ready':
            console.log('🎯 OffscreenCanvas worker ready - platform timeout protection active');
            setIsReady(true);
            onReady?.();
            break;
          case 'error':
            console.error('Worker error:', error);
            onError?.(error);
            break;
          case 'destroyed':
            console.log('Worker cleanup complete');
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Worker creation failed:', error);
        onError?.(error.message);
      };

      // Transfer canvas control to worker
      const offscreen = canvas.transferControlToOffscreen();
      
      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      offscreen.width = rect.width * window.devicePixelRatio || 800;
      offscreen.height = rect.height * window.devicePixelRatio || 600;

      // Initialize worker with canvas and config
      const baseColor = KASINA_COLORS[selectedKasina] || currentColor || '#FF0000';
      workerRef.current.postMessage({
        type: 'init',
        canvas: offscreen,
        config: {
          color: baseColor,
          kasinaType: selectedKasina,
          size: size
        }
      }, [offscreen]);

    } catch (error) {
      console.error('Failed to create worker:', error);
      onError?.(error instanceof Error ? error.message : String(error));
    }
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'destroy' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Update worker config when props change
  useEffect(() => {
    if (workerRef.current && isReady) {
      const baseColor = KASINA_COLORS[selectedKasina] || currentColor || '#FF0000';
      
      workerRef.current.postMessage({
        type: 'updateConfig',
        config: {
          color: baseColor,
          kasinaType: selectedKasina,
          size: size
        }
      });
    }
  }, [selectedKasina, currentColor, size, isReady]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isSupported) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [isSupported]);

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>OffscreenCanvas not supported in this browser</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{
        display: 'block',
        width: '100%',
        height: '100%'
      }}
    />
  );
}