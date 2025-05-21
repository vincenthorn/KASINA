import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import * as Vernier from '@/lib/vernierProtocol';

// This component provides a dedicated button for connecting to the Vernier Go Direct Respiration Belt
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

      // Request the device immediately in response to the button click
      console.log('Requesting Bluetooth device...');
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX-RB' }, // Go Direct Respiration Belt
          { namePrefix: 'Go Direct' } // Fallback for other Vernier devices
        ],
        optionalServices: [Vernier.VERNIER_SERVICE_UUID]
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
      const service = await server.getPrimaryService(Vernier.VERNIER_SERVICE_UUID);
      
      // Get characteristics
      const commandChar = await service.getCharacteristic(Vernier.COMMAND_UUID);
      const responseChar = await service.getCharacteristic(Vernier.RESPONSE_UUID);
      
      // Start notifications on the response characteristic
      console.log('Starting notifications on response characteristic...');
      await responseChar.startNotifications();
      
      // Set up listener for incoming data from the respiration belt
      console.log('Setting up data listener for respiration measurements...');
      
      // Handle incoming sensor data according to the Vernier documentation
      responseChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = event.target.value;
        if (!dataView) return;
        
        try {
          // Convert to Uint8Array for easier processing
          const rawBytes = new Uint8Array(dataView.buffer);
          
          // Create debug hex representation for logging
          const hexDump = Vernier.createHexDump(rawBytes);
          
          // Log the complete raw data for analysis
          console.log('COMPLETE RAW DATA:', Array.from(rawBytes));
          console.log('HEX DATA:', hexDump);
          
          // Parse incoming data according to the Vernier protocol
          console.log(`Packet length: ${rawBytes.length} bytes`);
          
          if (rawBytes.length === 0) return;
          
          const packetType = rawBytes[0];
          console.log(`Packet type: 0x${packetType.toString(16)}`);
          
          // Store raw data for debugging purposes
          localStorage.setItem('latestRawBytes', hexDump);
          
          // Process measurement data (type 0x01)
          if (packetType === Vernier.RESPONSE_TYPES.MEASUREMENT && rawBytes.length >= 7) {
            console.log('Processing measurement packet');
            
            // Look for force reading in the expected position first (byte 3)
            const forceReading = Vernier.extractForceReading(dataView);
            
            if (forceReading !== null) {
              // We found a valid force reading
              const normalizedReading = Vernier.normalizeForceReading(forceReading);
              console.log(`Force reading: ${normalizedReading.toFixed(4)}N (original: ${forceReading.toFixed(4)}N)`);
              
              // Store the reading for visualization
              localStorage.setItem('latestBreathReading', normalizedReading.toString());
              localStorage.setItem('latestBreathTimestamp', Date.now().toString());
              
              // Detect breathing phase
              const prevReading = parseFloat(localStorage.getItem('prevBreathReading') || '0');
              if (normalizedReading > prevReading) {
                localStorage.setItem('breathPhase', 'inhale');
                console.log(`BREATH PHASE: INHALING (${prevReading.toFixed(3)} → ${normalizedReading.toFixed(3)})`);
              } else {
                localStorage.setItem('breathPhase', 'exhale');
                console.log(`BREATH PHASE: EXHALING (${prevReading.toFixed(3)} → ${normalizedReading.toFixed(3)})`);
              }
              localStorage.setItem('prevBreathReading', normalizedReading.toString());
              
              // Calculate breathing rate when phase changes
              const lastPhaseChange = parseInt(localStorage.getItem('lastPhaseChangeTime') || '0');
              const currentTime = Date.now();
              const currentPhase = localStorage.getItem('breathPhase');
              const lastPhase = localStorage.getItem('lastPhase') || '';
              
              if (currentPhase !== lastPhase) {
                // Store this phase change
                localStorage.setItem('lastPhase', currentPhase || '');
                
                if (lastPhaseChange > 0) {
                  // Time between phase changes
                  const timeDiff = currentTime - lastPhaseChange; // ms
                  
                  // Calculate breaths per minute (one breath = inhale + exhale)
                  const breathRate = 60000 / (timeDiff * 2); // ms to minutes, 2 phase changes = 1 breath
                  
                  // Only use realistic breath rates
                  if (breathRate >= 4 && breathRate <= 30) {
                    console.log(`BREATH RATE: ${breathRate.toFixed(1)} breaths/min`);
                    localStorage.setItem('breathingRate', breathRate.toString());
                  }
                }
                
                // Remember this phase change time
                localStorage.setItem('lastPhaseChangeTime', currentTime.toString());
              }
            } else {
              // If we couldn't find a reading in the expected position, scan the packet
              console.log('Standard force reading not found, scanning packet...');
              const possibleReadings = Vernier.scanForForceReadings(dataView);
              
              if (possibleReadings.length > 0) {
                // Use the largest reading found
                const bestReading = Math.max(...possibleReadings);
                const normalizedReading = Vernier.normalizeForceReading(bestReading);
                
                console.log(`Found alternate force reading: ${normalizedReading.toFixed(4)}N`);
                localStorage.setItem('latestBreathReading', normalizedReading.toString());
                localStorage.setItem('latestBreathTimestamp', Date.now().toString());
              } else {
                console.log('No valid force readings found in packet');
              }
            }
          }
          // Process device info response
          else if (packetType === Vernier.RESPONSE_TYPES.DEVICE_INFO) {
            console.log('Received device info response');
          }
          // Process sensor list response
          else if (packetType === Vernier.RESPONSE_TYPES.SENSOR_LIST) {
            console.log('Received sensor list response');
            if (rawBytes.length > 1) {
              console.log(`Available sensors: ${rawBytes[1]}`);
            }
          }
        } catch (error) {
          console.error('Error processing incoming data:', error);
        }
      });
      
      // Setup response handlers for device disconnect
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected');
        localStorage.setItem('breathDeviceConnected', 'false');
      });
      
      // Initialize the device using the documented Vernier protocol
      console.log('Initializing Vernier Go Direct Respiration Belt...');
      
      // STEP 1: Reset the device to ensure clean state
      console.log('Step 1: Resetting device...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.RESET]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 2: Get device info
      console.log('Step 2: Getting device info...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_DEVICE_INFO]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 3: Get sensor list
      console.log('Step 3: Getting sensor list...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_SENSOR_LIST]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 4: Enable the Force sensor (channel 1)
      console.log('Step 4: Enabling force sensor (channel 1)...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.ENABLE_SENSOR, 0x01, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 5: Set sampling rate to 20Hz
      console.log('Step 5: Setting sampling rate to 20Hz...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.SET_SAMPLE_RATE, 0x32, 0x00]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // STEP 6: Start measurements
      console.log('Step 6: Starting measurements...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.START_MEASUREMENTS, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Use a keepalive to ensure the connection stays active
      const keepaliveInterval = setInterval(async () => {
        try {
          await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.KEEP_ALIVE]));
        } catch (e) {
          console.error('Error sending keepalive to belt:', e);
          clearInterval(keepaliveInterval);
        }
      }, 2000);
      
      // Store connection info
      localStorage.setItem('breathDeviceConnected', 'true');
      localStorage.setItem('breathDataSource', 'real');
      localStorage.setItem('breathDeviceName', device.name || 'Respiration Belt');
      
      console.log('Successfully connected to Vernier respiration belt!');
      setIsConnecting(false);
      
      // Navigate to the breath kasina page after successful connection
      // Use the correct path that matches our router configuration
      navigate('/breath-kasina');
    } catch (error) {
      console.error('Error connecting to Vernier device:', error);
      setIsConnecting(false);
      alert("Failed to connect to the respiration belt. Please try again.");
    }
  };

  return (
    <Button 
      onClick={connectToDevice}
      disabled={isConnecting}
      className="bg-blue-600 hover:bg-blue-700 text-white w-full py-6 mt-4"
    >
      {isConnecting ? "Connecting..." : "Connect to Respiration Belt"}
    </Button>
  );
};

export default VernierConnect;