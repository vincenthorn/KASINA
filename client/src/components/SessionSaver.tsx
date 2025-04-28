import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { KASINA_TYPES } from '../lib/constants';
import { KasinaType } from '../lib/types';
import { useSessionLogger } from '../lib/stores/useSessionLogger';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

/**
 * SessionSaver - A reliable component for saving meditation sessions
 * This component provides a user-friendly interface for saving sessions
 * with precise control over the kasina type and duration.
 */
const SessionSaver: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>("quick");
  const [selectedKasina, setSelectedKasina] = useState<KasinaType>("white");
  const [customMinutes, setCustomMinutes] = useState<string>("1");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Get the session logger from our custom store
  const { logSession, isSaving: storeIsSaving } = useSessionLogger();
  
  // Array of kasina types for selection
  const kasinaTypes = Object.values(KASINA_TYPES) as KasinaType[];
  
  // Quick durations in minutes
  const quickDurations = [1, 5, 10, 15, 20, 30, 45, 60];
  
  // Save a session with the given duration in minutes
  const saveSession = async (durationMinutes: number) => {
    // Prevent saving if already in progress
    if (isSaving || storeIsSaving) return;
    
    setIsSaving(true);
    
    try {
      // Minimum duration is 1 minute
      const minutes = Math.max(1, durationMinutes);
      
      // Log the session with our dedicated store
      const success = await logSession({
        kasinaType: selectedKasina,
        duration: minutes * 60,
        showToast: true
      });
      
      console.log(`Session save ${success ? 'successful' : 'failed'} for ${selectedKasina} (${minutes} minutes)`);
    } catch (error) {
      console.error("Error saving session:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle custom duration save
  const handleCustomSave = () => {
    const minutes = parseInt(customMinutes, 10) || 1;
    saveSession(minutes);
  };
  
  // Validate and update custom minutes
  const handleCustomMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setCustomMinutes(value);
    }
  };
  
  return (
    <Card className="border-gray-700 bg-black/40 backdrop-blur-md text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Session Saver</CardTitle>
        <CardDescription className="text-gray-400">
          Reliably save your meditation sessions
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Kasina Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Kasina Type</label>
            <select 
              value={selectedKasina}
              onChange={(e) => setSelectedKasina(e.target.value as KasinaType)}
              className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2"
            >
              {kasinaTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)} Kasina
                </option>
              ))}
            </select>
          </div>
          
          {/* Save Options Tabs */}
          <Tabs defaultValue="quick" value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-2 bg-gray-800">
              <TabsTrigger value="quick">Quick Durations</TabsTrigger>
              <TabsTrigger value="custom">Custom Duration</TabsTrigger>
            </TabsList>
            
            {/* Quick Save Options */}
            <TabsContent value="quick" className="pt-4">
              <div className="grid grid-cols-4 gap-2">
                {quickDurations.map(duration => (
                  <Button 
                    key={`quick-${duration}`}
                    size="sm"
                    onClick={() => saveSession(duration)}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {duration} {duration === 1 ? 'min' : 'mins'}
                  </Button>
                ))}
              </div>
            </TabsContent>
            
            {/* Custom Duration Input */}
            <TabsContent value="custom" className="pt-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={customMinutes}
                    onChange={handleCustomMinutesChange}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter minutes"
                  />
                </div>
                <Button 
                  onClick={handleCustomSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? 'Saving...' : 'Save Session'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 text-xs text-gray-400 justify-center">
        All sessions are saved server-side
      </CardFooter>
    </Card>
  );
};

export default SessionSaver;