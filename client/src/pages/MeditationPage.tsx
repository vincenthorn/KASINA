import React from "react";
import { useLocation } from 'react-router-dom';
import Layout from "../components/Layout";
import MeditationVideos from "../components/MeditationVideos";
import BreathKasinaOrb from "../components/BreathKasinaOrb";

const MeditationPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as { useVernier?: boolean; breathAmplitude?: number; breathPhase?: string } | null;
  
  // If Vernier breathing data is provided, show the breathing orb
  if (state?.useVernier) {
    console.log('Meditation page using Vernier breathing data:', state);
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
