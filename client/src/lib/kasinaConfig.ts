/**
 * Centralized kasina configuration system
 * Handles scaling, sizing, and behavior for all kasina types
 */

export interface KasinaScaleConfig {
  baseScale: number;           // Base scaling multiplier
  maxScale: number;           // Maximum scale cap
  minScale: number;           // Minimum scale floor
  expansionRate: number;      // How dramatically the kasina expands with breath
  immersionThreshold: number; // When background immersion starts (px)
  maxImmersion: number;       // When full immersion is reached (px)
}

export interface KasinaConfig {
  name: string;
  type: 'color' | 'elemental' | 'vajrayana' | 'special';
  scaling: KasinaScaleConfig;
  requiresShader: boolean;
  backgroundEnabled: boolean;
}

// Universal breath kasina scaling configuration
// Based on the original working color kasina parameters for consistency
const UNIVERSAL_BREATH_SCALING: KasinaScaleConfig = {
  baseScale: 18,            // Match original color kasina scaling
  maxScale: 18,             // Match original color kasina maximum
  minScale: 0.001,          // Match original color kasina minimum
  expansionRate: 18,        // Match original color kasina expansion
  immersionThreshold: 300,  // Match original color kasina immersion start
  maxImmersion: 3000        // Match original color kasina immersion max
};

// Apply universal scaling to all kasina categories
const SCALING_PRESETS: Record<string, KasinaScaleConfig> = {
  color: UNIVERSAL_BREATH_SCALING,
  elemental: UNIVERSAL_BREATH_SCALING,
  vajrayana: UNIVERSAL_BREATH_SCALING,
  special: UNIVERSAL_BREATH_SCALING
};

