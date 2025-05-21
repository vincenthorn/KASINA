import React, { useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { 
  COMMANDS, 
  VERNIER_SERVICE_UUID, 
  COMMAND_CHARACTERISTIC_UUID, 
  RESPONSE_CHARACTERISTIC_UUID, 
  formatBytes, 
  isRespirationBelt 
} from '../lib/vernierProtocol';
import { AlertCircle, Bluetooth, CheckCircle2 } from 'lucide-react';

interface VernierConnectProps {
  onConnect: (device: any, characteristic: any) => void;
  onDisconnect: () => void;
  onDataReceived?: (data: Uint8Array) => void;
  isConnected: boolean;
}

const VernierConnect: React.FC<VernierConnectProps> = ({
  onConnect,
  onDisconnect,
  onDataReceived,
  isConnected
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<string | null>(null);
  const [device, setDevice] = useState<any | null>(null);
  const [responseCharacteristic, setResponseCharacteristic] = useState<any | null>(null);

  // Handle notifications from the device
  const handleNotification = useCallback((event: any) => {
    const value = event.target.value;
    const bytes = new Uint8Array(value.buffer);
    
    console.log('✅ Raw BLE data received:', formatBytes(bytes));
    
    // Pass data to parent if callback provided
    if (onDataReceived) {
      onDataReceived(bytes);
    }
  }, [onDataReceived]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (device && device.gatt.connected) {
        try {
          device.gatt.disconnect();
          console.log('Disconnected from device on unmount');
        } catch (error) {
          console.error('Error disconnecting:', error);
        }
      }
    };
  }, [device]);

  // Connect to Vernier Go Direct device
  const connectToDevice = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser');
      }
      
      // Request device with name starting with GDX-RB (Respiration Belt)
      console.log('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX-RB' }, // Vernier Go Direct Respiration Belt
        ],
        optionalServices: [VERNIER_SERVICE_UUID]
      });
      
      if (!isRespirationBelt(device)) {
        throw new Error('Selected device is not a respiration belt');
      }
      
      setDeviceInfo(`${device.name || 'Unknown'} (${device.id})`);
      setDevice(device);
      
      // Connect to GATT server
      console.log('Connecting to GATT server...');
      const server = await device.gatt.connect();
      
      // Get primary service
      console.log('Getting primary service...');
      const service = await server.getPrimaryService(VERNIER_SERVICE_UUID);
      
      // Get command characteristic
      console.log('Getting command characteristic...');
      const commandCharacteristic = await service.getCharacteristic(COMMAND_CHARACTERISTIC_UUID);
      
      // Get response characteristic
      console.log('Getting response characteristic...');
      const responseCharacteristic = await service.getCharacteristic(RESPONSE_CHARACTERISTIC_UUID);
      setResponseCharacteristic(responseCharacteristic);
      
      // Set up notifications on the response characteristic
      console.log('Starting notifications...');
      await responseCharacteristic.startNotifications();
      responseCharacteristic.addEventListener('characteristicvaluechanged', handleNotification);
      
      // Send activation command to the command characteristic
      console.log('Sending activation command to device...');
      await commandCharacteristic.writeValue(COMMANDS.ENABLE_SENSOR);
      console.log("✅ Sensor activation command sent");
      
      // Notify parent component of successful connection
      onConnect(device, responseCharacteristic);
      
    } catch (error) {
      console.error('Connection error:', error);
      setError(error instanceof Error ? error.message : String(error));
      console.warn("⚠️ No BLE data received. Is your belt already connected to another app?");
      
      // Clean up any partial connection
      if (device && device.gatt.connected) {
        try {
          device.gatt.disconnect();
        } catch (e) {
          console.error('Error during cleanup:', e);
        }
      }
      
      setDevice(null);
      setResponseCharacteristic(null);
      setDeviceInfo(null);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from device
  const disconnectDevice = async () => {
    if (device && device.gatt.connected) {
      try {
        // Stop notifications if characteristic is available
        if (responseCharacteristic) {
          try {
            await responseCharacteristic.stopNotifications();
            responseCharacteristic.removeEventListener('characteristicvaluechanged', handleNotification);
          } catch (e) {
            console.error('Error stopping notifications:', e);
          }
        }
        
        // Disconnect from the device
        device.gatt.disconnect();
        console.log('Disconnected from device');
        
        // Reset state
        setDevice(null);
        setResponseCharacteristic(null);
        setDeviceInfo(null);
        
        // Notify parent
        onDisconnect();
        
      } catch (error) {
        console.error('Disconnect error:', error);
        setError(error instanceof Error ? error.message : String(error));
      }
    }
  };

  return (
    <div className="space-y-2">
      {!isConnected ? (
        <Button
          variant="default"
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          onClick={connectToDevice}
          disabled={isLoading}
        >
          <Bluetooth className="w-4 h-4" />
          {isLoading ? 'Connecting...' : 'Connect Belt'}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="bg-red-700 hover:bg-red-800 border-red-600 flex items-center gap-2"
          onClick={disconnectDevice}
        >
          <Bluetooth className="w-4 h-4" />
          Disconnect
        </Button>
      )}
      
      {deviceInfo && (
        <div className="flex items-center gap-2 text-sm text-green-500">
          <CheckCircle2 className="w-4 h-4" />
          <span>{deviceInfo}</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default VernierConnect;