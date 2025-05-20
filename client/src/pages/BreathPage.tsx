import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/stores/useAuth';
import { Wind, Activity, Crown, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';

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
      
      // Real Web Bluetooth API connection - This will show a device picker dialog
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          // Accept all devices - will show a picker for user to select from
          acceptAllDevices: true,
          // Optionally filter for specific devices
          // filters: [{ namePrefix: 'Go Direct' }],
          optionalServices: [
            '0000180f-0000-1000-8000-00805f9b34fb', // Standard Battery Service
            '00001809-0000-1000-8000-00805f9b34fb', // Health Thermometer
            '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
            '00001801-0000-1000-8000-00805f9b34fb'  // Generic Attribute
            // We'd add actual Vernier service UUIDs in production
          ]
        });
        
        console.log('Device selected:', device.name || 'Unknown device');
        
        // Attempt to connect to the device
        console.log('Connecting to GATT server...');
        const server = await device.gatt?.connect();
        
        if (server) {
          console.log('Connected to GATT server');
          
          // Store the device and server in localStorage to maintain connection data
          localStorage.setItem('breathBluetoothDevice', device.id);
          // Mark that we're using real data
          localStorage.setItem('breathDataSource', 'real');
          
          // In a production app, we would:
          // 1. Get the specific service for the Vernier Respiration Belt
          // 2. Get the characteristic that provides the respiration data
          // 3. Start notifications on that characteristic
          
          // For now, we'll proceed as if connection was successful
          setIsConnected(true);
          
          // Navigate to the breath kasina experience
          navigate('/breath/kasina');
          
          return;
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
      navigate('/breath/kasina');
      
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