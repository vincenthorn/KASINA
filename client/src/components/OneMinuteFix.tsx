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
  
  // Track last saved time to prevent double-saves
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  
  const saveOneMinuteSession = async () => {
    // Prevent double-clicking within 2 seconds
    if (lastSaved && (Date.now() - lastSaved < 2000)) {
      toast.info("Please wait before saving another session");
      return;
    }
    
    setIsSaving(true);
    setLastSaved(Date.now());
    
    try {
      // First try our direct emergency endpoint
      let response = await fetch('/api/direct-one-minute-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kasinaType: selectedKasina })
      });
      
      // If that fails, try the alternate method using the regular sessions endpoint with special flags
      if (!response.ok) {
        console.warn("⚠️ Primary method failed, trying fallback method...");
        
        // Create a direct test payload that we know works
        const fallbackPayload = {
          kasinaType: selectedKasina.toLowerCase(),
          kasinaName: `${selectedKasina.charAt(0).toUpperCase() + selectedKasina.slice(1).toLowerCase()} (1-minute)`,
          duration: 60, // Exactly 1 minute in seconds
          durationInMinutes: 1,
          timestamp: new Date().toISOString(),
          _directTest: true, // Mark as a direct test route payload
          _guaranteedSession: true
        };
        
        response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload)
        });
      }
      
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
        <h3 className="text-lg font-semibold text-white">1-Minute Session Fix</h3>
        <p className="text-xs text-gray-400 mt-1">
          Guaranteed to save a 1-minute session
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