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
  
  // Disable auto-detection to ensure kasina selection always happens
  useEffect(() => {
    console.log('🔍 MEDITATION: Auto-detection disabled - kasina selection required', {
      isConnected,
      calibrationComplete,
      hasState: !!state,
      stateUseVernier: state?.useVernier
    });
    // Auto-detection disabled - users must go through proper kasina selection flow
  }, [isConnected, calibrationComplete, state]);
  
  // Disabled automatic breath kasina rendering - users must go through proper kasina selection
  // This prevents bypassing the kasina selection interface
  if (false) {
    // This code path is intentionally disabled to ensure kasina selection flow
    console.log('🚫 Direct breath kasina rendering disabled - redirect to kasina selection');
  }
  
  // Otherwise show regular meditation videos
  return (
    <Layout>
      <MeditationVideos />
    </Layout>
  );
};

export default MeditationPage;
