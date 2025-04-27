/**
 * ULTRA DIRECT timer injection script for white kasina.
 * This runs completely outside of React to ensure visibility regardless of focus mode.
 * We're using the most direct approach possible to ensure the timer is visible.
 */

(function() {
  // Initialize immediately 
  console.log("WHITE KASINA TIMER: Initialize Direct Timer");
  
  // Create a globally accessible module
  window.DirectWhiteKasinaTimer = {
    active: false,
    seconds: 60,
    timerInterval: null,
    timerElement: null,
    
    // Format time helper
    formatTime: function(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      console.log("WHITE KASINA TIMER: Created timer element", timer);
    },
    
    // Start the timer
    start: function() {
      console.log("WHITE KASINA TIMER: Starting");
      this.createTimer();
      this.active = true;
      this.seconds = 60;
      
      if (this.timerElement) {
        this.timerElement.querySelector('#ultra-direct-timer-text').textContent = this.formatTime(this.seconds);
        this.timerElement.classList.add('visible');
        this.timerElement.classList.remove('final-countdown');
      }
      
      // Clear existing interval if any
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }
      
      // Start countdown
      this.timerInterval = setInterval(() => {
        this.seconds--;
        console.log("WHITE KASINA TIMER: Tick", this.seconds);
        
        if (this.timerElement) {
          const textElement = this.timerElement.querySelector('#ultra-direct-timer-text');
          if (textElement) {
            textElement.textContent = this.formatTime(this.seconds);
          }
          
          // Final countdown effects
          if (this.seconds <= 10 && this.seconds > 0) {
            this.timerElement.classList.add('final-countdown');
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
      
      if (this.timerElement) {
        this.timerElement.classList.remove('visible', 'final-countdown');
      }
    },
    
    // Update the timer with a new value
    setTime: function(seconds) {
      this.seconds = seconds;
      
      if (this.timerElement) {
        const textElement = this.timerElement.querySelector('#ultra-direct-timer-text');
        if (textElement) {
          textElement.textContent = this.formatTime(seconds);
        }
        
        if (seconds <= 10 && seconds > 0) {
          this.timerElement.classList.add('final-countdown');
        } else {
          this.timerElement.classList.remove('final-countdown');
        }
      }
    }
  };
  
  // Initialize immediately
  DirectWhiteKasinaTimer.createTimer();
  
  // Add to window.whiteKasinaTimer for compatibility with existing code
  window.whiteKasinaTimer = {
    start: function() { DirectWhiteKasinaTimer.start(); },
    stop: function() { DirectWhiteKasinaTimer.stop(); },
    setTime: function(seconds) { DirectWhiteKasinaTimer.setTime(seconds); }
  };
  
  // For debugging - make the timer visible on double-Escape key press
  document.addEventListener('keydown', function(e) {
    // Double escape key check
    if (e.key === 'Escape') {
      const now = Date.now();
      if (!window.lastEscapeTime || now - window.lastEscapeTime < 500) {
        // Double escape pressed - toggle the timer manually for debugging
        if (DirectWhiteKasinaTimer.timerElement) {
          if (DirectWhiteKasinaTimer.timerElement.classList.contains('visible')) {
            DirectWhiteKasinaTimer.timerElement.classList.remove('visible');
          } else {
            DirectWhiteKasinaTimer.timerElement.classList.add('visible');
          }
        }
      }
      window.lastEscapeTime = now;
    }
  });
  
  console.log("WHITE KASINA TIMER: Direct timer script initialized");
})();