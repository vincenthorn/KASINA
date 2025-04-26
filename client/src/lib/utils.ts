import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getLocalStorage = <T>(key: string, defaultValue?: T): T => {
  const stored = window.localStorage.getItem(key);
  if (stored === null) return defaultValue as T;
  try {
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`Error parsing stored value for ${key}:`, error);
    return defaultValue as T;
  }
};

export const setLocalStorage = <T>(key: string, value: T): void => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

// CSV parsing helper
export const parseCSV = (csv: string): string[] => {
  if (!csv) return [];
  
  // Remove trailing commas, whitespace, split by commas and filter out empty entries
  return csv
    .trim()
    .split(',')
    .map(email => email.trim())
    .filter(email => email);
};

// Format time in seconds to MM:SS or HH:MM:SS
export const formatTime = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Round up to the nearest minute (e.g., 59 seconds becomes 60 seconds / 1 minute)
export const roundUpToNearestMinute = (seconds: number): number => {
  if (seconds <= 0) return 0;
  
  // CRITICAL FIX: More explicit handling for exact minute values
  // If the seconds value is exactly a multiple of 60 (a whole number of minutes)
  if (seconds % 60 === 0) {
    console.log(`UTILS: Keeping exact minute value: ${seconds} seconds = ${seconds/60} minutes`);
    return seconds; // Return unchanged
  }
  
  // Otherwise round up to the next full minute
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  // Always round up when there are remaining seconds
  const roundedSeconds = (minutes + 1) * 60;
  console.log(`UTILS: Rounding ${seconds} seconds (${minutes}m ${remainingSeconds}s) up to ${roundedSeconds} seconds (${roundedSeconds/60}m)`);
  
  return roundedSeconds;
};
