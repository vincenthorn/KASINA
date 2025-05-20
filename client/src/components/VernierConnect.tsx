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
          // Create a byte array for easier debugging
          const bytes = new Uint8Array(dataView.buffer);
          console.log('Received data:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
          
          // Try to extract force readings from Vernier format
          if (bytes.length >= 8) {
            // The Vernier Go Direct devices typically send data in a specific format
            // For force readings, we're looking for packets that contain Float values
            try {
              // Extract data from all possible formats Vernier uses
              // Try several data packet formats
              
              // Format 1: Direct measurement packet (most common)
              if (bytes[0] === 0x01 || bytes[0] === 0x03) {
                try {
                  const value = dataView.getFloat32(4, true); // true for little-endian
                  
                  if (!isNaN(value) && value >= 0 && value <= 50) {
                    console.log(`Format 1 - Valid force reading: ${value.toFixed(2)}N`);
                    
                    // Store the reading for use by the visualization
                    localStorage.setItem('latestBreathReading', value.toString());
                    localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                    
                    // Alert on the first successful reading
                    if (!localStorage.getItem('firstReadingReceived')) {
                      localStorage.setItem('firstReadingReceived', 'true');
                      console.log('✅ Respiration data received successfully!');
                    }
                  }
                } catch (e) {
                  // Ignore parsing errors in this format
                }
              }
              
              // Format 2: Alternative data format
              if (bytes.length >= 5) {
                try {
                  // Try every possible 4-byte sequence for a valid float
                  for (let i = 0; i <= bytes.length - 4; i++) {
                    try {
                      const value = dataView.getFloat32(i, true);
                      
                      // Valid force readings are typically in the range of 5-20N
                      if (!isNaN(value) && value > 0 && value < 50) {
                        console.log(`Format 2 - Valid force at offset ${i}: ${value.toFixed(2)}N`);
                        
                        // Use this reading
                        localStorage.setItem('latestBreathReading', value.toString());
                        localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                        
                        // Only use the first valid value we find
                        break;
                      }
                    } catch (e) {
                      // Ignore parsing errors at this offset
                    }
                  }
                } catch (e) {
                  // Ignore overall parsing errors
                }
              }
              
              // Format 3: For debugging, store raw bytes for later analysis
              localStorage.setItem('latestRawBytes', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
              
              // Generate a test pattern that varies
              const testValue = 10 + Math.sin(Date.now() / 1000) * 5;
              localStorage.setItem('testBreathReading', testValue.toString());
              localStorage.setItem('testBreathTimestamp', Date.now().toString());
            } catch (error) {
              console.error('Error parsing force data:', error);
            }
          }
        } catch (error) {
          console.error('Error processing incoming data:', error);
        }
      });
      
      // Initialize the device
      console.log('Initializing Vernier device...');
      
      // Send device info request
      console.log('Sending device info request...');
      await commandChar.writeValue(new Uint8Array([0x55]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Enable force sensor (channel 1)
      console.log('Enabling force sensor...');
      await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set sampling period (100ms = 10Hz)
      console.log('Setting sampling period to 100ms...');
      await commandChar.writeValue(new Uint8Array([0x12, 0x64, 0x00]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Start measurements
      console.log('Starting measurements...');
      await commandChar.writeValue(new Uint8Array([0x18, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Request a reading to test connection
      console.log('Requesting initial reading...');
      await commandChar.writeValue(new Uint8Array([0x07, 0x01]));
      
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