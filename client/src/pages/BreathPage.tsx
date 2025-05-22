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
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Breath Meditation */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Breath Meditation</CardTitle>
            <CardDescription>
              Follow your breath with a simple visual guide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Focus on your breath with a simple animation that helps you
              maintain rhythm and presence. Perfect for beginners or quick
              meditation sessions.
            </p>
            <ul className="list-disc list-inside mb-4 text-sm text-gray-600 dark:text-gray-400">
              <li>Simple visual guide</li>
              <li>Preset breathing patterns</li>
              <li>No external hardware required</li>
              <li>Available to all users</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate('/meditation?type=breath')}
              className="w-full"
            >
              Start Basic Breath Meditation
            </Button>
          </CardFooter>
        </Card>
        
        {/* Microphone-based Breath Detection */}
        <Card className={!hasPremiumAccess ? "opacity-70" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center">
              Microphone Breath Detection
              {hasPremiumAccess ? (
                <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                  Premium
                </span>
              ) : (
                <span className="ml-2 text-xs bg-gray-500 text-white px-2 py-1 rounded-full">
                  Premium Only
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Real-time breath detection using your device's microphone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              This advanced feature uses your device's microphone to detect your
              breathing pattern and creates a synchronized visual experience that
              adapts to your natural rhythm.
            </p>
            <ul className="list-disc list-inside mb-4 text-sm text-gray-600 dark:text-gray-400">
              <li>Real-time breath detection</li>
              <li>Personalized to your natural rhythm</li>
              <li>Works with any microphone</li>
              <li>Premium feature</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate('/breath/microphone')}
              className="w-full"
              disabled={!hasPremiumAccess}
            >
              {hasPremiumAccess ? "Start Microphone Meditation" : "Premium Feature"}
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