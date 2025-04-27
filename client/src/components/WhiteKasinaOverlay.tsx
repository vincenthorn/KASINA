import React from 'react';

// Create dummy updateWhiteKasinaTimer function to prevent imports from failing
export const updateWhiteKasinaTimer = (timeRemaining: number, active: boolean) => {
  // Do nothing - we're using the native JS timer instead
  console.log("[White Kasina Overlay] Dummy update function called (inactive)");
};

/**
 * This component is intentionally disabled to prevent duplicate timers 
 * from showing. We're now using the native JavaScript timer implementation 
 * directly for better compatibility with focus mode.
 */
const WhiteKasinaOverlay: React.FC = () => {
  // Return empty component - timer is handled by direct JS now
  return null;
};

export default WhiteKasinaOverlay;