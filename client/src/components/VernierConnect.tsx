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
      
      // Start notifications
      console.log('Starting notifications...');
      await responseChar.startNotifications();
      
      // Set up listener for incoming data
      console.log('Setting up data listener...');
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
          
          // According to Vernier's Go Direct Bluetooth protocol, measurements follow this format:
          // - Measurement packets have a status byte of 0x01 or 0x03
          // - Followed by channel number (usually 0x01 for force sensor)
          // - Followed by a 4-byte IEEE-754 float (little-endian)
          
          if (rawBytes.length >= 6) {
            // Extract the key packet parts for proper interpretation
            const statusByte = rawBytes[0];
            
            // First byte should be 0x01 or 0x03 for measurement packets
            if (statusByte === 0x01 || statusByte === 0x03) {
              // Second byte is the channel number (should be 1 for the force sensor)
              const channel = rawBytes[1];
              
              // The actual measurement depends on which channel we're getting
              if (channel === 0x01) {
                // The force measurement is a 4-byte IEEE-754 float
                // Bytes 2-5 contain the float value in little-endian format
                
                // Use proper buffer handling for the floats within the DataView
                const forceValue = dataView.getFloat32(2, true); // true = little-endian
                
                if (!isNaN(forceValue) && forceValue >= 0 && forceValue <= 50) {
                  console.log(`VALID FORCE READING: ${forceValue.toFixed(4)}N on channel ${channel}`);
                  
                  // Save this for the visualization
                  localStorage.setItem('latestBreathReading', forceValue.toString());
                  localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                }
              }
            }
          }
          
          // For Vernier's alternative formats, we also check for other patterns
          if (rawBytes.length >= 5) {
            // Some Vernier packets may start with command response markers
            // This is an alternate format that might be used
            
            // Check for any valid floating point values in the data
            for (let offset = 0; offset < dataView.byteLength - 3; offset++) {
              try {
                const possibleValue = dataView.getFloat32(offset, true); // little-endian
                
                // Filter to realistic force reading values
                if (!isNaN(possibleValue) && possibleValue > 0 && possibleValue <= 30) {
                  console.log(`ALTERNATE FORMAT: Found valid force at offset ${offset}: ${possibleValue.toFixed(4)}N`);
                  
                  // Save for visualization
                  localStorage.setItem('latestBreathReading', possibleValue.toString());
                  localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                  
                  // Break after finding one valid reading to prevent duplicates
                  break;
                }
              } catch (e) {
                // Skip errors at this offset
              }
            }
          }
          
          // Store the raw bytes for debugging
          localStorage.setItem('latestRawBytes', hexDump);
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
      
      // Request specific sensor readings via command 0x07
      console.log('Requesting sensor readings...');
      
      // Request from sensor 1 (Force)
      await new Promise(resolve => setTimeout(resolve, 500));
      await commandChar.writeValue(new Uint8Array([0x07, 0x01]));
      
      // Set polling interval to continuously request readings (every 500ms)
      const pollingInterval = setInterval(async () => {
        try {
          // Periodically request new readings
          await commandChar.writeValue(new Uint8Array([0x07, 0x01]));
        } catch (e) {
          console.error('Error polling device:', e);
          clearInterval(pollingInterval);
        }
      }, 500);
      
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