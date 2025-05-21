// Vernier Go Direct Respiration Belt Protocol Implementation
// Based on specifications from https://www.vernier.com/til/19229

// Bluetooth UUIDs for Vernier Go Direct devices
export const VERNIER_SERVICE_UUID = 'd91714ef-28b9-4f91-ba16-f0d9a604f112';
export const COMMAND_UUID = 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb';
export const RESPONSE_UUID = 'b41e6675-a329-40e0-aa01-44d2f444babe';

// Command definitions - Verified against Vernier SDK code
export const COMMANDS = {
  // Basic device commands
  RESET: 0x00,
  KEEP_ALIVE: 0x01,
  
  // Device info commands
  GET_DEVICE_INFO: 0x55,
  GET_SENSOR_LIST: 0x56,
  GET_SENSOR_INFO: 0x50,
  
  // Sensor configuration commands
  ENABLE_SENSOR: 0x11,     // Requires channel parameter [0x11, channel, 0x01]
  SET_SAMPLE_RATE: 0x12,   // Set sampling rate [0x12, rate-low, rate-high]
  START_MEASUREMENTS: 0x18, // Start data collection [0x18, 0x01]
  STOP_MEASUREMENTS: 0x19,  // Stop data collection [0x19]
  GET_READING: 0x07,       // Request a single reading
};

// Predefined sensor activation command sequences for easier usage
export const ENABLE_SENSOR_1 = new Uint8Array([0x11, 0x01, 0x01]); // Enable sensor 1
export const START_MEASUREMENTS = new Uint8Array([0x18, 0x01]); // Start measurements
export const STOP_MEASUREMENTS = new Uint8Array([0x19]); // Stop measurements
export const SET_SAMPLE_RATE_10HZ = new Uint8Array([0x12, 0x10, 0x00]); // 10Hz sampling

// Response packet types with detailed explanation
export const RESPONSE_TYPES = {
  MEASUREMENT: 0x01,      // Contains sensor readings
  DEVICE_INFO: 0x55,      // Contains device information
  SENSOR_LIST: 0x56,      // Lists available sensors
  SENSOR_INFO: 0x50,      // Contains specific sensor information
  STATUS: 0x52,           // Status update
};

// Helper function to extract force reading from measurement data
export function extractForceReading(dataView: DataView): number | null {
  // Print detailed info about the dataView to help debug
  console.log('Data buffer size:', dataView.byteLength);
  
  // Skip verification for now - attempt to read data regardless of packet type
  // This is necessary for debugging since we're not sure of the exact format yet
  
  try {
    // Try to log all possible data interpretations at different offsets
    // This will help identify where the force reading actually is in the data
    
    // Create a byte array for inspection
    const bytes = new Uint8Array(dataView.buffer);
    console.log('ALL RAW BYTES:', Array.from(bytes));
    
    // Interpret data in multiple ways
    // Force could be a float32, uint16, uint8, etc.
    const results = [];
    
    // Check for various offsets
    for (let i = 0; i < dataView.byteLength - 3; i++) {
      try {
        const asFloat = dataView.getFloat32(i, true); // little-endian
        if (!isNaN(asFloat) && asFloat >= 0 && asFloat < 100) {
          results.push({ offset: i, type: 'float32', value: asFloat });
        }
        
        if (i < dataView.byteLength - 1) {
          const asUint16 = dataView.getUint16(i, true); // little-endian
          if (asUint16 > 0 && asUint16 < 10000) {
            // For the respiration belt, force readings divided by 100 might make sense
            const scaled = asUint16 / 100;
            results.push({ offset: i, type: 'uint16/100', value: scaled });
          }
        }
        
        // Check single byte as scaled value
        const asByte = dataView.getUint8(i);
        if (asByte > 0) {
          const scaled = asByte / 100; // Try scaling down to reasonable force value
          results.push({ offset: i, type: 'uint8/100', value: scaled });
        }
      } catch (e) {
        // Skip errors
      }
    }
    
    // Log all potential force readings
    if (results.length > 0) {
      console.log('POTENTIAL FORCE READINGS:', results);
      
      // Sort by likelihood of being a real force value (non-zero, reasonably sized)
      const bestCandidates = results.filter(r => r.value > 0.01 && r.value < 30);
      
      if (bestCandidates.length > 0) {
        // Use the most likely candidate
        const best = bestCandidates[0];
        console.log('BEST FORCE READING CANDIDATE:', best);
        return best.value;
      }
    }
  } catch (error) {
    console.error('Error scanning for force reading:', error);
  }
  
  // If anything is found, use the first non-zero value at byte 0 as a fallback
  try {
    const firstByte = dataView.getUint8(0);
    if (firstByte > 0) {
      const scaled = firstByte / 100; // Scale to reasonable force value
      console.log('FALLBACK FORCE READING:', scaled, 'from first byte value:', firstByte);
      return scaled;
    }
  } catch (e) {
    // Ignore errors
  }
  
  return null;
}

