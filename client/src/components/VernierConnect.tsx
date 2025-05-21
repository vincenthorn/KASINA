import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Vernier Go Direct Respiration Belt (GDX-RB) Bluetooth specifications
const VERNIER_SERVICE_UUID = 'd91714ef-28b9-4f91-ba16-f0d9a604f112';
const COMMAND_UUID = 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb';
const RESPONSE_UUID = 'b41e6675-a329-40e0-aa01-44d2f444babe';

// This component provides a dedicated button for connecting to Vernier devices
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

      // Using the predefined Vernier Go Direct Respiration Belt (GDX-RB) constants

      // Request the device immediately in response to the button click
      console.log('Requesting Bluetooth device...');
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX-RB' }, // Go Direct Respiration Belt
          { namePrefix: 'Go Direct' } // Fallback for other Vernier devices
        ],
        optionalServices: [VERNIER_SERVICE_UUID]
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
      const service = await server.getPrimaryService(VERNIER_SERVICE_UUID);
      
      // Get characteristics
      const commandChar = await service.getCharacteristic(COMMAND_UUID);
      const responseChar = await service.getCharacteristic(RESPONSE_UUID);
      
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
          
          // Create debug hex representation for logging
          const hexDump = Array.from(rawBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          
          // Log the complete raw data for analysis
          console.log('COMPLETE RAW DATA:', Array.from(rawBytes));
          console.log('HEX DATA:', hexDump);
          
          // Parse incoming data according to the instructions for Vernier Go Direct Respiration Belt
          console.log(`Packet length: ${rawBytes.length} bytes`);
          
          if (rawBytes.length > 0) {
            const packetType = rawBytes[0];
            console.log(`Packet type: 0x${packetType.toString(16)}`);
            
            // Store raw data for debugging purposes
            localStorage.setItem('latestRawBytes', hexDump);
            
            // Process measurement data packets (type 0x01)
            if (packetType === 0x01 && rawBytes.length >= 7) {
              console.log('Processing measurement packet (type 0x01)');
              
              // Format should be: [header(1), droppedCount(2), measurements...]
              // The force measurement should be a 4-byte float starting at offset 3
              
              // Extract dropped packet count (2 bytes, little-endian)
              const droppedCount = rawBytes[1] | (rawBytes[2] << 8);
              console.log(`Dropped packets: ${droppedCount}`);
              
              // Create a DataView for properly extracting typed values
              const dataView = new DataView(rawBytes.buffer);
                
                try {
                  // Let's print the ENTIRE data buffer to see what we're actually getting
                  const dataArray = [];
                  for (let i = 0; i < rawBytes.length; i++) {
                    dataArray.push(rawBytes[i]);
                  }
                  console.log(`COMPLETE DATA PACKET: [${dataArray.join(', ')}]`);
                  
                  // The respiration belt may use a different data format than expected
                  // Try a range of offset positions for the force reading
                  let bestReading = 0;
                  
                  // Try each position for float32 data (typically 4 bytes)
                  for (let offset = 0; offset < rawBytes.length - 3; offset++) {
                    try {
                      const testReading = dataView.getFloat32(offset, true); // little-endian
                      // If we find a reasonable, non-zero value, use it
                      if (!isNaN(testReading) && testReading > 0.01 && testReading < 10.0) {
                        console.log(`Found possible force reading at offset ${offset}: ${testReading.toFixed(4)}N`);
                        if (testReading > bestReading) {
                          bestReading = testReading;
                        }
                      }
                    } catch (e) {
                      // Skip errors
                    }
                  }
                  
                  // If we found a usable reading anywhere in the packet
                  if (bestReading > 0) {
                    // Use a reasonable force reading with cap for visualization
                    const normalizedReading = Math.min(bestReading, 0.5);
                    console.log(`Using force reading: ${normalizedReading.toFixed(4)}N (original: ${bestReading.toFixed(4)}N)`);
                    
                    // Store the normalized force reading for visualization
                    localStorage.setItem('latestBreathReading', normalizedReading.toString());
                    localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                    
                    // Store breath phase for better visualization
                    const prevReading = parseFloat(localStorage.getItem('prevBreathReading') || '0');
                    if (normalizedReading > prevReading) {
                      localStorage.setItem('breathPhase', 'inhale');
                      // Add debug info about breath pattern
                      console.log(`BREATH PATTERN: INHALING (${prevReading.toFixed(3)} → ${normalizedReading.toFixed(3)})`);
                    } else {
                      localStorage.setItem('breathPhase', 'exhale');
                      console.log(`BREATH PATTERN: EXHALING (${prevReading.toFixed(3)} → ${normalizedReading.toFixed(3)})`);
                    }
                    localStorage.setItem('prevBreathReading', normalizedReading.toString());
                    
                    // Calculate breathing rate based on time between breath phase changes
                    const lastPhaseChange = parseInt(localStorage.getItem('lastPhaseChangeTime') || '0');
                    const currentTime = Date.now();
                    const currentPhase = localStorage.getItem('breathPhase');
                    const lastPhase = localStorage.getItem('lastPhase') || '';
                    
                    // If we detect a phase change (inhale to exhale or vice versa)
                    if (currentPhase !== lastPhase) {
                      // Store this phase 
                      localStorage.setItem('lastPhase', currentPhase || '');
                      
                      if (lastPhaseChange > 0) {
                        // Measure time between phase changes
                        const timeDiff = currentTime - lastPhaseChange; // ms
                        
                        // A full breath cycle is inhale + exhale (two phase changes)
                        // Convert to breaths per minute (60000ms in a minute)
                        // 2 phase changes = 1 full breath
                        const breathRate = 60000 / (timeDiff * 2);
                        
                        // Only use reasonable rates (4-30 breaths per minute)
                        if (breathRate >= 4 && breathRate <= 30) {
                          console.log(`BREATH RATE: ${breathRate.toFixed(1)} breaths/min`);
                          localStorage.setItem('breathingRate', breathRate.toString());
                        }
                      }
                      
                      // Record time of this phase change
                      localStorage.setItem('lastPhaseChangeTime', currentTime.toString());
                    }
                  }
                } catch (e) {
                  console.error('Error parsing force reading:', e);
                }
              }
            }
            // Command response packets
            else if (packetType === 0x55) {
              // Device info response
              console.log('Received device info response');
              
              // Extract device info if needed
              if (rawBytes.length > 2) {
                const deviceFamily = rawBytes[1];
                console.log(`Device family: ${deviceFamily}`);
              }
            }
            else if (packetType === 0x56) {
              // Sensor list response
              console.log('Received sensor list response');
              
              // Parse sensor IDs if needed
              if (rawBytes.length > 2) {
                const sensorCount = rawBytes[1];
                console.log(`Available sensors: ${sensorCount}`);
              }
            }
            else if (packetType === 0x50) {
              // Sensor info response
              console.log('Received sensor info response');
            }
            else if (packetType === 0x52) {
              // Status info
              console.log('Received status info');
            }
            else {
              // Unknown packet type - attempt to find any usable data
              console.log(`Unknown packet type: 0x${packetType.toString(16)}`);
              
              // As a fallback, scan for any value that looks like a force reading
              let foundForceReading = false;
              
              // First try as a 32-bit float at various offsets
              for (let i = 0; i < rawBytes.length - 3; i++) {
                try {
                  const dataView = new DataView(rawBytes.buffer);
                  const value = dataView.getFloat32(i, true); // little-endian
                  
                  if (!isNaN(value) && value >= 0 && value < 40) {
                    console.log(`Potential force value at offset ${i}: ${value.toFixed(4)}N`);
                    
                    // Store as our reading
                    localStorage.setItem('latestBreathReading', value.toString());
                    localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                    foundForceReading = true;
                    break;
                  }
                } catch (e) {
                  // Skip errors
                }
              }
              
              // If no float found, check if any bytes could represent force directly
              if (!foundForceReading) {
                for (let i = 0; i < rawBytes.length; i++) {
                  if (rawBytes[i] > 0 && rawBytes[i] < 40) {
                    const forceValue = rawBytes[i];
                    console.log(`Using byte ${i} as direct force reading: ${forceValue}N`);
                    
                    localStorage.setItem('latestBreathReading', forceValue.toString());
                    localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                    break;
                  }
                }
              }
            }
          }
          
          // Store raw data for debugging
          localStorage.setItem('latestRawBytes', hexDump);
          
          // Remove redundant check since we've already processed the packet above
        } catch (error) {
          console.error('Error processing incoming data:', error);
        }
      });
      
      // Setup response handlers
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected');
        localStorage.setItem('breathDeviceConnected', 'false');
      });
      
      // Initialize the device for respiration data using the protocol from documentation
      console.log('Initializing Vernier Go Direct Respiration Belt...');
      
      // STEP 1: Reset the device to ensure clean state
      console.log('Step 1: Resetting device...');
      await commandChar.writeValue(new Uint8Array([0x00]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 2: Get device info (command 0x55)
      console.log('Step 2: Getting device info...');
      await commandChar.writeValue(new Uint8Array([0x55]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 3: Get sensor list (command 0x56)
      console.log('Step 3: Getting sensor list...');
      await commandChar.writeValue(new Uint8Array([0x56]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 4: Enable the Force sensor (channel 1)
      // This is where the respiration belt force measurements come from
      console.log('Step 4: Enabling force sensor (channel 1)...');
      await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 5: Set fast sampling rate for responsive readings (50ms = 20Hz)
      console.log('Step 5: Setting sampling rate to 20Hz...');
      await commandChar.writeValue(new Uint8Array([0x12, 0x32, 0x00]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 6: Start measurements on the enabled sensor
      console.log('Step 6: Starting measurements...');
      await commandChar.writeValue(new Uint8Array([0x18, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // According to the official Vernier protocol, once we've started measurements
      // with command 0x18, the device will automatically start streaming data
      // We don't need to continually poll with additional commands
      console.log('Data streaming started. Waiting for measurements...');
      
      // Still, we'll use a keepalive mechanism to ensure the connection stays active
      // According to docs, command 0x01 is a keepalive command
      const keepaliveInterval = setInterval(async () => {
        try {
          // Send keepalive command every second
          await commandChar.writeValue(new Uint8Array([0x01]));
          
          if (Date.now() % 5000 < 100) {
            console.log(`Sent keepalive to respiration belt at ${new Date().toLocaleTimeString()}`);
          }
        } catch (e) {
          console.error('Error sending keepalive to belt:', e);
        }
      }, 1000); // Once per second is sufficient for keepalive
      
      // Store the fact that polling is active, but we don't need to store the actual ID
      localStorage.setItem('pollingActive', 'true');
      
      // Store connection info
      localStorage.setItem('breathBluetoothDevice', device.id);
      localStorage.setItem('breathDataSource', 'real');
      localStorage.setItem('breathDeviceName', device.name || 'Respiration Belt');
      localStorage.setItem('latestBreathReading', '0');
      localStorage.setItem('latestBreathTimestamp', Date.now().toString());
      
      console.log('Connected successfully! Redirecting to Breath Kasina page');
      navigate('/breath-kasina');
      
    } catch (error: any) {
      console.error('Bluetooth connection error:', error);
      alert(`Connection error: ${error.message || 'Unknown error'}. Please make sure the device is on and nearby.`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={connectToDevice}
      disabled={isConnecting}
      className="w-full bg-blue-600 hover:bg-blue-700"
    >
      {isConnecting ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          Connecting to Respiration Belt...
        </>
      ) : (
        "Connect to Respiration Belt"
      )}
    </Button>
  );
};

export default VernierConnect;