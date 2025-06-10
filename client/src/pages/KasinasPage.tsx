import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useKasina } from "../lib/stores/useKasina";
import VisualKasinaOrb from "../components/VisualKasinaOrb";
import KasinaSelectionInterface from "../components/KasinaSelectionInterface";

const KasinasPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedKasina, setSelectedKasina } = useKasina();
  const [showKasinaSelection, setShowKasinaSelection] = useState(true);
  
  // CRITICAL DEBUGGING: Log any state changes that might trigger unmount
  useEffect(() => {
    console.log(`[KASINAS_PAGE] showKasinaSelection changed to: ${showKasinaSelection} at ${new Date().toISOString()}`);
  }, [showKasinaSelection]);
  const [kasinaSelectionStep, setKasinaSelectionStep] = useState<'series' | 'kasina'>('series');
  const [selectedKasinaSeries, setSelectedKasinaSeries] = useState<string | null>(null);

  const handleSeriesSelection = (series: string) => {
    setSelectedKasinaSeries(series);
    setKasinaSelectionStep('kasina');
  };

  const handleKasinaSelection = (kasina: string) => {
    setSelectedKasina(kasina);
    setShowKasinaSelection(false);
    setKasinaSelectionStep('series');
  };

  const handleBackToSeries = () => {
    setKasinaSelectionStep('series');
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (!showKasinaSelection) {
    console.log('🎯 KasinasPage: Rendering VisualKasinaOrb component');
    return (
      <div className="h-screen w-screen relative bg-black">
        <VisualKasinaOrb />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black flex items-center justify-center">
      <KasinaSelectionInterface
        showKasinaSelection={showKasinaSelection}
        kasinaSelectionStep={kasinaSelectionStep}
        selectedKasinaSeries={selectedKasinaSeries}
        onSeriesSelection={handleSeriesSelection}
        onKasinaSelection={handleKasinaSelection}
        onBackToSeries={handleBackToSeries}
        onCancel={handleCancel}
        mode="visual"
      />
    </div>
  );
};

export default KasinasPage;