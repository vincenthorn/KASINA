import React, { useState } from "react";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_TYPES, KASINA_COLORS } from "../lib/constants";
import VisualKasinaOrb from "../components/VisualKasinaOrb";

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
  };

  const getKasinasForSeries = (series: string) => {
    switch (series) {
      case 'COLOR':
        return [KASINA_TYPES.WHITE, KASINA_TYPES.BLUE, KASINA_TYPES.YELLOW, KASINA_TYPES.RED, 'custom'];
      case 'ELEMENTAL':
        return [KASINA_TYPES.WATER, KASINA_TYPES.FIRE, KASINA_TYPES.AIR, KASINA_TYPES.EARTH, KASINA_TYPES.SPACE, KASINA_TYPES.LIGHT];
      case 'VAJRAYANA':
        return [KASINA_TYPES.WHITE_A_THIGLE, KASINA_TYPES.WHITE_A_KASINA, KASINA_TYPES.OM_KASINA, KASINA_TYPES.AH_KASINA, KASINA_TYPES.HUM_KASINA, KASINA_TYPES.RAINBOW_KASINA];
      default:
        return [];
    }
  };

  const getKasinaColor = (kasina: string) => {
    return KASINA_COLORS[kasina as keyof typeof KASINA_COLORS] || '#666666';
  };

  const getKasinaDisplayName = (kasina: string) => {
    const names: { [key: string]: string } = {
      [KASINA_TYPES.WHITE]: 'White',
      [KASINA_TYPES.BLUE]: 'Blue', 
      [KASINA_TYPES.YELLOW]: 'Yellow',
      [KASINA_TYPES.RED]: 'Red',
      [KASINA_TYPES.WATER]: 'Water',
      [KASINA_TYPES.FIRE]: 'Fire',
      [KASINA_TYPES.AIR]: 'Air',
      [KASINA_TYPES.EARTH]: 'Earth',
      [KASINA_TYPES.SPACE]: 'Space',
      [KASINA_TYPES.LIGHT]: 'Light',
      [KASINA_TYPES.WHITE_A_THIGLE]: 'White A (Thigle)',
      [KASINA_TYPES.WHITE_A_KASINA]: 'White A (Kasina)',
      [KASINA_TYPES.OM_KASINA]: 'OM',
      [KASINA_TYPES.AH_KASINA]: 'AH',
      [KASINA_TYPES.HUM_KASINA]: 'HUM',
      [KASINA_TYPES.RAINBOW_KASINA]: 'Rainbow',
      'custom': 'Custom Color'
    };
    return names[kasina] || kasina;
  };

  if (!showKasinaSelection) {
    return (
      <div className="h-screen w-screen relative bg-black">
        <button
          onClick={() => setShowKasinaSelection(true)}
          className="absolute top-4 left-4 z-10 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all"
        >
          ← Change Kasina
        </button>
        <VisualKasinaOrb />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black flex items-center justify-center">
      <VisualKasinaOrb />
      
      {/* Kasina selection overlay */}
      {showKasinaSelection && (
        <div 
          className="absolute inset-0 z-50 flex items-end justify-center pb-20"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)'
          }}
        >
          {kasinaSelectionStep === 'series' ? (
            <div 
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '32px',
                borderRadius: '16px',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '20px'
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
                Choose Your Kasina Series
              </div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
                Select the type of meditation object you'd like to focus on
              </div>
              
              <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
                <button
                  onClick={() => handleSeriesSelection('COLOR')}
                  style={{
                    backgroundColor: '#4F46E5',
                    color: 'white',
                    border: 'none',
                    padding: '24px 32px',
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '180px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#4338CA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#4F46E5';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
                  <div>Color Kasinas</div>
                </button>
                
                <button
                  onClick={() => handleSeriesSelection('ELEMENTAL')}
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '24px 32px',
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '180px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#047857';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#059669';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌊</div>
                  <div>Elemental Kasinas</div>
                </button>
                
                <button
                  onClick={() => handleSeriesSelection('VAJRAYANA')}
                  style={{
                    backgroundColor: '#DC2626',
                    color: 'white',
                    border: 'none',
                    padding: '24px 32px',
                    borderRadius: '16px',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '180px',
                    textAlign: 'center',
                    transition: 'all 0.2s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#B91C1C';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#DC2626';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔮</div>
                  <div>Vajrayana Kasinas</div>
                </button>
              </div>
            </div>
          ) : (
            <div 
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '32px',
                borderRadius: '16px',
                textAlign: 'center',
                maxWidth: '800px',
                margin: '20px'
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
                Choose Your {selectedKasinaSeries === 'COLOR' ? 'Color' : selectedKasinaSeries === 'ELEMENTAL' ? 'Elemental' : 'Vajrayana'} Kasina
              </div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
                Select the specific kasina that resonates with your practice
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {getKasinasForSeries(selectedKasinaSeries || '').map((kasina) => (
                  <button
                    key={kasina}
                    onClick={() => handleKasinaSelection(kasina)}
                    style={{
                      ...(kasina === 'custom' ? {
                        background: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
                        backgroundSize: '400% 400%',
                        animation: 'rainbowShift 3s ease-in-out infinite'
                      } : {
                        backgroundColor: kasina === KASINA_TYPES.WHITE_A_KASINA ? '#4B5563' : getKasinaColor(kasina)
                      }),
                      color: kasina === 'white' || kasina === 'yellow' || kasina === 'light' || kasina === 'air' || kasina === 'om_kasina' || kasina === 'white_a_thigle' ? '#000' : '#fff',
                      border: '2px solid rgba(255,255,255,0.3)',
                      padding: '16px 12px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease-out',
                      minHeight: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                    }}
                  >
                    {getKasinaDisplayName(kasina)}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setKasinaSelectionStep('series')}
                style={{
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6B7280';
                }}
              >
                ← Back to Series Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KasinasPage;