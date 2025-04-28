import React, { useState } from "react";
import Layout from "../components/Layout";
import TimerKasinas from "../components/TimerKasinas";
import OneMinuteFix from "../components/OneMinuteFix";
import { Button } from "../components/ui/button";

const KasinasPage: React.FC = () => {
  const [showFix, setShowFix] = useState(false);
  
  return (
    <Layout fullWidth={true}>
      <div className="relative">
        <TimerKasinas />
        
        {/* Emergency Fix Toggle Button */}
        <div className="absolute top-4 right-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFix(!showFix)}
            className="bg-black/40 border-gray-600 text-gray-300 hover:text-white"
          >
            {showFix ? 'Hide Fix' : '1-Minute Fix'}
          </Button>
        </div>
        
        {/* Emergency Fix Panel */}
        {showFix && (
          <div className="fixed top-20 right-4 w-64 z-50 shadow-xl">
            <OneMinuteFix />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default KasinasPage;