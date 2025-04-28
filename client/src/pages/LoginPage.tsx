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
    <div className="bg-gray-900 w-full h-full min-h-screen">
      <div className="container mx-auto px-4 py-8 md:py-10 max-w-lg">
        <div className="flex flex-col items-center space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Logo size="large" />
          </div>
          
          {/* Login Form */}
          <div className="w-full">
            <LoginForm />
          </div>
          
          {/* Description */}
          <div className="text-center w-full mt-4">
            <p className="text-gray-300 mb-6">
              KASINA is a 3D visual meditation tool for those ready to deepen their concentration with a visual object. 
              Inspired by ancient kasina practices, reimagined for the modern meditator.
            </p>
            
            <div className="space-y-1.5 text-center text-gray-300">
              <p>🔲 Kasina mode with 10 visual orbs plus meditation timer</p>
              <p>🔴 4 Color Orbs: White, Yellow, Red, &amp; Blue</p>
              <p>🌎 6 Elemental Orbs: Earth, Water, Fire, Air, Space, &amp; Light</p>
              <p>📊 Visualize your meditation history with practice breakdowns</p>
              <p>🧘‍♀️ Access community-generated guided meditations <span className="text-purple-400 font-bold">COMING SOON</span></p>
              <p>🎙 Record &amp; share your own guided visual meditations <span className="text-purple-400 font-bold">COMING SOON</span></p>
            </div>
          </div>
          
          {/* Add extra space at the bottom to ensure scrolling works */}
          <div className="h-4 md:h-8"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
