import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the color sequence
export const colorSequence = [
  "#FFFFFF", // White
  "#FFEB3B", // Yellow
  "#F44336", // Red
  "#2196F3", // Blue
];

interface ColorContextType {
  currentColor: string;
  currentColorIndex: number;
  setCurrentColorIndex: (index: number) => void;
}

const ColorContext = createContext<ColorContextType>({
  currentColor: colorSequence[0],
  currentColorIndex: 0,
  setCurrentColorIndex: () => {},
});

export const useColor = () => useContext(ColorContext);

interface ColorProviderProps {
  children: ReactNode;
}

export const ColorProvider: React.FC<ColorProviderProps> = ({ children }) => {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  
  // Set up color cycling every 12 seconds (matching breathing cycle)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentColorIndex(prev => (prev + 1) % colorSequence.length);
    }, 12000);
    
    return () => clearInterval(interval);
  }, []);
  
  const value = {
    currentColor: colorSequence[currentColorIndex],
    currentColorIndex,
    setCurrentColorIndex,
  };
  
  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
};