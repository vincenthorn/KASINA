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
      
      // Properly set up notifications on the response characteristic
      console.log('Setting up response notifications...');
      
      // From the nRF Connect logs, we can see the B41E6675 characteristic has a CCCD descriptor
      // We need to explicitly enable notifications through this descriptor
      console.log('Enabling notification descriptor...');
      try {
        // Get the Client Characteristic Configuration Descriptor (CCCD)
        // The CCCD has a standard UUID of 0x2902
        const descriptor = await responseCharacteristic.getDescriptor('00002902-0000-1000-8000-00805f9b34fb');
        
        // Enable notifications by writing 0x0100 (little endian for notification bit)
        await descriptor.writeValue(new Uint8Array([0x01, 0x00]));
        console.log('✅ Notification descriptor explicitly enabled');
      } catch (err) {
        console.log('Could not find CCCD descriptor, falling back to standard method:', err);
        // Fall back to the standard method
        await responseCharacteristic.startNotifications();
      }
      
      // Add event listener to handle incoming data
      responseCharacteristic.addEventListener('characteristicvaluechanged', handleNotification);
      console.log('✅ Event listener added for notifications');
      
      // Send the activation command sequence
      console.log('Starting activation command sequence...');
      
      // First activation command from the protocol - this is the main one
      await commandCharacteristic.writeValue(COMMANDS.ENABLE_SENSOR);
      console.log('✅ Primary activation command sent');
      
      // Wait for device to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send start measurements command to begin data flow
      await commandCharacteristic.writeValue(COMMANDS.START_MEASUREMENTS);
      console.log('✅ Start measurements command sent');
      
      // Wait for device to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start a monitor to detect if we're receiving data
      let lastDataReceived = Date.now();
      const dataMonitorInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastDataReceived;
        
        if (elapsed > 3000) {
          console.log(`⚠️ No data received in ${Math.round(elapsed/1000)}s, sending refresh command...`);
          
          // Try sending another command to stimulate data flow
          if (commandCharacteristic && device.gatt.connected) {
            commandCharacteristic.writeValue(COMMANDS.START_CONTINUOUS)
              .then(() => console.log('Refresh command sent successfully'))
              .catch(err => console.error('Error sending refresh command:', err));
          }
          
          // Update timestamp to avoid too many refreshes
          lastDataReceived = now - 2000; 
        }
      }, 5000);
      
      // Store for cleanup
      (window as any).dataMonitorInterval = dataMonitorInterval;
      
      // Wrap the notification handler to update the last data timestamp
      const originalHandler = handleNotification;
      const wrappedHandler = (event: any) => {
        // Update timestamp
        lastDataReceived = Date.now();
        // Call original handler
        originalHandler(event);
      };
      
      // Replace the event listener with our wrapped version
      responseCharacteristic.removeEventListener('characteristicvaluechanged', handleNotification);
      responseCharacteristic.addEventListener('characteristicvaluechanged', wrappedHandler);
      
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
        // Clear all intervals we might have created
        if ((window as any).connectionRefreshInterval) {
          clearInterval((window as any).connectionRefreshInterval);
          console.log('Connection refresh interval cleared');
        }
        
        if ((window as any).dataMonitorInterval) {
          clearInterval((window as any).dataMonitorInterval);
          console.log('Data monitor interval cleared');
        }
        
        // Stop notifications if characteristic is available
        if (responseCharacteristic) {
          try {
            // First, disable notifications via descriptor if possible
            try {
              const descriptor = await responseCharacteristic.getDescriptor('00002902-0000-1000-8000-00805f9b34fb');
              if (descriptor) {
                // Write 0x0000 to disable notifications
                await descriptor.writeValue(new Uint8Array([0x00, 0x00]));
                console.log('Notifications disabled via descriptor');
              }
            } catch (descriptorError) {
              console.log('Could not disable via descriptor, using standard method');
            }
            
            // Then use the standard method
            await responseCharacteristic.stopNotifications();
            console.log('Notifications stopped');
            
            // Remove event listeners
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