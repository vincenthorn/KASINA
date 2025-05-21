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
          
          // Log the raw data as specified in the instructions
          console.log("✅ Raw sensor data:", rawBytes);
          
          // Log the raw data with detailed information
          const bytesInfo = Array.from(rawBytes).map(b => b.toString()).join(', ');
          const hexInfo = Array.from(rawBytes).map(b => "0x" + b.toString(16).padStart(2, '0')).join(', ');
          addLog(`✅ Raw sensor data: [${bytesInfo}]`);
          addLog(`✅ Hex: [${hexInfo}]`);
          
          // Store raw data in local storage for visualization
          localStorage.setItem('latestRawBytes', Vernier.createHexDump(rawBytes));
          
          // Track which bytes change during breathing to identify the force data
          // This will help us identify which bytes represent the breathing force
          
          // Store previous values to compare for changes
          const prevRawBytesStr = localStorage.getItem('prevRawBytes');
          if (prevRawBytesStr) {
            const prevRawBytes = prevRawBytesStr.split(',').map(b => parseInt(b, 10));
            
            // Compare previous and current data to detect changes
            const changedByteIndices = [];
            
            for (let i = 0; i < Math.min(rawBytes.length, prevRawBytes.length); i++) {
              if (rawBytes[i] !== prevRawBytes[i]) {
                changedByteIndices.push(i);
              }
            }
            
            // Log which bytes changed (important for identifying breath data)
            if (changedByteIndices.length > 0) {
              addLog(`🔍 Bytes changed at indices: ${changedByteIndices.join(', ')}`);
              addLog(`🔍 Previous values: ${changedByteIndices.map(i => prevRawBytes[i]).join(', ')}`);
              addLog(`🔍 Current values: ${changedByteIndices.map(i => rawBytes[i]).join(', ')}`);
              
              // Calculate and interpret force from changed bytes
              // This is an initial heuristic - we'll refine based on observed patterns
              
              // If we see changes in bytes, they might represent force values
              // Let's focus on the first few bytes which often contain the primary sensor data
              for (const idx of changedByteIndices) {
                if (idx < 4) {  // Focus on the first 4 bytes where sensor data is most likely
                  const rawValue = rawBytes[idx];
                  // Scale to a reasonable force range (0-20N)
                  const forceValue = rawValue / 10.0;
                  
                  addLog(`⭐ Potential force from byte ${idx}: ${forceValue.toFixed(2)}N`);
                  
                  // Store for visualization
                  localStorage.setItem('latestBreathReading', forceValue.toString());
                  localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                  localStorage.setItem('breathDataSource', 'real');
                  break; // Use the first changing byte for now
                }
              }
            }
          }
          
          // Store current bytes for next comparison
          localStorage.setItem('prevRawBytes', Array.from(rawBytes).join(','));
          
          // For any packet type, also try to interpret as float values
          // This covers the common format for sensor data in many devices
          for (let i = 0; i < dataView.byteLength - 3; i++) {
            try {
              const value = dataView.getFloat32(i, true); // little-endian
              
              // Range check for plausible force values (0.1-30N)
              if (!isNaN(value) && value > 0.1 && value < 30) {
                addLog(`✅ Float32 force at offset ${i}: ${value.toFixed(2)}N`);
                
                // Store for visualization
                localStorage.setItem('latestBreathReading', value.toString());
                localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                localStorage.setItem('breathingRate', '12'); // Placeholder breath rate
                localStorage.setItem('breathDataSource', 'real');
                break; // Use first valid reading
              }
            } catch (e) {
              // Skip errors at this offset
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
      
      // Simplify the approach - focus only on the key steps
      // First, perform a clean reset to ensure the device is in a known state
      addLog('Resetting device...');
      await commandChar.writeValue(new Uint8Array([0x00])); // Reset command
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // STEP 5: Set the sampling rate to 10Hz (100ms period) - this is critical
      addLog('Setting sampling rate to 10Hz (100ms)...');
      await commandChar.writeValue(new Uint8Array([0x12, 0x64, 0x00])); // 0x64 = 100ms period
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // STEP 6: Send ONLY the real Vernier Respiration Belt activation command
      // This is the EXACT command from the Vernier Python SDK as specified in the instructions
      addLog('Sending the official Vernier respiration belt activation command...');
      
      // Use EXACTLY the command array provided in the instructions - no modifications
      const enableSensorCommand = new Uint8Array([
        0x58, 0x19, 0xFE, 0x3F, 0x1A, 0xA5, 0x4A, 0x06,
        0x49, 0x07, 0x48, 0x08, 0x47, 0x09, 0x46, 0x0A,
        0x45, 0x0B, 0x44, 0x0C, 0x43, 0x0D, 0x42, 0x0E, 0x41
      ]);
      
      // Send the exact command as specified
      await commandChar.writeValue(enableSensorCommand);
      console.log("✅ Sent full sensor activation command");
      addLog("✅ Sent full sensor activation command");
      
      // Use a longer wait to ensure the command is fully processed
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // STEP 7: Make sure BLE notifications are active as specified in the instructions
      addLog('Ensuring notifications are active and will log raw data correctly...');
      
      // Re-enable notifications to ensure they're active
      await responseChar.startNotifications();
      addLog('✅ Notifications activated for response characteristic');
      
      // Small pause to let everything initialize properly
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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