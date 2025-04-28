import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import Logo from "../components/Logo";
import LoginForm from "../components/LoginForm";

// Simple CSS for the page to ensure proper scrolling
const pageStyles = {
  minHeight: "100vh", // Use viewport height instead of 100%
  backgroundColor: "#111827", // bg-gray-900
  padding: "40px 20px 60px 20px", // Generous padding on all sides
  overflowY: "auto" as const, // Force scrolling
  position: "absolute" as const, // Take it out of the normal flow
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const contentStyles = {
  maxWidth: "450px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: "24px",
};

const sectionStyles = {
  width: "100%",
  textAlign: "center" as const
};

const paragraphStyles = {
  color: "#d1d5db", // text-gray-300
  marginBottom: "16px",
  fontSize: "16px",
  lineHeight: "1.6"
};

const listItemStyles = {
  color: "#d1d5db", // text-gray-300
  marginBottom: "10px",
  fontSize: "16px",
  lineHeight: "1.5",
  paddingLeft: "8px",
  textAlign: "center" as const
};

const comingSoonStyles = {
  color: "#a78bfa", // text-purple-400
  fontWeight: "bold" as const
};

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div style={pageStyles}>
      <div style={contentStyles}>
        {/* Logo Section */}
        <div style={sectionStyles}>
          <Logo size="large" />
        </div>
        
        {/* Login Form Section */}
        <div style={sectionStyles}>
          <LoginForm />
        </div>
        
        {/* Description Section */}
        <div style={sectionStyles}>
          <p style={paragraphStyles}>
            KASINA is a 3D visual meditation tool for those ready to deepen their concentration with a visual object. 
            Inspired by ancient kasina practices, reimagined for the modern meditator.
          </p>
          
          <div>
            <p style={listItemStyles}>🔲 Kasina mode with 10 visual orbs plus meditation timer</p>
            <p style={listItemStyles}>🔴 4 Color Orbs: White, Yellow, Red, &amp; Blue</p>
            <p style={listItemStyles}>🌎 6 Elemental Orbs: Earth, Water, Fire, Air, Space, &amp; Light</p>
            <p style={listItemStyles}>📊 Visualize your meditation history with practice breakdowns</p>
            <p style={listItemStyles}>
              🧘‍♀️ Access community-generated guided meditations <span style={comingSoonStyles}>COMING SOON</span>
            </p>
            <p style={listItemStyles}>
              🎙 Record &amp; share your own guided visual meditations <span style={comingSoonStyles}>COMING SOON</span>
            </p>
          </div>
        </div>
        
        {/* Extra Bottom Space */}
        <div style={{ height: "40px" }}></div>
      </div>
    </div>
  );
};

export default LoginPage;
