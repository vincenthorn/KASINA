import React, { useState } from "react";
import { useKasina } from "../lib/stores/useKasina";
import VisualKasinaOrb from "../components/VisualKasinaOrb";
import KasinaSelectionInterface from "../components/KasinaSelectionInterface";

const KasinasPage: React.FC = () => {
  const { selectedKasina, setSelectedKasina } = useKasina();
  const [showKasinaSelection, setShowKasinaSelection] = useState(true);
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
    setShowKasinaSelection(false);
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
      />
    </div>
  );
};

export default KasinasPage;