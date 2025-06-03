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

// Default scaling configurations for different kasina categories
// Using elemental/vajrayana scaling as the foundation for immersive experience
const SCALING_PRESETS: Record<string, KasinaScaleConfig> = {
  color: {
    baseScale: 18,        // Match vajrayana/elemental dramatic scaling
    maxScale: 18,         // Allow full expansion like other types
    minScale: 0.001,
    expansionRate: 18,    // Match vajrayana/elemental expansion
    immersionThreshold: 300,
    maxImmersion: 3000    // Keep immersion range consistent
  },
  elemental: {
    baseScale: 18,
    maxScale: 18,
    minScale: 0.001,
    expansionRate: 18,
    immersionThreshold: 300,
    maxImmersion: 3000
  },
  vajrayana: {
    baseScale: 18,        // Upgrade to match elemental scaling
    maxScale: 18,         // Full dramatic expansion
    minScale: 0.001,
    expansionRate: 18,    // Match elemental expansion
    immersionThreshold: 300,  // Consistent with other kasina types
    maxImmersion: 3000    // Match elemental range
  },
  special: {
    baseScale: 18,        // Match elemental scaling
    maxScale: 18,         // Full expansion capability
    minScale: 0.001,
    expansionRate: 18,    // Consistent expansion rate
    immersionThreshold: 300,
    maxImmersion: 3000    // Consistent immersion range
  }
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
 * Calculate unified scaling for any kasina type
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
  
  // Baseline: 150px = 1.0 scale
  const baseScale = orbSize / 150;
  
  // Apply kasina-specific scaling with proper normalization
  const normalizedScale = Math.max(0, Math.min(1, baseScale / scaling.expansionRate));
  const easedScale = naturalBreathingEase(normalizedScale);
  // Use consistent scaling factor for all kasina types
  const scaleFactor = scaling.baseScale / scaling.expansionRate;
  const scale = Math.max(scaling.minScale, easedScale * scaleFactor);
  
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
  const normalizedScale = Math.max(0, Math.min(1, baseScale / config.scaling.expansionRate));
  const scaleFactor = config.scaling.baseScale / config.scaling.expansionRate;
  
  console.log(`🎯 ${config.name} (${config.type}) SCALING:
    orbSize: ${orbSize}px
    baseScale: ${baseScale.toFixed(3)}
    normalizedScale: ${normalizedScale.toFixed(3)}
    scaleFactor: ${scaleFactor.toFixed(3)}
    final scale: ${scale.toFixed(3)}
    cappedScale: ${cappedScale.toFixed(3)}
    maxScale: ${config.scaling.maxScale}`);
}