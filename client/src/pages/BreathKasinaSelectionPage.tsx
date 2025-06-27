import React from 'react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useVernierBreathOfficial } from '../lib/useVernierBreathOfficial';
import { useKasina } from '../lib/stores/useKasina';
import { ArrowLeft, Bluetooth, Waves } from 'lucide-react';

const KASINA_OPTIONS = [
  { id: 'blue', name: 'Blue', description: 'Deep ocean blue for calming breath meditation' },
  { id: 'white', name: 'White', description: 'Pure white light for clarity and focus' },
  { id: 'red', name: 'Red', description: 'Warm red energy for vitality and strength' },
  { id: 'yellow', name: 'Yellow', description: 'Golden yellow for warmth and positivity' },
  { id: 'green', name: 'Green', description: 'Natural green for balance and harmony' },
  { id: 'earth', name: 'Earth', description: 'Terra cotta earth element for grounding' },
];

export default function BreathKasinaSelectionPage() {
  const navigate = useNavigate();
  const { setSelectedKasina } = useKasina();
  const { 
    isConnected, 
    calibrationComplete, 
    currentForce, 
    breathPhase,
    disconnectDevice,
    forceDisconnectDevice 
  } = useVernierBreathOfficial();

  // Redirect back to connection page if not properly connected
  React.useEffect(() => {
    if (!isConnected || !calibrationComplete) {
      console.log('Device not ready, redirecting to connection page');
      navigate('/breath-official');
    }
  }, [isConnected, calibrationComplete, navigate]);

  const handleKasinaSelect = (kasinaId: string) => {
    console.log('Starting breath kasina session with:', kasinaId);
    setSelectedKasina(kasinaId);
    navigate('/breath-official', { state: { selectedKasina: kasinaId, autoStart: true } });
  };

  const handleBackToConnection = () => {
    navigate('/breath-official');
  };

  const handleDisconnect = () => {
    disconnectDevice();
    navigate('/breath-official');
  };

  const handleForceDisconnect = () => {
    forceDisconnectDevice();
    navigate('/breath-official');
  };

  if (!isConnected || !calibrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Checking device connection...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToConnection}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Choose Your Breath Kasina</h1>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <Bluetooth className="h-4 w-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <Waves className="h-4 w-4" />
              <span className="text-sm font-medium">
                Force: {currentForce.toFixed(1)}N
              </span>
            </div>
            <div className="flex items-center gap-2 text-purple-600">
              <span className="text-sm font-medium">
                Phase: {breathPhase}
              </span>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <Alert className="mb-8 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            ✅ Your Vernier respiration belt is connected and calibrated. 
            No need to re-pair - it will automatically reconnect for future sessions!
          </AlertDescription>
        </Alert>

        {/* Kasina Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {KASINA_OPTIONS.map((kasina) => (
            <Card 
              key={kasina.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-300"
              onClick={() => handleKasinaSelect(kasina.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>{kasina.name} Kasina</span>
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: kasina.id === 'earth' ? '#A0522D' : kasina.id }}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{kasina.description}</p>
                <Button className="w-full" variant="outline">
                  Start Session
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Device Management */}
        <div className="flex justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleDisconnect}
            className="flex items-center gap-2"
          >
            Soft Disconnect
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleForceDisconnect}
            className="flex items-center gap-2"
          >
            Force Disconnect
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500 mt-4">
          <p>Soft Disconnect: Keep device connection for next session</p>
          <p>Force Disconnect: Fully disconnect and require re-pairing</p>
        </div>
      </div>
    </Layout>
  );
}