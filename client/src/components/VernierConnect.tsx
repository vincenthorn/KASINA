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
    
    // Track when we receive actual data packets for debugging
    console.log(`Data packet received at: ${new Date().toISOString()}`);
    
    // Look for patterns in the data to help understand the format
    if (bytes.length > 1) {
      // The second byte (index 1) often contains the primary sensor reading in Vernier devices
      console.log(`Key sensor byte value: ${bytes[1]} (${(bytes[1]/255).toFixed(4)})`);
    }
    
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
    
    // Set a timeout to cancel the operation if it takes too long
    const connectionTimeout = setTimeout(() => {
      if (isLoading) {
        setError("Connection timed out. Please try again.");
        setIsLoading(false);
      }
    }, 15000); // 15 second timeout
    
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
      
      // Check if device was selected or the dialog was closed
      if (!device) {
        throw new Error('No device selected');
      }
      
      if (!isRespirationBelt(device)) {
        throw new Error('Selected device is not a respiration belt');
      }
      
      setDeviceInfo(`${device.name || 'Unknown'} (${device.id})`);
      setDevice(device);
      
      // Set up disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        console.log('Device disconnected event');
        onDisconnect();
        setDevice(null);
        setResponseCharacteristic(null);
        setDeviceInfo(null);
      });
      
      // Add a more specific timeout for the GATT connection
      const connectPromise = device.gatt.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timed out')), 10000)
      );
      
      // Connect to GATT server with timeout
      console.log('Connecting to GATT server...');
      const server = await Promise.race([connectPromise, timeoutPromise]);
      
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
      
      // Clear the timeout as we've successfully connected
      clearTimeout(connectionTimeout);
      
      // Properly set up notifications on the response characteristic
      console.log('Setting up response notifications...');
      
      // First, enable notifications via standard method
      await responseCharacteristic.startNotifications();
      console.log('Standard notifications enabled');
      
      // Also try using the CCCD descriptor directly (belt and suspenders approach)
      try {
        const descriptor = await responseCharacteristic.getDescriptor('00002902-0000-1000-8000-00805f9b34fb');
        if (descriptor) {
          await descriptor.writeValue(new Uint8Array([0x01, 0x00]));
          console.log('✅ Notification descriptor explicitly enabled');
        }
      } catch (error) {
        console.log('Note: Could not use descriptor method, continuing with standard notifications');
      }
      
      // Add event listener for notifications
      responseCharacteristic.addEventListener('characteristicvaluechanged', handleNotification);
      console.log('✅ Event listener added for notifications');
      
      // IMPROVED ACTIVATION SEQUENCE - Based on Vernier protocol
      console.log('Starting Vernier activation sequence...');
      
      // 1. First, send the primary enable command
      await commandCharacteristic.writeValue(COMMANDS.ENABLE_SENSOR);
      console.log('✅ Primary sensor enable command sent');
      
      // Wait for device to process
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 2. Send start measurements command
      await commandCharacteristic.writeValue(COMMANDS.START_MEASUREMENTS);
      console.log('✅ Start measurements command (0x01, 0x0A) sent');
      
      // Wait for device to process
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 3. Send basic activation command to ensure data stream
      await commandCharacteristic.writeValue(COMMANDS.ACTIVATE_DATA_STREAM);
      console.log('✅ Basic data stream activation (0x01, 0x01) sent');
      
      // 4. Check for any incoming data to verify connection is working
      console.log('⏳ Waiting for data transmission to begin...');
      
      // Set a flag to avoid endless attempts to fix connection
      let autoRecoveryAttempted = false;
      
      // Set a timestamp for the first connection
      const connectionStartTime = Date.now();
      
      // Set up a ONE-TIME check after 5 seconds to verify we're getting data
      const initialDataCheck = setTimeout(async () => {
        try {
          if (device && device.gatt.connected && !autoRecoveryAttempted) {
            console.log('Performing one-time data flow check...');
            
            // Only attempt recovery once
            autoRecoveryAttempted = true;
            
            // If no data received in first 5 seconds, try restart with the simple command
            await commandCharacteristic.writeValue(COMMANDS.START_MEASUREMENTS);
            console.log('Sent restart measurement command as precaution');
          }
        } catch (error) {
          console.error('Error in initial data check:', error);
        }
      }, 5000);
      
      // Store for cleanup
      (window as any).initialDataCheck = initialDataCheck;
      
      // Notify parent component of successful connection
      onConnect(device, responseCharacteristic);
      
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for common Bluetooth errors and provide user-friendly messages
      let userFriendlyMessage = errorMessage;
      
      if (errorMessage.includes("already connected") || 
          errorMessage.includes("with this ID") ||
          errorMessage.includes("connecting to GATT server") ||
          errorMessage.includes("another app")) {
        userFriendlyMessage = "⚠️ This respiration belt is already connected to another app! Please close nRF Connect or any other Bluetooth apps, then try again.";
      } else if (errorMessage.includes("timeout")) {
        userFriendlyMessage = "⚠️ Connection timed out. Make sure your respiration belt is turned on, charged, and nearby.";
      } else if (errorMessage.includes("cancelled")) {
        userFriendlyMessage = "Bluetooth connection was cancelled.";
      } else if (errorMessage.includes("Bluetooth")) {
        userFriendlyMessage = `⚠️ Bluetooth error: ${errorMessage}`;
      }
      
      // Show the user-friendly error message
      setError(userFriendlyMessage);
      
      // Also display in an alert for high visibility of critical errors
      if (userFriendlyMessage.includes("⚠️")) {
        alert(userFriendlyMessage);
      }
      
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
        // Clear all intervals and timeouts we might have created
        if ((window as any).connectionRefreshInterval) {
          clearInterval((window as any).connectionRefreshInterval);
          console.log('Connection refresh interval cleared');
        }
        
        if ((window as any).dataMonitorInterval) {
          clearInterval((window as any).dataMonitorInterval);
          console.log('Data monitor interval cleared');
        }
        
        if ((window as any).initialDataCheck) {
          clearTimeout((window as any).initialDataCheck);
          console.log('Initial data check timeout cleared');
        }
        
        // Stop notifications if characteristic is available
        if (responseCharacteristic) {
          try {
            // First try to disable notifications via the standard method
            await responseCharacteristic.stopNotifications();
            console.log('Notifications stopped');
            
            // Remove any event listeners
            responseCharacteristic.removeEventListener('characteristicvaluechanged', handleNotification);
          } catch (e) {
            console.error('Error stopping notifications:', e);
          }
        }
        
        // Force disconnect from the device
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
    } else {
      // Clean up even if we think we're already disconnected
      console.log('Device already disconnected or not connected');
      setDevice(null);
      setResponseCharacteristic(null);
      setDeviceInfo(null);
      onDisconnect();
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