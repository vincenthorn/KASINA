import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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

      // The specific Vernier Go Direct service UUID
      // Vernier Go Direct official UUIDs
      // From Vernier documentation at https://www.vernier.com/til/19229
      // Go Direct Service UUID
      const VERNIER_SERVICE_UUID = 'd91714ef-28b9-4f91-ba16-f0d9a604f112';
      
      // Standard BLE protocol for Go Direct devices
      const COMMAND_UUID = 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb'; // Command characteristic
      const RESPONSE_UUID = 'b41e6675-a329-40e0-aa01-44d2f444babe'; // Response characteristic

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
      
      // Set up listener for incoming data
      console.log('Setting up data listener...');
      
      // Process data according to Vernier Go Direct protocol documentation
      responseChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = event.target.value;
        if (!dataView) return;
        
        try {
          // Create an array from the raw data for easier access
          const rawBytes = new Uint8Array(dataView.buffer);
          
          // Format as hex for readability
          const hexDump = Array.from(rawBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
          
          console.log('VERNIER DATA PACKET:', hexDump);
          
          // According to Vernier protocol documentation from https://www.vernier.com/til/19229
          // First byte in the response indicates the packet type
          console.log(`Packet length: ${rawBytes.length} bytes`);
          
          if (rawBytes.length > 0) {
            const packetType = rawBytes[0];
            console.log(`Packet type: 0x${packetType.toString(16)}`);
            
            // Handle different packet types based on Vernier documentation
            if (packetType === 0x01 && rawBytes.length >= 7) {
              // Measurement data packet (type 0x01)
              // Format: [header(1), droppedCount(2), measurements...]
              
              // Extract dropped packet count (2 bytes, little-endian)
              const droppedCount = rawBytes[1] | (rawBytes[2] << 8);
              
              // The rest contains sensor readings (4 bytes per sensor, IEEE-754 float)
              // For the respiration belt, the force sensor is the first one
              if (rawBytes.length >= 7) {
                // Create a DataView for reliable float extraction
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
      
      // Initialize the device using Vernier's documented protocol with optimizations
      console.log('Initializing Vernier Go Direct Respiration Belt...');
      
      // Reset any existing device state first - necessary for reliability
      await commandChar.writeValue(new Uint8Array([0x00])); // Reset command
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 1: Get device info (command 0x55)
      console.log('Step 1: Getting device info...');
      await commandChar.writeValue(new Uint8Array([0x55]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 2: Get sensor list (command 0x56)
      console.log('Step 2: Getting sensor list...');
      await commandChar.writeValue(new Uint8Array([0x56]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 3: Get detailed info for sensor 1 (command 0x50, sensor number 0x01)
      // For respiration belt, channel 1 is the Force channel
      console.log('Step 3: Getting sensor info for Force sensor (channel 1)...');
      await commandChar.writeValue(new Uint8Array([0x50, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // The Respiration Belt has multiple channels - try enabling them all
      // This ensures we get all available data from the device
      console.log('Step 4: Enabling all possible sensor channels...');
      
      // Force channel (most important)
      await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01])); 
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try additional channels that might be on the respiration belt
      // Channel 2 (sometimes used for derivative values like breathing rate)
      await commandChar.writeValue(new Uint8Array([0x11, 0x02, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Set fast sampling rate (50ms = 20Hz) for more responsive readings
      console.log('Step 5: Setting faster sampling rate (20Hz)...');
      await commandChar.writeValue(new Uint8Array([0x12, 0x32, 0x00])); // 0x32 = 50ms
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Start measurements on all channels (mask 0x03 = channels 1 and 2)
      console.log('Step 6: Starting measurements on ALL sensors...');
      await commandChar.writeValue(new Uint8Array([0x18, 0x03])); 
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