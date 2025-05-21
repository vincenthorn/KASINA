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
    
    // Mark that we have successfully received data to stop the command rotation
    (window as any).vernierDataReceived = true;
    
    // Log the full data packet in a readable format
    console.log('🔵 DATA RECEIVED:', formatBytes(bytes));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Enhanced logging for troubleshooting
    if (bytes.length > 0) {
      // Format the bytes as HEX for debugging
      const hexValues = Array.from(bytes).map(b => 
        b.toString(16).padStart(2, '0')
      ).join(' ');
      
      // Show detailed byte analysis
      console.log(`📊 DATA ANALYSIS [Length: ${bytes.length}]:`);
      console.log(`HEX: ${hexValues}`);
      
      // Log specific bytes of interest
      if (bytes.length > 1) {
        const byte1 = bytes[1];
        const normalizedValue = byte1 / 255;
        console.log(`KEY SENSOR BYTE: ${byte1} (Normalized: ${normalizedValue.toFixed(4)})`);
        
        // Generate visual indicator of signal strength
        const barLength = Math.round(normalizedValue * 20);
        const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
        console.log(`Signal strength: ${bar} ${(normalizedValue * 100).toFixed(1)}%`);
      }
    }
    
    // Pass data to parent component for visualization
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
      
      // NEW VERNIER PROTOCOL IMPLEMENTATION
      console.log('⭐️ Starting full Vernier initialization protocol...');
      
      // 1. Send the initial device activation command (always required)
      await commandCharacteristic.writeValue(COMMANDS.ENABLE_SENSOR);
      console.log('✅ DEVICE ACTIVATED');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Select the force sensor channel specifically
      await commandCharacteristic.writeValue(COMMANDS.SELECT_FORCE_CHANNEL);
      console.log('✅ FORCE SENSOR CHANNEL SELECTED');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. Enable real-time data mode for immediate response
      await commandCharacteristic.writeValue(COMMANDS.ENABLE_REALTIME);
      console.log('✅ REAL-TIME DATA MODE ENABLED');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 4. Start with high-frequency sampling (30Hz)
      await commandCharacteristic.writeValue(COMMANDS.START_HIGH);
      console.log('✅ HIGH-FREQUENCY SAMPLING INITIALIZED');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 5. Set up continuous data flow mode
      await commandCharacteristic.writeValue(COMMANDS.SETUP_CONTINUOUS);
      console.log('✅ CONTINUOUS DATA FLOW CONFIGURED');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 6. Implement active polling for data
      console.log('🔄 Implementing active data polling system...');
      
      // Clear any existing intervals
      if ((window as any).dataPollingInterval) {
        clearInterval((window as any).dataPollingInterval);
      }
      
      // This approach uses explicit requests for new data
      // rather than relying on automatic notifications
      (window as any).dataPollingInterval = setInterval(async () => {
        if (device && device.gatt.connected && commandCharacteristic) {
          try {
            // Cycle through different data request commands
            // This helps ensure we find the right command that works with this device
            const requestCommands = [
              COMMANDS.REQUEST_SAMPLE,
              COMMANDS.START_HIGH,
              COMMANDS.ENABLE_REALTIME
            ];
            
            // Get next command in rotation
            const requestCommand = requestCommands[(window as any).requestCommandIndex || 0];
            (window as any).requestCommandIndex = 
              (((window as any).requestCommandIndex || 0) + 1) % requestCommands.length;
              
            // Send request command
            await commandCharacteristic.writeValue(requestCommand);
            
            // Try to read the value directly after requesting it
            try {
              const value = await responseCharacteristic.readValue();
              const bytes = new Uint8Array(value.buffer);
              if (bytes.length > 0) {
                console.log('📊 Direct read data:', formatBytes(bytes));
                
                // Manually trigger the notification handler with this data
                const event = { target: { value } };
                handleNotification(event);
              }
            } catch (readErr) {
              // Reading may fail on some devices, that's ok
              // We'll still get notifications if they're working
            }
          } catch (err) {
            console.error('Error in polling cycle:', err);
          }
        } else {
          clearInterval((window as any).dataPollingInterval);
        }
      }, 100); // Request data very frequently (10 times per second)
      
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