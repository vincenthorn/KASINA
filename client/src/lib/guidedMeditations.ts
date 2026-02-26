export interface GuidedMeditationConfig {
  id: string;
  title: string;
  audioPath: string;
  kasina: string;
  durationSeconds: number; // Duration in seconds
}

// Mapping of kasina types to their guided meditation (if available)
// One meditation per kasina for simplicity
export const GUIDED_MEDITATIONS: Record<string, GuidedMeditationConfig | null> = {
  // Color kasinas
  'white': {
    id: 'white-focus',
    title: 'Focusing with the White Orb',
    audioPath: '/sounds/meditations/white-kasina.mp3',
    kasina: 'white',
    durationSeconds: 741 // 12 minutes
  },
  'blue': {
    id: 'blue-sweet-spot',
    title: 'Finding the Sweet Spot',
    audioPath: '/sounds/meditations/blue-kasina.mp3',
    kasina: 'blue',
    durationSeconds: 981 // 16 minutes
  },
  'red': {
    id: 'red-absorbed',
    title: 'Absorbed in Red',
    audioPath: '/sounds/meditations/absorbed-in-red.mp3',
    kasina: 'red',
    durationSeconds: 1020
  },
  'yellow': null,
  'green': null,
  'purple': null,
  'orange': null,
  'pink': null,
  'brown': null,
  'black': null,
  'custom': null,
  
  // Elemental kasinas
  'water': null,
  'fire': null,
  'air': null,
  'earth': null,
  'space': null,
  'light': null,
  
  // Vajrayana kasinas
  'white_a_kasina': null,
  'clear_light_thigle': {
    id: 'clear-light-cycle',
    title: 'The Clear Light Cycle',
    audioPath: '/sounds/meditations/The Clear Light Cycle.mp3',
    kasina: 'clear_light_thigle',
    durationSeconds: 1060 // 17 minutes 40 seconds
  },
  'om_kasina': null,
  'ah_kasina': null,
  'hum_kasina': null,
  'rainbow_kasina': null,
};

export const hasGuidedMeditation = (kasina: string): boolean => {
  return GUIDED_MEDITATIONS[kasina] !== null;
};

export const getGuidedMeditation = (kasina: string): GuidedMeditationConfig | null => {
  return GUIDED_MEDITATIONS[kasina];
};