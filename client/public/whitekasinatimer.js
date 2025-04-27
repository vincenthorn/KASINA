/**
 * Direct timer injection script for white kasina.
 * This is specifically for active White Kasina meditation sessions ONLY
 */

// Create dummy placeholders immediately - this prevents any runtime errors in the app code
window.whiteKasinaTimer = {
  start: function() { console.log("WHITE KASINA TIMER: inactive placeholder called"); },
  stop: function() { console.log("WHITE KASINA TIMER: inactive placeholder called"); },
  setTime: function() { console.log("WHITE KASINA TIMER: inactive placeholder called"); }
};

// Delay initialization to ensure paths are fully loaded
setTimeout(function() {
  // ONLY proceed with initialization if we're on the Kasinas page
  if (!window.location.pathname.includes('/kasinas')) {
    console.log("WHITE KASINA TIMER: Not on kasinas page, timer disabled");
    return; // Exit immediately - don't even create timer elements
  }
  
  console.log("WHITE KASINA TIMER: On kasinas page, initializing");
  
  // Create the actual timer implementation
  (function() {
    // Create a globally accessible module
    window.DirectWhiteKasinaTimer = {
      active: false,
      seconds: 60,
      timerInterval: null,
      timerElement: null,
      inactivityTimeout: null,
      lastMouseMoveTime: Date.now(),
      visibilityTimeoutDuration: 3000, // 3 seconds until timer hides
      
      // Format time helper
      formatTime: function(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      },
      
      // Check if we're in an active White Kasina session
      isWhiteKasinaActive: function() {
        // Only show on paths that indicate we're on the kasina page
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/kasinas')) {
          return false;
        }
        
        // Look for white kasina indicators in the DOM or URL
        const whiteKasinaIndicators = [
          document.querySelector('.white-kasina-final-countdown'),
          document.querySelector('.white-kasina-timer-emphasis'),
          document.querySelector('[data-kasina-type="white"]'),
          document.querySelector('[data-fade-level]')
        ];
        
        // Check if any indicator is found
        const hasWhiteKasinaIndicator = whiteKasinaIndicators.some(el => el !== null);
        
        // Check the URL or page content for "white" keywords
        const whiteInContent = 
          window.location.href.toLowerCase().includes('white') || 
          document.body.textContent.toLowerCase().includes('white kasina') ||
          document.body.innerHTML.toLowerCase().includes('white orb');
        
        return hasWhiteKasinaIndicator || whiteInContent;
      },
      
      // Handle mouse movement to show the timer and then hide after inactivity
      setupInactivityTracking: function() {
        // Clear any existing handler
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('keydown', this.handleKeyPress);
        
        // Store reference to 'this' for event handlers
        const self = this;

        // Handle mouse movement
        this.handleMouseMove = function() {
          // Update last activity timestamp
          self.lastMouseMoveTime = Date.now();
          
          // Show the timer
          if (self.timerElement && self.active) {
            self.timerElement.classList.add('visible');
          }
          
          // Clear any existing timeout
          if (self.inactivityTimeout) {
            clearTimeout(self.inactivityTimeout);
          }
          
          // Set timeout to hide the timer after inactivity
          // Don't hide during final 10 seconds countdown
          self.inactivityTimeout = setTimeout(function() {
            if (self.timerElement && self.active) {
              // Never hide during final countdown
              if (self.seconds <= 10 && self.seconds > 0) {
                // Keep visible
                console.log("WHITE KASINA TIMER: Keeping visible during final countdown");
              } else {
                // Hide normally after inactivity timeout
                self.timerElement.classList.remove('visible');
                console.log("WHITE KASINA TIMER: Hiding after inactivity");
              }
            }
          }, self.visibilityTimeoutDuration);
        };
        
        // Handle keyboard input
        this.handleKeyPress = function() {
          // Update last activity timestamp
          self.lastMouseMoveTime = Date.now();
          
          // Show the timer
          if (self.timerElement && self.active) {
            self.timerElement.classList.add('visible');
          }
          
          // Clear any existing timeout
          if (self.inactivityTimeout) {
            clearTimeout(self.inactivityTimeout);
          }
          
          // Set timeout to hide the timer after inactivity
          self.inactivityTimeout = setTimeout(function() {
            if (self.timerElement && self.active) {
              // Never hide during final countdown
              if (self.seconds <= 10 && self.seconds > 0) {
                // Keep visible
                console.log("WHITE KASINA TIMER: Keeping visible during final countdown");
              } else {
                // Hide normally
                self.timerElement.classList.remove('visible');
                console.log("WHITE KASINA TIMER: Hiding after key press inactivity");
              }
            }
          }, self.visibilityTimeoutDuration);
        };
        
        // Add event listeners
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('keydown', this.handleKeyPress);
        
        console.log("WHITE KASINA TIMER: Inactivity tracking set up");
      },
      
      // Create the timer DOM elements
      createTimer: function() {
        if (this.timerElement) return;
        
        // Add CSS styles for the timer
        const style = document.createElement('style');
        style.innerHTML = `
          #ultra-direct-timer {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100000000;
            padding: 10px 20px;
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            font-size: 30px;
            font-family: monospace;
            border-radius: 50px;
            border: 3px solid #666;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            gap: 15px;
            opacity: 0;
            transition: opacity 0.3s, border-color 0.3s;
            pointer-events: none;
          }
          
          #ultra-direct-timer.visible {
            opacity: 1;
          }
          
          #ultra-direct-timer.final-countdown {
            border-color: white;
            animation: timer-pulse 1s infinite;
          }
          
          @keyframes timer-pulse {
            0% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); }
            50% { box-shadow: 0 0 50px rgba(255, 255, 255, 0.5); }
            100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); }
          }
        `;
        document.head.appendChild(style);
        
        // Create timer container
        const timer = document.createElement('div');
        timer.id = 'ultra-direct-timer';
        
        // Timer icon
        const icon = document.createElement('div');
        icon.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" 
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        `;
        
        // Timer text
        const text = document.createElement('span');
        text.id = 'ultra-direct-timer-text';
        text.textContent = this.formatTime(this.seconds);
        
        // Assemble everything
        timer.appendChild(icon);
        timer.appendChild(text);
        document.body.appendChild(timer);
        
        this.timerElement = timer;
        console.log("WHITE KASINA TIMER: Created timer element");
        
        // Setup inactivity tracking for the timer
        this.setupInactivityTracking();
      },
      
      // Start the timer - only if we're in a white kasina session
      start: function() {
        console.log("WHITE KASINA TIMER: Start requested");
        
        // Safety check - only proceed if we're on the kasinas page
        if (!window.location.pathname.includes('/kasinas')) {
          console.log("WHITE KASINA TIMER: Not on kasinas page, timer suppressed");
          return;
        }
        
        // Check if this is a white kasina session
        if (!this.isWhiteKasinaActive()) {
          console.log("WHITE KASINA TIMER: Not in white kasina session, timer suppressed");
          return;
        }
        
        console.log("WHITE KASINA TIMER: Starting active session");
        
        // Create the timer element if needed
        this.createTimer();
        this.active = true;
        this.seconds = 60;
        
        if (this.timerElement) {
          this.timerElement.querySelector('#ultra-direct-timer-text').textContent = this.formatTime(this.seconds);
          this.timerElement.classList.add('visible');
          this.timerElement.classList.remove('final-countdown');
          
          // Initially show, then hide after inactivity
          this.lastMouseMoveTime = Date.now();
          
          // Set up initial hide timeout
          if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
          }
          
          this.inactivityTimeout = setTimeout(() => {
            if (this.timerElement && this.active) {
              this.timerElement.classList.remove('visible');
              console.log("WHITE KASINA TIMER: Initial hide after inactivity");
            }
          }, this.visibilityTimeoutDuration);
        }
        
        // Clear existing interval if any
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
        }
        
        // Start countdown
        this.timerInterval = setInterval(() => {
          this.seconds--;
          
          if (this.timerElement) {
            const textElement = this.timerElement.querySelector('#ultra-direct-timer-text');
            if (textElement) {
              textElement.textContent = this.formatTime(this.seconds);
            }
            
            // Final countdown effects
            if (this.seconds <= 10 && this.seconds > 0) {
              this.timerElement.classList.add('final-countdown');
              
              // Always make timer visible during final countdown
              this.timerElement.classList.add('visible');
            }
            
            // When finished, hide after a delay
            if (this.seconds <= 0) {
              clearInterval(this.timerInterval);
              this.timerInterval = null;
              
              // Keep visible for a few seconds, then hide
              setTimeout(() => {
                if (this.timerElement) {
                  this.timerElement.classList.remove('visible', 'final-countdown');
                }
                this.active = false;
              }, 3000);
            }
          }
        }, 1000);
      },
      
      // Stop the timer
      stop: function() {
        console.log("WHITE KASINA TIMER: Stopping");
        this.active = false;
        
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        
        if (this.inactivityTimeout) {
          clearTimeout(this.inactivityTimeout);
          this.inactivityTimeout = null;
        }
        
        if (this.timerElement) {
          this.timerElement.classList.remove('visible', 'final-countdown');
        }
      },
      
      // Update the timer with a new value
      setTime: function(seconds) {
        this.seconds = seconds;
        
        // Safety check - only update display if we're on a kasina page
        if (!window.location.pathname.includes('/kasinas')) {
          return;
        }
        
        if (this.timerElement) {
          const textElement = this.timerElement.querySelector('#ultra-direct-timer-text');
          if (textElement) {
            textElement.textContent = this.formatTime(seconds);
          }
          
          if (seconds <= 10 && seconds > 0) {
            this.timerElement.classList.add('final-countdown');
            // Always make visible during final countdown
            this.timerElement.classList.add('visible');
          } else {
            this.timerElement.classList.remove('final-countdown');
            
            // Check if we should hide timer due to inactivity
            const timeSinceLastMove = Date.now() - this.lastMouseMoveTime;
            if (timeSinceLastMove > this.visibilityTimeoutDuration) {
              this.timerElement.classList.remove('visible');
            }
          }
        }
      }
    };
    
    // Override the placeholder functions
    window.whiteKasinaTimer = {
      start: function() { DirectWhiteKasinaTimer.start(); },
      stop: function() { DirectWhiteKasinaTimer.stop(); },
      setTime: function(seconds) { DirectWhiteKasinaTimer.setTime(seconds); }
    };
    
    // Listen for URL changes to hide/show timer appropriately
    let lastUrl = window.location.href;
    
    // Hide timer when navigating away from kasina page
    const checkForUrlChanges = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        console.log("WHITE KASINA TIMER: URL changed", currentUrl);
        lastUrl = currentUrl;
        
        // If we're not on a kasina page anymore, hide the timer
        if (!window.location.pathname.includes('/kasinas')) {
          DirectWhiteKasinaTimer.stop();
        }
      }
    };
    
    // Check for URL changes every second
    setInterval(checkForUrlChanges, 1000);
    
    // For debugging - make the timer visible on double-Escape key press
    document.addEventListener('keydown', function(e) {
      // Double escape key check
      if (e.key === 'Escape') {
        const now = Date.now();
        if (!window.lastEscapeTime || now - window.lastEscapeTime < 500) {
          // Double escape pressed - toggle the timer manually for debugging
          // But only on kasina pages
          if (window.location.pathname.includes('/kasinas')) {
            if (DirectWhiteKasinaTimer.timerElement) {
              if (DirectWhiteKasinaTimer.timerElement.classList.contains('visible')) {
                DirectWhiteKasinaTimer.timerElement.classList.remove('visible');
              } else {
                DirectWhiteKasinaTimer.timerElement.classList.add('visible');
              }
            } else {
              // Create timer if it doesn't exist
              DirectWhiteKasinaTimer.createTimer();
              DirectWhiteKasinaTimer.timerElement.classList.add('visible');
            }
          }
        }
        window.lastEscapeTime = now;
      }
    });
    
    console.log("WHITE KASINA TIMER: Initialized for kasinas page");
  })();
}, 500); // Delay initialization by 500ms