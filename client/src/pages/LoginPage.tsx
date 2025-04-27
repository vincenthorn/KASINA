import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import Logo from "../components/Logo";
import LoginForm from "../components/LoginForm";

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="py-8 px-4 flex flex-col items-center">
        <div className="text-center mb-6">
          <Logo size="large" />
        </div>
        
        <div className="text-center mb-6 max-w-xl">
          <p className="text-gray-200 mb-6 text-justify">
            KASINA is a 3D visual meditation tool for those ready to deepen their concentration with a visual object. 
            Inspired by ancient kasina practices, reimagined for the modern meditator.
          </p>
          
          <div className="space-y-2 text-left mb-6 text-gray-300">
            <div className="flex items-start">
              <span className="mr-2">🔲</span>
              <span>Freestyle kasina mode with 10 orbs + practice timer</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">📊</span>
              <span>Visualize your practice history with kasina breakdowns</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">🎙</span>
              <span>Record & share your own guided visual meditations (coming soon)</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">🧘‍♀️</span>
              <span>Access curated & community-generated guided meditations (coming soon)</span>
            </div>
          </div>
          
          <div className="text-indigo-400 text-base mb-6">
            Who it's for:
            <div className="mt-1 text-gray-400">
              Jhāna nerds • Meditation teachers • Contemplative techies
            </div>
          </div>
        </div>
        
        <LoginForm />
        <div className="h-8"></div> {/* Bottom spacing */}
      </div>
    </div>
  );
};

export default LoginPage;
