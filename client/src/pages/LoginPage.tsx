import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import Logo from "../components/Logo";
import LoginForm from "../components/LoginForm";

// Simple CSS for the page to ensure proper scrolling
const pageStyles = {
  minHeight: "100vh", // Use viewport height instead of 100%
  backgroundColor: "#111827", // bg-gray-900
  padding: "110px 20px 20px 20px", // Increased top padding from 60px to 110px (added 50px)
  overflowY: "auto" as const, // Force scrolling
  position: "absolute" as const, // Take it out of the normal flow
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// Shared styles that won't change with resizing
const sectionStyles = {
  width: "100%",
  textAlign: "center" as const
};

const paragraphStyles = {
  color: "#d1d5db", // text-gray-300
  marginBottom: "24px",
  fontSize: "18px", // Reduced from 20px
  lineHeight: "1.7",
  maxWidth: "800px",
  margin: "0 auto 24px auto",
  padding: "0 10px", // Add some padding for smaller screens
};

const listItemStyles = {
  color: "#d1d5db", // text-gray-300
  marginBottom: "16px", // Increased spacing
  fontSize: "17px", // Reduced from 19px
  lineHeight: "1.6",
  padding: "0 10px", // Add padding for smaller screens
  textAlign: "center" as const
};

const comingSoonStyles = {
  color: "#a78bfa", // text-purple-400
  fontWeight: "bold" as const,
  fontSize: "17px", // Match parent text size
};

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [contentWidth, setContentWidth] = useState("800px");
  
  // Function to calculate responsive width based on screen size
  const calculateResponsiveWidth = () => {
    const screenWidth = window.innerWidth;
    let newWidth;
    
    if (screenWidth < 640) {
      newWidth = "95%"; // Mobile - almost full width
    } else if (screenWidth < 1024) {
      newWidth = "75%"; // Tablet - 75% width
    } else if (screenWidth < 1440) {
      newWidth = "60%"; // Small desktop - 60% width
    } else {
      newWidth = "800px"; // Large desktop - fixed max width
    }
    
    setContentWidth(newWidth);
  };
  
  // Initialize width on first render and add resize listener
  useEffect(() => {
    // Set initial width
    calculateResponsiveWidth();
    
    // Set up resize listener
    const handleResize = () => {
      calculateResponsiveWidth();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Calculate content styles with the current width
  const contentStyles = {
    width: "100%",
    maxWidth: contentWidth,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "32px", // Increased spacing between sections
  };

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
          </p>
          <p style={paragraphStyles}>
            Inspired by ancient <a href="https://www.dhammawiki.com/index.php/10_kasinas" target="_blank" rel="noopener noreferrer" style={{ color: "#93c5fd", textDecoration: "underline" }}>kasina</a> practices, reimagined for the modern meditator.
          </p>
          
          {/* "Featuring" header */}
          <p style={{
            color: "#f9fafb", 
            fontSize: "20px", 
            fontWeight: "bold",
            marginBottom: "20px",
            textAlign: "center"
          }}>
            Featuring:
          </p>
          
          <div>
            <p style={listItemStyles}>⏱️ 🧘‍♀️ Kasina mode with 10 visual orbs plus meditation timer</p>
            <p style={listItemStyles}>4️⃣ Color Orbs: ⚪ 🟡 🔴 🔵</p>
            <p style={listItemStyles}>6️⃣ Elemental Orbs: 🌎 💧 🔥 💨 ✨ ☀️</p>
            <p style={listItemStyles} className="mb-0">📊 📈 Visualize your meditation history with practice breakdowns</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
