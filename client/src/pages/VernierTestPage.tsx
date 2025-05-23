import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';

interface ServiceInfo {
  uuid: string;
  characteristics: CharacteristicInfo[];
}

interface CharacteristicInfo {
  uuid: string;
  properties: string[];
}

const VernierTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Connect to Vernier device and enumerate all services/characteristics
  const connectAndEnumerate = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setServices([]);
      setLogs([]);
      
      addLog('🔍 Starting Vernier GDX device discovery...');
      
      // Check if Bluetooth is supported
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth is not supported in this browser');
      }
      
      addLog('📱 Requesting Vernier GDX device...');
      
      // Request device with GDX name prefix
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "GDX" }],
        optionalServices: ['battery_service', 'device_information'] // Leave blank to get all services
      });
      
      addLog(`✅ Device selected: ${device.name} (ID: ${device.id})`);
      
      // Connect to GATT server
      addLog('🔗 Connecting to GATT server...');
      const server = await device.gatt!.connect();
      setIsConnected(true);
      
      addLog('🎯 Connected! Discovering services...');
      
      // Get all primary services
      const primaryServices = await server.getPrimaryServices();
      addLog(`📋 Found ${primaryServices.length} primary services`);
      
      const discoveredServices: ServiceInfo[] = [];
      
      // Enumerate each service and its characteristics
      for (const service of primaryServices) {
        addLog(`\n🔧 Service: ${service.uuid}`);
        
        try {
          const characteristics = await service.getCharacteristics();
          addLog(`   📊 Found ${characteristics.length} characteristics`);
          
          const characteristicInfos: CharacteristicInfo[] = [];
          
          for (const char of characteristics) {
            const properties = [];
            if (char.properties.read) properties.push('read');
            if (char.properties.write) properties.push('write');
            if (char.properties.writeWithoutResponse) properties.push('writeWithoutResponse');
            if (char.properties.notify) properties.push('notify');
            if (char.properties.indicate) properties.push('indicate');
            if (char.properties.authenticatedSignedWrites) properties.push('authenticatedSignedWrites');
            if (char.properties.reliableWrite) properties.push('reliableWrite');
            if (char.properties.writableAuxiliaries) properties.push('writableAuxiliaries');
            
            addLog(`     🔹 Characteristic: ${char.uuid}`);
            addLog(`       Properties: [${properties.join(', ')}]`);
            
            characteristicInfos.push({
              uuid: char.uuid,
              properties
            });
            
            // If this characteristic supports reading, try to read a sample
            if (char.properties.read) {
              try {
                const value = await char.readValue();
                addLog(`       📖 Sample read: ${value.byteLength} bytes`);
                
                // Try to interpret as different data types
                if (value.byteLength >= 4) {
                  const float32 = value.getFloat32(0, true);
                  const int32 = value.getInt32(0, true);
                  addLog(`         Float32: ${float32}`);
                  addLog(`         Int32: ${int32}`);
                }
                if (value.byteLength >= 2) {
                  const int16 = value.getInt16(0, true);
                  addLog(`         Int16: ${int16}`);
                }
                if (value.byteLength >= 1) {
                  const uint8Array = new Uint8Array(value.buffer);
                  addLog(`         Raw bytes: [${Array.from(uint8Array).join(', ')}]`);
                }
              } catch (readError) {
                addLog(`       ❌ Read failed: ${readError}`);
              }
            }
            
            // If this characteristic supports notifications, try to start them
            if (char.properties.notify) {
              try {
                await char.startNotifications();
                addLog(`       🔔 Notifications started`);
                
                // Listen for a few data points
                let dataCount = 0;
                const maxSamples = 5;
                
                const handleNotification = (event: Event) => {
                  if (dataCount >= maxSamples) return;
                  
                  const target = event.target as BluetoothRemoteGATTCharacteristic;
                  const value = target.value;
                  
                  if (value) {
                    dataCount++;
                    addLog(`       📨 Notification ${dataCount}: ${value.byteLength} bytes`);
                    
                    // Try to interpret the data
                    if (value.byteLength >= 4) {
                      const float32 = value.getFloat32(0, true);
                      addLog(`         Respiration force: ${float32.toFixed(4)}N`);
                    }
                    
                    if (dataCount >= maxSamples) {
                      char.removeEventListener('characteristicvaluechanged', handleNotification);
                      char.stopNotifications();
                      addLog(`       🛑 Stopped notifications after ${maxSamples} samples`);
                    }
                  }
                };
                
                char.addEventListener('characteristicvaluechanged', handleNotification);
                
                // Auto-stop after 10 seconds
                setTimeout(() => {
                  if (dataCount < maxSamples) {
                    char.removeEventListener('characteristicvaluechanged', handleNotification);
                    char.stopNotifications();
                    addLog(`       ⏰ Stopped notifications after timeout`);
                  }
                }, 10000);
                
              } catch (notifyError) {
                addLog(`       ❌ Notification failed: ${notifyError}`);
              }
            }
          }
          
          discoveredServices.push({
            uuid: service.uuid,
            characteristics: characteristicInfos
          });
          
        } catch (serviceError) {
          addLog(`   ❌ Error accessing service: ${serviceError}`);
        }
      }
      
      setServices(discoveredServices);
      addLog(`\n🎉 Discovery complete! Found ${discoveredServices.length} accessible services`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addLog(`❌ Connection failed: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    setServices([]);
    setError(null);
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Vernier Respiration Belt - Bluetooth Discovery</h1>
        
        <div className="mb-8">
          <p className="mb-4">
            This tool will connect to your Vernier GDX respiration belt and enumerate all available 
            Bluetooth services and characteristics to understand the data format.
          </p>
          
          <div className="flex space-x-4 mb-6">
            <Button 
              onClick={connectAndEnumerate}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? 'Discovering...' : 'Connect & Discover'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={clearLogs}
              disabled={isConnecting}
            >
              Clear Logs
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/breath')}
            >
              Back to Breath
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Connection Error</h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          
          {isConnected && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-green-800 dark:text-green-200">Connected to Vernier Device</h3>
              <p className="text-green-700 dark:text-green-300">Successfully connected and discovering services...</p>
            </div>
          )}
        </div>
        
        {/* Services Summary */}
        {services.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Discovered Services Summary</h2>
            <div className="grid gap-4">
              {services.map((service, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Service: {service.uuid}</h3>
                  <div className="ml-4">
                    {service.characteristics.map((char, charIndex) => (
                      <div key={charIndex} className="mb-2">
                        <div className="text-sm font-medium">📊 {char.uuid}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 ml-4">
                          Properties: {char.properties.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Detailed Logs */}
        {logs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Discovery Logs</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="mb-1 whitespace-pre-wrap">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VernierTestPage;