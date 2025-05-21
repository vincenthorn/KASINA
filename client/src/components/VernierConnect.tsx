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
          addLog(`✅ New raw sensor data received: [${bytesInfo}]`);
          
          // Log byte-by-byte for detailed analysis
          if (rawBytes.length > 0) {
            // Store raw data in local storage for visualization
            localStorage.setItem('latestRawBytes', Vernier.createHexDump(rawBytes));
            
            // Log packet type
            addLog(`✅ Packet type: 0x${rawBytes[0].toString(16)}`);
            
            // Try different data interpretation approaches
            if (rawBytes.length >= 7) {
              // Try as float32 at offset 3 (typical for sensor readings)
              try {
                const forceReading = dataView.getFloat32(3, true); // little-endian
                if (!isNaN(forceReading) && forceReading >= 0) {
                  addLog(`✅ FORCE READING: ${forceReading.toFixed(4)}N`);
                  
                  // Store valid reading for visualization
                  const normalizedReading = Vernier.normalizeForceReading(forceReading);
                  localStorage.setItem('latestBreathReading', normalizedReading.toString());
                  localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                }
              } catch (e) {
                // Try as int16 values
                try {
                  for (let i = 1; i < rawBytes.length - 1; i++) {
                    const uint16Value = dataView.getUint16(i, true);
                    if (uint16Value > 0 && uint16Value < 1000) {
                      const scaledValue = uint16Value / 100.0;
                      addLog(`✅ POTENTIAL SCALED FORCE: ${scaledValue.toFixed(4)}N`);
                      
                      // Store for visualization
                      localStorage.setItem('latestBreathReading', scaledValue.toString());
                      localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                    }
                  }
                } catch (e2) {
                  // Skip errors
                }
              }
            }
          }
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
      
      // STEP 4: Enable the Force sensor (channel 1) - CRITICAL STEP
      addLog('Step 4: Enabling force sensor (channel 1)...');
      // Try simple sensor activation command first (this matches what's in the instructions)
      const simpleEnableCommand = new Uint8Array([0x01, 0x02, 0x01]);
      await commandChar.writeValue(simpleEnableCommand);
      addLog(`✅ Explicit sensor activation command sent: [${Array.from(simpleEnableCommand).join(', ')}]`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Alternative: Try the standard command from the protocol
      await commandChar.writeValue(Vernier.ENABLE_SENSOR_1);
      addLog(`✅ Alternate sensor activation command sent: [${Array.from(Vernier.ENABLE_SENSOR_1).join(', ')}]`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // STEP 5: Set sampling rate to 10Hz (more stable for breath monitoring)
      addLog('Step 5: Setting sampling rate to 10Hz...');
      await commandChar.writeValue(Vernier.SET_SAMPLE_RATE_10HZ);
      addLog(`✅ Sample rate command sent: [${Array.from(Vernier.SET_SAMPLE_RATE_10HZ).join(', ')}]`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // STEP 6: Start measurements - CRITICAL STEP
      addLog('Step 6: Starting measurements...');
      // Try the standard command approach
      await commandChar.writeValue(Vernier.START_MEASUREMENTS);
      addLog(`✅ Start measurements command sent: [${Array.from(Vernier.START_MEASUREMENTS).join(', ')}]`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // STEP 7: Alternative start measurements using code from the instructions
      addLog('Step 7: Trying alternative measurement start command...');
      // This is the specific format mentioned in the instructions: [0x01, 0x02, 0x01]
      const alternativeStartCommand = new Uint8Array([0x07, 0x00, 0x00, 0x00, 0x01]);
      await commandChar.writeValue(alternativeStartCommand);
      addLog(`✅ Alternative start command sent: [${Array.from(alternativeStartCommand).join(', ')}]`);
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