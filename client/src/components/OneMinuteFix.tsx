import React, { useState } from 'react';
import { Button } from './ui/button';
import { KASINA_TYPES } from '../lib/constants';
import { toast } from 'sonner';

/**
 * OneMinuteFix - A simple component that provides a guaranteed way to save 1-minute sessions
 * directly on the server without relying on any client-side timer logic
 */
const OneMinuteFix: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const kasinaTypes = Object.values(KASINA_TYPES);
  const [selectedKasina, setSelectedKasina] = useState(kasinaTypes[0]);
  
  const saveOneMinuteSession = async () => {
    setIsSaving(true);
    
    try {
      // Call our special emergency API endpoint
      const response = await fetch('/api/direct-one-minute-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kasinaType: selectedKasina })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ 1-MINUTE SESSION SAVED SUCCESSFULLY:", data);
        toast.success(`Successfully saved 1-minute ${selectedKasina} session`);
        
        // Force a refresh of the sessions list
        window.dispatchEvent(new Event('session-saved'));
      } else {
        console.error("❌ 1-MINUTE SESSION SAVE FAILED:", response.status);
        toast.error("Failed to save session. Please try again.");
      }
    } catch (error) {
      console.error("❌ 1-MINUTE SESSION SAVE ERROR:", error);
      toast.error("Error connecting to server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="bg-black/40 backdrop-blur-md p-4 rounded-lg border border-gray-700 shadow-xl">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white">Emergency 1-Minute Fix</h3>
        <p className="text-xs text-gray-400 mt-1">
          Directly saves a 1-minute session without using the timer
        </p>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-1">Kasina Type</label>
        <select 
          value={selectedKasina}
          onChange={(e) => setSelectedKasina(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white text-sm"
        >
          {kasinaTypes.map(type => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Kasina
            </option>
          ))}
        </select>
      </div>
      
      <Button 
        onClick={saveOneMinuteSession}
        disabled={isSaving}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isSaving ? 'Saving...' : 'Save 1-Minute Session'}
      </Button>
    </div>
  );
};

export default OneMinuteFix;