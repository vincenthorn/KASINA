/**
 * Functions for communicating with Vernier Go Direct Respiration Belt
 * This file contains the protocol implementation for the respiration belt
 */

// Service and characteristic UUIDs - updated per specific requirements
export const VERNIER_SERVICE_UUID = "d91714ef-28b9-4f91-ba16-f0d9a604f112";
export const COMMAND_CHARACTERISTIC_UUID = "f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb";
export const RESPONSE_CHARACTERISTIC_UUID = "b41e6675-a329-40e0-aa01-44d2f444babe";

// Commands
export const COMMANDS = {
  // Activation command specifically for the respiration belt
  ENABLE_SENSOR: new Uint8Array([
    0x58, 0x19, 0xFE, 0x3F, 0x1A, 0xA5, 0x4A, 0x06,
    0x49, 0x07, 0x48, 0x08, 0x47, 0x09, 0x46, 0x0A,
    0x45, 0x0B, 0x44, 0x0C, 0x43, 0x0D, 0x42, 0x0E, 0x41
  ]),
  // Simple start command based on Go Direct protocol docs
  SIMPLE_START: new Uint8Array([0x01, 0x01]),
  // Standard command to start measurements (higher frequency)
  START_MEASUREMENTS: new Uint8Array([0x01, 0x0A]),
  // Alternative start command for compatibility
  START_CONTINUOUS: new Uint8Array([0x55, 0x01]),
  // Maximum speed measurement command
  MAX_SPEED: new Uint8Array([0x01, 0x1E]), // Fastest sampling
  // Different format attempt (based on various device protocols)
  ALT_DATA_REQUEST: new Uint8Array([0xAA, 0x01, 0x01, 0x00, 0x00]),
  // Command to stop measurements
  STOP_MEASUREMENTS: new Uint8Array([0x01, 0x00])
};

/**
 * Helper to format bytes array for logging
 */
export function formatBytes(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ');
}

/**
 * Checks if a device is likely a Vernier Go Direct Respiration Belt
 * based on the device name
 */
export function isRespirationBelt(device: any): boolean {
  return device.name?.startsWith('GDX-RB') || false;
}

/**
 * Convert raw bytes to force value (Newtons)
 * This is a placeholder implementation that will be refined with actual data
 */
export function bytesToForce(bytes: Uint8Array): number | null {
  // Check if we have enough data
  if (bytes.length < 4) {
    return null;
  }
  
  // Extract force data based on Vernier Go Direct protocol
  try {
    // Based on the nRF Connect logs and Vernier protocol documentation
    // The second byte often contains the primary sensor reading
    // We'll focus on this as our main data point
    const primaryByte = bytes[1];
    
    // Convert to a force value between 0 and 1
    // The range of the respiration belt force should be proportional to this value
    const normalizedForce = primaryByte / 255;
    
    // Log all data for debugging
    console.log(`Raw bytes: ${formatBytes(bytes)}, Primary byte: ${primaryByte}, Normalized: ${normalizedForce.toFixed(4)}`);
    
    return normalizedForce;
  } catch (error) {
    console.error("Error parsing force data:", error);
    return null;
  }
}

/**
 * Decodes breath force data from the respiration belt
 * 
 * This is a simplified placeholder implementation as specified in the requirements.
 * It will be refined with actual data patterns once more testing is done.
 */
// Timestamp to ensure each data point is unique even with same raw values
let lastTimestamp = Date.now();
// Last normalized value to detect changes
let lastNormalizedValue = 0.5;

export function handleBreathData(raw: Uint8Array): number {
  // Log raw data for debugging to help identify patterns
  console.log(`Raw breath data: ${formatBytes(raw)}`);
  
  // Based on Vernier protocol analysis and nRF Connect logs
  // The most reliable data appears to be in the first few bytes
  // This simplified approach focuses on the most relevant bytes
  
  // Extract the main breath pressure value from the second byte (index 1)
  // This byte often contains the primary sensor reading in Vernier devices
  if (raw.length >= 2) {
    // Get the raw value from byte 1
    const primaryByte = raw[1]; 
    
    // Normalize to 0-1 range and apply scaling for better visualization
    // We want the orb to respond visibly to even small changes
    const normalizedValue = primaryByte / 255;
    
    // Calculate the force with a good visual range (0.3 to 1.0)
    // This ensures the orb is still visible at minimum and expands significantly at maximum
    const force = 0.3 + (normalizedValue * 0.7);
    
    // Update tracking variables
    lastNormalizedValue = normalizedValue;
    lastTimestamp = Date.now();
    
    console.log(`Breath force calculated: ${force.toFixed(4)} from byte: ${primaryByte}`);
    return force;
  }
  
  // If we somehow have data but not enough bytes, use a fallback
  if (raw.length > 0) {
    const value = raw[0] / 255;
    const force = 0.3 + (value * 0.7);
    
    console.log(`Limited data available, using first byte: ${force.toFixed(4)}`);
    return force;
  }
  
  // If we reach here, we couldn't extract meaningful data
  console.log('Invalid or empty data received');
  return 0.5; // Return a neutral value
}

/**
 * Updates the visual representation of the breath orb based on force data
 */
export function updateOrb(force: number, orbElement: HTMLElement | null): void {
  if (!orbElement) return;
  
  // Apply visual changes to the orb based on breath force
  orbElement.style.transform = `scale(${0.8 + force * 0.6})`;
  orbElement.style.opacity = `${0.5 + force * 0.5}`;
}