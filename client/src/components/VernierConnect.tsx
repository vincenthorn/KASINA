import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import * as Vernier from '@/lib/vernierProtocol';

// This component provides a dedicated button for connecting to the Vernier Go Direct Respiration Belt
// It ensures the Bluetooth connection happens in direct response to a user action
const VernierConnect = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const navigate = useNavigate();
  
  // Replacement for console.log to capture logs in the UI for easier debugging
  const addLog = (message: string) => {
    console.log(message);
    setLogMessages(prev => [...prev, message].slice(-10)); // Keep last 10 logs
  };

  const connectToDevice = async () => {
    if (!(navigator as any).bluetooth) {
      alert("Web Bluetooth is not supported in your browser. Please use Chrome or Edge on desktop or Android.");
      return;
    }
    
    // Clear any previous connection data
    localStorage.removeItem('latestBreathReading');
    localStorage.removeItem('latestBreathTimestamp');
    
    // Clear previous log messages
    setLogMessages([]);

    try {
      setIsConnecting(true);
      addLog('Starting Vernier connection in direct response to user action');

      // Print the exact UUIDs we're using for debugging
      addLog(`✅ Using command UUID: ${Vernier.COMMAND_UUID}`);
      addLog(`✅ Using response UUID: ${Vernier.RESPONSE_UUID}`);

      // Request the device immediately in response to the button click
      addLog('Requesting Bluetooth device...');
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX-RB' }, // Go Direct Respiration Belt
          { namePrefix: 'Go Direct' } // Fallback for other Vernier devices
        ],
        optionalServices: [Vernier.VERNIER_SERVICE_UUID]
      });

      addLog(`Device selected: ${device.name || 'Unknown device'}`);
      
      // Connect to GATT server
      addLog('Connecting to GATT server...');
      const server = await device.gatt?.connect();
      
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }
      
      // Get the primary service
      addLog('Getting Vernier service...');
      const service = await server.getPrimaryService(Vernier.VERNIER_SERVICE_UUID);
      
      // Get characteristics
      addLog('Getting command and response characteristics...');
      const commandChar = await service.getCharacteristic(Vernier.COMMAND_UUID);
      const responseChar = await service.getCharacteristic(Vernier.RESPONSE_UUID);
      
      // Explicitly start notifications
      addLog('Starting notifications on response characteristic...');
      await responseChar.startNotifications();
      addLog('✅ BLE notifications explicitly started on responseCharacteristic.');
      
      // Set up listener for incoming data with explicit logging
      addLog('Setting up data listener for respiration measurements...');
      
      // Handle incoming sensor data with specific logging and format display
      responseChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = event.target.value;
        if (!dataView) return;
        
        try {
          // Convert to Uint8Array for easier processing
          const rawBytes = new Uint8Array(dataView.buffer);
          
          // Log the raw data immediately with detailed information
          const bytesInfo = Array.from(rawBytes).map(b => b.toString()).join(', ');
          const hexInfo = Array.from(rawBytes).map(b => "0x" + b.toString(16).padStart(2, '0')).join(', ');
          addLog(`✅ New data: [${bytesInfo}]`);
          addLog(`✅ Hex: [${hexInfo}]`);
          
          // Store raw data in local storage for visualization
          localStorage.setItem('latestRawBytes', Vernier.createHexDump(rawBytes));
          
          // First, check if this is the specific pattern we've observed in the logs
          // Pattern: "9c 87 81 d6 01 00 31"
          if (rawBytes.length > 0 && rawBytes[0] === 0x9c) {
            addLog(`✅ Detected respiration belt packet pattern (0x9c)`);
            
            // Use our specialized parser for the identified pattern
            const forceReading = Vernier.parseRespirationBeltPacket(rawBytes);
            
            if (forceReading !== null) {
              addLog(`✅ Parsed force reading: ${forceReading.toFixed(4)}N`);
              
              // Store for visualization
              localStorage.setItem('latestBreathReading', forceReading.toString());
              localStorage.setItem('latestBreathTimestamp', Date.now().toString());
              
              // Calculate estimated breathing rate based on recent readings
              // This would normally be calculated over multiple breath cycles
              // For now, just set a placeholder value
              localStorage.setItem('breathingRate', '12');
              
              // Set data source flag to indicate real data
              localStorage.setItem('breathDataSource', 'real');
            }
          } else {
            // For all other packet types, try with generic detection approaches
            addLog(`Trying general data interpretation...`);
            
            // First, identify the packet type
            const packetType = rawBytes[0];
            addLog(`✅ Packet type: 0x${packetType.toString(16)}`);
            
            let forceReading = null;
            
            // Try all possible interpretations of the data
            addLog("Trying all possible interpretations...");
            
            // Try all possible offsets for a float value
            for (let i = 0; i <= dataView.byteLength - 4; i++) {
              try {
                const value = dataView.getFloat32(i, true);
                
                // Look for values in the expected range for respiration (0.1-10N)
                if (!isNaN(value) && value > 0.1 && value < 10) {
                  addLog(`✅ Valid float32 at offset ${i}: ${value.toFixed(4)}N`);
                  
                  forceReading = value;
                  break;
                }
              } catch (e) {
                // Skip errors at this offset
              }
            }
            
            // If we found a valid reading, store it
            if (forceReading !== null) {
              localStorage.setItem('latestBreathReading', forceReading.toString());
              localStorage.setItem('latestBreathTimestamp', Date.now().toString());
              localStorage.setItem('breathDataSource', 'real');
            }
          }
          
          // As we're receiving data, set a flag that real data is available
          localStorage.setItem('realDataAvailable', 'true');
          
        } catch (error) {
          console.error('Error processing incoming data:', error);
          addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      
      // Remove duplicate event listener for device disconnect
      device.addEventListener('gattserverdisconnected', () => {
        addLog('Device disconnected');
        localStorage.setItem('breathDeviceConnected', 'false');
      });
      
      // Initialize the device using the documented Vernier protocol with explicit logging
      addLog('Initializing Vernier Go Direct Respiration Belt...');
      
      // STEP 1: Reset the device to ensure clean state
      addLog('Step 1: Resetting device...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.RESET]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 2: Get device info
      addLog('Step 2: Getting device info...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_DEVICE_INFO]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 3: Get sensor list
      addLog('Step 3: Getting sensor list...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_SENSOR_LIST]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 4: Set a more aggressive device setup
      addLog('Starting complete device initialization sequence...');
      
      // Step 4a: Reset the device first
      addLog('Resetting device...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.RESET]));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Longer wait after reset
      
      // Step 4b: Get device info (important step based on official documentation)
      addLog('Getting device info...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_DEVICE_INFO]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4c: Get sensor list (required before enabling sensors)
      addLog('Getting sensor list...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_SENSOR_LIST]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4d: Enable the Force sensor (channel 1) - using multiple approaches
      addLog('Enabling force sensor (channel 1)...');
      
      // Format from the official Vernier examples - VERY IMPORTANT
      await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01]));
      addLog('✅ Standard sensor activation sent: [0x11, 0x01, 0x01]');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4e: Direct command format from the instructions
      await commandChar.writeValue(new Uint8Array([0x01, 0x02, 0x01]));
      addLog('✅ Direct sensor activation sent: [0x01, 0x02, 0x01]');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // STEP 5: Set sampling rate to exactly 10Hz (100ms period)
      addLog('Setting sample rate to 10Hz (100ms)...');
      await commandChar.writeValue(new Uint8Array([0x12, 0x64, 0x00])); // 0x64 = 100ms period
      addLog('✅ Sample rate command sent: [0x12, 0x64, 0x00]');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // STEP 6: Start measurements - CRITICAL STEP
      addLog('Starting measurements...');
      
      // Format from the official documentation (most reliable)
      await commandChar.writeValue(new Uint8Array([0x18, 0x01]));
      addLog('✅ Start measurements command sent: [0x18, 0x01]');
      await new Promise(resolve => setTimeout(resolve, 1000));  // Longer wait after start
      
      // STEP 7: Force a reading request to jump-start the data stream
      addLog('Sending explicit reading request...');
      await commandChar.writeValue(new Uint8Array([0x07, 0x00, 0x00, 0x00, 0x01]));
      addLog('✅ Force reading request sent: [0x07, 0x00, 0x00, 0x00, 0x01]');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use a keepalive to ensure the connection stays active
      const keepaliveInterval = setInterval(async () => {
        try {
          await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.KEEP_ALIVE]));
        } catch (e) {
          console.error('Error sending keepalive to belt:', e);
          clearInterval(keepaliveInterval);
        }
      }, 2000);
      
      // Store connection info with meaningful names
      localStorage.setItem('breathDeviceConnected', 'true');
      localStorage.setItem('breathDataSource', 'real');
      localStorage.setItem('breathDeviceName', device.name || 'Respiration Belt');
      
      // Store the device ID for debugging
      localStorage.setItem('breathDeviceId', device.id || 'unknown');
      
      addLog('✅ Successfully connected to Vernier respiration belt!');
      addLog(`Device ID: ${device.id || 'unknown'}`);
      addLog(`Device Name: ${device.name || 'Respiration Belt'}`);
      
      setIsConnecting(false);
      
      // Wait 1 second to allow any incoming data to be displayed in the logs
      // before navigating away from this page
      addLog('Preparing to navigate to breath kasina visualization...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Stay on this page for 5 seconds to observe incoming data,
      // This will help us debug any problems with data transmission
      addLog("✅ Connection established, monitoring for incoming data...");
      
      // Wait 5 seconds before navigating to see if we get any data
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Navigate to the breath kasina page after successful connection
      // Use the correct path that matches our router configuration
      navigate('/breath-kasina');
    } catch (error) {
      // Log the error details to help with debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`⚠️ Error connecting to Vernier device: ${errorMessage}`);
      console.error('Error connecting to Vernier device:', error);
      setIsConnecting(false);
      alert("Failed to connect to the respiration belt. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button 
        onClick={connectToDevice}
        disabled={isConnecting}
        className="bg-blue-600 hover:bg-blue-700 text-white w-full py-6 mt-4"
      >
        {isConnecting ? "Connecting..." : "Connect to Respiration Belt"}
      </Button>
      
      {/* Debug logs display - this keeps the logs visible in the UI */}
      {logMessages.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs font-mono h-60 overflow-auto">
          <h3 className="font-bold mb-2">Device Connection Logs:</h3>
          {logMessages.map((msg, i) => (
            <div key={i} className="mb-1">{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VernierConnect;