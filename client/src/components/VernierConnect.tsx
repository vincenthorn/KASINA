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
      const NOTIFICATION_UUID = 'b41e6676-a329-40e0-aa01-44d2f444babe';

      // Request the device immediately in response to the button click
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX-RB' } // Go Direct Respiration Belt
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
      await responseChar.startNotifications();
      
      // Set up listener for incoming data
      responseChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = event.target.value;
        if (!dataView) return;
        
        try {
          // Create a byte array for easier debugging
          const bytes = new Uint8Array(dataView.buffer);
          console.log('Received data:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
          
          // Try to extract force readings from different data formats
          let force = null;
          
          // Check several possible formats based on what we've seen from Vernier devices
          if (bytes.length >= 6) {
            // Try to find a valid force reading (usually a floating point number)
            for (let i = 0; i <= bytes.length - 4; i++) {
              try {
                const value = dataView.getFloat32(i, true); // true for little-endian
                
                // Look for values in the expected range for respiration (5-20N)
                if (!isNaN(value) && value >= 3 && value <= 25) {
                  force = value;
                  break;
                }
              } catch (e) {
                // Ignore parsing errors and continue
              }
            }
          }
          
          if (force !== null) {
            // Store the reading for use by the visualization
            localStorage.setItem('latestBreathReading', force.toString());
            localStorage.setItem('latestBreathTimestamp', Date.now().toString());
            console.log(`Force reading: ${force.toFixed(2)}N`);
          }
        } catch (error) {
          console.error('Error processing data:', error);
        }
      });
      
      // Initialize the device
      console.log('Initializing device...');
      
      // Send device info request
      await commandChar.writeValue(new Uint8Array([0x55]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Enable force sensor (channel 1)
      await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set sampling period (100ms = 10Hz)
      await commandChar.writeValue(new Uint8Array([0x12, 0x64, 0x00]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Start measurements
      await commandChar.writeValue(new Uint8Array([0x18, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Store connection info
      localStorage.setItem('breathBluetoothDevice', device.id);
      localStorage.setItem('breathDataSource', 'real');
      localStorage.setItem('breathDeviceName', device.name || 'Respiration Belt');
      
      console.log('Connected successfully! Redirecting to Breath Kasina page');
      navigate('/breath-kasina');
      
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      alert(`Connection error: ${(error as Error).message || 'Unknown error'}. Please make sure the device is on and nearby.`);
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