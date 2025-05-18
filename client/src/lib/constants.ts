// Kasina types
export const KASINA_TYPES = {
  WHITE: "white",
  BLUE: "blue",
  RED: "red",
  YELLOW: "yellow",
  CUSTOM: "custom",
  WATER: "water",
  AIR: "air", 
  FIRE: "fire",
  EARTH: "earth",
  SPACE: "space",
  LIGHT: "light",
  // Vajrayana Series
  WHITE_A_THIGLE: "clear_light_thigle", // Updated name from white_a_thigle
  WHITE_A_KASINA: "white_a_kasina", // New White A Kasina
  OM_KASINA: "om_kasina",
  AH_KASINA: "ah_kasina",
  HUM_KASINA: "hum_kasina",
  RAINBOW_KASINA: "rainbow_kasina" // New Rainbow Kasina
};

// Kasina names
export const KASINA_NAMES: Record<string, string> = {
  // Basic Color Kasinas
  [KASINA_TYPES.WHITE]: "White",
  [KASINA_TYPES.BLUE]: "Blue",
  [KASINA_TYPES.RED]: "Red",
  [KASINA_TYPES.YELLOW]: "Yellow",
  [KASINA_TYPES.CUSTOM]: "Custom Color",
  // Elemental Kasinas
  [KASINA_TYPES.WATER]: "Water",
  [KASINA_TYPES.AIR]: "Air",
  [KASINA_TYPES.FIRE]: "Fire",
  [KASINA_TYPES.EARTH]: "Earth",
  [KASINA_TYPES.SPACE]: "Space",
  [KASINA_TYPES.LIGHT]: "Light",
  // Vajrayana Series
  [KASINA_TYPES.WHITE_A_THIGLE]: "Clear Light",
  [KASINA_TYPES.WHITE_A_KASINA]: "White A",
  [KASINA_TYPES.OM_KASINA]: "OM",
  [KASINA_TYPES.AH_KASINA]: "AH",
  [KASINA_TYPES.HUM_KASINA]: "HUM",
  [KASINA_TYPES.RAINBOW_KASINA]: "Rainbow"
};

// Kasina colors (hex codes)
export const KASINA_COLORS: Record<string, string> = {
  // Basic Color Kasinas
  [KASINA_TYPES.WHITE]: "#FFFFFF",
  [KASINA_TYPES.BLUE]: "#0000FF",
  [KASINA_TYPES.RED]: "#FF0000",
  [KASINA_TYPES.YELLOW]: "#FFFF00",
  [KASINA_TYPES.CUSTOM]: "#8A2BE2", // Default to a medium violet red for custom
  // Elemental Kasinas
  [KASINA_TYPES.WATER]: "#0065b3", // Deeper ocean blue for water
  [KASINA_TYPES.AIR]: "#a0d6f7",   // Distinct medium sky blue with a hint of aqua
  [KASINA_TYPES.FIRE]: "#FF6600",  // Bright orange for fire
  [KASINA_TYPES.EARTH]: "#CC6633", // Warm terracotta clay color
  [KASINA_TYPES.SPACE]: "#330066", // Deep purple
  [KASINA_TYPES.LIGHT]: "#FFFFCC", // Light yellowish white with significantly increased brightness
  // Vajrayana Series
  [KASINA_TYPES.WHITE_A_THIGLE]: "#FFCC00", // Gold/amber for Clear Light Thigle
  [KASINA_TYPES.WHITE_A_KASINA]: "#FFFFFF", // Pure white for the Tibetan letter A
  [KASINA_TYPES.OM_KASINA]: "#CCCCCC", // Light grey for OM in charts
  [KASINA_TYPES.AH_KASINA]: "#FF0000", // Deep red orb with golden glow
  [KASINA_TYPES.HUM_KASINA]: "#0000FF", // Deep blue orb
  [KASINA_TYPES.RAINBOW_KASINA]: "#FF69B4" // Pink for Rainbow kasina in charts
};

