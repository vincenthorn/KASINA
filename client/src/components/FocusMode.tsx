import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Timer } from 'lucide-react';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { useKasina } from '../lib/stores/useKasina';
import { useSimpleTimer } from '../lib/stores/useSimpleTimer';
import { KASINA_BACKGROUNDS } from '../lib/constants';
import { KasinaType } from '../lib/types';
import { Dialog, DialogContent } from './ui/dialog';

interface FocusModeProps {
  children: React.ReactNode;
}

// Helper function to format time as MM:SS, handling null
const formatTime = (seconds: number | null): string => {
  if (seconds === null) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const FocusMode: React.FC<FocusModeProps> = ({ children }) => {
  const { isFocusModeActive, enableFocusMode, disableFocusMode } = useFocusMode();
  const { selectedKasina } = useKasina();
  const timerState = useSimpleTimer();
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100% (default size)
  const zoomSpeed = 0.061; // Zoom speed factor - reduced by another 10% from 0.068
  const minZoom = 0.1; // 10%
  const maxZoom = 25; // 2500%
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Get the background color for the selected kasina
  const getBackgroundColor = () => {
    return KASINA_BACKGROUNDS[selectedKasina as KasinaType] || '#000000';
  };
  
  // Handle mouse movement to show UI temporarily
  const handleMouseMove = () => {
    setLastActivity(Date.now());
    setIsUIVisible(true);
  };
  
  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isFocusModeActive) {
      e.preventDefault();
      // Calculate new zoom level based on wheel delta
      const delta = -Math.sign(e.deltaY) * zoomSpeed;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));
      setZoomLevel(newZoom);
      
      // Show UI when zooming
      setLastActivity(Date.now());
      setIsUIVisible(true);
    }
  };
  
  // Hide UI after inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      if (isFocusModeActive && Date.now() - lastActivity > 2000) {
        setIsUIVisible(false);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [isFocusModeActive, lastActivity]);
  
  // Add/remove cursor-none class to body
  useEffect(() => {
    if (isFocusModeActive && !isUIVisible) {
      document.body.classList.add('cursor-none');
    } else {
      document.body.classList.remove('cursor-none');
    }
    
    return () => {
      document.body.classList.remove('cursor-none');
    };
  }, [isFocusModeActive, isUIVisible]);
  
  // Reset zoom level when exiting focus mode
  useEffect(() => {
    if (!isFocusModeActive) {
      setZoomLevel(1);
    }
  }, [isFocusModeActive]);
  
  return (
    <>
      <div className="relative">
        {/* Focus mode toggle button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={isFocusModeActive ? disableFocusMode : enableFocusMode}
          >
            {isFocusModeActive ? (
              <Minimize2 className="h-4 w-4 mr-1" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-1" />
            )}
            {isFocusModeActive ? 'Exit Focus Mode' : 'Enter Focus Mode'}
          </Button>
        </div>
        
        {/* Main content - always visible */}
        <div>
          {children}
        </div>
      </div>
      
      {/* Focus Mode Dialog */}
      <Dialog 
        open={isFocusModeActive} 
        onOpenChange={(open) => {
          if (!open) disableFocusMode();
        }}
      >
        <DialogContent 
          className="border-none max-w-full h-screen p-0 flex items-center justify-center"
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          ref={contentRef}
          style={{ 
            width: '100vw',
            backgroundColor: getBackgroundColor(),
            transition: 'background-color 0.5s ease',
            position: 'relative' /* Added to ensure absolute positioning of children works properly */
          }}
        >
          {/* Exit button - visible on mouse movement */}
          <div 
            className={`fixed top-4 right-4 transition-opacity duration-300 z-50 ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <Button 
              variant="outline" 
              size="sm" 
              onClick={disableFocusMode}
              className="border-gray-700 text-gray-300 hover:bg-gray-900"
            >
              <Minimize2 className="h-4 w-4 mr-1" />
              Exit Focus Mode
            </Button>
          </div>
          
          {/* Zoom controls - visible on mouse movement */}
          <div 
            className={`fixed top-4 left-4 transition-opacity duration-300 z-50 ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="bg-black/50 text-white text-sm px-3 py-1 rounded-md border border-gray-800 flex items-center gap-2">
              <button 
                onClick={() => setZoomLevel(Math.max(minZoom, zoomLevel - zoomSpeed * 3))}
                className="hover:bg-gray-700 rounded p-1 transition-colors"
                disabled={zoomLevel <= minZoom}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              
              <span className="min-w-[60px] text-center">{Math.round(zoomLevel * 100)}%</span>
              
              <button 
                onClick={() => setZoomLevel(Math.min(maxZoom, zoomLevel + zoomSpeed * 3))}
                className="hover:bg-gray-700 rounded p-1 transition-colors"
                disabled={zoomLevel >= maxZoom}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Render only the orb from the children */}
          <div className="orb-container-wrapper" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}>
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                // Find and extract only the .orb-container element
                const findOrb = (element: React.ReactElement): React.ReactElement | null => {
                  if (element.props && element.props.className && 
                      typeof element.props.className === 'string' && 
                      element.props.className.includes('orb-container')) {
                    return element;
                  }
                  
                  if (element.props && element.props.children) {
                    if (Array.isArray(element.props.children)) {
                      for (const child of element.props.children) {
                        if (React.isValidElement(child)) {
                          const found = findOrb(child);
                          if (found) return found;
                        }
                      }
                    } else if (React.isValidElement(element.props.children)) {
                      return findOrb(element.props.children);
                    }
                  }
                  
                  return null;
                };
                
                const orb = findOrb(child);
                // Create a wrapper for the orb to ensure it stays centered regardless of animations
                return orb ? (
                  <div 
                    className={`orb-wrapper ${selectedKasina === 'space' ? 'kasina-space-breathe-effect' : ''}`}
                    style={{
                      position: 'relative',
                      width: `${300 * zoomLevel}px`,
                      height: `${300 * zoomLevel}px`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      borderRadius: '50%'
                    }}
                  >
                    {React.cloneElement(orb, {
                      className: `${orb.props.className} fixed-orb`,
                      style: {
                        ...orb.props.style,
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        top: 'auto',
                        left: 'auto',
                        transform: 'none',
                        transition: 'width 0.2s ease, height 0.2s ease'
                      }
                    })}
                  </div>
                ) : null;
              }
              return null;
            })}
          </div>
          
          {/* Timer display - visible on mouse movement */}
          <div 
            className={`fixed top-16 left-1/2 transform -translate-x-1/2 transition-opacity duration-300 z-50 ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Only show timer when it's running */}
            {timerState.isRunning && (
              <div className="bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2 border border-gray-800">
                <Timer className="h-4 w-4 text-gray-400" />
                <div className="text-xl font-mono">
                  {timerState.timeRemaining !== null 
                    ? formatTime(timerState.timeRemaining) 
                    : formatTime(timerState.elapsedTime)}
                </div>
              </div>
            )}
          </div>
          
          {/* Timer controls - visible on mouse movement */}
          <div 
            className={`fixed bottom-8 transition-opacity duration-300 z-50 ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                // Find timer buttons from the children
                const findTimerButtons = (element: React.ReactElement): React.ReactElement | null => {
                  if (element.props && element.props.className && 
                      typeof element.props.className === 'string' && 
                      element.props.className.includes('space-x-2') &&
                      element.props.children &&
                      React.isValidElement(element.props.children) &&
                      element.props.children.props &&
                      element.props.children.props.className &&
                      typeof element.props.children.props.className === 'string' &&
                      element.props.children.props.className.includes('w-20')) {
                    return element;
                  }
                  
                  if (element.props && element.props.children) {
                    if (Array.isArray(element.props.children)) {
                      for (const child of element.props.children) {
                        if (React.isValidElement(child)) {
                          const found = findTimerButtons(child);
                          if (found) return found;
                        }
                      }
                    } else if (React.isValidElement(element.props.children)) {
                      return findTimerButtons(element.props.children);
                    }
                  }
                  
                  return null;
                };
                
                const timerButtons = findTimerButtons(child);
                return timerButtons ? React.cloneElement(timerButtons, {
                  className: `${timerButtons.props.className} timer-buttons-focus`
                }) : null;
              }
              return null;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FocusMode;