import React, { useState } from "react";
import Layout from "../components/Layout";
import TimerKasinas from "../components/TimerKasinas";
import EmergencyFix from "../components/EmergencyFix";
import { Button } from "../components/ui/button";

const KasinasPage: React.FC = () => {
  const [showEmergencyFix, setShowEmergencyFix] = useState(false);
  
  return (
    <Layout fullWidth={true}>
      <div className="relative">
        <TimerKasinas />
        
        {/* Emergency Fix Toggle Button */}
        <div className="absolute top-4 right-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowEmergencyFix(!showEmergencyFix)}
            className="bg-black/40 border-gray-600 text-gray-300 hover:text-white"
          >
            {showEmergencyFix ? 'Hide Emergency Fix' : 'Session Logging Fix'}
          </Button>
        </div>
        
        {/* Emergency Fix Panel */}
        {showEmergencyFix && (
          <div className="fixed top-20 right-4 w-72 z-50 shadow-xl">
            <EmergencyFix />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default KasinasPage;