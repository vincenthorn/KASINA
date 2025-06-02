// Centralized WebGL context recovery system
class WebGLRecoveryManager {
  private static instance: WebGLRecoveryManager;
  private contextLossCount = 0;
  private recoveryInProgress = false;
  private listeners: Array<() => void> = [];

  static getInstance() {
    if (!this.instance) {
      this.instance = new WebGLRecoveryManager();
    }
    return this.instance;
  }

  setupRecovery(canvas: HTMLCanvasElement) {
    // Remove any existing listeners to prevent duplicates
    this.removeListeners(canvas);

    const handleContextLost = (event: Event) => {
      console.log('WebGL context lost - initiating proper recovery');
      
      // Prevent default behavior to enable recovery
      event.preventDefault();
      
      this.contextLossCount++;
      this.recoveryInProgress = true;

      // Log for diagnostics without crashing
      const crashLog = localStorage.getItem('persistentCrashLog') || '[]';
      const crashes = JSON.parse(crashLog);
      crashes.push({
        timestamp: new Date().toISOString(),
        crashType: 'webgl_context_lost',
        message: 'WebGL context lost - recovery initiated',
        userAgent: navigator.userAgent,
        recoveryAttempt: this.contextLossCount
      });
      if (crashes.length > 10) crashes.shift();
      localStorage.setItem('persistentCrashLog', JSON.stringify(crashes));
    };

    const handleContextRestored = (event: Event) => {
      console.log('WebGL context restored successfully');
      this.recoveryInProgress = false;

      // Notify all listeners that recovery is complete
      this.listeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          console.warn('Recovery listener error:', error);
        }
      });
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Store references for cleanup
    (canvas as any).__webglRecoveryListeners = {
      contextLost: handleContextLost,
      contextRestored: handleContextRestored
    };
  }

  removeListeners(canvas: HTMLCanvasElement) {
    const listeners = (canvas as any).__webglRecoveryListeners;
    if (listeners) {
      canvas.removeEventListener('webglcontextlost', listeners.contextLost);
      canvas.removeEventListener('webglcontextrestored', listeners.contextRestored);
      delete (canvas as any).__webglRecoveryListeners;
    }
  }

  addRecoveryListener(callback: () => void) {
    this.listeners.push(callback);
  }

  removeRecoveryListener(callback: () => void) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  isRecovering() {
    return this.recoveryInProgress;
  }

  getContextLossCount() {
    return this.contextLossCount;
  }
}

export const webglRecovery = WebGLRecoveryManager.getInstance();