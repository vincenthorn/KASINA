import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';

interface SensorReading {
  name: string;
  unit: string;
  number: number;
  enabled: boolean;
  values: { value: string; timestamp: number }[];
  lastValue: string;
  isNaN: boolean;
}

const VernierTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const deviceRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (deviceRef.current) {
        try { deviceRef.current.stop(); } catch (e) { /* ignore */ }
        try { deviceRef.current.close(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  const connectAndDiscover = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setSensors([]);
      setLogs([]);
      setElapsed(0);

      addLog('Loading Vernier GoDirect library...');
      const goDirectModule = await import('@vernier/godirect');
      const godirectLib = goDirectModule.default || goDirectModule;
      addLog('Library loaded successfully');

      addLog('Opening Bluetooth device chooser...');
      const gdxDevice = await godirectLib.selectDevice(true);
      deviceRef.current = gdxDevice;
      setDeviceName(gdxDevice.name || 'Unknown Device');

      addLog(`Connected to: ${gdxDevice.name}`);
      addLog(`Order Code: ${gdxDevice.orderCode || 'N/A'}`);
      addLog(`Serial: ${gdxDevice.serialNumber || 'N/A'}`);
      addLog(`Total sensors: ${gdxDevice.sensors.length}`);

      const sensorReadings: SensorReading[] = [];

      gdxDevice.sensors.forEach((sensor: any, index: number) => {
        const reading: SensorReading = {
          name: sensor.name || `Sensor ${index}`,
          unit: sensor.unit || '',
          number: sensor.number,
          enabled: false,
          values: [],
          lastValue: '--',
          isNaN: false,
        };
        sensorReadings.push(reading);

        addLog(`  Sensor[${index}]: "${sensor.name}" (${sensor.unit}) number=${sensor.number}`);

        sensor.setEnabled(true);
        reading.enabled = true;
        addLog(`    -> Enabled`);

        sensor.on('value-changed', (sensorData: any) => {
          const raw = sensorData.value;
          const strVal = String(raw);
          const numVal = parseFloat(raw);
          const isNanValue = isNaN(numVal) || !isFinite(numVal) || strVal.toUpperCase() === 'NAN';

          setSensors(prev => {
            const updated = [...prev];
            const s = updated.find(r => r.number === sensor.number);
            if (s) {
              s.lastValue = isNanValue ? 'NaN (calculating...)' : numVal.toFixed(4);
              s.isNaN = isNanValue;
              s.values.push({ value: strVal, timestamp: Date.now() });
              if (s.values.length > 50) s.values = s.values.slice(-50);
            }
            return updated;
          });
        });
      });

      setSensors(sensorReadings);

      addLog('Starting data collection with 100ms period...');
      await gdxDevice.start(100);
      addLog('Data collection started!');
      addLog('');
      addLog('Respiration Rate sensor needs ~30 seconds before producing valid BPM values.');
      addLog('Force sensor should show values immediately.');

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setIsConnected(true);
      setIsConnecting(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addLog(`Connection failed: ${errorMessage}`);
      setError(errorMessage);
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (deviceRef.current) {
      try { await deviceRef.current.stop(); } catch (e) { /* ignore */ }
      try { deviceRef.current.close(); } catch (e) { /* ignore */ }
      deviceRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsConnected(false);
    setSensors([]);
    setElapsed(0);
    addLog('Disconnected from device');
  };

  const clearLogs = () => {
    setLogs([]);
    setError(null);
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Vernier Sensor Diagnostics</h1>
        <p className="text-gray-400 mb-6">
          Connect to your Vernier GDX device to see all sensor channels and their live data.
          The Respiration Rate sensor typically needs ~30 seconds of data before producing valid readings.
        </p>

        <div className="flex space-x-4 mb-6">
          {!isConnected ? (
            <Button
              onClick={connectAndDiscover}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? 'Connecting...' : 'Connect & Discover'}
            </Button>
          ) : (
            <Button onClick={disconnect} className="bg-red-600 hover:bg-red-700">
              Disconnect
            </Button>
          )}

          <Button variant="outline" onClick={clearLogs} disabled={isConnecting}>
            Clear Logs
          </Button>

          <Button variant="outline" onClick={() => navigate('/breath')}>
            Back to Breath
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error</h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {isConnected && (
          <>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    Connected: {deviceName}
                  </h3>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    Streaming data for {elapsed}s
                    {elapsed < 30 && ' (respiration rate needs ~30s)'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${elapsed >= 30 ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    {elapsed >= 30 ? 'All sensors active' : 'Warming up...'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Live Sensor Data</h2>
              <div className="grid gap-3">
                {sensors.map((sensor, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      sensor.isNaN
                        ? 'border-yellow-500/50 bg-yellow-900/10'
                        : sensor.values.length > 0
                        ? 'border-green-500/50 bg-green-900/10'
                        : 'border-gray-700 bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">
                          {sensor.name}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Sensor #{sensor.number} | Unit: {sensor.unit || 'N/A'} | {sensor.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-mono font-bold ${sensor.isNaN ? 'text-yellow-400' : 'text-green-400'}`}>
                          {sensor.lastValue}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {sensor.unit}
                          {sensor.isNaN && ' (waiting for data)'}
                        </div>
                      </div>
                    </div>
                    {sensor.values.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {sensor.values.length} readings received
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {logs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Connection Logs</h2>
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
