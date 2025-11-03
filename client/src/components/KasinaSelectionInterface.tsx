import React, { useState } from 'react';
import { KASINA_TYPES, KASINA_COLORS, KASINA_NAMES, KASINA_EMOJIS, KASINA_SERIES } from '../lib/constants';
import CustomColorDialog from './CustomColorDialog';
import { useKasina } from '../lib/stores/useKasina';
import { hasGuidedMeditation, getGuidedMeditation } from '../lib/guidedMeditations';

interface KasinaSelectionInterfaceProps {
  showKasinaSelection: boolean;
  kasinaSelectionStep: 'series' | 'kasina' | 'meditation-choice';
  selectedKasinaSeries: string | null;
  onSeriesSelection: (series: string) => void;
  onKasinaSelection: (kasina: string, isGuided?: boolean) => void;
  onBackToSeries: () => void;
  onCancel: () => void;
  mode?: 'visual' | 'breath'; // Add mode prop to restrict available kasinas
  isInSelfGuidedSession?: boolean; // If true, skip guided meditation choice
}

export default function KasinaSelectionInterface({
  showKasinaSelection,
  kasinaSelectionStep,
  selectedKasinaSeries,
  onSeriesSelection,
  onKasinaSelection,
  onBackToSeries,
  onCancel,
  mode = 'visual', // Default to visual mode for backwards compatibility
  isInSelfGuidedSession = false // Default to false for normal behavior
}: KasinaSelectionInterfaceProps) {
  const { customColor, setCustomColor } = useKasina();
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [tempCustomColor, setTempCustomColor] = useState(customColor);
  const [pendingKasina, setPendingKasina] = useState<string | null>(null);

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

  // Handle custom color change from the color wheel picker
  const handleCustomColorChange = (newColor: string) => {
    setTempCustomColor(newColor);
    setCustomColor(newColor);
    
    // Update the color in the constants
    KASINA_COLORS[KASINA_TYPES.CUSTOM] = newColor;
  };

  // Handle custom color selection (when user clicks "Select Color" in dialog)
  const handleCustomColorSelect = async () => {
    // Trigger fullscreen when user selects their custom color
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        console.log("📺 Entered fullscreen for custom color meditation session");
      }
    } catch (error) {
      console.log("📺 Fullscreen request failed:", error);
    }
    
    // Then proceed with kasina selection (custom color never has guided meditation)
    onKasinaSelection('custom', false);
  };

  // Handle kasina click - intercept custom color to show picker
  const handleKasinaClick = async (kasina: string) => {
    if (kasina === 'custom') {
      // For custom color, open the color picker dialog instead of immediately starting session
      setIsColorDialogOpen(true);
      return;
    }

    // Check if this kasina has a guided meditation available (only for visual mode)
    // BUT skip the choice if we're already in a self-guided session
    if (mode === 'visual' && hasGuidedMeditation(kasina) && !isInSelfGuidedSession) {
      // Store the kasina and show meditation choice dialog
      setPendingKasina(kasina);
      // Parent component should handle updating kasinaSelectionStep to 'meditation-choice'
      // For now, we'll call a modified onKasinaSelection that indicates we need to show choice
      // Actually, let's handle this locally by showing the meditation choice dialog
      return;
    }

    // For kasinas without guided meditation OR when in self-guided session, proceed with self-guided
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        console.log("📺 Entered fullscreen for meditation session");
      }
    } catch (error) {
      console.log("📺 Fullscreen request failed:", error);
    }
    
    onKasinaSelection(kasina, false); // Always false (self-guided) when in self-guided session
  };

  // Handle meditation choice
  const handleMeditationChoice = async (isGuided: boolean) => {
    if (!pendingKasina) return;

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        console.log("📺 Entered fullscreen for meditation session");
      }
    } catch (error) {
      console.log("📺 Fullscreen request failed:", error);
    }
    
    onKasinaSelection(pendingKasina, isGuided);
    setPendingKasina(null);
  };

  if (!showKasinaSelection) {
    return null;
  }

  return (
    <>
      <CustomColorDialog
        isOpen={isColorDialogOpen}
        onOpenChange={setIsColorDialogOpen}
        customColor={tempCustomColor}
        onColorChange={handleCustomColorChange}
        onSelect={handleCustomColorSelect}
      >
        <div></div>
      </CustomColorDialog>
      
      <div 
        className="absolute inset-0 z-50 flex items-end justify-center pb-20"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)'
        }}
      >
      {/* Meditation Choice Dialog - shows when kasina has guided meditation */}
      {pendingKasina && mode === 'visual' && hasGuidedMeditation(pendingKasina) && (
        <div 
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '32px',
            borderRadius: '16px',
            textAlign: 'center',
            maxWidth: '500px',
            margin: '20px'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
            {KASINA_NAMES[pendingKasina]} Kasina
          </div>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
            Want to practice a guided meditation or in silence?
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <button
              onClick={() => handleMeditationChoice(true)}
              style={{
                backgroundColor: '#4F46E5',
                color: 'white',
                border: 'none',
                padding: '20px 24px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.backgroundColor = '#4338CA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#4F46E5';
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Guided Practice</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {(() => {
                  const meditation = getGuidedMeditation(pendingKasina);
                  if (!meditation) return null;
                  const minutes = Math.round(meditation.durationSeconds / 60);
                  return `${meditation.title} (${minutes}m)`;
                })()}
              </div>
            </button>
            
            <button
              onClick={() => handleMeditationChoice(false)}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                padding: '20px 24px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.backgroundColor = '#047857';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#059669';
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Silent Practice</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Self-guided meditation
              </div>
            </button>
          </div>
          
          <button
            onClick={() => setPendingKasina(null)}
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
            ← Back
          </button>
        </div>
      )}

      {/* Series Selection */}
      {!pendingKasina && kasinaSelectionStep === 'series' ? (
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
              <div>Color</div>
              <div>Kasinas</div>
            </button>
            
{/* Elemental kasinas now available in both Visual and Breath modes */}
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
              <div>Elemental</div>
              <div>Kasinas</div>
            </button>
                
            {/* Vajrayana kasinas now available in both Visual and Breath modes */}
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
              <div>Vajrayana</div>
              <div>Kasinas</div>
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
      ) : !pendingKasina && (
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
                onClick={() => handleKasinaClick(kasina)}
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
    </>
  );
}