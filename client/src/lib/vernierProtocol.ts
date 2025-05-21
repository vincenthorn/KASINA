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
  // Legacy commands kept for reference
  START_MEASUREMENTS: new Uint8Array([0x01, 0x01]),
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
  if (bytes.length < 8) {
    return null;
  }
  
  // Extract force data (actual format will depend on device)
  // This is a placeholder based on general Vernier protocol patterns
  // The format may need to be adjusted
  try {
    // Bytes 4-7 might contain a float32 value
    const dataView = new DataView(bytes.buffer);
    const forceValue = dataView.getFloat32(4, true); // true = little endian
    
    // Log for debugging
    console.log(`Raw bytes: ${formatBytes(bytes)}, Force value: ${forceValue}`);
    
    return forceValue;
  } catch (error) {
    console.error("Error parsing force data:", error);
    return null;
  }
}

/**
 * Parse the device info response
 */
export function parseDeviceInfo(bytes: Uint8Array): any {
  // Sample implementation - will need to be adjusted based on actual device responses
  try {
    const dataView = new DataView(bytes.buffer);
    const firmwareVersion = `${dataView.getUint8(1)}.${dataView.getUint8(2)}`;
    const serialNumber = bytes.slice(3, 11).reduce((str, byte) => 
      str + String.fromCharCode(byte), '');
    
    return {
      firmwareVersion,
      serialNumber,
      raw: formatBytes(bytes)
    };
  } catch (error) {
    console.error("Error parsing device info:", error);
    return { raw: formatBytes(bytes) };
  }
}

/**
 * Parse the sensor data packet
 * This is based on known Vernier protocols but may need adjusting
 */
export function parseSensorData(bytes: Uint8Array): any {
  // Log the raw data for debugging
  console.log(`Sensor data packet: ${formatBytes(bytes)}`);
  
  try {
    if (bytes.length < 4) {
      return { type: 'unknown', raw: formatBytes(bytes) };
    }
    
    // Check packet type (first byte often indicates type)
    const packetType = bytes[0];
    
    switch (packetType) {
      case 0x11: // Example: Sensor reading
        if (bytes.length >= 8) {
          const dataView = new DataView(bytes.buffer);
          const channelIndex = bytes[1];
          const value = dataView.getFloat32(4, true); // Little-endian float at position 4
          
          return {
            type: 'reading',
            channel: channelIndex,
            value,
            raw: formatBytes(bytes)
          };
        }
        break;
        
      case 0x57: // Example: Device info response
        return parseDeviceInfo(bytes);
        
      default:
        return { 
          type: 'unknown',
          code: packetType,
          raw: formatBytes(bytes)
        };
    }
  } catch (error) {
    console.error("Error parsing sensor data:", error);
  }
  
  return { type: 'error', raw: formatBytes(bytes) };
}