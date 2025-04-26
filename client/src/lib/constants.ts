// Kasina types
export const KASINA_TYPES = {
  WHITE: "white",
  BLUE: "blue",
  RED: "red",
  YELLOW: "yellow",
  WATER: "water",
  AIR: "air", 
  FIRE: "fire",
  EARTH: "earth",
  SPACE: "space",
  LIGHT: "light"
};

// Kasina names
export const KASINA_NAMES: Record<string, string> = {
  [KASINA_TYPES.WHITE]: "White",
  [KASINA_TYPES.BLUE]: "Blue",
  [KASINA_TYPES.RED]: "Red",
  [KASINA_TYPES.YELLOW]: "Yellow",
  [KASINA_TYPES.WATER]: "Water",
  [KASINA_TYPES.AIR]: "Air",
  [KASINA_TYPES.FIRE]: "Fire",
  [KASINA_TYPES.EARTH]: "Earth",
  [KASINA_TYPES.SPACE]: "Space",
  [KASINA_TYPES.LIGHT]: "Light"
};

// Kasina colors (hex codes)
export const KASINA_COLORS: Record<string, string> = {
  [KASINA_TYPES.WHITE]: "#FFFFFF",
  [KASINA_TYPES.BLUE]: "#0000FF",
  [KASINA_TYPES.RED]: "#FF0000",
  [KASINA_TYPES.YELLOW]: "#FFFF00",
  [KASINA_TYPES.WATER]: "#0099FF", // Deep water blue
  [KASINA_TYPES.AIR]: "#a0d6f7",   // Distinct medium sky blue with a hint of aqua
  [KASINA_TYPES.FIRE]: "#FF6600",  // Bright orange for fire
  [KASINA_TYPES.EARTH]: "#993300", // Terracotta red
  [KASINA_TYPES.SPACE]: "#330066", // Deep purple
  [KASINA_TYPES.LIGHT]: "#FFFCF0"  // Light yellowish white
};

// Background colors for elemental kasinas
export const KASINA_BACKGROUNDS: Record<string, string> = {
  [KASINA_TYPES.WHITE]: "#000000", // Default black
  [KASINA_TYPES.BLUE]: "#000000",  // Default black
  [KASINA_TYPES.RED]: "#000000",   // Default black
  [KASINA_TYPES.YELLOW]: "#000000", // Default black
  [KASINA_TYPES.WATER]: "#001933", // Deep dark ocean blue
  [KASINA_TYPES.AIR]: "#1a4b75",   // Darker sky blue (changed from steel blue)
  [KASINA_TYPES.FIRE]: "#330000",  // Deep dark red background
  [KASINA_TYPES.EARTH]: "#2E1A00", // Deep dark earth brown
  [KASINA_TYPES.SPACE]: "#2a0055", // Dark purple background (inverted from black)
  [KASINA_TYPES.LIGHT]: "#000000"  // Pure black
};

// Kasina emojis
export const KASINA_EMOJIS: Record<string, string> = {
  [KASINA_TYPES.WHITE]: "⚪",
  [KASINA_TYPES.BLUE]: "🔵",
  [KASINA_TYPES.RED]: "🔴",
  [KASINA_TYPES.YELLOW]: "🟡",
  [KASINA_TYPES.WATER]: "💧",
  [KASINA_TYPES.AIR]: "💨",
  [KASINA_TYPES.FIRE]: "🔥",
  [KASINA_TYPES.EARTH]: "🌎",
  [KASINA_TYPES.SPACE]: "✨",
  [KASINA_TYPES.LIGHT]: "☀️"
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
