import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../lib/stores/useAuth';

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
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Breath Meditation</h1>
      
      <div className="max-w-2xl mx-auto">
        {/* Vernier Respiration Belt Option - Official Library */}
        <Card className="border-purple-200 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔬 Vernier Respiration Belt
              <span className="text-sm bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
                Premium
              </span>
              <span className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                Official
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Connect your Vernier GDX Respiration Belt via Bluetooth using the official 
              Vernier GoDirect library for seamless, medical-grade breathing detection.
            </p>
            <ul className="list-disc list-inside mb-4 text-sm text-gray-600 dark:text-gray-400">
              <li>Official Vernier GoDirect integration</li>
              <li>Medical-grade accuracy (Newtons)</li>
              <li>Automatic sensor detection</li>
              <li>Professional breathing analysis</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate('/breath/vernier-official')}
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={!hasPremiumAccess}
            >
              {hasPremiumAccess ? "Connect Vernier Belt (Official)" : "Premium Feature"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8 text-center">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    </div>
  );
};

export default BreathPage;