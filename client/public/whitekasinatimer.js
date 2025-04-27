/**
 * Direct timer injection script for white kasina.
 * This runs completely outside of React to ensure visibility regardless of focus mode.
 */

(function() {
  // Only create once
  if (window.__whiteKasinaTimerInitialized) return;
  window.__whiteKasinaTimerInitialized = true;
  
  // Format time helper
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Create styles for the timer
  const style = document.createElement('style');
  style.textContent = `
    #white-kasina-timer-fixed {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 10px 16px;
      border-radius: 50px;
      font-family: monospace;
      font-size: 24px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 9999999;
      border: 2px solid #666;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
      transition: opacity 0.5s ease;
      opacity: 0;
      pointer-events: none;
    }
    
    #white-kasina-timer-fixed.active {
      opacity: 1;
    }
    
    #white-kasina-timer-fixed.final-countdown {
      border-color: white;
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
      50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.7); }
      100% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
    }
  `;
  document.head.appendChild(style);
  
  // Create the timer element
  const timer = document.createElement('div');
  timer.id = 'white-kasina-timer-fixed';
  timer.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
         stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
    <span id="white-kasina-time-value">01:00</span>
  `;
  document.body.appendChild(timer);
  
  // Initialize timer state
  let seconds = 60;
  let interval = null;
  let isActive = false;
  
  // Global methods to control the timer
  window.whiteKasinaTimer = {
    start: function() {
      if (interval) clearInterval(interval);
      seconds = 60;
      isActive = true;
      timer.classList.add('active');
      timer.classList.remove('final-countdown');
      document.getElementById('white-kasina-time-value').textContent = formatTime(seconds);
      
      interval = setInterval(function() {
        seconds--;
        document.getElementById('white-kasina-time-value').textContent = formatTime(seconds);
        
        // When 10 seconds or less are remaining, add the final countdown style
        if (seconds <= 10 && seconds > 0) {
          timer.classList.add('final-countdown');
        }
        
        // When time's up
        if (seconds <= 0) {
          clearInterval(interval);
          interval = null;
          
          // Keep the timer visible for a moment, then fade it out
          setTimeout(function() {
            isActive = false;
            timer.classList.remove('active', 'final-countdown');
          }, 3000);
        }
      }, 1000);
    },
    
    stop: function() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      isActive = false;
      timer.classList.remove('active', 'final-countdown');
    },
    
    setTime: function(newSeconds) {
      seconds = newSeconds;
      document.getElementById('white-kasina-time-value').textContent = formatTime(seconds);
      
      if (seconds <= 10 && seconds > 0) {
        timer.classList.add('final-countdown');
      } else {
        timer.classList.remove('final-countdown');
      }
    }
  };
  
  // Listen for keyboard events to show the timer
  document.addEventListener('keydown', function() {
    if (isActive) {
      timer.style.opacity = '1';
      setTimeout(function() {
        if (isActive && seconds > 10) {
          timer.style.opacity = '0.8';
        }
      }, 3000);
    }
  });
  
  // Listen for mouse movement to show the timer
  document.addEventListener('mousemove', function() {
    if (isActive) {
      timer.style.opacity = '1';
      setTimeout(function() {
        if (isActive && seconds > 10) {
          timer.style.opacity = '0.8';
        }
      }, 3000);
    }
  });
  
  console.log("White Kasina direct timer script initialized");
})();