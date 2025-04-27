/**
 * Direct timer injection script for white kasina meditation timer
 * This implements a completely separate timer that's guaranteed to be visible
 * even in focus mode, but also automatically hides after inactivity
 */

// Immediately create dummy placeholders to prevent runtime errors in app code
window.whiteKasinaTimer = {
  start: function() { console.log("WHITE KASINA TIMER: placeholder called"); },
  stop: function() { console.log("WHITE KASINA TIMER: placeholder called"); },
  setTime: function() { console.log("WHITE KASINA TIMER: placeholder called"); }
};

// Delay the actual implementation to ensure DOM is ready
setTimeout(function() {
  // Only proceed if we're on the kasinas page
  if (!window.location.pathname.includes('/kasinas')) {
    console.log("WHITE KASINA TIMER: Not on kasinas page, timer not initialized");
    return; // Exit early, not on kasinas page
  }
  
  console.log("WHITE KASINA TIMER: Initializing direct timer");
  
  // Create the actual timer implementation in IIFE for encapsulation
  (function() {
    // Timer state
    let timerElement = null;
    let timerInterval = null;
    let inactivityTimeout = null;
    let hideTimeout = null;
    let isActive = false;
    let currentSeconds = 60;
    let lastMoveTime = Date.now();
    
    // DOM and event tracking references
    let mouseListener = null;
    let keyListener = null;
    
    // Format seconds as MM:SS
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Create the timer DOM element with forced styling
    function createTimerElement() {
      if (timerElement) return; // Already created
      
      console.log("WHITE KASINA TIMER: Creating timer element");
      
      // Add CSS styles for timer with !important declarations to force precedence
      const style = document.createElement('style');
      style.textContent = `
        #white-kasina-direct-timer {
          position: fixed !important;
          top: 20px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important; /* Maximum possible z-index */
          background-color: rgba(0, 0, 0, 0.85) !important;
          color: white !important;
          font-family: monospace, 'Courier New', Courier !important;
          font-size: 30px !important;
          padding: 8px 20px !important;
          border-radius: 50px !important;
          border: 2px solid #666 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          transition: opacity 0.4s ease, visibility 0.4s ease !important;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.7) !important;
          pointer-events: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        #white-kasina-direct-timer.hidden {
          opacity: 0 !important;
          visibility: hidden !important;
        }
        
        #white-kasina-direct-timer.countdown {
          border-color: white !important;
          animation: wk-timer-pulse 1s infinite !important;
        }
        
        @keyframes wk-timer-pulse {
          0% { box-shadow: 0 0 15px rgba(255, 255, 255, 0.2) !important; }
          50% { box-shadow: 0 0 30px rgba(255, 255, 255, 0.5) !important; }
          100% { box-shadow: 0 0 15px rgba(255, 255, 255, 0.2) !important; }
        }
      `;
      document.head.appendChild(style);
      
      // Create the timer element
      const timer = document.createElement('div');
      timer.id = 'white-kasina-direct-timer';
      timer.className = 'hidden'; // Start hidden
      
      // Timer icon
      const iconSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      `;
      
      const icon = document.createElement('div');
      icon.innerHTML = iconSvg;
      
      // Timer text element
      const timeText = document.createElement('div');
      timeText.id = 'white-kasina-timer-text';
      timeText.textContent = formatTime(currentSeconds);
      
      // Assemble everything
      timer.appendChild(icon);
      timer.appendChild(timeText);
      document.body.appendChild(timer);
      
      timerElement = timer;
    }
    
    // Show the timer for a few seconds
    function showTimer() {
      if (!timerElement) createTimerElement();
      
      // Cancel any pending hide operations
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Show timer immediately
      timerElement.classList.remove('hidden');
      
      // Only auto-hide if we're not in the final countdown
      if (currentSeconds > 10) {
        // Set up auto-hide after inactivity
        hideTimeout = setTimeout(function() {
          if (timerElement && isActive) {
            timerElement.classList.add('hidden');
            console.log("WHITE KASINA TIMER: Auto-hiding after inactivity");
          }
        }, 3000); // Hide after 3 seconds of inactivity
      }
    }
    
    // Set up mouse and keyboard event listeners
    function setupEventListeners() {
      // Clean up any existing listeners first
      if (mouseListener) {
        document.removeEventListener('mousemove', mouseListener);
      }
      
      if (keyListener) {
        document.removeEventListener('keydown', keyListener);
      }
      
      // Create new listeners
      mouseListener = function(e) {
        // Only react to actual mouse movement
        if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
          lastMoveTime = Date.now();
          
          // Only show timer if it's active
          if (isActive) {
            showTimer();
          }
        }
      };
      
      keyListener = function(e) {
        // For any key press, show the timer
        lastMoveTime = Date.now();
        
        // Only show timer if it's active
        if (isActive) {
          showTimer();
        }
        
        // Special case for Escape key double-press (debug feature)
        if (e.key === 'Escape') {
          const now = Date.now();
          if (window.lastEscapePress && now - window.lastEscapePress < 500) {
            // Double Escape pressed - force toggle timer visibility
            if (timerElement) {
              if (timerElement.classList.contains('hidden')) {
                timerElement.classList.remove('hidden');
              } else {
                timerElement.classList.add('hidden');
              }
            }
          }
          window.lastEscapePress = now;
        }
      };
      
      // Add listeners to document
      document.addEventListener('mousemove', mouseListener);
      document.addEventListener('keydown', keyListener);
      
      console.log("WHITE KASINA TIMER: Event listeners initialized");
    }
    
    // Start the timer countdown
    function startTimer() {
      // Only work on kasinas page
      if (!window.location.pathname.includes('/kasinas')) {
        console.log("WHITE KASINA TIMER: Can't start timer - not on kasinas page");
        return;
      }
      
      console.log("WHITE KASINA TIMER: Starting countdown");
      
      // Create UI elements if needed
      if (!timerElement) {
        createTimerElement();
      }
      
      // Set up event listeners
      setupEventListeners();
      
      // Reset state
      isActive = true;
      currentSeconds = 60;
      lastMoveTime = Date.now();
      
      // Set initial timer text
      if (timerElement) {
        const textElement = document.getElementById('white-kasina-timer-text');
        if (textElement) {
          textElement.textContent = formatTime(currentSeconds);
        }
        
        // Show initially, then hide after delay
        timerElement.classList.remove('hidden', 'countdown');
        
        // Set up auto-hide
        if (hideTimeout) {
          clearTimeout(hideTimeout);
        }
        
        hideTimeout = setTimeout(function() {
          if (timerElement && isActive && currentSeconds > 10) {
            timerElement.classList.add('hidden');
            console.log("WHITE KASINA TIMER: Initial auto-hide");
          }
        }, 3000);
      }
      
      // Clear any existing interval
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      // Start the countdown
      timerInterval = setInterval(function() {
        currentSeconds--;
        
        // Update timer text
        if (timerElement) {
          const textElement = document.getElementById('white-kasina-timer-text');
          if (textElement) {
            textElement.textContent = formatTime(currentSeconds);
          }
          
          // Final 10-second countdown - always visible with effects
          if (currentSeconds <= 10 && currentSeconds > 0) {
            timerElement.classList.add('countdown');
            timerElement.classList.remove('hidden');
            console.log("WHITE KASINA TIMER: Final countdown, force visible");
          }
          
          // Timer complete
          if (currentSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            
            // Keep visible briefly, then clean up
            setTimeout(function() {
              if (timerElement) {
                timerElement.classList.add('hidden');
                timerElement.classList.remove('countdown');
                isActive = false;
              }
            }, 3000);
          }
        }
      }, 1000);
    }
    
    // Stop the timer
    function stopTimer() {
      console.log("WHITE KASINA TIMER: Stopping timer");
      
      isActive = false;
      
      // Clear timers
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
      }
      
      // Hide timer
      if (timerElement) {
        timerElement.classList.add('hidden');
        timerElement.classList.remove('countdown');
      }
    }
    
    // Update the timer display
    function setTimerValue(seconds) {
      currentSeconds = seconds;
      
      // Update display if exists
      if (timerElement) {
        const textElement = document.getElementById('white-kasina-timer-text');
        if (textElement) {
          textElement.textContent = formatTime(seconds);
        }
        
        // Show/hide based on rules
        if (seconds <= 10 && seconds > 0) {
          // Final countdown - always visible
          timerElement.classList.add('countdown');
          timerElement.classList.remove('hidden');
        } else {
          // Normal state - check activity
          timerElement.classList.remove('countdown');
          
          const timeSinceLastMove = Date.now() - lastMoveTime;
          if (timeSinceLastMove > 3000 && isActive) {
            // No recent activity, hide
            timerElement.classList.add('hidden');
          } else {
            // Recent activity, show
            timerElement.classList.remove('hidden');
          }
        }
      }
    }
    
    // Check if URL changes to hide when navigating away
    function setupUrlChangeMonitor() {
      let lastUrl = window.location.href;
      
      // Check for URL changes periodically
      setInterval(function() {
        const currentUrl = window.location.href;
        
        if (currentUrl !== lastUrl) {
          console.log("WHITE KASINA TIMER: URL changed", { from: lastUrl, to: currentUrl });
          lastUrl = currentUrl;
          
          // If we navigated away from kasinas page, stop the timer
          if (!window.location.pathname.includes('/kasinas')) {
            stopTimer();
          }
        }
      }, 1000);
    }
    
    // Set up URL monitoring
    setupUrlChangeMonitor();
    
    // Replace dummy placeholders with actual implementations
    window.whiteKasinaTimer = {
      start: startTimer,
      stop: stopTimer,
      setTime: setTimerValue
    };
    
    console.log("WHITE KASINA TIMER: Full implementation loaded");
  })();
}, 500); // Delay to ensure DOM is ready