import React, { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import Layout from "../components/Layout";
import MeditationVideos from "../components/MeditationVideos";
import BreathKasinaOrb from "../components/BreathKasinaOrb";
import { useVernierBreathOfficial } from "../lib/useVernierBreathOfficial";

const MeditationPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as { useVernier?: boolean; breathAmplitude?: number; breathPhase?: string } | null;
  const [autoDetectVernier, setAutoDetectVernier] = useState(false);
  
  // Get Vernier connection status for auto-detection
  const { isConnected, calibrationComplete } = useVernierBreathOfficial();
  
  // Auto-detect if user was redirected from Vernier calibration
  useEffect(() => {
    console.log('🔍 MEDITATION AUTO-DETECT: Checking for Vernier redirect...', {
      isConnected,
      calibrationComplete,
      hasState: !!state,
      stateUseVernier: state?.useVernier,
      previousPath: document.referrer
    });
    
    // If user has connected Vernier device with completed calibration but no explicit state,
    // assume they were auto-redirected from Vernier calibration
    if (isConnected && calibrationComplete && !state?.useVernier) {
      console.log('🎯 AUTO-DETECT SUCCESS: Detected Vernier auto-redirect, enabling breathing visualization!');
      setAutoDetectVernier(true);
    }
  }, [isConnected, calibrationComplete, state]);
  
  // If Vernier breathing data is provided via state OR auto-detected, show the breathing orb
  if (state?.useVernier || autoDetectVernier) {
    console.log('🌟 MEDITATION: Using Vernier breathing data', { 
      fromState: !!state?.useVernier, 
      autoDetected: autoDetectVernier 
    });
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <BreathKasinaOrb useVernier={true} />
        </div>
      </Layout>
    );
  }
  
  // Otherwise show regular meditation videos
  return (
    <Layout>
      <MeditationVideos />
    </Layout>
  );
};

export default MeditationPage;
