import React, { useEffect, useState } from 'react';
import { useGuidedMeditation } from '../lib/stores/useGuidedMeditation';

interface UnifiedSessionInterfaceProps {
  // Timer and session controls
  meditationTime: number;
  onEndSession: () => void;
  
  // Size control
  sizeMultiplier: number;
  onSizeChange: (size: number) => void;
  
  // Fullscreen control
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  
  // Kasina selection
  onChangeKasina: () => void;
  
  // Visibility controls
  showControls: boolean;
  
  // Mode to determine slider scale
  mode: 'visual' | 'breath';
  
  // Optional breathing rate for breath mode
  breathingRate?: number;
  
  // Guided meditation
  isGuidedMeditation?: boolean;
}

export default function UnifiedSessionInterface({
  meditationTime,
  onEndSession,
  sizeMultiplier,
  onSizeChange,
  isFullscreen,
  onToggleFullscreen,
  onChangeKasina,
  showControls,
  mode,
  breathingRate,
  isGuidedMeditation = false
}: UnifiedSessionInterfaceProps) {
  const [isEnding, setIsEnding] = useState(false);
  const guidedMeditation = useGuidedMeditation();
  
  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Configure slider based on mode
  const sliderConfig = mode === 'breath' 
    ? { min: 0.05, max: 1.0, step: 0.025 }  // Breath kasinas: 5% to 100%, 2x finer steps
    : { min: 0.05, max: 3.0, step: 0.0125 }; // Visual kasinas: 5% to 300%, 4x finer steps

  // For visual mode, we need to map between display percentage (0-100%) and actual multiplier (0.05-3.0)
  const getDisplayValue = () => {
    if (mode === 'breath') {
      return Math.min(sizeMultiplier, sliderConfig.max);
    } else {
      // Visual mode: map 0.05-3.0 to 0-100
      const clampedSize = Math.min(sizeMultiplier, sliderConfig.max);
      return ((clampedSize - 0.05) / (3.0 - 0.05)) * 100;
    }
  };

  const getDisplayPercentage = () => {
    if (mode === 'breath') {
      return Math.round(Math.min(sizeMultiplier, sliderConfig.max) * 100);
    } else {
      // Visual mode: show 0-100%
      return Math.round(getDisplayValue());
    }
  };
  
  // Auto-clamp size when it exceeds the new maximum
  useEffect(() => {
    if (sizeMultiplier > sliderConfig.max) {
      onSizeChange(sliderConfig.max);
    }
  }, [mode, sizeMultiplier, sliderConfig.max, onSizeChange]);
  
  // Handle size slider change
  const handleSizeSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(event.target.value);
    
    if (mode === 'breath') {
      onSizeChange(sliderValue);
    } else {
      // Visual mode: map 0-100 back to 0.05-3.0
      const actualSize = 0.05 + (sliderValue / 100) * (3.0 - 0.05);
      onSizeChange(actualSize);
    }
  };

  // Handle end session with debouncing
  const handleEndSession = async () => {
    if (isEnding) return; // Prevent multiple clicks
    
    setIsEnding(true);
    try {
      await onEndSession();
    } catch (error) {
      console.error('Error ending session:', error);
      setIsEnding(false); // Re-enable button on error
    }
    // Note: We don't reset isEnding to false on success because the component 
    // will unmount when navigating away from the session
  };

  if (!showControls) return null;

  return (
    <>
      {/* Timer and End button - Upper Left */}
      <div 
        className="absolute top-4 left-4 z-30 flex items-center space-x-3"
        style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          transition: 'all 0.3s ease-out'
        }}
      >
        <div 
          style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {formatTime(meditationTime)}
        </div>

        <button
          onClick={handleEndSession}
          disabled={isEnding}
          style={{
            backgroundColor: isEnding ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            color: isEnding ? 'rgba(255, 255, 255, 0.5)' : 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isEnding ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease-out'
          }}
          onMouseEnter={(e) => {
            if (!isEnding) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isEnding) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }
          }}
        >
          {isEnding ? 'Ending...' : 'End'}
        </button>
      </div>

      {/* Size Control Slider - Top Center */}
      <div 
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30"
        style={{
          padding: '12px 20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          minWidth: '200px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
          Size
        </span>
        <input
          type="range"
          min={mode === 'breath' ? sliderConfig.min : 0}
          max={mode === 'breath' ? sliderConfig.max : 100}
          step={mode === 'breath' ? sliderConfig.step : 0.25}
          value={getDisplayValue()}
          onChange={handleSizeSliderChange}
          style={{
            flex: 1,
            height: '4px',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <span style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          fontSize: '12px', 
          fontWeight: '500',
          minWidth: '35px',
          textAlign: 'right'
        }}>
          {getDisplayPercentage()}%
        </span>
      </div>

      {/* Fullscreen Button - Upper Right */}
      <div 
        className="absolute top-4 right-4 z-30"
        style={{
          padding: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease-out'
        }}
        onClick={onToggleFullscreen}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        }}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="2"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {isFullscreen ? (
            // Exit fullscreen icon
            <>
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </>
          ) : (
            // Enter fullscreen icon
            <>
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </>
          )}
        </svg>
      </div>

      {/* Guided Meditation Audio Player - Bottom Left */}
      {isGuidedMeditation && guidedMeditation.selectedMeditation && (
        <div 
          className="absolute bottom-4 left-4 z-30"
          style={{
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
            pointerEvents: showControls ? 'auto' : 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '12px 16px',
            borderRadius: '8px',
            minWidth: '320px'
          }}
        >
          {/* Play/Pause Button and Progress */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => guidedMeditation.togglePlayPause()}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {guidedMeditation.isPlaying ? '⏸' : '▶️'}
            </button>
            
            {/* Progress Bar */}
            <div className="flex-1 flex items-center gap-2">
              <input 
                type="range"
                min={0}
                max={guidedMeditation.duration || 100}
                value={guidedMeditation.currentTime}
                onChange={(e) => guidedMeditation.seek(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            {/* Time Display */}
            <span style={{ 
              color: 'rgba(255, 255, 255, 0.9)', 
              fontSize: '12px',
              fontFamily: 'monospace',
              minWidth: '90px'
            }}>
              {formatTime(Math.floor(guidedMeditation.currentTime))} / {formatTime(Math.floor(guidedMeditation.duration))}
            </span>
          </div>
          
          {/* Meditation Title */}
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '13px', 
            marginTop: '8px'
          }}>
            {guidedMeditation.selectedMeditation.title}
          </div>
        </div>
      )}

      {/* Change Kasina Button - Bottom Center - Only show for self-guided sessions */}
      {!isGuidedMeditation && (
        <div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
        >
          <button
            onClick={onChangeKasina}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }}
          >
            Change Kasina
          </button>
        </div>
      )}
    </>
  );
}