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
        <div className="text-center mb-8 mt-12">
          <Logo size="large" />
        </div>
        
        <div className="mb-10 w-full max-w-md flex justify-center">
          <LoginForm />
        </div>
        
        <div className="text-center mb-6 max-w-xl">
          <p className="text-gray-200 mb-6 text-justify text-lg">
            KASINA is a 3D visual meditation tool for those ready to deepen their concentration with a visual object. 
            Inspired by ancient kasina practices, reimagined for the modern meditator.
          </p>
          
          <div className="space-y-2 text-left mb-6 text-gray-300 text-lg">
            <div className="flex items-start">
              <span className="mr-2">🔲</span>
              <span>Kasina mode with 10 visual orbs & meditation timer</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">🔴</span>
              <span>Train with 4 Color Orbs: White, Yellow, Red, & Blue</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">🌎</span>
              <span>Practice with 6 Elemental Orbs: Earth, Water, Fire, Air, Space, & Light</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">📊</span>
              <span>Visualize your meditation history with practice breakdowns</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">🧘‍♀️</span>
              <span>Access community-generated guided meditations <span className="text-indigo-400 ml-1 text-base font-medium">COMING SOON</span></span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">🎙</span>
              <span>Record & share your own guided visual meditations <span className="text-indigo-400 ml-1 text-base font-medium">COMING SOON</span></span>
            </div>
          </div>
        </div>
        
        <div className="h-8"></div> {/* Bottom spacing */}
      </div>
    </div>
  );
};

export default LoginPage;
