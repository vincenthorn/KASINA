import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useFocusMode } from '../lib/stores/useFocusMode';
import { Dialog, DialogContent } from './ui/dialog';

interface FocusModeProps {
  children: React.ReactNode;
}

const FocusMode: React.FC<FocusModeProps> = ({ children }) => {
  const { isFocusModeActive, enableFocusMode, disableFocusMode } = useFocusMode();
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  // Handle mouse movement to show UI temporarily
  const handleMouseMove = () => {
    setLastActivity(Date.now());
    setIsUIVisible(true);
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
          className="bg-black border-none max-w-full h-screen p-0 flex items-center justify-center"
          onMouseMove={handleMouseMove}
          style={{ width: '100vw' }}
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
          
          {/* Render only the orb from the children */}
          <div className="orb-container-wrapper">
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
                return orb ? React.cloneElement(orb, {
                  className: `${orb.props.className} fixed-orb`,
                  style: {
                    ...orb.props.style,
                    width: '300px',
                    height: '300px',
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }
                }) : null;
              }
              return null;
            })}
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