// Complete kasina configuration map
export const KASINA_CONFIGS: Record<string, KasinaConfig> = {
  // Color kasinas
  blue: {
    name: 'Blue',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  red: {
    name: 'Red',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  white: {
    name: 'White',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  yellow: {
    name: 'Yellow',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  green: {
    name: 'Green',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  purple: {
    name: 'Purple',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  orange: {
    name: 'Orange',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  pink: {
    name: 'Pink',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  brown: {
    name: 'Brown',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  black: {
    name: 'Black',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  
  // Elemental kasinas
  water: {
    name: 'Water',
    type: 'elemental',
    scaling: SCALING_PRESETS.elemental,
    requiresShader: true,
    backgroundEnabled: true
  },
  fire: {
    name: 'Fire',
    type: 'elemental',
    scaling: SCALING_PRESETS.elemental,
    requiresShader: true,
    backgroundEnabled: true
  },
  air: {
    name: 'Air',
    type: 'elemental',
    scaling: SCALING_PRESETS.elemental,
    requiresShader: true,
    backgroundEnabled: true
  },
  earth: {
    name: 'Earth',
    type: 'elemental',
    scaling: SCALING_PRESETS.elemental,
    requiresShader: true,
    backgroundEnabled: true
  },
  space: {
    name: 'Space',
    type: 'elemental',
    scaling: SCALING_PRESETS.elemental,
    requiresShader: true,
    backgroundEnabled: true
  },
  light: {
    name: 'Light',
    type: 'elemental',
    scaling: SCALING_PRESETS.elemental,
    requiresShader: true,
    backgroundEnabled: true
  },
  
  // Vajrayana kasinas
  'white-a': {
    name: 'White A',
    type: 'vajrayana',
    scaling: SCALING_PRESETS.vajrayana,
    requiresShader: false,
    backgroundEnabled: true
  },
  'white-a-thigle': {
    name: 'White A Thigle',
    type: 'vajrayana',
    scaling: SCALING_PRESETS.vajrayana,
    requiresShader: false,
    backgroundEnabled: true
  },
  om: {
    name: 'Om',
    type: 'vajrayana',
    scaling: SCALING_PRESETS.vajrayana,
    requiresShader: false,
    backgroundEnabled: true
  },
  ah: {
    name: 'Ah',
    type: 'vajrayana',
    scaling: SCALING_PRESETS.vajrayana,
    requiresShader: false,
    backgroundEnabled: true
  },
  hum: {
    name: 'Hum',
    type: 'vajrayana',
    scaling: SCALING_PRESETS.vajrayana,
    requiresShader: false,
    backgroundEnabled: true
  },
  
  // Special kasinas
  custom: {
    name: 'Changing Color',
    type: 'color',
    scaling: SCALING_PRESETS.color,
    requiresShader: false,
    backgroundEnabled: true
  },
  rainbow: {
    name: 'Rainbow',
    type: 'vajrayana',
    scaling: SCALING_PRESETS.vajrayana,
    requiresShader: false,
    backgroundEnabled: true
  }
};

/**
 * Calculate unified breath kasina sizing based on original color kasina parameters
 */
export function calculateBreathKasinaSize(
  kasina: string,
  breathAmplitude: number,
  sizeScale: number = 0.1,
  sizeMultiplier: number = 0.8
): {
  size: number;
  minSize: number;
  maxSize: number;
  immersionLevel: number;
  config: KasinaConfig;
} {
  const config = KASINA_CONFIGS[kasina] || KASINA_CONFIGS.blue;
  const { scaling } = config;
  
  // Use enhanced size ranges for better visual breath response
  const BASE_MIN_SIZE = 80;   // Increased minimum for better visibility (was 5px)
  const BASE_MAX_SIZE = 400;  // Reasonable maximum for breath response (was 6000px)
  
  // Calculate size range based on enhanced scaling and multipliers
  const minSize = Math.floor(BASE_MIN_SIZE * sizeScale);
  const maxSize = Math.floor(BASE_MAX_SIZE * sizeScale * sizeMultiplier);
  const sizeRange = maxSize - minSize;
  
  // Apply breath amplitude to size calculation
  const clampedAmplitude = Math.max(0, Math.min(1, breathAmplitude));
  const calculatedSize = Math.floor(minSize + (sizeRange * clampedAmplitude));
  
  // Cap at original color kasina immersion level (1200px)
  const finalSize = Math.min(calculatedSize, 1200);
  
  // Calculate immersion level for background effects using original thresholds
  const immersionLevel = Math.max(0, Math.min(1, 
    (finalSize - scaling.immersionThreshold) / (scaling.maxImmersion - scaling.immersionThreshold)
  ));
  
  return {
    size: finalSize,
    minSize,
    maxSize,
    immersionLevel,
    config
  };
}

/**
 * Calculate unified scaling for any kasina type (legacy function for Three.js components)
 */
export function calculateKasinaScale(
  kasina: string,
  orbSize: number,
  immersionLevel: number = 0,
  naturalBreathingEase: (t: number) => number = (t) => Math.sin(t * Math.PI * 0.5)
): {
  scale: number;
  cappedScale: number;
  immersionLevel: number;
  config: KasinaConfig;
} {
  const config = KASINA_CONFIGS[kasina] || KASINA_CONFIGS.blue;
  const { scaling } = config;
  
  // Use universal scaling approach
  const baseScale = orbSize / 150;
  const normalizedScale = Math.max(0, Math.min(1, baseScale / scaling.expansionRate));
  const easedScale = naturalBreathingEase(normalizedScale);
  const scale = Math.max(scaling.minScale, easedScale * scaling.expansionRate);
  
  // Calculate immersion level
  const cappedOrbSize = Math.min(orbSize, scaling.maxImmersion);
  const calculatedImmersionLevel = Math.max(0, Math.min(1, 
    (cappedOrbSize - scaling.immersionThreshold) / (scaling.maxImmersion - scaling.immersionThreshold)
  ));
  
  // Apply scale cap based on immersion
  const cappedScale = calculatedImmersionLevel > 0 ? Math.min(scale, scaling.maxScale) : scale;
  
  return {
    scale,
    cappedScale,
    immersionLevel: calculatedImmersionLevel,
    config
  };
}

/**
 * Get kasina configuration
 */
export function getKasinaConfig(kasina: string): KasinaConfig {
  return KASINA_CONFIGS[kasina] || KASINA_CONFIGS.blue;
}

/**
 * Update scaling preset for a category (useful for global adjustments)
 */
export function updateScalingPreset(category: keyof typeof SCALING_PRESETS, updates: Partial<KasinaScaleConfig>) {
  SCALING_PRESETS[category] = { ...SCALING_PRESETS[category], ...updates };
  
  // Update all kasinas using this preset
  Object.values(KASINA_CONFIGS).forEach(config => {
    if (config.scaling === SCALING_PRESETS[category]) {
      config.scaling = SCALING_PRESETS[category];
    }
  });
}

/**
 * Debug helper to log scaling information
 */
export function logKasinaScaling(kasina: string, orbSize: number, scale: number, cappedScale: number) {
  const config = getKasinaConfig(kasina);
  const baseScale = orbSize / 150;
  const normalizedScale = Math.max(0, Math.min(1, baseScale / 18));
  
  console.log(`🎯 ${config.name} (${config.type}) SCALING:
    orbSize: ${orbSize}px
    baseScale: ${baseScale.toFixed(3)}
    normalizedScale: ${normalizedScale.toFixed(3)}
    final scale: ${scale.toFixed(3)}
    cappedScale: ${cappedScale.toFixed(3)}`);
}