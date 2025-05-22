import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../lib/stores/useAuth';
import Layout from '../components/Layout';

/**
 * BreathPage - Landing page for breath meditation features
 * Acts as a gateway to premium features and offers upgrade prompts
 */
const BreathPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if user has premium access or is admin
  const isPremium = user?.subscription === 'premium';
  const isAdmin = user?.email === 'admin@kasina.app';
  const hasPremiumAccess = isPremium || isAdmin;
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-center mb-8">Breath Meditation</h1>
        
        {hasPremiumAccess ? (
          // Premium content for premium users
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
              <div className="rounded-full bg-blue-600 p-4 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <path d="M12 22a9 9 0 0 0 9-9c0-1.3-.3-2.6-.9-3.8" />
                  <path d="M3.9 9.2A9 9 0 0 0 3 13a9 9 0 0 0 9 9" />
                  <path d="M17.4 3.6A9 9 0 0 0 12 2a8.9 8.9 0 0 0-8.1 5.2" />
                  <path d="m12 7-2 5h4l-2 5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Microphone Breath Kasina</h2>
              <p className="text-gray-500 mb-6">
                Use your device's microphone to detect your breathing pattern and visualize it
                through the kasina orb. Perfect for beginners or when specialized equipment isn't available.
              </p>
              <Button 
                onClick={() => navigate('/breath/mic')}
                className="mt-auto"
              >
                Start Microphone Breathing
              </Button>
            </Card>
            
            <Card className="p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow opacity-60">
              <div className="rounded-full bg-blue-600 p-4 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <rect width="18" height="12" x="3" y="6" rx="2" />
                  <path d="M5 13a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
                  <circle cx="12" cy="9" r="1" />
                  <path d="M10 9h-.01" />
                  <path d="M14 9h-.01" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Hexoskin Integration</h2>
              <p className="text-gray-500 mb-6">
                Connect your Hexoskin smart garment for precise breath monitoring and 
                visualization. Coming soon - experience the most accurate breath tracking.
              </p>
              <Button 
                disabled
                variant="outline"
                className="mt-auto"
              >
                Coming Soon
              </Button>
            </Card>
          </div>
        ) : (
          // Upgrade prompt for non-premium users
          <Card className="p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <path d="M8.7 10.7c-.7.7-1.1 1.7-1.1 2.6 0 1.9 1.5 3.4 3.4 3.4s3.4-1.5 3.4-3.4c0-1-.4-1.9-1.1-2.6" />
                  <path d="M8.7 13.3V3h6.6v10.3" />
                  <path d="M17 21H7a4 4 0 0 1-4-4v-5h18v5a4 4 0 0 1-4 4Z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
              <p className="text-gray-500 mb-6">
                Breath Kasina is a premium feature that transforms your 
                meditation practice by visualizing your real-time breathing patterns.
              </p>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Premium Benefits:</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-500 mr-2 mt-0.5"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>Real-time breath visualization through the kasina orb</span>
                </li>
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-500 mr-2 mt-0.5"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>Advanced breathing metrics and patterns</span>
                </li>
                <li className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-500 mr-2 mt-0.5"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>Support for multiple breath detection methods</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center">
              <Button className="w-full">
                Upgrade to Premium
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Contact admin@kasina.app for subscription details
              </p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default BreathPage;