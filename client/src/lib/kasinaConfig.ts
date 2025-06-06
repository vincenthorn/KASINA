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
// All kasina types use the same scaling parameters for consistent behavior
const UNIVERSAL_BREATH_SCALING: KasinaScaleConfig = {
  baseScale: 1.0,           // Base scaling multiplier (1.0 = normal size)
  maxScale: 2.0,            // Maximum scale cap (2x original size)
  minScale: 0.02,           // Minimum scale floor (2% of original size)
  expansionRate: 1.8,       // How dramatically kasina expands with breath
  immersionThreshold: 400,  // When background immersion starts (px)
  maxImmersion: 1200        // When full immersion is reached (px)
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
 * Calculate unified breath kasina sizing for consistent behavior across all types
 */
export function calculateBreathKasinaSize(
  kasina: string,
  breathAmplitude: number,
  sizeScale: number = 0.05,
  sizeMultiplier: number = 0.3
): {
  size: number;
  minSize: number;
  maxSize: number;
  immersionLevel: number;
  config: KasinaConfig;
} {
  const config = KASINA_CONFIGS[kasina] || KASINA_CONFIGS.blue;
  const { scaling } = config;
  
  // Universal base size ranges for all kasina types
  const BASE_MIN_SIZE = 25;  // Minimum visible size (25px)
  const BASE_MAX_SIZE = 600; // Maximum expansion size (600px)
  
  // Calculate size range based on scaling and multipliers
  const minSize = Math.floor(BASE_MIN_SIZE * sizeScale);
  const maxSize = Math.floor(BASE_MAX_SIZE * sizeScale * sizeMultiplier);
  const sizeRange = maxSize - minSize;
  
  // Apply breath amplitude to size calculation
  const clampedAmplitude = Math.max(0, Math.min(1, breathAmplitude));
  const calculatedSize = Math.floor(minSize + (sizeRange * clampedAmplitude));
  
  // Cap size at immersion threshold to prevent overwhelming experience
  const finalSize = Math.min(calculatedSize, scaling.maxImmersion);
  
  // Calculate immersion level for background effects
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