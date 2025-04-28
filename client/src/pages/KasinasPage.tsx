import React, { useState } from "react";
import Layout from "../components/Layout";
import TimerKasinas from "../components/TimerKasinas";
import SessionSaver from "../components/SessionSaver";
import { Button } from "../components/ui/button";

const KasinasPage: React.FC = () => {
  const [showSessionSaver, setShowSessionSaver] = useState(false);
  
  return (
    <Layout fullWidth={true}>
      <div className="relative">
        <TimerKasinas />
        
        {/* Session Saver Toggle Button - positioned to avoid overlap with Focus Mode button */}
        <div className="absolute top-4 right-36">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSessionSaver(!showSessionSaver)}
            className="bg-black/40 border-gray-600 text-gray-300 hover:text-white"
          >
            {showSessionSaver ? 'Hide Tools' : 'Session Saver'}
          </Button>
        </div>
        
        {/* Session Saver Panel */}
        {showSessionSaver && (
          <div className="fixed top-20 right-36 w-80 z-50 shadow-xl">
            <SessionSaver />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default KasinasPage;