/**
 * WHITE KASINA TIMER
 * A direct JavaScript timer implementation that bypasses React
 * and guarantees timer visibility while still allowing auto-hide
 */

console.log("[White Kasina] Script loaded - initializing");

// Create temporary placeholders
window.whiteKasinaTimer = {
  start: function() { 
    console.log("[White Kasina] Placeholder start called - initializing real timer"); 
    // Force initialization now if called before ready
    initializeTimer();
  },
  stop: function() { console.log("[White Kasina] Placeholder stop called"); },
  setTime: function(t) { console.log("[White Kasina] Placeholder setTime called with time:", t); }
};

// Track initialization
let isInitialized = false;
let initializationTimeout = null;

// Schedule initialization for when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("[White Kasina] DOM loaded, initializing timer...");
  initializeTimer();
});

// Also try to initialize after a delay as a fallback
initializationTimeout = setTimeout(function() {
  console.log("[White Kasina] Delayed initialization");
  initializeTimer();
}, 1000);

// Main implementation
function initializeTimer() {
  if (isInitialized) {
    console.log("[White Kasina] Timer already initialized, skipping");
    return;
  }
  
  // Prevent multiple inits
  isInitialized = true;
  
  // Clear pending timeout
  if (initializationTimeout) {
    clearTimeout(initializationTimeout);
    initializationTimeout = null;
  }
  
  console.log("[White Kasina] Timer script initializing NOW");
  
  // Force a delay to ensure DOM is ready
  setTimeout(function() {
  
  (function() {
    // Private variables
    let timerElement = null;
    let countdownInterval = null;
    let hideTimeout = null;
    let time = 60;
    let active = false;
    let lastInteractionTime = Date.now();
    
    // Debug flag - prints extra logging
    const DEBUG = true;
    
    // DOM Setup - Create a fixed timer element that floats above everything
    function setupTimerElement() {
      // Don't recreate if already exists
      if (timerElement) return;
      
      // 1. Add CSS
      const style = document.createElement('style');
      style.innerHTML = `
        /* Timer container */
        .white-kasina-timer {
          position: fixed !important;
          top: 20px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important; /* Max possible z-index */
          background: rgba(0, 0, 0, 0.8) !important;
          color: white !important;
          font-family: monospace, 'Courier New', Courier !important;
          font-size: 24px !important;
          padding: 8px 16px !important;
          border-radius: 50px !important;
          border: 2px solid #555 !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
          pointer-events: none !important;
          opacity: 1 !important;
          transition: opacity 0.3s ease !important;
        }
        
        /* Hidden state */
        .white-kasina-timer.timer-hidden {
          opacity: 0 !important;
        }
        
        /* Last 10 seconds countdown special styling */
        .white-kasina-timer.timer-countdown {
          border-color: white !important;
          animation: kasina-timer-pulse 1s infinite !important;
        }
        
        @keyframes kasina-timer-pulse {
          0% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.2) !important; }
          50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.4) !important; }
          100% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.2) !important; }
        }
      `;
      document.head.appendChild(style);
      
      // 2. Create timer element
      timerElement = document.createElement('div');
      timerElement.className = 'white-kasina-timer timer-hidden';
      
      // 3. Add timer icon
      const timerIcon = document.createElement('div');
      timerIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      `;
      
      // 4. Add timer text
      const timerText = document.createElement('div');
      timerText.id = 'white-kasina-timer-text';
      timerText.textContent = formatTime(time);
      
      // 5. Assemble and append to body
      timerElement.appendChild(timerIcon);
      timerElement.appendChild(timerText);
      document.body.appendChild(timerElement);
      
      console.log("[White Kasina] Timer element created");
    }
    
    // Helper: Format seconds as MM:SS
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Mouse activity detector - show timer when mouse moves
    function setupEventListeners() {
      console.log("[White Kasina] Setting up event listeners");
      
      // Track mouse movement
      document.addEventListener('mousemove', function(e) {
        if (!active) return;
        
        // Only react to actual movement (prevent system-generated events)
        if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
          lastInteractionTime = Date.now();
          showTimer();
        }
      });
      
      // Track keyboard activity
      document.addEventListener('keydown', function(e) {
        if (!active) return;
        
        // Update last interaction time
        lastInteractionTime = Date.now();
        showTimer();
        
        // Handle double-escape for debug toggle
        if (e.key === 'Escape') {
          if (window.lastEscapeTime && Date.now() - window.lastEscapeTime < 500) {
            if (timerElement) {
              timerElement.classList.toggle('timer-hidden');
              console.log("[White Kasina] Timer visibility toggled via Escape");
            }
          }
          window.lastEscapeTime = Date.now();
        }
      });
      
      // Check for inactivity repeatedly
      setInterval(function() {
        if (!active || !timerElement) return;
        
        // Don't hide during the final countdown
        if (time <= 10 && time > 0) return;
        
        // Check if we should hide the timer due to inactivity
        const timeSinceLastInteraction = Date.now() - lastInteractionTime;
        if (timeSinceLastInteraction > 2000) { // 2 seconds inactivity
          timerElement.classList.add('timer-hidden');
        }
      }, 500);
      
      // Watch for URL changes
      let lastUrl = window.location.href;
      setInterval(function() {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          console.log("[White Kasina] URL changed, reevaluating timer", {
            from: lastUrl,
            to: currentUrl
          });
          
          lastUrl = currentUrl;
          
          // Stop timer if we navigate away from kasinas page
          if (!window.location.pathname.includes('/kasinas')) {
            stopTimer();
          }
        }
      }, 1000);
    }
    
    // Show the timer (and setup auto-hide)
    function showTimer() {
      if (!timerElement) setupTimerElement();
      
      // Immediately show timer
      timerElement.classList.remove('timer-hidden');
      
      // Clear any pending hide timeouts
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Don't auto-hide during final countdown
      if (time <= 10 && time > 0) return;
      
      // Set up auto-hide timeout
      hideTimeout = setTimeout(function() {
        if (timerElement && active) {
          timerElement.classList.add('timer-hidden');
          console.log("[White Kasina] Auto-hiding timer after inactivity");
        }
      }, 2000);
    }
    
    // PUBLIC: Start the timer
    function startTimer() {
      console.log("[White Kasina] startTimer called with pathname:", window.location.pathname);
      
      // We'll start regardless of URL since React will call this only when appropriate
      console.log("[White Kasina] FORCING TIMER START - URL check disabled");
      
      // Make sure DOM elements exist
      setupTimerElement();
      setupEventListeners();
      
      console.log("[White Kasina] Starting timer - setting active=true");
      
      // Reset state
      active = true;
      time = 60;
      lastInteractionTime = Date.now();
      
      // Force debug output of element
      if (timerElement) {
        console.log("[White Kasina] Timer element exists:", timerElement.className);
      } else {
        console.log("[White Kasina] Timer element is null!");
      }
      
      // Update display
      if (timerElement) {
        const textEl = document.getElementById('white-kasina-timer-text');
        if (textEl) textEl.textContent = formatTime(time);
        
        timerElement.classList.remove('timer-hidden', 'timer-countdown');
        showTimer();
      }
      
      // Clear any existing interval
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      
      // Start countdown
      console.log("[White Kasina] Setting up countdown interval");
      countdownInterval = setInterval(function() {
        // Decrement time
        time--;
        console.log("[White Kasina] Countdown tick:", time);
        
        if (timerElement) {
          // Update display
          const textEl = document.getElementById('white-kasina-timer-text');
          if (textEl) {
            textEl.textContent = formatTime(time);
            console.log("[White Kasina] Updated text to:", formatTime(time));
          } else {
            console.log("[White Kasina] Text element not found!");
          }
          
          // Handle final countdown
          if (time <= 10 && time > 0) {
            console.log("[White Kasina] Entering final countdown");
            timerElement.classList.add('timer-countdown');
            timerElement.classList.remove('timer-hidden');
          } else {
            timerElement.classList.remove('timer-countdown');
          }
          
          // Handle completion
          if (time <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            
            console.log("[White Kasina] Timer complete");
            
            // Keep visible for a moment, then clean up
            setTimeout(function() {
              if (timerElement) {
                timerElement.classList.add('timer-hidden');
                timerElement.classList.remove('timer-countdown');
                active = false;
              }
            }, 3000);
          }
        }
      }, 1000);
    }
    
    // PUBLIC: Stop the timer
    function stopTimer() {
      console.log("[White Kasina] Stopping timer");
      
      active = false;
      
      // Clear all timers
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Hide timer element
      if (timerElement) {
        timerElement.classList.add('timer-hidden');
        timerElement.classList.remove('timer-countdown');
      }
    }
    
    // PUBLIC: Update the timer value
    function setTimerValue(seconds) {
      time = seconds;
      
      if (timerElement) {
        // Update text
        const textEl = document.getElementById('white-kasina-timer-text');
        if (textEl) textEl.textContent = formatTime(seconds);
        
        // Apply final countdown styling if needed
        if (seconds <= 10 && seconds > 0) {
          timerElement.classList.add('timer-countdown');
          timerElement.classList.remove('timer-hidden');
        } else {
          timerElement.classList.remove('timer-countdown');
          
          // Check if we should be hidden due to inactivity
          const timeSinceLastInteraction = Date.now() - lastInteractionTime;
          if (timeSinceLastInteraction > 2000 && active) {
            timerElement.classList.add('timer-hidden');
          }
        }
      }
    }
    
    // Replace the placeholders with real implementations
    window.whiteKasinaTimer = {
      start: startTimer,
      stop: stopTimer,
      setTime: setTimerValue
    };
    
    // Log completion for debugging
    console.log("[White Kasina] Timer implementation ready");
  })();
  }, 50); // Short delay to ensure DOM is loaded
}