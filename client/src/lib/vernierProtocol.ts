// Vernier Go Direct Protocol Implementation
// Based on the Vernier Go Direct Respiration Belt specifications

// Bluetooth Service and Characteristic UUIDs for Vernier Go Direct devices
export const VERNIER_SERVICE_UUID = 'd91714ef-28b9-4f91-ba16-f0d9a604f112';
export const COMMAND_UUID = 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb';
export const RESPONSE_UUID = 'b41e6675-a329-40e0-aa01-44d2f444babe';
export const NOTIFICATION_UUID = 'b41e6676-a329-40e0-aa01-44d2f444babe';

// Go Direct command codes
export const COMMANDS = {
  GET_DEVICE_INFO: 0x55, // Gets information about the device
  GET_SENSOR_IDS: 0x56, // Gets list of sensors on the device
  START_MEASUREMENTS: 0x18, // Starts measurements on enabled channels
  STOP_MEASUREMENTS: 0x19, // Stops measurements
  ENABLE_SENSOR_CHANNEL: 0x11, // Enables a sensor channel
  SET_SAMPLE_PERIOD: 0x12, // Sets the period between samples
  GET_SENSOR_INFO: 0x50, // Gets information about a sensor
  REQUEST_READING: 0x07, // Requests a reading from a sensor
};

// Data structure to hold device readings
export interface DeviceReading {
  timestamp: number;
  force: number;
  respirationRate?: number;
}

// Utility functions for data conversion
export function byteArrayToFloat(bytes: Uint8Array, startIndex: number): number {
  // Convert 4 bytes to a floating point number (IEEE 754)
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  for (let i = 0; i < 4; i++) {
    view.setUint8(i, bytes[startIndex + i]);
  }
  return view.getFloat32(0, true); // true for little-endian
}

export function parseRespironicsData(data: DataView): DeviceReading | null {
  try {
    // First byte is status/header
    const header = data.getUint8(0);
    
    // Check if this is a measurement packet (typically has a specific header value)
    if (header !== 0x20) {
      // Not a measurement packet
      return null;
    }
    
    // Extract the force value (typically 4 bytes starting at offset 2)
    const forceBytes = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      forceBytes[i] = data.getUint8(2 + i);
    }
    
    // Convert to float
    const force = byteArrayToFloat(forceBytes, 0);
    
    // Return a structured reading
    return {
      timestamp: Date.now(),
      force: force
    };
  } catch (error) {
    console.error('Error parsing sensor data:', error);
    return null;
  }
}

// Define the BluetoothRemoteGATTCharacteristic interface here
interface BluetoothRemoteGATTCharacteristic {
  value: DataView;
  addEventListener: (type: string, listener: EventListener) => void;
  readValue: () => Promise<DataView>;
  writeValue: (value: BufferSource) => Promise<void>;
  startNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>;
}

// Initialize the device with the correct settings for respiration monitoring
export async function initializeDevice(
  commandChar: BluetoothRemoteGATTCharacteristic
): Promise<void> {
  console.log('Initializing Vernier Go Direct Respiration Belt');
  
  // Step 1: Get device info
  await commandChar.writeValue(new Uint8Array([COMMANDS.GET_DEVICE_INFO]));
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 2: Get sensor IDs
  await commandChar.writeValue(new Uint8Array([COMMANDS.GET_SENSOR_IDS]));
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 3: Enable the Force (Respiration) sensor - channel 1
  // Command: 0x11 (enable sensor), 0x01 (sensor channel), 0x01 (enable)
  await commandChar.writeValue(new Uint8Array([COMMANDS.ENABLE_SENSOR_CHANNEL, 0x01, 0x01]));
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 4: Set sampling period - 100ms (10 Hz)
  // Command: 0x12 (set period), 0x64, 0x00 (100ms in little-endian)
  await commandChar.writeValue(new Uint8Array([COMMANDS.SET_SAMPLE_PERIOD, 0x64, 0x00]));
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 5: Start measurements
  // Command: 0x18 (start), 0x01 (channel mask for channel 1)
  await commandChar.writeValue(new Uint8Array([COMMANDS.START_MEASUREMENTS, 0x01]));
  console.log('Device initialization complete');
}

// Calculate respiration rate from a series of force readings
export function calculateRespirationRate(readings: DeviceReading[]): number {
  // Need at least 10 seconds of data
  if (readings.length < 100) { // assuming 10Hz sampling rate
    return 0;
  }
  
  // Use a 30-second window for calculation (as per Vernier's spec)
  const windowSize = 30 * 10; // 30 seconds * 10 samples per second
  const recentReadings = readings.slice(-windowSize);
  
  // Find peaks (inhalations)
  const peaks: number[] = [];
  const threshold = 0.5; // N change to detect as breath
  let rising = false;
  let peakValue = 0;
  let peakTime = 0;
  
  for (let i = 1; i < recentReadings.length; i++) {
    const current = recentReadings[i].force;
    const previous = recentReadings[i-1].force;
    const delta = current - previous;
    
    // Detect rising edge
    if (!rising && delta > threshold) {
      rising = true;
    }
    
    // Track peak during rising phase
    if (rising && current > peakValue) {
      peakValue = current;
      peakTime = recentReadings[i].timestamp;
    }
    
    // Detect falling edge after rise
    if (rising && delta < -threshold) {
      peaks.push(peakTime);
      rising = false;
      peakValue = 0;
    }
  }
  
  // Calculate breaths per minute
  if (peaks.length < 2) {
    return 0; // Not enough peaks to calculate
  }
  
  const firstPeak = peaks[0];
  const lastPeak = peaks[peaks.length - 1];
  const timeSpanSeconds = (lastPeak - firstPeak) / 1000;
  
  if (timeSpanSeconds <= 0) {
    return 0;
  }
  
  const breathsPerSecond = (peaks.length - 1) / timeSpanSeconds;
  const breathsPerMinute = breathsPerSecond * 60;
  
  return Math.round(breathsPerMinute);
}