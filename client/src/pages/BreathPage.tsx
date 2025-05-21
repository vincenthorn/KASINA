import React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/stores/useAuth";
import { Wind } from "lucide-react";

const BreathPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const isPremiumOrAdmin = auth.user?.isPremium || auth.user?.isAdmin;

  if (!isPremiumOrAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <Wind className="w-16 h-16 text-blue-500 mb-4" />
          <h1 className="text-3xl font-bold mb-4">Premium Feature</h1>
          <p className="text-lg text-gray-300 max-w-lg mb-8">
            The Breath Kasina is available exclusively for premium users. This feature
            allows you to connect your Vernier Go Direct Respiration Belt for real-time
            breath visualization.
          </p>
          <Button 
            variant="default" 
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => navigate("/")}
          >
            Return to Home
          </Button>
        </div>
      </Layout>
    );
  }

  const handleConnect = async () => {
    try {
      // Request Bluetooth device and connect
      if (!navigator.bluetooth) {
        throw new Error("Bluetooth is not supported in this browser");
      }
      
      // Navigate to the breath kasina visualization page
      navigate("/breath-kasina");
    } catch (error) {
      console.error("Failed to connect:", error);
      alert(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Breath Kasina</h1>
        
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Connect Your Respiration Belt</h2>
          <div className="flex items-center mb-6">
            <div className="mr-6">
              <img 
                src="/images/respiration-belt.svg" 
                alt="Vernier Go Direct Respiration Belt" 
                className="w-48"
              />
            </div>
            <div>
              <p className="mb-4">
                The Breath Kasina works with the Vernier Go Direct Respiration Belt 
                to visualize your breathing patterns in real-time.
              </p>
              <ol className="list-decimal list-inside space-y-2 mb-6">
                <li>Put on your respiration belt securely around your chest or abdomen</li>
                <li>Turn on the belt (check for the green LED indicator)</li>
                <li>Click the "Connect Belt" button below</li>
                <li>Select your device from the list when prompted</li>
              </ol>
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleConnect}
              >
                Connect Belt
              </Button>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About Breath Kasina</h2>
          <p className="mb-4">
            Breath Kasina is an immersive meditation experience that creates a visual 
            representation of your breathing pattern. As you breathe in, the kasina 
            expands, and as you breathe out, it contracts.
          </p>
          <p>
            This practice helps develop concentration (samadhi) by focusing on the 
            rhythm of the breath while observing the corresponding visual changes.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default BreathPage;