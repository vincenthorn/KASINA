// Vernier Go Direct Respiration Belt Protocol Implementation
// Based on specifications from https://www.vernier.com/til/19229

// Bluetooth UUIDs for Vernier Go Direct devices
export const VERNIER_SERVICE_UUID = 'd91714ef-28b9-4f91-ba16-f0d9a604f112';
export const COMMAND_UUID = 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb';
export const RESPONSE_UUID = 'b41e6675-a329-40e0-aa01-44d2f444babe';

// Command codes for communicating with Vernier devices
export const COMMANDS = {
  RESET: 0x00,
  KEEP_ALIVE: 0x01,
  GET_DEVICE_INFO: 0x55,
  GET_SENSOR_LIST: 0x56,
  GET_SENSOR_INFO: 0x50,
  ENABLE_SENSOR: 0x11,
  SET_SAMPLE_RATE: 0x12,
  START_MEASUREMENTS: 0x18,
  GET_READING: 0x07,
};

// Response packet types
export const RESPONSE_TYPES = {
  MEASUREMENT: 0x01,
  DEVICE_INFO: 0x55,
  SENSOR_LIST: 0x56,
  SENSOR_INFO: 0x50,
  STATUS: 0x52,
};

// Helper function to extract force reading from measurement data
export function extractForceReading(dataView: DataView): number | null {
  // Verify this is a measurement packet
  if (dataView.byteLength < 7 || dataView.getUint8(0) !== RESPONSE_TYPES.MEASUREMENT) {
    return null;
  }
  
  try {
    // Force reading should be a float32 at offset 3 (after header and dropped count)
    const forceReading = dataView.getFloat32(3, true); // little-endian
    
    // Validate the reading (force should be positive and reasonably sized)
    if (!isNaN(forceReading) && forceReading >= 0 && forceReading < 50) {
      return forceReading;
    }
  } catch (error) {
    console.error('Error parsing force reading:', error);
  }
  
  return null;
}

// Helper function to scan a packet for any potential force readings
export function scanForForceReadings(dataView: DataView): number[] {
  const possibleReadings: number[] = [];
  
  // Scan all possible 4-byte aligned positions for float32 values
  for (let offset = 0; offset < dataView.byteLength - 3; offset++) {
    try {
      const value = dataView.getFloat32(offset, true); // little-endian
      
      // Look for values that could reasonably be force readings
      if (!isNaN(value) && value > 0 && value < 10) {
        possibleReadings.push(value);
      }
    } catch (e) {
      // Skip errors at this offset
    }
  }
  
  return possibleReadings;
}

// Helper function to create a hex dump of a byte array for debugging
export function createHexDump(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

// Helper function to normalize a force reading for visualization
// This caps extremely high values and ensures we have a reasonable range
export function normalizeForceReading(reading: number): number {
  // Cap at 0.5N for visualization purposes (prevents the orb from getting too large)
  return Math.min(reading, 0.5);
}