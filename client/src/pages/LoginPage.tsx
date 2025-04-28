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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-10 px-4 overflow-auto">
      <div className="text-center mb-8 mt-8">
        <Logo size="large" />
      </div>
      <LoginForm />
      
      <div className="mt-10 max-w-lg text-center px-4 mb-10">
        <p className="text-gray-300 mb-6">
          KASINA is a 3D visual meditation tool for those ready to deepen their concentration with a visual object. 
          Inspired by ancient kasina practices, reimagined for the modern meditator.
        </p>
        
        <div className="space-y-1.5 text-center md:w-96 mx-auto text-gray-300">
          <p>🔲 Kasina mode with 10 visual orbs plus meditation timer</p>
          <p>🔴 4 Color Orbs: White, Yellow, Red, &amp; Blue</p>
          <p>🌎 6 Elemental Orbs: Earth, Water, Fire, Air, Space, &amp; Light</p>
          <p>📊 Visualize your meditation history with practice breakdowns</p>
          <p>🧘‍♀️ Access community-generated guided meditations <span className="text-purple-400 font-bold">COMING SOON</span></p>
          <p>🎙 Record &amp; share your own guided visual meditations <span className="text-purple-400 font-bold">COMING SOON</span></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
