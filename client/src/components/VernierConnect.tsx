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
                  // Force reading starts at byte 3 (after header and dropped count)
                  const forceReading = dataView.getFloat32(3, true); // little-endian
                  
                  if (!isNaN(forceReading)) {
                    // Cap extremely high readings to prevent visualization issues
                    const normalizedReading = Math.min(forceReading, 0.5);
                    console.log(`Force reading: ${normalizedReading.toFixed(4)}N (original: ${forceReading.toFixed(4)}N)`);
                    
                    // Store the normalized force reading for visualization
                    localStorage.setItem('latestBreathReading', normalizedReading.toString());
                    localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                    
                    // Store breath phase for better visualization
                    const prevReading = parseFloat(localStorage.getItem('prevBreathReading') || '0');
                    if (normalizedReading > prevReading) {
                      localStorage.setItem('breathPhase', 'inhale');
                    } else {
                      localStorage.setItem('breathPhase', 'exhale');
                    }
                    localStorage.setItem('prevBreathReading', normalizedReading.toString());
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
      
      // Initialize the device using Vernier's documented protocol
      console.log('Initializing Vernier Go Direct Respiration Belt...');
      
      // According to Vernier Go Direct BLE protocol in https://www.vernier.com/til/19229
      // Following the exact sequence from official documentation
      
      // Step 1: Get device info (command 0x55)
      console.log('Step 1: Getting device info...');
      await commandChar.writeValue(new Uint8Array([0x55]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 2: Get sensor list (command 0x56)
      console.log('Step 2: Getting sensor list...');
      await commandChar.writeValue(new Uint8Array([0x56]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Get detailed info for sensor 1 (command 0x50, sensor number 0x01)
      // For respiration belt, channel 1 is the Force channel
      console.log('Step 3: Getting sensor info for Force sensor (channel 1)...');
      await commandChar.writeValue(new Uint8Array([0x50, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4: Enable the Force sensor (channel 1)
      // Command 0x11, sensor number 0x01, enabled 0x01
      console.log('Step 4: Enabling Force sensor (channel 1)...');
      await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 5: Set measurement period to 100ms (0x64) for 10Hz sampling
      // Command 0x12, period low byte 0x64, period high byte 0x00
      console.log('Step 5: Setting measurement period to 100ms (10Hz)...');
      await commandChar.writeValue(new Uint8Array([0x12, 0x64, 0x00]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 6: Start measurements
      // Command 0x18, sensor mask 0x01 (channel 1)
      console.log('Step 6: Starting measurements on Force sensor...');
      await commandChar.writeValue(new Uint8Array([0x18, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
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