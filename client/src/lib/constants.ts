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
  RAINBOW_KASINA: "rainbow_kasina", // New Rainbow Kasina
  // Breath Kasina
  BREATH: "breath"
};

// Kasina names
export const KASINA_NAMES: Record<string, string> = {
  // Basic Color Kasinas
  [KASINA_TYPES.WHITE]: "White",
  [KASINA_TYPES.BLUE]: "Blue",
  [KASINA_TYPES.RED]: "Red",
  [KASINA_TYPES.YELLOW]: "Yellow",
  [KASINA_TYPES.CUSTOM]: "Custom",
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
  [KASINA_TYPES.RAINBOW_KASINA]: "Rainbow",
  // Breath Kasina
  [KASINA_TYPES.BREATH]: "Breath Kasina"
};

// Kasina colors (hex codes) - using gentler, more muted colors for better visual harmony
export const KASINA_COLORS: Record<string, string> = {
  // Basic Color Kasinas
  [KASINA_TYPES.WHITE]: "#F3F4F6",
  [KASINA_TYPES.BLUE]: "#0000FF",
  [KASINA_TYPES.RED]: "#FF0000",
  [KASINA_TYPES.YELLOW]: "#FFFF00",
  [KASINA_TYPES.CUSTOM]: "#A78BFA", // Gentle purple for custom
  // Elemental Kasinas
  [KASINA_TYPES.WATER]: "#67E8F9", // Gentle cyan for water
  [KASINA_TYPES.AIR]: "#A78BFA",   // Gentle purple for air
  [KASINA_TYPES.FIRE]: "#FB923C",  // Gentle orange for fire
  [KASINA_TYPES.EARTH]: "#A3E635", // Gentle green for earth
  [KASINA_TYPES.SPACE]: "#C084FC", // Gentle purple for space
  [KASINA_TYPES.LIGHT]: "#FDE047", // Bright yellow for light
  // Vajrayana Series
  [KASINA_TYPES.WHITE_A_THIGLE]: "#67E8F9", // Gentle cyan for Clear Light Thigle
  [KASINA_TYPES.WHITE_A_KASINA]: "#8B5CF6", // Distinct purple for White A
  [KASINA_TYPES.OM_KASINA]: "#FBBF24", // Gentle amber for OM
  [KASINA_TYPES.AH_KASINA]: "#F87171", // Gentle red for AH
  [KASINA_TYPES.HUM_KASINA]: "#34D399", // Gentle green for HUM
  [KASINA_TYPES.RAINBOW_KASINA]: "#EC4899" // Pink for Rainbow to distinguish from White A
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
  [KASINA_TYPES.AIR]: "#87CEEB",   // Light sky blue for airier quality
  [KASINA_TYPES.FIRE]: "#000000",  // Pure black background
  [KASINA_TYPES.EARTH]: "#241000", // Very dark rich brown (almost black)
  [KASINA_TYPES.SPACE]: "#2a0055", // Dark purple background (inverted from black)
  [KASINA_TYPES.LIGHT]: "#000000", // Black background
  // Vajrayana Series - very dark harmonizing colors for seamless backgrounds
  [KASINA_TYPES.WHITE_A_THIGLE]: "#001133",  // Very dark royal blue harmonizing with outer ring
  [KASINA_TYPES.WHITE_A_KASINA]: "#000033",  // Very dark blue harmonizing with outer ring
  [KASINA_TYPES.OM_KASINA]: "#000000",       // Black to match OM outer ring
  [KASINA_TYPES.AH_KASINA]: "#000000",       // Black to match AH outer ring
  [KASINA_TYPES.HUM_KASINA]: "#000000",      // Black to match HUM outer ring
  [KASINA_TYPES.RAINBOW_KASINA]: "#1F00CC"   // Exact blue-violet from Rainbow outer ring
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
  [KASINA_TYPES.LIGHT]: "💡",
  // Vajrayana Series
  [KASINA_TYPES.WHITE_A_THIGLE]: "⚡️",
  [KASINA_TYPES.WHITE_A_KASINA]: "Ⓐ",
  [KASINA_TYPES.OM_KASINA]: "🕉️",
  [KASINA_TYPES.AH_KASINA]: "🔮",
  [KASINA_TYPES.HUM_KASINA]: "🌀",
  [KASINA_TYPES.RAINBOW_KASINA]: "🌈",
  // Breath Kasina
  [KASINA_TYPES.BREATH]: "🫁"
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
