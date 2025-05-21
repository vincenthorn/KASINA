import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import * as Vernier from '@/lib/vernierProtocol';

// This component provides a dedicated button for connecting to the Vernier Go Direct Respiration Belt
// It ensures the Bluetooth connection happens in direct response to a user action
const VernierConnect = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  const connectToDevice = async () => {
    if (!(navigator as any).bluetooth) {
      alert("Web Bluetooth is not supported in your browser. Please use Chrome or Edge on desktop or Android.");
      return;
    }
    
    // Clear any previous connection data
    localStorage.removeItem('latestBreathReading');
    localStorage.removeItem('latestBreathTimestamp');

    try {
      setIsConnecting(true);
      console.log('Starting Vernier connection in direct response to user action');

      // Request the device immediately in response to the button click
      console.log('Requesting Bluetooth device...');
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX-RB' }, // Go Direct Respiration Belt
          { namePrefix: 'Go Direct' } // Fallback for other Vernier devices
        ],
        optionalServices: [Vernier.VERNIER_SERVICE_UUID]
      });

      console.log('Device selected:', device.name || 'Unknown device');
      
      // Connect to GATT server
      console.log('Connecting to GATT server...');
      const server = await device.gatt?.connect();
      
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }
      
      // Get the primary service
      console.log('Getting Vernier service...');
      const service = await server.getPrimaryService(Vernier.VERNIER_SERVICE_UUID);
      
      // Get characteristics
      const commandChar = await service.getCharacteristic(Vernier.COMMAND_UUID);
      const responseChar = await service.getCharacteristic(Vernier.RESPONSE_UUID);
      
      // Start notifications on the response characteristic
      console.log('Starting notifications on response characteristic...');
      await responseChar.startNotifications();
      
      // Set up listener for incoming data from the respiration belt
      console.log('Setting up data listener for respiration measurements...');
      
      // Handle incoming sensor data according to the Vernier documentation
      responseChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = event.target.value;
        if (!dataView) return;
        
        try {
          // Convert to Uint8Array for easier processing
          const rawBytes = new Uint8Array(dataView.buffer);
          
          // Log the raw data immediately with checkmark to make it easier to find in logs
          console.log("✅ New raw sensor data received:", Array.from(rawBytes));
          
          // Create debug hex representation for logging
          const hexDump = Vernier.createHexDump(rawBytes);
          console.log("✅ Hex representation:", hexDump);
          
          // Log byte-by-byte for detailed analysis
          console.log("✅ Byte-by-byte breakdown:");
          for (let i = 0; i < rawBytes.length; i++) {
            console.log(`Byte ${i}: ${rawBytes[i]} (0x${rawBytes[i].toString(16).padStart(2, '0')})`);
          }
          
          // Parse incoming data according to the Vernier protocol
          console.log(`✅ Packet length: ${rawBytes.length} bytes`);
          
          if (rawBytes.length === 0) return;
          
          // Detailed data interpretation in multiple formats
          console.log("✅ Trying all possible data interpretations:");
          
          // Check for float32 values (common for sensor data)
          for (let offset = 0; offset < dataView.byteLength - 3; offset++) {
            try {
              const floatValue = dataView.getFloat32(offset, true); // little-endian
              if (!isNaN(floatValue)) {
                console.log(`Float32 at offset ${offset}: ${floatValue}`);
                
                // Look for values that seem like reasonable force readings
                if (floatValue > 0 && floatValue < 10) {
                  console.log(`  ✅ POTENTIAL FORCE READING at offset ${offset}: ${floatValue.toFixed(4)}N`);
                  
                  // Store any valid-looking reading for visualization
                  const normalizedReading = Vernier.normalizeForceReading(floatValue);
                  localStorage.setItem('latestBreathReading', normalizedReading.toString());
                  localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                }
              }
            } catch (e) {
              // Skip errors at this offset
            }
          }
          
          // Check for uint16 values that might represent force
          for (let offset = 0; offset < dataView.byteLength - 1; offset++) {
            try {
              const uint16Value = dataView.getUint16(offset, true); // little-endian
              if (uint16Value > 0) {
                console.log(`Uint16 at offset ${offset}: ${uint16Value}`);
                
                // Force might be an integer with an implied decimal point
                const scaledValue = uint16Value / 100.0; // Typical scaling factor
                if (scaledValue > 0 && scaledValue < 10) {
                  console.log(`  ✅ POTENTIAL SCALED FORCE at offset ${offset}: ${scaledValue.toFixed(4)}N`);
                }
              }
            } catch (e) {
              // Skip errors
            }
          }
          
          // Try to detect the packet type based on the first byte
          const packetType = rawBytes[0];
          console.log(`✅ Packet type: 0x${packetType.toString(16)}`);
          
          // Store raw data for debugging purposes
          localStorage.setItem('latestRawBytes', hexDump);
          
          // Process measurement data (type 0x01)
          if (packetType === Vernier.RESPONSE_TYPES.MEASUREMENT && rawBytes.length >= 7) {
            console.log('✅ Processing measurement packet');
            
            // For Vernier respiration belt, force reading is usually a float32 at offset 3
            try {
              // Get force reading at the known offset
              const forceReading = dataView.getFloat32(3, true); // little-endian
              
              if (!isNaN(forceReading) && forceReading >= 0) {
                console.log(`✅ FORCE READING: ${forceReading.toFixed(4)}N`);
                
                // Normalize and store the reading
                const normalizedReading = Vernier.normalizeForceReading(forceReading);
                localStorage.setItem('latestBreathReading', normalizedReading.toString());
                localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                
                // Detect breathing phase
                const prevReading = parseFloat(localStorage.getItem('prevBreathReading') || '0');
                if (normalizedReading > prevReading) {
                  localStorage.setItem('breathPhase', 'inhale');
                  console.log(`BREATH PHASE: INHALING (${prevReading.toFixed(3)} → ${normalizedReading.toFixed(3)})`);
                } else {
                  localStorage.setItem('breathPhase', 'exhale');
                  console.log(`BREATH PHASE: EXHALING (${prevReading.toFixed(3)} → ${normalizedReading.toFixed(3)})`);
                }
                localStorage.setItem('prevBreathReading', normalizedReading.toString());
                
                // Calculate breathing rate
                const lastPhaseChange = parseInt(localStorage.getItem('lastPhaseChangeTime') || '0');
                const currentTime = Date.now();
                const currentPhase = localStorage.getItem('breathPhase');
                const lastPhase = localStorage.getItem('lastPhase') || '';
                
                if (currentPhase !== lastPhase) {
                  localStorage.setItem('lastPhase', currentPhase || '');
                  
                  if (lastPhaseChange > 0) {
                    const timeDiff = currentTime - lastPhaseChange; // ms
                    const breathRate = 60000 / (timeDiff * 2); // ms to minutes, 2 phase changes = 1 breath
                    
                    if (breathRate >= 4 && breathRate <= 30) {
                      console.log(`BREATH RATE: ${breathRate.toFixed(1)} breaths/min`);
                      localStorage.setItem('breathingRate', breathRate.toString());
                    }
                  }
                  
                  localStorage.setItem('lastPhaseChangeTime', currentTime.toString());
                }
              }
            } catch (error) {
              console.error('Error extracting force reading:', error);
            }
          }
          // Process device info response
          else if (packetType === Vernier.RESPONSE_TYPES.DEVICE_INFO) {
            console.log('✅ Received device info response');
          }
          // Process sensor list response
          else if (packetType === Vernier.RESPONSE_TYPES.SENSOR_LIST) {
            console.log('✅ Received sensor list response');
            if (rawBytes.length > 1) {
              console.log(`Available sensors: ${rawBytes[1]}`);
            }
          }
        } catch (error) {
          console.error('Error processing incoming data:', error);
        }
      });
      
      // Setup response handlers for device disconnect
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected');
        localStorage.setItem('breathDeviceConnected', 'false');
      });
      
      // Initialize the device using the documented Vernier protocol
      console.log('Initializing Vernier Go Direct Respiration Belt...');
      
      // STEP 1: Reset the device to ensure clean state
      console.log('Step 1: Resetting device...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.RESET]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 2: Get device info
      console.log('Step 2: Getting device info...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_DEVICE_INFO]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 3: Get sensor list
      console.log('Step 3: Getting sensor list...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_SENSOR_LIST]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 4: Enable the Force sensor (channel 1)
      console.log('Step 4: Enabling force sensor (channel 1)...');
      await commandChar.writeValue(Vernier.ENABLE_SENSOR_1);
      console.log("✅ Sensor activation command sent:", Array.from(Vernier.ENABLE_SENSOR_1));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 5: Set sampling rate to 10Hz (more stable for breath monitoring)
      console.log('Step 5: Setting sampling rate to 10Hz...');
      await commandChar.writeValue(Vernier.SET_SAMPLE_RATE_10HZ);
      console.log("✅ Sample rate command sent:", Array.from(Vernier.SET_SAMPLE_RATE_10HZ));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 6: Start measurements
      console.log('Step 6: Starting measurements...');
      await commandChar.writeValue(Vernier.START_MEASUREMENTS);
      console.log("✅ Start measurements command sent:", Array.from(Vernier.START_MEASUREMENTS));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Use a keepalive to ensure the connection stays active
      const keepaliveInterval = setInterval(async () => {
        try {
          await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.KEEP_ALIVE]));
        } catch (e) {
          console.error('Error sending keepalive to belt:', e);
          clearInterval(keepaliveInterval);
        }
      }, 2000);
      
      // Store connection info
      localStorage.setItem('breathDeviceConnected', 'true');
      localStorage.setItem('breathDataSource', 'real');
      localStorage.setItem('breathDeviceName', device.name || 'Respiration Belt');
      
      console.log('Successfully connected to Vernier respiration belt!');
      setIsConnecting(false);
      
      // Navigate to the breath kasina page after successful connection
      // Use the correct path that matches our router configuration
      navigate('/breath-kasina');
    } catch (error) {
      console.error('Error connecting to Vernier device:', error);
      setIsConnecting(false);
      alert("Failed to connect to the respiration belt. Please try again.");
    }
  };

  return (
    <Button 
      onClick={connectToDevice}
      disabled={isConnecting}
      className="bg-blue-600 hover:bg-blue-700 text-white w-full py-6 mt-4"
    >
      {isConnecting ? "Connecting..." : "Connect to Respiration Belt"}
    </Button>
  );
};

export default VernierConnect;