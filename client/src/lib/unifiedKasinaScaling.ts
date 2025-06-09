/**
 * Unified Kasina Scaling System
 * 
 * This system preserves the working Color kasina scaling behavior
 * while providing consistent scaling for all kasina types.
 */

export interface UnifiedScaleResult {
  scale: number;
  cappedScale: number;
  immersionLevel: number;
  backgroundIntensity: number;
  config: {
    baseScale: number;
    maxScale: number;
    minScale: number;
    expansionRate: number;
    immersionThreshold: number;
    maxImmersion: number;
  };
}

// Base configuration that matches the working Color kasinas
const BASE_BREATH_CONFIG = {
  baseScale: 18,            // Proven working value for Color kasinas
  maxScale: 18,             // Maximum expansion
  minScale: 0.001,          // Minimum contraction
  expansionRate: 18,        // Rate of expansion with breath
  immersionThreshold: 300,  // When background effect starts
  maxImmersion: 3000        // Full background immersion
};

/**
 * Universal scaling function that all kasina types use
 * Preserves the exact behavior of working Color kasinas
 */
export function calculateUnifiedKasinaScale(
  kasinaType: string,
  orbSize: number,
  sizeMultiplier: number,
  easingFunction: (t: number) => number
): UnifiedScaleResult {
  
  // Use the proven configuration for all kasina types
  const config = BASE_BREATH_CONFIG;
  
  // Calculate scale using the same logic as working Color kasinas
  const normalizedOrbSize = Math.max(0, Math.min(1, orbSize / 300));
  const easedSize = easingFunction(normalizedOrbSize);
  
  // Apply the proven scaling formula
  const baseScale = config.minScale + (easedSize * config.expansionRate * sizeMultiplier);
  const cappedScale = Math.min(baseScale, config.maxScale * sizeMultiplier);
  
  // Calculate immersion level for background effects
  const scaledSize = cappedScale * 100; // Convert to pixel-like units
  const immersionLevel = Math.max(0, Math.min(1, 
    (scaledSize - config.immersionThreshold) / (config.maxImmersion - config.immersionThreshold)
  ));
  
  // Background intensity follows the same pattern
  const backgroundIntensity = Math.max(0.1, Math.min(1, easedSize * 0.8 + 0.2));
  
  return {
    scale: cappedScale,
    cappedScale,
    immersionLevel,
    backgroundIntensity,
    config
  };
}

/**
 * Get kasina-specific rendering properties
 * This allows different visual styles while maintaining consistent scaling
 */
export function getKasinaRenderingProps(kasinaType: string) {
  // Elemental kasinas need shader materials
  const elementalKasinas = ['FIRE', 'WATER', 'EARTH', 'AIR', 'SPACE', 'LIGHT'];
  
  // Vajrayana kasinas use special components
  const vajrayanaKasinas = [
    'WHITE_A_KASINA', 'WHITE_A_THIGLE', 'OM_KASINA', 
    'AH_KASINA', 'HUM_KASINA', 'RAINBOW_KASINA'
  ];
  
  // Color kasinas (including custom) use simple materials
  const colorKasinas = ['RED', 'BLUE', 'WHITE', 'YELLOW', 'CUSTOM'];
  
  return {
    isElemental: elementalKasinas.includes(kasinaType),
    isVajrayana: vajrayanaKasinas.includes(kasinaType),
    isColor: colorKasinas.includes(kasinaType),
    requiresShader: elementalKasinas.includes(kasinaType),
    requiresSpecialComponent: vajrayanaKasinas.includes(kasinaType),
    usesSimpleMaterial: colorKasinas.includes(kasinaType)
  };
}

/**
 * Get background color calculation that works for all kasina types
 */
export function calculateUnifiedBackgroundColor(
  kasinaColor: string, 
  backgroundIntensity: number,
  kasinaType: string
): string {
  // Parse the kasina color
  const result = kasinaColor.slice(1).match(/.{2}/g);
  if (!result) return '#2a2a2a';
  
  const [r, g, b] = result.map(c => parseInt(c, 16));
  
  // Use the same background calculation as working Color kasinas
  const baseIntensity = 0.3;
  const breathIntensity = backgroundIntensity * 0.2;
  const totalIntensity = baseIntensity + breathIntensity;
  
  const newR = Math.round(r * totalIntensity);
  const newG = Math.round(g * totalIntensity);
  const newB = Math.round(b * totalIntensity);
  
  return `rgb(${newR}, ${newG}, ${newB})`;
}