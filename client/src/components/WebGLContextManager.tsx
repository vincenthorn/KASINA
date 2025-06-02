import { useEffect } from 'react';

interface WebGLContextManagerProps {
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

export const WebGLContextManager: React.FC<WebGLContextManagerProps> = ({
  onContextLost,
  onContextRestored
}) => {
  useEffect(() => {
    const handleContextLost = (event: Event) => {
      console.log('WebGL context lost - allowing browser recovery');
      
      // Log for diagnostics without preventing recovery
      const crashLog = localStorage.getItem('persistentCrashLog') || '[]';
      const crashes = JSON.parse(crashLog);
      crashes.push({
        timestamp: new Date().toISOString(),
        crashType: 'webgl_context_lost',
        message: 'WebGL context lost - browser handling recovery',
        userAgent: navigator.userAgent
      });
      if (crashes.length > 10) crashes.shift();
      localStorage.setItem('persistentCrashLog', JSON.stringify(crashes));
      
      onContextLost?.();
    };

    const handleContextRestored = (event: Event) => {
      console.log('WebGL context restored by browser');
      onContextRestored?.();
    };

    // Add listeners to any existing canvas
    const addListeners = () => {
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
      });
    };

    addListeners();
    
    // Re-add listeners after a delay for dynamically created canvases
    const timeout = setTimeout(addListeners, 1000);

    return () => {
      clearTimeout(timeout);
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      });
    };
  }, [onContextLost, onContextRestored]);

  return null;
};