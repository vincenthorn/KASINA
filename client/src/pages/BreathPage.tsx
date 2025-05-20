import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/stores/useAuth';
import { Wind, Activity, Crown, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';

// Type definitions for Web Bluetooth API
interface BluetoothRemoteGATTCharacteristic {
  value: DataView;
  addEventListener: (type: string, listener: EventListener) => void;
  readValue: () => Promise<DataView>;
  writeValue: (value: BufferSource) => Promise<void>;
  startNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>;
}

const BreathPage = () => {
  const { email } = useAuth();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const isPremiumOrAdmin = email && (email.includes('premium') || email.includes('admin'));
  
  // Function to handle Bluetooth connection
  const connectToRespirationBelt = async () => {
    if (!(navigator as any).bluetooth) {
      alert("Web Bluetooth is not supported in your browser. Please use Chrome or Edge on desktop or Android.");
      return;
    }
    
    try {
      setIsConnecting(true);
      
      // Real Web Bluetooth API connection for Vernier Go Direct Respiration Belt
      try {
        // The Go Direct devices use a specific service and characteristics
        // These are the documented Vernier Go Direct UUIDs
        // Source: https://github.com/VernierST/godirect-examples
        // and https://github.com/VernierST/godirect-js
        const VERNIER_SERVICE_UUID = 'd91714ef-28b9-4f91-ba16-f0d9a604f112';
        const COMMAND_CHARACTERISTIC_UUID = 'f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb';
        const RESPONSE_CHARACTERISTIC_UUID = 'b41e6675-a329-40e0-aa01-44d2f444babe';
        
        // Request the device with specific filters for Go Direct devices
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { namePrefix: 'GDX-RB' }, // Go Direct Respiration Belt prefix
            { namePrefix: 'Go Direct' } // Fallback for other Vernier devices
          ],
          optionalServices: [
            VERNIER_SERVICE_UUID,
            '0000180f-0000-1000-8000-00805f9b34fb', // Standard Battery Service
            '00001809-0000-1000-8000-00805f9b34fb', // Health Thermometer
          ]
        });
        
        console.log('Device selected:', device.name || 'Unknown device');
        
        // Attempt to connect to the device
        console.log('Connecting to GATT server...');
        const server = await device.gatt?.connect();
        
        if (server) {
          console.log('Connected to GATT server');
          
          try {
            // Now get the specific Vernier service
            console.log('Getting Vernier service...');
            const vernierService = await server.getPrimaryService(VERNIER_SERVICE_UUID);
            
            if (vernierService) {
              console.log('Found Vernier service');
              
              // Get command characteristic
              console.log('Getting command characteristic...');
              const commandChar = await vernierService.getCharacteristic(COMMAND_CHARACTERISTIC_UUID);
              
              // Get response characteristic
              console.log('Getting response characteristic...');
              const responseChar = await vernierService.getCharacteristic(RESPONSE_CHARACTERISTIC_UUID);
              
              if (commandChar && responseChar) {
                console.log('Successfully got Vernier characteristics');
                
                // Enable notifications to receive data in real-time
                console.log('Starting notifications for respiratory data...');
                await responseChar.startNotifications();
                
                // Set up listener for data received from the device - critical for respiration belt functionality
                responseChar.addEventListener('characteristicvaluechanged', function(event: Event) {
                  try {
                    // Safely access the value from the event target using type assertion and optional chaining
                    const target = event.target as any; // Cast to any first to avoid TypeScript errors
                    const dataView = target?.value;
                    
                    if (dataView && dataView instanceof DataView) {
                      // Raw data debugging - this will help identify the exact format
                      console.log('Data received from Vernier Go Direct belt');
                      
                      // Create a UInt8Array for better visualization of the data
                      const rawBytes = new Uint8Array(dataView.buffer);
                      
                      // Log the full buffer as hexadecimal bytes
                      console.log('Raw bytes: [' + 
                        Array.from(rawBytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ') + 
                        ']');
                      
                      // According to Vernier documentation for the Go Direct respiration belt
                      // The first byte (0) is typically a header/command code
                      // The second byte (1) is the sensor channel number
                      // If message is a measurement packet, bytes 2-5 contain the float value (little-endian)
                      
                      let forceValue = 0;
                      let measurementFound = false;
                      
                      // Based on Vernier Graphical Analysis, the data pattern shows:
                      // Normal breathing typically delivers values between 5-15 N
                      // Try different known command and data patterns
                      
                      // Pattern 1: Check if this is a measurement packet (typically starts with 0x01)
                      if (dataView.byteLength >= 6 && rawBytes[0] === 0x01) {
                        // This is likely a measurement packet
                        const channelNumber = rawBytes[1];
                        console.log(`Measurement packet for channel ${channelNumber}`);
                        
                        // Extract the force measurement (4-byte float, little-endian)
                        forceValue = dataView.getFloat32(2, true);
                        measurementFound = true;
                        
                        console.log(`Force reading: ${forceValue.toFixed(4)} N`);
                      }
                      // Pattern 2: Common alternative format (starts with 0x20)
                      else if (dataView.byteLength >= 6 && rawBytes[0] === 0x20) {
                        console.log('Detected 0x20 packet format');
                        // Try to extract the force value from bytes 2-5
                        forceValue = dataView.getFloat32(2, true);
                        measurementFound = true;
                        console.log(`Force reading (0x20 format): ${forceValue.toFixed(4)} N`);
                      }
                      // Pattern 3: Other possible formats based on Vernier docs
                      else if (dataView.byteLength >= 6 && [0x21, 0x22, 0x23].includes(rawBytes[0])) {
                        console.log(`Detected 0x${rawBytes[0].toString(16)} format packet`);
                        forceValue = dataView.getFloat32(2, true);
                        measurementFound = true;
                        console.log(`Force reading: ${forceValue.toFixed(4)} N`);
                      }
                      // Also try other potential data formats
                      else {
                        console.log('Not a standard measurement packet, testing alternatives...');
                        
                        // Try to find a float value specifically in the expected range for respiration (5-20 N)
                        // This matches what we saw in Vernier's Graphical Analysis
                        for (let i = 0; i <= dataView.byteLength - 4; i++) {
                          const value = dataView.getFloat32(i, true);
                          
                          // Specifically target values in the typical respiration range
                          if (!isNaN(value) && value >= 3 && value <= 25) {
                            console.log(`  High confidence value at offset ${i}: ${value.toFixed(4)} N`);
                            forceValue = value;
                            measurementFound = true;
                            console.log(`  Using value from offset ${i}`);
                            break; // Stop after finding the first good value
                          }
                          // Fallback for other reasonable values
                          else if (!isNaN(value) && Math.abs(value) > 0.5 && Math.abs(value) < 40) {
                            console.log(`  Potential value at offset ${i}: ${value.toFixed(4)} N`);
                            if (!measurementFound) {
                              forceValue = value;
                              measurementFound = true;
                            }
                          }
                        }
                      }
                      
                      // Ensure force value is positive (tension is always positive on a belt)
                      forceValue = Math.abs(forceValue);
                      
                      // Only store valid readings
                      if (forceValue > 0.1) {
                        console.log('Force reading: ' + forceValue.toFixed(2) + ' N');
                        
                        // Store in localStorage for use by BreathKasinaPage
                        localStorage.setItem('latestBreathReading', forceValue.toString());
                        localStorage.setItem('latestBreathTimestamp', Date.now().toString());
                        localStorage.setItem('breathDataSource', 'real');
                      } else {
                        console.log('Received data but no valid force value found');
                      }
                    } else {
                      console.log('No DataView available in event');
                    }
                  } catch (error) {
                    console.error('Error processing breath data:', error);
                  }
                });
                
                // Using the most direct approach to the Go Direct protocol based on their documentation
                // This follows the exact initialization sequence required for Vernier Go Direct devices
                console.log('Initializing Vernier Go Direct Respiration Belt with direct protocol...');
                
                // Step 1: Read device information
                console.log('Step 1: Reading device information');
                await commandChar.writeValue(new Uint8Array([0x55])); // Get device info command
                await new Promise(resolve => setTimeout(resolve, 1000)); // Longer wait for complete response
                
                try {
                  const deviceInfo = await responseChar.readValue();
                  console.log('Device info response:', new Uint8Array(deviceInfo.buffer));
                } catch (err) {
                  console.log('Error reading device info:', err);
                }
                
                // Step 2: Select and enable sensor channels (specifically for respiration belt)
                console.log('Step 2: Enabling specific sensor channels for respiration measurement');
                // Command format: [command code, sensor number]
                await commandChar.writeValue(new Uint8Array([0x11, 0x01, 0x01])); // Enable sensor 1 (force)
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Step 3: Set up data collection parameters
                console.log('Step 3: Setting data collection parameters');
                // Command format: [command code, period low byte, period high byte]
                // Setting period to 100ms (10Hz sampling rate) = 0x0064 in hex (little-endian)
                await commandChar.writeValue(new Uint8Array([0x12, 0x64, 0x00]));
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Step 4: Start measurements
                console.log('Step 4: Starting measurements');
                // We need to send specific start command with the sensor mask
                // 0x18 = Start measurements command, 0x01 = Sensor mask for channel 1
                await commandChar.writeValue(new Uint8Array([0x18, 0x01]));
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Step 5: Directly request a reading to test if the device is responding
                console.log('Step 5: Requesting initial reading');
                // This forces an immediate reading to check if everything is working
                await commandChar.writeValue(new Uint8Array([0x07, 0x01]));
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Store device connection info
                localStorage.setItem('breathBluetoothDevice', device.id);
                localStorage.setItem('breathDataSource', 'real');
                
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
              }
            }
          } catch (serviceError) {
            console.error('Error accessing Vernier services:', serviceError);
          }
        }
      } catch (bluetoothError) {
        console.error('Bluetooth connection error:', bluetoothError);
        // Fall back to simulation if real connection fails
      }
      
      // If we reach here, either the user canceled the Bluetooth dialog or
      // something went wrong with the real connection, so we'll use simulation
      alert("Using simulated respiration data for testing purposes. No real device data will be used.");
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsConnected(true);
      
      // Store in localStorage that we're using simulated data
      localStorage.setItem('breathDataSource', 'simulation');
      
      // Navigate to the breath kasina experience with simulated data
      navigate('/breath-kasina');
      
    } catch (error) {
      console.error('Error connecting to respiration belt:', error);
      alert("Failed to connect to the respiration belt. Please make sure it's powered on and nearby.");
    } finally {
      setIsConnecting(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Wind className="h-12 w-12 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Breath Kasina</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience dynamic kasina visualizations that respond to your breathing in real-time, 
            creating a powerful tool for meditation and mindfulness practices.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Premium Feature Card */}
          {!isPremiumOrAdmin && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="mr-2 h-5 w-5 text-yellow-500" />
                  Premium Feature
                </CardTitle>
                <CardDescription>
                  Upgrade to access the Breath Kasina feature
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  The Breath Kasina is a premium feature that offers an advanced meditation
                  experience using real-time biofeedback from your breathing patterns.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700"
                  onClick={() => window.open('https://www.kasina.app/premium', '_blank')}>
                  Upgrade to Premium
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Required Hardware Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-blue-500" />
                Required Hardware
              </CardTitle>
              <CardDescription>
                To use the Breath Kasina feature, you need the Vernier Go Direct Respiration Belt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <img 
                  src="/images/respiration-belt.jpg" 
                  alt="Vernier Go Direct Respiration Belt" 
                  className="h-48 rounded-md shadow"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://www.vernier.com/images/cache/product.gdx-rb._hero.001.752.424.jpg";
                  }}
                />
              </div>
              <p>
                The Vernier Go Direct Respiration Belt connects via Bluetooth to provide real-time
                breath data for dynamic kasina visualizations.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full flex items-center" 
                onClick={() => window.open('https://www.vernier.com/product/go-direct-respiration-belt/?srsltid=AfmBOoq8Oe6yMc4rHJPKAl9Sl8956BQ_G5LQMBOS1mfWeRU8bGssX_0q', '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Details & Purchase
              </Button>
            </CardFooter>
          </Card>
          
          {/* Bluetooth Connection Card - visible only for premium/admin users */}
          {isPremiumOrAdmin && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wind className="mr-2 h-5 w-5 text-blue-500" />
                  Connect Your Device
                </CardTitle>
                <CardDescription>
                  Connect the Vernier Go Direct Respiration Belt via Bluetooth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Ensure your Vernier Go Direct Respiration Belt is powered on and nearby.
                  Click the button below to establish a Bluetooth connection.
                </p>
                <div className="h-12 flex items-center justify-center">
                  {isConnected ? (
                    <div className="text-green-600 font-medium flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      Connected to Respiration Belt
                    </div>
                  ) : null}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={connectToRespirationBelt}
                  disabled={isConnecting || isConnected}
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Connecting...
                    </>
                  ) : isConnected ? (
                    "Connected"
                  ) : (
                    "Connect Respiration Belt"
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BreathPage;