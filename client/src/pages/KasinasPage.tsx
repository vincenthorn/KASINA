import React, { useState } from "react";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_TYPES, KASINA_COLORS, KASINA_EMOJIS } from "../lib/constants";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import VisualKasinaOrb from "../components/VisualKasinaOrb";

const KasinasPage: React.FC = () => {
  const { selectedKasina, setSelectedKasina } = useKasina();
  const [kasinaTab, setKasinaTab] = useState<string>('colors');
  const [showKasina, setShowKasina] = useState(false);

  const handleKasinaSelect = (kasina: string) => {
    setSelectedKasina(kasina);
    setShowKasina(true);
  };

  const handleBack = () => {
    setShowKasina(false);
  };

  if (showKasina) {
    return (
      <div className="h-screen w-screen relative bg-black">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-10 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all"
        >
          ← Back to Selection
        </button>
        <VisualKasinaOrb />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Visual Kasinas</h1>
        
        {/* Kasina Type Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-black/20 rounded-lg p-1">
            <Button
              variant={kasinaTab === 'colors' ? 'default' : 'ghost'}
              onClick={() => setKasinaTab('colors')}
              className="text-white"
            >
              🎨 Colors
            </Button>
            <Button
              variant={kasinaTab === 'elements' ? 'default' : 'ghost'}
              onClick={() => setKasinaTab('elements')}
              className="text-white"
            >
              🌊 Elements
            </Button>
            <Button
              variant={kasinaTab === 'vajrayana' ? 'default' : 'ghost'}
              onClick={() => setKasinaTab('vajrayana')}
              className="text-white"
            >
              🔮 Vajrayana
            </Button>
          </div>
        </div>

        {/* Kasina Selection Grid */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-6">
            {/* Color Kasinas */}
            {kasinaTab === 'colors' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { type: KASINA_TYPES.WHITE, name: 'White', emoji: '⚪' },
                  { type: KASINA_TYPES.BLUE, name: 'Blue', emoji: '🔵' },
                  { type: KASINA_TYPES.YELLOW, name: 'Yellow', emoji: '🟡' },
                  { type: KASINA_TYPES.RED, name: 'Red', emoji: '🔴' },
                  { type: KASINA_TYPES.GREEN, name: 'Green', emoji: '🟢' },
                  { type: KASINA_TYPES.BROWN, name: 'Brown', emoji: '🟤' },
                  { type: KASINA_TYPES.BLACK, name: 'Black', emoji: '⚫' },
                  { type: KASINA_TYPES.VIOLET, name: 'Violet', emoji: '🟣' }
                ].map((kasina) => (
                  <Button
                    key={kasina.type}
                    onClick={() => handleKasinaSelect(kasina.type)}
                    className="h-20 flex flex-col items-center justify-center gap-2 text-white border-white/20 hover:border-white/40"
                    variant="outline"
                    style={{ 
                      backgroundColor: `${KASINA_COLORS[kasina.type]}20`,
                      borderColor: KASINA_COLORS[kasina.type]
                    }}
                  >
                    <span className="text-2xl">{kasina.emoji}</span>
                    <span className="text-sm">{kasina.name}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* Elemental Kasinas */}
            {kasinaTab === 'elements' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { type: KASINA_TYPES.WATER, name: 'Water', emoji: '🌊' },
                  { type: KASINA_TYPES.FIRE, name: 'Fire', emoji: '🔥' },
                  { type: KASINA_TYPES.AIR, name: 'Air', emoji: '💨' },
                  { type: KASINA_TYPES.EARTH, name: 'Earth', emoji: '🌍' },
                  { type: KASINA_TYPES.SPACE, name: 'Space', emoji: '🌌' },
                  { type: KASINA_TYPES.LIGHT, name: 'Light', emoji: '💡' }
                ].map((kasina) => (
                  <Button
                    key={kasina.type}
                    onClick={() => handleKasinaSelect(kasina.type)}
                    className="h-20 flex flex-col items-center justify-center gap-2 text-white border-white/20 hover:border-white/40"
                    variant="outline"
                    style={{ 
                      backgroundColor: `${KASINA_COLORS[kasina.type]}20`,
                      borderColor: KASINA_COLORS[kasina.type]
                    }}
                  >
                    <span className="text-2xl">{kasina.emoji}</span>
                    <span className="text-sm">{kasina.name}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* Vajrayana Kasinas */}
            {kasinaTab === 'vajrayana' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { type: KASINA_TYPES.WHITE_A_THIGLE, name: 'White A (Thigle)', emoji: '🤍' },
                  { type: KASINA_TYPES.WHITE_A_KASINA, name: 'White A (Kasina)', emoji: '⚪' },
                  { type: KASINA_TYPES.OM, name: 'OM', emoji: '🕉️' },
                  { type: KASINA_TYPES.AH, name: 'AH', emoji: '🔆' },
                  { type: KASINA_TYPES.HUM, name: 'HUM', emoji: '💎' },
                  { type: KASINA_TYPES.RAINBOW, name: 'Rainbow', emoji: '🌈' }
                ].map((kasina) => (
                  <Button
                    key={kasina.type}
                    onClick={() => handleKasinaSelect(kasina.type)}
                    className="h-20 flex flex-col items-center justify-center gap-2 text-white border-white/20 hover:border-white/40"
                    variant="outline"
                    style={{ 
                      backgroundColor: `${KASINA_COLORS[kasina.type] || '#ffffff'}20`,
                      borderColor: KASINA_COLORS[kasina.type] || '#ffffff'
                    }}
                  >
                    <span className="text-2xl">{kasina.emoji}</span>
                    <span className="text-sm text-center">{kasina.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KasinasPage;