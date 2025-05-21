import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import FocusMode from "../components/FocusMode";
import { useAuth } from "../lib/stores/useAuth";
import BreathKasinaOrb from "../components/BreathKasinaOrb";
import { isRespirationBelt } from "../lib/vernierProtocol";
import { KasinaType } from "../types/kasina";

interface BreathData {
  timestamp: number;
  amplitude: number;
  normalizedValue: number;
}

const BreathKasinaPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const isPremiumOrAdmin = auth.user?.isPremium || auth.user?.isAdmin;
  const [isConnected, setIsConnected] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [device, setDevice] = useState<any | null>(null);
  const [breathData, setBreathData] = useState<BreathData[]>([]);
  const [currentAmplitude, setCurrentAmplitude] = useState(0.5); // Default mid-point
  const [isExpanding, setIsExpanding] = useState(false);
  const [breathingRate, setBreathingRate] = useState(12); // Default 12 breaths per minute
  const [effectType, setEffectType] = useState<'expand-contract' | 'brighten-darken' | 'color-shift'>('expand-contract');
  
  // References for WebBluetooth
  const deviceRef = useRef<any>(null);
  const characteristicRef = useRef<any>(null);
  
  // The kasina will be blue
  const breathKasina: KasinaType = 'blue';
  
  // Not premium, redirect to home
  if (!isPremiumOrAdmin) {
    navigate("/");
    return null;
  }

  useEffect(() => {
    // Cleanup function to disconnect from device when component unmounts
    return () => {
      if (deviceRef.current && deviceRef.current.gatt.connected) {
        try {
          deviceRef.current.gatt.disconnect();
          console.log("Disconnected from device");
        } catch (error) {
          console.error("Error disconnecting:", error);
        }
      }
    };
  }, []);
  
  // Handle device connection
  const connectToDevice = async () => {
    try {
      if (!navigator.bluetooth) {
        throw new Error("WebBluetooth is not supported in this browser");
      }
      
      // Request device
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: "GDX-RB" }, // Vernier Go Direct Respiration Belt prefix
        ],
        optionalServices: ["d91714ef-28b9-4f91-ba16-f0d9a604f112"] // Vernier service UUID
      });
      
      if (!isRespirationBelt(device)) {
        throw new Error("Selected device is not a respiration belt");
      }
      
      // Connect to the device
      console.log("Connecting to device:", device.name);
      const server = await device.gatt.connect();
      
      // Get the Vernier service
      const service = await server.getPrimaryService("d91714ef-28b9-4f91-ba16-f0d9a604f112");
      
      // Get the characteristic for reading sensor data
      const characteristic = await service.getCharacteristic("d91714ef-28b9-4f91-ba16-f0d9a604f112");
      
      // Store references
      deviceRef.current = device;
      characteristicRef.current = characteristic;
      
      // Subscribe to notifications
      await characteristic.startNotifications();
      
      // Handle notifications
      characteristic.addEventListener('characteristicvaluechanged', handleBreathData);
      
      // Update connection state
      setIsConnected(true);
      setDevice(device);
      
      console.log("Successfully connected to respiration belt");
      
      // Start measurements (specific command for Vernier devices)
      const startCommand = new Uint8Array([0x01, 0x01]);
      await characteristic.writeValue(startCommand);
      
    } catch (error) {
      console.error("Connection error:", error);
      alert(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle incoming breath data
  const handleBreathData = (event: any) => {
    const value = event.target.value;
    if (!value) return;
    
    // Convert data buffer to ArrayBuffer
    const buffer = value.buffer;
    const dataView = new DataView(buffer);
    
    // Log full data packet for debugging
    const bytes = new Uint8Array(buffer);
    console.log("Raw data received:", Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    // Extract force reading (this will need adjustment based on actual data format)
    // Assuming the force data is at a specific offset and is a float32
    try {
      // This is a placeholder - actual byte positions will depend on device protocol
      const forceReading = dataView.getFloat32(4, true); // true for little-endian
      
      // Normalize to a value between 0 and 1
      const normalizedValue = Math.max(0, Math.min(1, (forceReading + 10) / 20));
      
      // Create breath data point
      const newData: BreathData = {
        timestamp: Date.now(),
        amplitude: forceReading,
        normalizedValue
      };
      
      // Update state
      setBreathData(prev => [...prev, newData].slice(-100)); // Keep last 100 points
      setCurrentAmplitude(normalizedValue);
      
      // Determine if breath is expanding (inhale) or contracting (exhale)
      if (breathData.length > 1) {
        const prevValue = breathData[breathData.length - 1].normalizedValue;
        setIsExpanding(normalizedValue > prevValue);
      }
      
      // Calculate breathing rate (breaths per minute)
      calculateBreathingRate();
      
    } catch (error) {
      console.error("Error processing breath data:", error);
    }
  };
  
  // Calculate breathing rate based on recent breath data
  const calculateBreathingRate = () => {
    if (breathData.length < 4) return; // Need sufficient data
    
    // Simplified calculation - looking for zero crossings
    const timeWindow = 60000; // 1 minute in ms
    const recentData = breathData.filter(point => 
      point.timestamp > Date.now() - timeWindow
    );
    
    if (recentData.length < 4) return;
    
    // Count direction changes (from expanding to contracting or vice versa)
    let changes = 0;
    for (let i = 1; i < recentData.length; i++) {
      const prevExpanding = recentData[i-1].normalizedValue < recentData[i].normalizedValue;
      const currExpanding = i < recentData.length - 1 ? 
        recentData[i].normalizedValue < recentData[i+1].normalizedValue : 
        prevExpanding;
        
      if (prevExpanding !== currExpanding) {
        changes++;
      }
    }
    
    // Each full breath is two changes (inhale->exhale, exhale->inhale)
    const breaths = changes / 2;
    const minutesFraction = timeWindow / 60000;
    const rate = Math.round(breaths / minutesFraction);
    
    // Only update if we have a reasonable value
    if (rate > 0 && rate < 60) {
      setBreathingRate(rate);
    }
  };
  
  // Toggle focus mode
  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
  };
  
  // Handle effect type change
  const handleEffectChange = (effect: 'expand-contract' | 'brighten-darken' | 'color-shift') => {
    setEffectType(effect);
  };
  
  // Disconnect from device
  const disconnect = async () => {
    if (deviceRef.current && deviceRef.current.gatt.connected) {
      try {
        // Stop measurements if characteristic is available
        if (characteristicRef.current) {
          const stopCommand = new Uint8Array([0x01, 0x00]);
          await characteristicRef.current.writeValue(stopCommand);
        }
        
        // Disconnect
        deviceRef.current.gatt.disconnect();
        console.log("Disconnected from device");
        
        // Update state
        setIsConnected(false);
        setDevice(null);
        setBreathData([]);
        setCurrentAmplitude(0.5); // Reset to neutral
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
    }
  };
  
  // If in focus mode, show minimalist interface
  if (isFocusMode) {
    return (
      <FocusMode onExit={toggleFocusMode}>
        <div className="flex items-center justify-center h-full w-full">
          <BreathKasinaOrb
            type={breathKasina}
            breathAmplitude={currentAmplitude}
            breathingRate={breathingRate}
            effectType={effectType}
          />
        </div>
      </FocusMode>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Breath Kasina</h1>
          <div className="space-x-3">
            {isConnected ? (
              <>
                <Button 
                  variant="outline" 
                  className="bg-red-700 hover:bg-red-800 border-red-600"
                  onClick={disconnect}
                >
                  Disconnect
                </Button>
                <Button 
                  variant="default" 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={toggleFocusMode}
                >
                  Enter Focus Mode
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={connectToDevice}
              >
                Connect Belt
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-900 rounded-lg p-6 flex items-center justify-center" style={{ minHeight: "400px" }}>
            <BreathKasinaOrb
              type={breathKasina}
              breathAmplitude={currentAmplitude}
              breathingRate={breathingRate}
              effectType={effectType}
            />
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Kasina Settings</h2>
            
            <div className="mb-6">
              <p className="mb-2">Effect Type:</p>
              <div className="space-y-2">
                <Button 
                  variant={effectType === 'expand-contract' ? 'default' : 'outline'}
                  className={`w-full ${effectType === 'expand-contract' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => handleEffectChange('expand-contract')}
                >
                  Expand & Contract
                </Button>
                <Button 
                  variant={effectType === 'brighten-darken' ? 'default' : 'outline'}
                  className={`w-full ${effectType === 'brighten-darken' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => handleEffectChange('brighten-darken')}
                >
                  Brighten & Darken
                </Button>
                <Button 
                  variant={effectType === 'color-shift' ? 'default' : 'outline'}
                  className={`w-full ${effectType === 'color-shift' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => handleEffectChange('color-shift')}
                >
                  Color Shift
                </Button>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="mb-2">Connection Status:</p>
              <div className={`flex items-center ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {device && (
                <p className="text-sm text-gray-400 mt-1">{device.name}</p>
              )}
            </div>
            
            {isConnected && (
              <div>
                <p className="mb-2">Breath Data:</p>
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-400">Current:</span>
                    <span className="ml-2">{Math.round(currentAmplitude * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Rate:</span>
                    <span className="ml-2">{breathingRate} BPM</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Direction:</span>
                    <span className="ml-2">{isExpanding ? 'Inhale' : 'Exhale'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Points:</span>
                    <span className="ml-2">{breathData.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About Breath Kasina</h2>
          <p className="mb-4">
            This Breath Kasina visualization directly responds to your breathing patterns
            captured through the Vernier Go Direct Respiration Belt. The blue orb represents 
            your breath - expanding as you inhale and contracting as you exhale.
          </p>
          <p>
            For the best experience, sit comfortably, wear the belt around your abdomen,
            breathe naturally, and enter Focus Mode for an immersive meditation session.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default BreathKasinaPage;