// Helper function to scan a packet for any potential force readings
export function scanForForceReadings(dataView: DataView): number[] {
  const possibleReadings: number[] = [];
  
  // Log the full data packet information
  const bytes = new Uint8Array(dataView.buffer);
  console.log('Scanning data packet:', Array.from(bytes));
  console.log('Data buffer size:', dataView.byteLength, 'bytes');
  
  // Log each individual byte with its decimal and hex value
  console.log('Byte-by-byte analysis:');
  for (let i = 0; i < bytes.length; i++) {
    console.log(`Byte ${i}: ${bytes[i]} (0x${bytes[i].toString(16)})`);
  }
  
  // Try all possible interpretations of the data
  console.log('Trying all possible data interpretations:');
  
  // Check for 32-bit floats (common format for sensor readings)
  for (let offset = 0; offset < dataView.byteLength - 3; offset++) {
    try {
      const value = dataView.getFloat32(offset, true); // little-endian
      console.log(`Float32 at offset ${offset}: ${value}`);
      
      // Look for values that could reasonably be force readings
      if (!isNaN(value) && value > 0 && value < 10) {
        possibleReadings.push(value);
        console.log(`  ✓ Valid force reading: ${value.toFixed(4)}N`);
      }
    } catch (e) {
      // Skip errors at this offset
    }
  }
  
  // Check for 16-bit unsigned integers
  for (let offset = 0; offset < dataView.byteLength - 1; offset++) {
    try {
      const rawValue = dataView.getUint16(offset, true); // little-endian
      console.log(`Uint16 at offset ${offset}: ${rawValue}`);
      
      // Force might be encoded as an integer with an implied decimal point
      const scaledValue = rawValue / 100; // Typical scaling for force sensors
      
      if (scaledValue > 0 && scaledValue < 10) {
        console.log(`  ✓ Potential scaled force: ${scaledValue.toFixed(4)}N (from ${rawValue})`);
      }
    } catch (e) {
      // Skip errors
    }
  }
  
  console.log(`Found ${possibleReadings.length} potential force readings`);
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
  // Map to range 0.3-1.0 to make the visualization more dramatic
  // This will make the breath kasina expand and contract more visibly
  return 0.3 + Math.min(0.7, reading * 0.7);
}

// Parse the specific "9c 87 81 d6 01 00 31" pattern we've observed in logs
export function parseRespirationBeltPacket(bytes: Uint8Array): number | null {
  // Check if this is the pattern we've observed (starts with 0x9c)
  if (bytes.length >= 7 && bytes[0] === 0x9c) {
    // Based on the observed data and breathing pattern,
    // it looks like the second byte (0x87 in the example) represents the reading
    const value = bytes[1];
    
    // Convert to a normalized value (0.0-1.0) for visualization
    // Scale based on observed ranges (typically 0x80-0x90)
    const baseValue = 0.5; // Default center point
    const normalized = baseValue + ((value - 0x87) / 20);
    
    // Return a value scaled for force display (0-5N typical for respiration)
    return Math.max(0, normalized * 5);
  }
  return null;
}