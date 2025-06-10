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

// Kasina-specific configurations for balanced scaling
const KASINA_CONFIGS: Record<string, any> = {
  // Color kasinas - reduce max scale to prevent being too large
  'red': { baseScale: 1.8, maxScale: 3.2, minScale: 0.8, expansionRate: 1.8, immersionThreshold: 300, maxImmersion: 450 },
  'blue': { baseScale: 1.8, maxScale: 3.2, minScale: 0.8, expansionRate: 1.8, immersionThreshold: 300, maxImmersion: 450 },
  'white': { baseScale: 1.8, maxScale: 3.2, minScale: 0.8, expansionRate: 1.8, immersionThreshold: 300, maxImmersion: 450 },
  'yellow': { baseScale: 1.8, maxScale: 3.2, minScale: 0.8, expansionRate: 1.8, immersionThreshold: 300, maxImmersion: 450 },
  'custom': { baseScale: 1.8, maxScale: 3.2, minScale: 0.8, expansionRate: 1.8, immersionThreshold: 300, maxImmersion: 450 },
  
  // Elemental kasinas - reduced to more appropriate sizes
  'fire': { baseScale: 0.5, maxScale: 1.2, minScale: 0.3, expansionRate: 0.7, immersionThreshold: 150, maxImmersion: 220 },
  'water': { baseScale: 0.5, maxScale: 1.2, minScale: 0.3, expansionRate: 0.7, immersionThreshold: 150, maxImmersion: 220 },
  'earth': { baseScale: 0.5, maxScale: 1.2, minScale: 0.3, expansionRate: 0.7, immersionThreshold: 150, maxImmersion: 220 },
  'air': { baseScale: 0.5, maxScale: 1.2, minScale: 0.3, expansionRate: 0.7, immersionThreshold: 150, maxImmersion: 220 },
  'space': { baseScale: 0.5, maxScale: 1.2, minScale: 0.3, expansionRate: 0.7, immersionThreshold: 150, maxImmersion: 220 },
  'light': { baseScale: 0.5, maxScale: 1.2, minScale: 0.3, expansionRate: 0.7, immersionThreshold: 150, maxImmersion: 220 },
  
  // Vajrayana kasinas - increase significantly to be visible and responsive
  'whiteAKasina': { baseScale: 2.8, maxScale: 6.5, minScale: 1.2, expansionRate: 2.8, immersionThreshold: 350, maxImmersion: 550 },
  'whiteAThigle': { baseScale: 2.8, maxScale: 6.5, minScale: 1.2, expansionRate: 2.8, immersionThreshold: 350, maxImmersion: 550 },
  'omKasina': { baseScale: 2.8, maxScale: 6.5, minScale: 1.2, expansionRate: 2.8, immersionThreshold: 350, maxImmersion: 550 },
  'ahKasina': { baseScale: 2.8, maxScale: 6.5, minScale: 1.2, expansionRate: 2.8, immersionThreshold: 350, maxImmersion: 550 },
  'humKasina': { baseScale: 2.8, maxScale: 6.5, minScale: 1.2, expansionRate: 2.8, immersionThreshold: 350, maxImmersion: 550 },
  'rainbowKasina': { baseScale: 2.8, maxScale: 6.5, minScale: 1.2, expansionRate: 2.8, immersionThreshold: 350, maxImmersion: 550 }
};

// Default configuration for unknown kasina types
const DEFAULT_CONFIG = {
  baseScale: 1.8, maxScale: 3.2, minScale: 0.8, expansionRate: 1.8, immersionThreshold: 300, maxImmersion: 450
};

/**
 * Universal scaling function that all kasina types use
 * Preserves the exact behavior of working Color kasinas
 */
export function calculateUnifiedKasinaScale(
  kasinaType: string,
  orbSize: number,
  sizeMultiplier: number,
  easingFunction: (t: number) => number,
  breathAmplitude?: number
): UnifiedScaleResult {
  
  // Get kasina-specific configuration
  const configKey = kasinaType.toLowerCase();
  const config = (KASINA_CONFIGS as any)[configKey] || DEFAULT_CONFIG;
  
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
  
  // Background intensity uses breath amplitude when available for proper synchronization
  let backgroundIntensity: number;
  if (breathAmplitude !== undefined) {
    // Use breath amplitude directly for background intensity (0.0 to 1.0 range)
    backgroundIntensity = Math.max(0.1, Math.min(1.0, breathAmplitude));
    console.log(`🎨 Background intensity synced with breath: ${backgroundIntensity.toFixed(3)} (amplitude: ${breathAmplitude.toFixed(3)})`);
  } else {
    // Fallback to orb size-based calculation
    backgroundIntensity = Math.max(0.1, Math.min(1, easedSize * 0.8 + 0.2));
    console.log(`🎨 Background intensity from orb size: ${backgroundIntensity.toFixed(3)}`);
  }
  
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
  const normalizedType = kasinaType.toLowerCase();
  
  // Elemental kasinas need shader materials
  const elementalKasinas = ['fire', 'water', 'earth', 'air', 'space', 'light'];
  
  // Vajrayana kasinas use special components
  const vajrayanaKasinas = [
    'whiteakasina', 'whiteatthigle', 'omkasina', 
    'ahkasina', 'humkasina', 'rainbowkasina'
  ];
  
  // Color kasinas (including custom) use simple materials
  const colorKasinas = ['red', 'blue', 'white', 'yellow', 'custom'];
  
  return {
    isElemental: elementalKasinas.includes(normalizedType),
    isVajrayana: vajrayanaKasinas.includes(normalizedType),
    isColor: colorKasinas.includes(normalizedType),
    requiresShader: elementalKasinas.includes(normalizedType),
    requiresSpecialComponent: vajrayanaKasinas.includes(normalizedType),
    usesSimpleMaterial: colorKasinas.includes(normalizedType)
  };
}

/**
 * Get background color calculation that works for all kasina types
 * Enhanced breath synchronization for immersive experience
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
  
  // Enhanced breath-synchronized intensity scaling
  const breathSyncIntensity = Math.max(0.1, Math.min(0.8, backgroundIntensity));
  
  // Kasina-specific background adjustments
  let baseIntensity = 0.15;
  let breathMultiplier = 0.4;
  
  switch (kasinaType.toLowerCase()) {
    case 'water':
      // Water kasina needs darker background for better contrast
      baseIntensity = 0.05;
      breathMultiplier = 0.2;
      break;
    case 'fire':
      // Fire kasina benefits from warmer, more intense background
      baseIntensity = 0.2;
      breathMultiplier = 0.5;
      break;
    case 'whiteakasina':
    case 'whiteatthigle':
    case 'omkasina':
    case 'ahkasina':
    case 'humkasina':
    case 'rainbowkasina':
      // Vajrayana kasinas get enhanced breath-synchronized backgrounds
      baseIntensity = 0.25;
      breathMultiplier = 0.6;
      break;
    case 'custom':
      // Custom/changing color kasina gets dynamic background
      baseIntensity = 0.18;
      breathMultiplier = 0.45;
      break;
    default:
      // Standard color kasinas get moderate enhancement
      baseIntensity = 0.15;
      breathMultiplier = 0.4;
  }
  
  // Apply breath-synchronized scaling with kasina-specific adjustments
  const breathIntensity = breathSyncIntensity * breathMultiplier;
  const totalIntensity = baseIntensity + breathIntensity;
  
  const newR = Math.round(r * totalIntensity);
  const newG = Math.round(g * totalIntensity);
  const newB = Math.round(b * totalIntensity);
  
  return `rgb(${newR}, ${newG}, ${newB})`;
}