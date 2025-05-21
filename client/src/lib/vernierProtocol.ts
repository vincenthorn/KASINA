/**
 * Vernier Go Direct Protocol Helper
 * 
 * This module provides constants and utility functions for communicating with
 * Vernier Go Direct devices using the Web Bluetooth API.
 */

// Service and characteristic UUIDs for Vernier Go Direct devices
export const VERNIER_SERVICE_UUID = 'd91714ef-28b9-4f91-ba16-f0d9a604f112';
export const COMMAND_UUID = 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb';
export const RESPONSE_UUID = 'b41e6675-a329-40e0-aa01-44d2f444babe';

// Command codes for the Go Direct protocol
export const COMMANDS = {
  RESET: 0x00,
  START_MEASUREMENTS: 0x18,
  STOP_MEASUREMENTS: 0x19,
  GET_SENSOR_LIST: 0x55,
  GET_SENSOR_INFO: 0x3B,
  GET_DEFAULT_SENSORS: 0x57,
  QUERY_BATTERY: 0x24,
  READ_SINGLE_VALUE: 0x07
};

/**
 * Creates a formatted hex dump string from a Uint8Array for logging/debugging
 */
export function createHexDump(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ');
}

/**
 * Checks if a device is likely a Vernier Go Direct Respiration Belt
 * based on the device name
 */
export function isRespirationBelt(device: BluetoothDevice): boolean {
  return device.name?.startsWith('GDX-RB') || false;
}

/**
 * Convert raw bytes to force value (Newtons)
 * This is a placeholder implementation that will be refined with actual data
 */
export function decodeForceValue(raw: Uint8Array): number | null {
  // This is a placeholder implementation
  // We'll refine this based on observed data patterns
  
  // For initial testing, we'll check a couple of formats
  // TODO: Update this with the correct parsing logic once confirmed
  
  try {
    // Option 1: Look for a reasonable value in specific byte positions
    const candidateBytes = [2, 3, 4, 5];
    for (const byteIndex of candidateBytes) {
      if (byteIndex < raw.length) {
        // Simple normalization to 0-1 range for initial testing
        const normalizedValue = raw[byteIndex] / 255;
        
        // Scale to a reasonable force range (0-10N)
        const forceValue = normalizedValue * 10;
        
        // If we find a reasonable value, return it
        if (forceValue > 0 && forceValue < 10) {
          return forceValue;
        }
      }
    }
    
    // Option 2: Try to interpret as floating point values
    if (raw.length >= 4) {
      const dataView = new DataView(raw.buffer);
      try {
        // Try little-endian float at different offsets
        for (let i = 0; i < raw.length - 3; i++) {
          const value = dataView.getFloat32(i, true);
          // Check if this looks like a reasonable force value
          if (!isNaN(value) && value >= 0 && value < 20) {
            return value;
          }
        }
      } catch (e) {
        // Ignore errors in float parsing
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error decoding force value:", error);
    return null;
  }
}