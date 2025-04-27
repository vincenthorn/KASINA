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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8 mt-[100px]">
        <Logo size="large" />
      </div>
      
      <div className="text-center mb-8 max-w-2xl">
        <p className="text-gray-200 mb-6 px-[100px] text-justify">
          KASINA is a 3D visual meditation tool for those ready to deepen their concentration with a visual object. 
          Inspired by ancient kasina practices, reimagined for the modern meditator.
        </p>
        
        <div className="space-y-2 text-left mx-auto max-w-md mb-6 text-gray-300">
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
        
        <div className="text-indigo-400 text-base">
          Who it's for:
          <div className="mt-1 text-gray-400">
            Jhāna nerds • Meditation teachers • Contemplative techies
          </div>
        </div>
      </div>
      
      <LoginForm />
    </div>
  );
};

export default LoginPage;
