// Kasina types
export type KasinaType = 
  // Color kasinas
  | "white" 
  | "blue" 
  | "red" 
  | "yellow"
  | "custom" 
  // Elemental kasinas
  | "water" 
  | "air" 
  | "fire" 
  | "earth" 
  | "space" 
  | "light"
  // Vajrayana kasinas (admin only)
  | "white_a_thigle";

// Emojis for different kasina types
export const getKasinaEmoji = (type: KasinaType): string => {
  const emojis: Record<KasinaType, string> = {
    white: "⚪",
    blue: "🔵",
    red: "🔴",
    yellow: "🟡",
    custom: "🎨",
    water: "💧",
    air: "💨",
    fire: "🔥",
    earth: "🌍",
    space: "✨",
    light: "☀️",
    white_a_thigle: "💀",
  };
  
  return emojis[type] || "🟠";
};

// Configuration for rendering orbs
export interface OrbConfig {
  color: string;
  emissive?: string;
  speed: number;
  complexity: number;
  particles?: boolean;
}

export const getOrbConfig = (type: KasinaType, customColor?: string): OrbConfig => {
  const configs: Record<KasinaType, OrbConfig> = {
    // Color kasinas
    white: { 
      color: "#FFFFFF", 
      emissive: "#FFFFFF", 
      speed: 0.3, 
      complexity: 1 
    },
    blue: { 
      color: "#0000FF", 
      emissive: "#0033FF", 
      speed: 0.4, 
      complexity: 1 
    },
    red: { 
      color: "#FF0000", 
      emissive: "#FF3300", 
      speed: 0.5, 
      complexity: 1 
    },
    yellow: { 
      color: "#FFFF00", 
      emissive: "#FFCC00", 
      speed: 0.35, 
      complexity: 1 
    },
    custom: {
      color: customColor || "#8A2BE2", // Default to medium violet red if no custom color
      emissive: customColor || "#9932CC", 
      speed: 0.45,
      complexity: 1
    },
    
    // Elemental kasinas
    water: { 
      color: "#0088FF", 
      emissive: "#00AAFF", 
      speed: 0.6, 
      complexity: 2,
      particles: true 
    },
    air: { 
      color: "#E0E0E0", 
      emissive: "#FFFFFF", 
      speed: 0.8, 
      complexity: 3,
      particles: true 
    },
    fire: { 
      color: "#FF5500", 
      emissive: "#FF8800", 
      speed: 0.7, 
      complexity: 3,
      particles: true 
    },
    earth: { 
      color: "#336600", 
      emissive: "#448800", 
      speed: 0.2, 
      complexity: 2 
    },
    space: { 
      color: "#000066", 
      emissive: "#3300CC", 
      speed: 0.5, 
      complexity: 4,
      particles: true 
    },
    light: { 
      color: "#FFFFCC", 
      emissive: "#FFFFFF", 
      speed: 0.4, 
      complexity: 2,
      particles: true 
    },
    // Vajrayana kasinas
    white_a_thigle: {
      color: "#FFFFFF",
      emissive: "#FFFFFF",
      speed: 0.2,
      complexity: 2
    },
  };
  
  return configs[type] || configs.blue;
};

// Session data
export interface KasinaSession {
  id: string;
  kasinaType: KasinaType;
  duration: number; // in seconds
  date: Date | string;
}

// Recording data
export interface Recording {
  id: string;
  type: "audio" | "screen";
  url: string;
  filename: string;
  kasinaType: KasinaType;
  duration: number; // in seconds
  date: Date | string;
  size: number; // in bytes
}
