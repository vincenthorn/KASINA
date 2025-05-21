import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import * as Vernier from '@/lib/vernierProtocol';
import { useAuth } from '@/lib/stores/useAuth';

const BreathPage = () => {
  const navigate = useNavigate();
  const { user, isPremium, isAdmin } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Check access permissions - redirect non-premium users
  useEffect(() => {
    if (!(isPremium || isAdmin)) {
      navigate('/');
    }
  }, [isPremium, isAdmin, navigate]);

  // Add a log entry with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, `${timestamp}: ${message}`].slice(-20)); // Keep last 20 logs
  };

  // Connect to the Vernier respiration belt
  const connectToRespirationBelt = async () => {
    // Clear previous errors
    setConnectionError(null);
    setIsConnecting(true);
    addLog('Starting connection to respiration belt...');

    try {
      // Check if Web Bluetooth is supported
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge on desktop, or Chrome on Android.');
      }

      // Request device with Vernier Go Direct respiration belt filter
      addLog('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX-RB' }, // Vernier Go Direct Respiration Belt
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
      
      // Set up listener for incoming data with exact logging format
      addLog('Setting up data listener for respiration measurements...');
      
      // Set up event listener for incoming data from the sensor
      responseChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const dataView = event.target.value;
        if (!dataView) return;
        
        try {
          // Log the raw data exactly as requested
          console.log('✅ Raw data received:', new Uint8Array(event.target.value.buffer));
          
          // For UI display, also log in hex format
          const raw = new Uint8Array(dataView.buffer);
          const hexInfo = Array.from(raw).map(b => "0x" + b.toString(16).padStart(2, '0')).join(', ');
          addLog(`✅ Raw data received: [${hexInfo}]`);
          
          // Extract and decode force value if possible
          const forceValue = Vernier.decodeForceValue(raw);
          if (forceValue !== null) {
            addLog(`Force reading: ${forceValue.toFixed(2)} N`);
            
            // Store in localStorage for use by BreathKasinaPage
            localStorage.setItem('latestBreathReading', forceValue.toString());
            localStorage.setItem('latestBreathTimestamp', Date.now().toString());
            localStorage.setItem('breathDataSource', 'real');
          }
          
          // As we're receiving data, set a flag that real data is available
          localStorage.setItem('realDataAvailable', 'true');
        } catch (error) {
          console.error('Error processing breath data:', error);
        }
      });
      
      // Start notifications on the response characteristic
      addLog('Starting notifications on response characteristic...');
      await responseChar.startNotifications();
      
      // Using the most direct approach to the Go Direct protocol based on their documentation
      // This follows the exact initialization sequence required for Vernier Go Direct devices
      addLog('Initializing Vernier Go Direct Respiration Belt with direct protocol...');
      
      // Step 1: Read device information
      addLog('Step 1: Reading device information');
      await commandChar.writeValue(new Uint8Array([0x55])); // Get device info command
      await new Promise(resolve => setTimeout(resolve, 1000)); // Longer wait for complete response
      
      try {
        const deviceInfo = await responseChar.readValue();
        console.log('Device info response:', new Uint8Array(deviceInfo.buffer));
        addLog('Successfully read device information');
      } catch (e) {
        console.warn('Could not read device info, continuing anyway');
      }
      
      // Step 2: Reset the device to ensure clean state
      addLog('Step 2: Resetting device');
      await commandChar.writeValue(new Uint8Array([0x00])); // Reset command
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Get sensor list
      addLog('Step 3: Getting sensor list...');
      await commandChar.writeValue(new Uint8Array([Vernier.COMMANDS.GET_SENSOR_LIST]));
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 4: Send the activation command (as provided in the documentation)
      addLog('Step 4: Sending the activation command specified in the documentation...');
      
      // Send the specific activation command from the documentation
      const enableSensorCommand = new Uint8Array([
        0x58, 0x19, 0xFE, 0x3F, 0x1A, 0xA5, 0x4A, 0x06,
        0x49, 0x07, 0x48, 0x08, 0x47, 0x09, 0x46, 0x0A,
        0x45, 0x0B, 0x44, 0x0C, 0x43, 0x0D, 0x42, 0x0E, 0x41
      ]);
      await commandChar.writeValue(enableSensorCommand);
      addLog('Sent activation command to device');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 5: Enable sensor channel 1 (force sensor is typically on channel 1)
      addLog('Step 5: Enabling force sensor...');
      await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 6: Start measurements
      addLog('Step 6: Starting measurements...');
      // 0x18 = Start measurements command, 0x01 = Sensor mask for channel 1
      await commandChar.writeValue(new Uint8Array([0x18, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 7: Directly request a reading to test if the device is responding
      addLog('Step 7: Requesting initial reading');
      // This forces an immediate reading to check if everything is working
      await commandChar.writeValue(new Uint8Array([0x07, 0x01]));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Store device connection info
      localStorage.setItem('breathBluetoothDevice', device.id);
      localStorage.setItem('breathDataSource', 'real');
      
      // Record connection timestamp for synchronizing visualizations
      localStorage.setItem('connectionTimestamp', Date.now().toString());
      
      // Store device name for display
      if (device.name) {
        localStorage.setItem('breathDeviceName', device.name);
      }
      
      // Initialize data storage
      localStorage.setItem('latestBreathReading', '0');
      localStorage.setItem('latestBreathTimestamp', Date.now().toString());
      
      // Real connection is successful!
      setIsConnected(true);
      
      // Navigate to the breath kasina experience
      navigate('/breath-kasina');
      return;

    } catch (error) {
      console.error('Error connecting to respiration belt:', error);
      
      // Set appropriate error message based on the type of error
      if (error instanceof DOMException && error.name === 'NotFoundError') {
        setConnectionError('No compatible respiration belt found. Make sure your device is powered on and in range.');
      } else if (error instanceof DOMException && error.name === 'SecurityError') {
        setConnectionError('Bluetooth permission denied. Please allow Bluetooth access and try again.');
      } else if (error instanceof DOMException && error.name === 'NetworkError') {
        setConnectionError('Connection lost. The device may have powered off or moved out of range.');
      } else {
        setConnectionError(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      addLog(`❌ Connection error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Breath Kasina</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect your Vernier Go Direct Respiration Belt to measure your breathing 
            and create dynamic kasina visualizations that respond to your breath in real-time.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Connect Respiration Belt</CardTitle>
              <CardDescription>
                Pair with a Vernier Go Direct Respiration Belt to begin your breath-responsive meditation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img 
                    src="/images/respiration-belt.jpg" 
                    alt="Vernier Go Direct Respiration Belt" 
                    className="max-h-60 rounded-lg object-contain"
                    onError={(e) => {
                      // Fallback if image isn't available
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                
                <div className="p-4 bg-blue-50 rounded-md border border-blue-200 text-blue-800">
                  <h3 className="font-medium mb-2">How it works:</h3>
                  <p>
                    The respiration belt measures the expansion of your abdomen or chest as you breathe.
                    This data is sent wirelessly to create a visualization that expands and contracts with your breath.
                  </p>
                  <ul className="list-disc ml-5 mt-2 text-sm">
                    <li>Put the belt around your abdomen below the ribcage</li>
                    <li>Ensure the belt is snug but comfortable</li>
                    <li>Look for the green LED indicator on the device</li>
                    <li>Click "Connect Belt" below and select your device</li>
                  </ul>
                </div>

                {connectionError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
                    <p className="font-medium">Connection Error</p>
                    <p className="text-sm">{connectionError}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-4">
              <Button 
                onClick={connectToRespirationBelt} 
                disabled={isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
              >
                {isConnecting ? 'Connecting...' : 'Connect Respiration Belt'}
              </Button>
              
              {logs.length > 0 && (
                <div className="mt-4 w-full">
                  <details>
                    <summary className="cursor-pointer text-sm text-gray-600 mb-2">Connection Log</summary>
                    <div className="bg-gray-100 p-3 rounded text-xs font-mono text-gray-800 max-h-40 overflow-y-auto">
                      {logs.map((log, index) => (
                        <div key={index} className="pb-1">{log}</div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default BreathPage;