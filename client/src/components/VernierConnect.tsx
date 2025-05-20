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

    try {
      setIsConnecting(true);
      console.log('Starting Vernier connection in direct response to user action');

      // The specific Vernier Go Direct service UUID
      // Vernier Go Direct official UUIDs
      const VERNIER_SERVICE_UUID = 'd91714ef-28b9-4f91-ba16-f0d9a604f112';
      const COMMAND_UUID = 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb';
      const RESPONSE_UUID = 'b41e6675-a329-40e0-aa01-44d2f444babe';

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
      
      // Only use the response characteristic listener
      responseChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = event.target.value;
        if (!dataView) return;
        
        try {
          // Create readable raw byte array for logging
          const rawBytes = new Array(dataView.byteLength);
          for (let i = 0; i < dataView.byteLength; i++) {
            rawBytes[i] = dataView.getUint8(i);
          }
          
          // Format as hex for readability
          const hexDump = rawBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('VERNIER RAW DATA PACKET:', hexDump);
          
          // FUNDAMENTAL APPROACH CHANGE: Let's examine the exact data coming from this specific belt model
          console.log('PACKET DETAILS:');
          console.log(`- Packet Length: ${rawBytes.length} bytes`);
          console.log(`- Raw Data: ${Array.from(rawBytes).join(', ')}`);
          
          // Try EVERY possible interpretation of the data
          
          // 1. Try each byte as a direct force reading (0-40N range)
          for (let i = 0; i < rawBytes.length; i++) {
            const singleByteValue = rawBytes[i];
            if (singleByteValue > 0 && singleByteValue < 40) {
              console.log(`POSSIBLE DIRECT READING: Byte ${i} = ${singleByteValue}N`);
              
              // Store any promising value
              localStorage.setItem('latestByteReading', singleByteValue.toString());
              localStorage.setItem('latestBytePosition', i.toString());
            }
          }
          
          // 2. Try interpreting as 16-bit integers at every position
          for (let i = 0; i < rawBytes.length - 1; i++) {
            try {
              // Try as 16-bit value (both little and big endian)
              const uint16Value = (rawBytes[i+1] << 8) | rawBytes[i]; // Little-endian
              const uint16ValueBE = (rawBytes[i] << 8) | rawBytes[i+1]; // Big-endian
              
              // Scales: divide by 100 or 10 for appropriate range
              const scaledValue = uint16Value / 100;
              const scaledValueBE = uint16ValueBE / 100;
              
              if (scaledValue > 0 && scaledValue < 40) {
                console.log(`POSSIBLE 16-BIT LE: Bytes ${i}-${i+1} = ${scaledValue.toFixed(2)}N`);
                localStorage.setItem('latest16bitReading', scaledValue.toString());
              }
              
              if (scaledValueBE > 0 && scaledValueBE < 40) {
                console.log(`POSSIBLE 16-BIT BE: Bytes ${i}-${i+1} = ${scaledValueBE.toFixed(2)}N`);
                localStorage.setItem('latest16bitReadingBE', scaledValueBE.toString());
              }
            } catch (e) {
              // Skip errors
            }
          }
          
          // 3. Try as standard 32-bit floats
          for (let i = 0; i < rawBytes.length - 3; i++) {
            try {
              // Try IEEE-754 float at each position
              const floatValue = dataView.getFloat32(i, true); // Little-endian
              const floatValueBE = dataView.getFloat32(i, false); // Big-endian
              
              if (!isNaN(floatValue) && floatValue > 0 && floatValue < 40) {
                console.log(`FOUND FLOAT32 LE: Offset ${i} = ${floatValue.toFixed(4)}N`);
                localStorage.setItem('latestBreathReading', floatValue.toString());
                localStorage.setItem('latestBreathTimestamp', Date.now().toString());
              }
              
              if (!isNaN(floatValueBE) && floatValueBE > 0 && floatValueBE < 40) {
                console.log(`FOUND FLOAT32 BE: Offset ${i} = ${floatValueBE.toFixed(4)}N`);
                localStorage.setItem('latestBreathReading', floatValueBE.toString());
                localStorage.setItem('latestBreathTimestamp', Date.now().toString());
              }
            } catch (e) {
              // Skip errors at this offset
            }
          }
          
          // Try simpler directly readable values from sensor
          // Sometimes force sensors just use single byte or 16-bit values
          
          // Try processing as unsigned int values at various positions
          for (let i = 0; i < rawBytes.length; i++) {
            const rawByteValue = rawBytes[i];
            console.log(`BYTE VALUE at ${i}: ${rawByteValue} (0x${rawByteValue.toString(16)})`);
          }
          
          // Check if we have reasonable-looking 16-bit values
          if (rawBytes.length >= 2) {
            const uint16Value = (rawBytes[0] << 8) | rawBytes[1]; // big-endian
            const uint16Value_le = (rawBytes[1] << 8) | rawBytes[0]; // little-endian
            console.log(`16-BIT VALUE (BE): ${uint16Value} (hex: 0x${uint16Value.toString(16)})`);
            console.log(`16-BIT VALUE (LE): ${uint16Value_le} (hex: 0x${uint16Value_le.toString(16)})`);
          }
          
          // Try as a direct float value from the start
          if (rawBytes.length >= 4) {
            try {
              const floatVal = dataView.getFloat32(0, true); // little-endian
              const floatVal_be = dataView.getFloat32(0, false); // big-endian
              console.log(`FLOAT32 VALUE (LE): ${floatVal.toFixed(4)}`);
              console.log(`FLOAT32 VALUE (BE): ${floatVal_be.toFixed(4)}`);
            } catch (e) {
              console.log('Error parsing float:', e);
            }
          }
          
          // Store the raw bytes for debugging
          localStorage.setItem('latestRawBytes', hexDump);
          
          // Try a last-resort approach - just use any non-zero value as evidence of breathing
          let anyNonZero = false;
          for (let i = 0; i < rawBytes.length; i++) {
            if (rawBytes[i] > 0) {
              anyNonZero = true;
              break;
            }
          }
          
          if (anyNonZero) {
            console.log('NON-ZERO VALUES DETECTED IN PACKET!');
            
            // Find the largest byte value in the packet
            const maxByte = Math.max(...rawBytes);
            if (maxByte > 0) {
              // Use this as a simple indicator (range 0-255 scaled to 0-25.5N)
              const simpleForce = maxByte / 10; 
              console.log(`USING SIMPLE FORCE CALCULATION: ${simpleForce.toFixed(2)}N`);
              
              // Store this for visualization
              localStorage.setItem('latestBreathReading', simpleForce.toString());
              localStorage.setItem('latestBreathTimestamp', Date.now().toString());
            }
          }
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
      
      // Step 1: Get the device info (command 0x55)
      console.log('Step 1: Getting device info...');
      await commandChar.writeValue(new Uint8Array([0x55]));
      await new Promise(resolve => setTimeout(resolve, 1000)); // longer delay for response
      
      // Step 2: Get sensor IDs (command 0x56)
      console.log('Step 2: Getting sensor IDs...');
      await commandChar.writeValue(new Uint8Array([0x56]));
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Request sensor info for sensor 1 (Force)
      console.log('Step 3: Getting sensor info...');
      await commandChar.writeValue(new Uint8Array([0x50, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Enable sensor channel 1 (Force) with command 0x11
      console.log('Step 4: Enabling force sensor (channel 1)...');
      await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 5: Set the sample period to 100ms (10Hz) with command 0x12
      console.log('Step 5: Setting sampling rate to 100ms (10Hz)...');
      await commandChar.writeValue(new Uint8Array([0x12, 0x64, 0x00]));
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 6: Start measurements on channel 1 with command 0x18
      console.log('Step 6: Starting measurements...');
      await commandChar.writeValue(new Uint8Array([0x18, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For the Vernier GDX-RB respiration belt, we need to try a direct approach
      console.log('Setting up direct sensor communication...');
      
      // Try a simpler, more direct approach to reading force data
      // Let's use command 0x07 to request readings from channel 1 (force sensor)
      await commandChar.writeValue(new Uint8Array([0x07, 0x01]));
      
      // Start a more frequent polling cycle with detailed logging
      const pollingInterval = setInterval(async () => {
        try {
          // Send command to request force readings
          await commandChar.writeValue(new Uint8Array([0x07, 0x01]));
          
          // Log our polling attempts
          console.log('Requesting force reading from belt...');
        } catch (e) {
          console.error('Error polling device:', e);
          clearInterval(pollingInterval);
        }
      }, 300); // Poll more frequently (every 300ms)
      
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