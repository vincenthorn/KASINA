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
          const hexDump = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log('RAW DATA:', hexDump);
          
          // Log the raw data to help understand the format
          console.log('DATA LENGTH:', bytes.length);
          console.log('FIRST BYTES:', bytes[0], bytes[1], bytes[2], bytes[3]);
          
          // CRITICAL: This is a different approach - try to find any valid measurement
          // Based on Vernier's documented formats and common practices
          
          // Try ALL possible starting points for a potential float value
          for (let i = 0; i < bytes.length - 3; i++) {
            try {
              // Try to read a float starting at each position
              const view = new DataView(bytes.buffer);
              const value = view.getFloat32(i, true); // little-endian is most common
              
              // Also try big-endian
              const valueBigEndian = view.getFloat32(i, false);
              
              // Valid respiration force readings have realistic ranges (typically 0-30N)
              // Log any value in a reasonable range
              if (!isNaN(value) && value > 0 && value < 50) {
                console.log(`FOUND POTENTIAL READING at offset ${i} (LE): ${value.toFixed(4)}N`);
                
                // This looks like a valid reading - use it
                localStorage.setItem('latestBreathReading', value.toString());
                localStorage.setItem('latestBreathTimestamp', Date.now().toString());
              }
              
              if (!isNaN(valueBigEndian) && valueBigEndian > 0 && valueBigEndian < 50) {
                console.log(`FOUND POTENTIAL READING at offset ${i} (BE): ${valueBigEndian.toFixed(4)}N`);
                
                // This looks like a valid reading - use it
                localStorage.setItem('latestBreathReading', valueBigEndian.toString());
                localStorage.setItem('latestBreathTimestamp', Date.now().toString());
              }
            } catch (e) {
              // Silent error - just try the next position
            }
          }
          
          // Try to interpret it as raw byte values
          for (let i = 0; i < bytes.length; i++) {
            const rawValue = bytes[i];
            if (rawValue > 0 && rawValue < 50) {
              console.log(`FOUND POTENTIAL RAW BYTE VALUE at position ${i}: ${rawValue}N`);
              localStorage.setItem('latestBreathRawByte', rawValue.toString());
            }
          }
          
          // Store the raw bytes for debugging
          localStorage.setItem('latestRawBytes', hexDump);
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