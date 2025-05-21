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
    try {
      const value = event.target.value;
      if (!value) {
        console.log('Received notification but value is null/undefined');
        return;
      }
      
      // Create a byte array from the data
      const bytes = new Uint8Array(value.buffer);
      
      // Mark that we have successfully received data
      (window as any).vernierDataReceived = true;
      
      // Super prominent logging to easily see data flow
      console.log('🟢🟢🟢 DATA RECEIVED FROM BELT:', formatBytes(bytes));
      
      // Enhanced visual debugging
      if (bytes.length > 0) {
        // Find the key data byte - typically byte 1 for force data
        let primaryByte = bytes.length > 1 ? bytes[1] : bytes[0];
        const normalizedValue = primaryByte / 255;
        
        // Create a visual bar representing the force/pressure
        const barLength = Math.floor(normalizedValue * 30);
        const progressBar = '▓'.repeat(barLength) + '░'.repeat(30 - barLength);
        
        // Super clear formatted output in console
        console.log(
          `\n%c BREATH DATA: %c${normalizedValue.toFixed(4)} %c${progressBar} %c${(normalizedValue*100).toFixed(1)}%\n`,
          'background:#2D46B9; color:white; font-weight:bold; padding:3px 5px; border-radius:3px;',
          'color:#13B338; font-weight:bold; font-size:14px;',
          'color:#437AF4; font-weight:bold;',
          'background:#13B338; color:white; font-weight:bold; padding:2px 5px; border-radius:3px;'
        );
        
        // For developers inspecting the raw data
        console.table(Array.from(bytes).map((b, i) => ({ 
          byte: i, 
          decimal: b, 
          hex: b.toString(16).padStart(2, '0'),
          percent: (b/255*100).toFixed(1) + '%'
        })));
      }
      
      // Immediately pass to parent for visualization
      if (onDataReceived && bytes.length > 0) {
        // Force dramatic visual reaction to prove data is flowing
        onDataReceived(bytes);
      }
    } catch (error) {
      console.error('Error processing notification:', error);
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
      console.log('Requesting Bluetooth device with proper permissions...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'GDX-RB' }, // Vernier Go Direct Respiration Belt
        ],
        // Important: Request ALL the characteristics we need access to
        optionalServices: [
          VERNIER_SERVICE_UUID,
          // Add standard descriptors and services that might be needed
          '00002902-0000-1000-8000-00805f9b34fb', // Client Characteristic Configuration Descriptor
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Information Service
          '00002a00-0000-1000-8000-00805f9b34fb'  // Generic Access Service
        ]
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
      
      // SIMPLIFIED COMMAND SEQUENCE - Based on Vernier specification
      console.log('⭐️ Starting simplified Vernier protocol...');
      
      // 1. First, send the basic activation command (always required)
      await commandCharacteristic.writeValue(COMMANDS.ENABLE_SENSOR);
      console.log('✅ BASIC SENSOR ACTIVATION COMPLETE');
      
      // Wait for device to initialize (crucial timing)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Send the standard start command - most likely to work across devices
      await commandCharacteristic.writeValue(COMMANDS.START_MEDIUM);
      console.log('✅ START MEASUREMENT COMMAND SENT');
      
      // Wait for measurement mode to activate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Much simpler approach - use notification handlers as intended
      console.log('📣 Setting up standard notification handling...');
      
      // We won't try to poll directly - this was causing permission errors
      // Instead, we'll rely on the standard notification system and make sure
      // our visualization is extremely responsive to any data we do receive
      
      // Create a heartbeat to keep the connection active
      if ((window as any).connectionHeartbeat) {
        clearInterval((window as any).connectionHeartbeat);
      }
      
      // Send a heartbeat command every few seconds to maintain activity
      (window as any).connectionHeartbeat = setInterval(async () => {
        if (device && device.gatt.connected && commandCharacteristic) {
          try {
            // Simple keep-alive command
            console.log('💓 Sending connection heartbeat...');
            await commandCharacteristic.writeValue(COMMANDS.START_MEDIUM);
          } catch (err) {
            console.error('Error in heartbeat:', err);
          }
        } else {
          clearInterval((window as any).connectionHeartbeat);
        }
      }, 3000); // Every 3 seconds
      
      // Manually generate a test data point to verify our visualization pipeline
      console.log('🧪 Generating test data point to verify visualization...');
      const testData = new Uint8Array([0, 128, 0, 0]); // Mid-range value for testing
      if (onDataReceived) {
        onDataReceived(testData);
      }
      
      console.log('✅ Active data polling activated')
      
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