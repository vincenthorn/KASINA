import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../lib/stores/useAuth';
import Layout from '../components/Layout';

const BreathPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  // Check if user has premium access
  console.log("User data:", user);
  console.log("Is admin:", isAdmin);
  console.log("Email:", user?.email);
  console.log("Subscription:", user?.subscription);
  
  const hasPremiumAccess = user?.subscription === 'premium' || isAdmin;
  console.log("Has premium access:", hasPremiumAccess);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-white">Breath Meditation</h1>
        
        <div className="max-w-2xl mx-auto">
          {/* Vernier Respiration Belt Option - Official Library */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                🌀 Vernier Respiration Belt
                <span className="text-sm bg-blue-600 text-white px-2 py-1 rounded-full">
                  Premium
                </span>
                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                  Official
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                Connect your Vernier GDX Respiration Belt via Bluetooth using the official 
                Vernier library for seamless, medical-grade breathing detection.
              </p>
              <ul className="list-disc list-inside mb-4 text-sm text-gray-400">
                <li>Official sensor GoDirect integration</li>
                <li>Medical-grade accuracy (Newtons)</li>
                <li>Automatic sensor detection</li>
                <li>Professional breathing analysis</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => navigate('/breath/vernier-official')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!hasPremiumAccess}
              >
                {hasPremiumAccess ? "Connect Vernier Belt (Official)" : "Premium Feature"}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
            Back
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default BreathPage;