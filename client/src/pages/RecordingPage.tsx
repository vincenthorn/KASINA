import React from "react";
import Layout from "../components/Layout";
import KasinaOrb from "../components/KasinaOrb";
import RecordingControls from "../components/RecordingControls";
import RecordingList from "../components/RecordingList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import FreestyleControls from "../components/FreestyleControls";

const RecordingPage: React.FC = () => {
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-white mb-6">Recording Studio</h1>
      
      <Tabs defaultValue="record" className="w-full">
        <TabsList className="bg-gray-800 mb-6">
          <TabsTrigger value="record" className="text-white">Record Session</TabsTrigger>
          <TabsTrigger value="library" className="text-white">Recording Library</TabsTrigger>
        </TabsList>
        
        <TabsContent value="record">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Controls */}
            <div className="lg:col-span-1 space-y-6">
              <FreestyleControls />
              <RecordingControls />
            </div>
            
            {/* Right: Kasina Orb */}
            <div className="lg:col-span-2 h-96 bg-black rounded-lg overflow-hidden">
              <KasinaOrb />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="library">
          <RecordingList />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default RecordingPage;
