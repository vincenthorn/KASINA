import React from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/stores/useAuth';

/**
 * BreathPage - Landing page for breath meditation features
 * Acts as a gateway to premium features and offers upgrade prompts
 */
const BreathPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  // Check if user has premium access
  const hasPremiumAccess = user?.subscription === 'premium' || isAdmin;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Breath Meditation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6 flex flex-col h-full">
          <h2 className="text-xl font-semibold mb-2">Microphone Breath Detection</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4 flex-grow">
            Use your device's microphone to detect your breathing pattern and visualize it
            with our interactive breath kasina. The orb will respond to your breath in real-time.
          </p>
          
          {hasPremiumAccess ? (
            <Button onClick={() => navigate('/breath/microphone')}>
              Start Microphone Meditation
            </Button>
          ) : (
            <div>
              <Button variant="outline" className="opacity-75 mb-2 w-full" disabled>
                Premium Feature
              </Button>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This feature requires a premium subscription
              </p>
            </div>
          )}
        </Card>
        
        <Card className="p-6 flex flex-col h-full">
          <h2 className="text-xl font-semibold mb-2">Guided Breath Meditation</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4 flex-grow">
            Follow along with guided breathing patterns. The kasina will guide your 
            breath with a gentle expansion and contraction rhythm.
          </p>
          
          <Button onClick={() => navigate('/kasinas')}>
            Start Guided Meditation
          </Button>
        </Card>
      </div>
      
      {!hasPremiumAccess && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800 mb-8">
          <h2 className="text-xl font-semibold mb-2">Upgrade to Premium</h2>
          <p className="mb-4">
            Unlock all breath meditation features and more with a premium subscription.
            Get access to microphone breath detection, advanced visualizations, and more.
          </p>
          
          <Button variant="default" className="bg-gradient-to-r from-blue-600 to-purple-600">
            Learn More
          </Button>
        </Card>
      )}
      
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
        <p>
          Coming soon: Integration with specialized breath sensors for even more accurate readings.
        </p>
      </div>
    </div>
  );
};

export default BreathPage;