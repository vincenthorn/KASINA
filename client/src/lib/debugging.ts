/**
 * Kasina Debugging Utility
 * Provides comprehensive debugging tools for tracking component lifecycles
 * and timer operations to identify issues in the meditation flow.
 */

// Configuration
const DEBUG_ENABLED = true;
const MAX_DEBUG_ENTRIES = 100;

// Track debugging events with timestamps
type DebugEvent = {
  timestamp: number;
  component: string;
  action: string;
  data?: any;
};

// Global state for debugging
let debugLog: DebugEvent[] = [];
let debugConsoleOutput = true;

// Permanent DOM element for debugging
let debugElement: HTMLElement | null = null;

// Initialize debugging
export function initDebugging() {
  if (!DEBUG_ENABLED) return;
  
  if (typeof window !== 'undefined') {
    // Create a floating debug panel if it doesn't exist
    if (!debugElement) {
      debugElement = document.createElement('div');
      debugElement.id = 'kasina-debug-panel';
      debugElement.style.position = 'fixed';
      debugElement.style.bottom = '0';
      debugElement.style.right = '0';
      debugElement.style.width = '400px';
      debugElement.style.height = '200px';
      debugElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      debugElement.style.color = '#00ff00';
      debugElement.style.fontFamily = 'monospace';
      debugElement.style.fontSize = '10px';
      debugElement.style.padding = '10px';
      debugElement.style.overflow = 'auto';
      debugElement.style.zIndex = '9999';
      debugElement.style.display = 'none';
      
      // Add toggle button
      const toggleButton = document.createElement('button');
      toggleButton.innerText = 'Debug';
      toggleButton.style.position = 'fixed';
      toggleButton.style.bottom = '0';
      toggleButton.style.right = '0';
      toggleButton.style.zIndex = '10000';
      toggleButton.style.backgroundColor = '#333';
      toggleButton.style.color = '#fff';
      toggleButton.style.border = 'none';
      toggleButton.style.padding = '5px 10px';
      toggleButton.style.cursor = 'pointer';
      
      toggleButton.addEventListener('click', () => {
        if (debugElement) {
          debugElement.style.display = debugElement.style.display === 'none' ? 'block' : 'none';
        }
      });
      
      document.body.appendChild(toggleButton);
      document.body.appendChild(debugElement);
    }
  }
  
  // Create global debug object
  if (typeof window !== 'undefined') {
    (window as any).__KASINA_DEBUG = {
      log: debugLog,
      getLog: () => debugLog,
      clear: () => {
        debugLog = [];
        updateDebugPanel();
      },
      toggleConsole: () => {
        debugConsoleOutput = !debugConsoleOutput;
        return `Console output ${debugConsoleOutput ? 'enabled' : 'disabled'}`;
      }
    };
  }
}

// Log a debug event
export function logDebugEvent(component: string, action: string, data?: any) {
  if (!DEBUG_ENABLED) return;
  
  const event: DebugEvent = {
    timestamp: Date.now(),
    component,
    action,
    data
  };
  
  // Add to log with max size limit
  debugLog.unshift(event);
  if (debugLog.length > MAX_DEBUG_ENTRIES) {
    debugLog = debugLog.slice(0, MAX_DEBUG_ENTRIES);
  }
  
  // Also log to console if enabled
  if (debugConsoleOutput) {
    console.log(`🐛 [${component}] ${action}`, data || '');
  }
  
  // Update debug panel
  updateDebugPanel();
}

// Update the debug panel with current log
function updateDebugPanel() {
  if (!DEBUG_ENABLED || !debugElement) return;
  
  const formattedLog = debugLog.map(event => {
    const time = new Date(event.timestamp).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    
    return `<div class="debug-entry">
      <span class="debug-time">[${time}]</span>
      <span class="debug-component">[${event.component}]</span>
      <span class="debug-action">${event.action}</span>
      ${event.data ? `<span class="debug-data">${JSON.stringify(event.data)}</span>` : ''}
    </div>`;
  }).join('');
  
  debugElement.innerHTML = formattedLog;
}

// Export a timing utility
export function createTimingTracker(name: string) {
  const startTime = Date.now();
  
  return {
    elapsed: () => Date.now() - startTime,
    log: (action: string, data?: any) => {
      const elapsed = Date.now() - startTime;
      logDebugEvent(name, `${action} (${elapsed}ms)`, data);
      return elapsed;
    }
  };
}

// Initialize debugging when this module loads
initDebugging();

// Export a global debug function
export const debug = {
  log: (component: string, action: string, data?: any) => logDebugEvent(component, action, data),
  timing: createTimingTracker
};

export default debug;