import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import Logo from "../components/Logo";
import LoginForm from "../components/LoginForm";

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Explicitly enable scrolling on this page
  useEffect(() => {
    // Override any CSS that might be restricting scrolling
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    
    return () => {
      // Reset when unmounting
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="bg-gray-900" style={{ paddingBottom: "100px" }}>
      <div className="container mx-auto px-4 pt-10 pb-20 max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size="large" />
        </div>
        
        {/* Login Form */}
        <div className="mb-10">
          <LoginForm />
        </div>
        
        {/* Description */}
        <div className="text-center">
          <p className="text-gray-300 mb-6">
            KASINA is a 3D visual meditation tool for those ready to deepen their concentration with a visual object. 
            Inspired by ancient kasina practices, reimagined for the modern meditator.
          </p>
          
          <div className="space-y-2 text-center text-gray-300">
            <p>🔲 Kasina mode with 10 visual orbs plus meditation timer</p>
            <p>🔴 4 Color Orbs: White, Yellow, Red, &amp; Blue</p>
            <p>🌎 6 Elemental Orbs: Earth, Water, Fire, Air, Space, &amp; Light</p>
            <p>📊 Visualize your meditation history with practice breakdowns</p>
            <p>🧘‍♀️ Access community-generated guided meditations <span className="text-purple-400 font-bold">COMING SOON</span></p>
            <p>🎙 Record &amp; share your own guided visual meditations <span className="text-purple-400 font-bold">COMING SOON</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
