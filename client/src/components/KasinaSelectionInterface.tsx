import React from 'react';
import { KASINA_TYPES, KASINA_COLORS, KASINA_NAMES, KASINA_EMOJIS, KASINA_SERIES } from '../lib/constants';

interface KasinaSelectionInterfaceProps {
  showKasinaSelection: boolean;
  kasinaSelectionStep: 'series' | 'kasina';
  selectedKasinaSeries: string | null;
  onSeriesSelection: (series: string) => void;
  onKasinaSelection: (kasina: string) => void;
  onBackToSeries: () => void;
  onCancel: () => void;
}

export default function KasinaSelectionInterface({
  showKasinaSelection,
  kasinaSelectionStep,
  selectedKasinaSeries,
  onSeriesSelection,
  onKasinaSelection,
  onBackToSeries,
  onCancel
}: KasinaSelectionInterfaceProps) {
  // Get kasinas for the selected series
  const getKasinasForSeries = (series: string) => {
    switch (series) {
      case 'COLOR':
        return KASINA_SERIES.COLOR;
      case 'ELEMENTAL':
        return KASINA_SERIES.ELEMENTAL;
      case 'VAJRAYANA':
        return KASINA_SERIES.VAJRAYANA;
      default:
        return [];
    }
  };

  // Get color for selected kasina - use the official KASINA_COLORS
  const getKasinaColor = (kasina: string) => {
    return KASINA_COLORS[kasina] || KASINA_COLORS[KASINA_TYPES.BLUE];
  };

  if (!showKasinaSelection) {
    return null;
  }

  return (
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
              onClick={() => onSeriesSelection('COLOR')}
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
              onClick={() => onSeriesSelection('ELEMENTAL')}
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
              onClick={() => onSeriesSelection('VAJRAYANA')}
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
          
          <button
            onClick={onCancel}
            style={{
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              marginTop: '24px'
            }}
          >
            Cancel
          </button>
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
                onClick={async () => {
                  // Trigger fullscreen when user selects their kasina
                  try {
                    if (!document.fullscreenElement) {
                      await document.documentElement.requestFullscreen();
                      console.log("📺 Entered fullscreen for meditation session");
                    }
                  } catch (error) {
                    console.log("📺 Fullscreen request failed:", error);
                  }
                  
                  // Then proceed with kasina selection
                  onKasinaSelection(kasina);
                }}
                style={{
                  ...(kasina === 'custom' ? {
                    background: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
                    backgroundSize: '400% 400%',
                    animation: 'rainbowShift 3s ease-in-out infinite'
                  } : {
                    backgroundColor: kasina === KASINA_TYPES.WHITE_A_KASINA ? '#4B5563' : getKasinaColor(kasina)
                  }),
                  color: kasina === 'white' || kasina === 'yellow' || kasina === 'light' || kasina === 'air' || kasina === 'om_kasina' || kasina === 'clear_light_thigle' ? '#000' : '#fff',
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
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                  {KASINA_EMOJIS[kasina]}
                </div>
                <div>{KASINA_NAMES[kasina]}</div>
              </button>
            ))}
          </div>
          
          <button
            onClick={onBackToSeries}
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
            ← Back to Series
          </button>
        </div>
      )}
    </div>
  );
}