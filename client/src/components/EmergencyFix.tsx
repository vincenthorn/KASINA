import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { KASINA_TYPES } from '../lib/constants';

/**
 * EmergencyFix - A component that provides a guaranteed way to save 1-minute sessions 
 * bypassing all client-side timer logic
 */
const EmergencyFix: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // List of all kasina types for the dropdown
  const kasinaTypes = Object.values(KASINA_TYPES);
  
  // State for selected kasina
  const [selectedKasina, setSelectedKasina] = useState(kasinaTypes[0]);
  
  const saveOneMinuteSession = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      // Create a direct test payload that we know works
      const directTestPayload = {
        kasinaType: selectedKasina.toLowerCase(),
        kasinaName: `${selectedKasina.charAt(0).toUpperCase() + selectedKasina.slice(1).toLowerCase()} (1-minute)`,
        duration: 60, // Exactly 1 minute in seconds
        durationInMinutes: 1,
        timestamp: new Date().toISOString(),
        _directTest: true, // Mark as a direct test route payload
        _guaranteedSession: true
      };
      
      console.log("📋 EMERGENCY DIRECT SAVE PAYLOAD:", directTestPayload);
      
      // Make the direct API call
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(directTestPayload)
      });
      
      if (response.ok) {
        console.log("✅ EMERGENCY DIRECT SAVE SUCCEEDED");
        setSuccessMessage(`✅ Successfully saved 1-minute ${selectedKasina} Kasina session`);
        // Force refresh the sessions list by dispatching a custom event
        window.dispatchEvent(new Event('session-saved'));
      } else {
        console.error("❌ EMERGENCY DIRECT SAVE FAILED:", response.status);
        setErrorMessage(`Error: Failed to save session (${response.status})`);
      }
    } catch (error) {
      console.error("❌ EMERGENCY DIRECT SAVE ERROR:", error);
      setErrorMessage('Error: Could not connect to server');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="w-full p-4 bg-black/30 backdrop-blur-sm rounded-lg border border-gray-700">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-white">Emergency 1-Minute Session Fix</h3>
        <p className="text-sm text-gray-300 mb-4">
          This will directly save a 1-minute meditation session, bypassing any timer issues.
        </p>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">Kasina Type</label>
        <select 
          className="w-full bg-gray-800 text-white rounded-md border border-gray-700 px-4 py-2"
          value={selectedKasina}
          onChange={(e) => setSelectedKasina(e.target.value)}
        >
          {kasinaTypes.map(type => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Kasina
            </option>
          ))}
        </select>
      </div>
      
      <Button 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
        onClick={saveOneMinuteSession}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save 1-Minute Session'}
      </Button>
      
      {successMessage && (
        <div className="mt-2 text-green-500 text-sm text-center">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="mt-2 text-red-500 text-sm text-center">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default EmergencyFix;