// Background colors for elemental kasinas
export const KASINA_BACKGROUNDS: Record<string, string> = {
  // Basic Color Kasinas
  [KASINA_TYPES.WHITE]: "#000000", // Default black
  [KASINA_TYPES.BLUE]: "#000000",  // Default black
  [KASINA_TYPES.RED]: "#000000",   // Default black
  [KASINA_TYPES.YELLOW]: "#000000", // Default black
  [KASINA_TYPES.CUSTOM]: "#000000", // Default black
  // Elemental Kasinas
  [KASINA_TYPES.WATER]: "#001a33", // Deep oceanic blue background
  [KASINA_TYPES.AIR]: "#1a4b75",   // Darker sky blue (changed from steel blue)
  [KASINA_TYPES.FIRE]: "#000000",  // Pure black background
  [KASINA_TYPES.EARTH]: "#241000", // Very dark rich brown (almost black)
  [KASINA_TYPES.SPACE]: "#2a0055", // Dark purple background (inverted from black)
  [KASINA_TYPES.LIGHT]: "#000000", // Pure black
  // Vajrayana Series
  [KASINA_TYPES.WHITE_A_THIGLE]: "#0055ff",  // More vibrant royal blue background for Clear Light Thigle
  [KASINA_TYPES.WHITE_A_KASINA]: "#0055ff",  // Same royal blue background for White A Kasina
  [KASINA_TYPES.OM_KASINA]: "#000000",       // Black background for OM Kasina
  [KASINA_TYPES.AH_KASINA]: "#000000",       // Black background for AH Kasina
  [KASINA_TYPES.HUM_KASINA]: "#000000",      // Black background for HUM Kasina
  [KASINA_TYPES.RAINBOW_KASINA]: "#2000CC"   // Pure blue-violet background for Rainbow Kasina
};

// Kasina emojis
export const KASINA_EMOJIS: Record<string, string> = {
  // Basic Color Kasinas
  [KASINA_TYPES.WHITE]: "⚪",
  [KASINA_TYPES.BLUE]: "🔵",
  [KASINA_TYPES.RED]: "🔴",
  [KASINA_TYPES.YELLOW]: "🟡",
  [KASINA_TYPES.CUSTOM]: "🎨",
  // Elemental Kasinas
  [KASINA_TYPES.WATER]: "💧",
  [KASINA_TYPES.AIR]: "💨",
  [KASINA_TYPES.FIRE]: "🔥",
  [KASINA_TYPES.EARTH]: "🌎",
  [KASINA_TYPES.SPACE]: "✨",
  [KASINA_TYPES.LIGHT]: "☀️",
  // Vajrayana Series
  [KASINA_TYPES.WHITE_A_THIGLE]: "⚡️",
  [KASINA_TYPES.WHITE_A_KASINA]: "Ⓐ",
  [KASINA_TYPES.OM_KASINA]: "🕉️",
  [KASINA_TYPES.AH_KASINA]: "🔮",
  [KASINA_TYPES.HUM_KASINA]: "🌀",
  [KASINA_TYPES.RAINBOW_KASINA]: "🌈"
};

// Kasina series groupings
export const KASINA_SERIES = {
  COLOR: [
    KASINA_TYPES.WHITE,
    KASINA_TYPES.BLUE,
    KASINA_TYPES.RED,
    KASINA_TYPES.YELLOW,
    KASINA_TYPES.CUSTOM
  ],
  ELEMENTAL: [
    KASINA_TYPES.WATER,
    KASINA_TYPES.AIR,
    KASINA_TYPES.FIRE,
    KASINA_TYPES.EARTH,
    KASINA_TYPES.SPACE,
    KASINA_TYPES.LIGHT
  ],
  VAJRAYANA: [
    KASINA_TYPES.OM_KASINA,
    KASINA_TYPES.AH_KASINA,
    KASINA_TYPES.HUM_KASINA,
    KASINA_TYPES.WHITE_A_KASINA,
    KASINA_TYPES.WHITE_A_THIGLE,
    KASINA_TYPES.RAINBOW_KASINA
  ]
};

// Timer options
export const TIMER_OPTIONS = [
  { label: "1 min", value: 60 }, // 1 minute in seconds
  { label: "5 min", value: 300 }, // 5 minutes in seconds
  { label: "10 min", value: 600 }, // 10 minutes in seconds
  { label: "15 min", value: 900 }, // 15 minutes in seconds
  { label: "20 min", value: 1200 }, // 20 minutes in seconds
  { label: "30 min", value: 1800 }, // 30 minutes in seconds
];
