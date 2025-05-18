import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import LoginForm from "../components/LoginForm";

// Simple CSS for the page to ensure proper scrolling
const pageStyles = {
  minHeight: "100vh", // Use viewport height instead of 100%
  backgroundColor: "#0A0052", // Deep indigo/purple background
  backgroundImage: "linear-gradient(135deg, #0A0052 0%, #2a1570 100%)", // Gradient background
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
  maxWidth: "512px", // Updated to match login card width (max-w-lg = 512px)
  margin: "0 auto 24px auto",
  padding: "0 10px", // Add some padding for smaller screens
};

const listItemStyles = {
  color: "#d1d5db", // text-gray-300
  marginBottom: "16px", // Increased spacing
  fontSize: "17px", // Reduced from 19px
  lineHeight: "1.6",
  padding: "0 10px", // Add padding for smaller screens
  textAlign: "center" as const,
  maxWidth: "512px", // Match login card width
  margin: "0 auto" // Center the text
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
        {/* Login Form Section with Logo inside */}
        <div style={sectionStyles}>
          <LoginForm />
        </div>
        
        {/* Description Section */}
        <div style={sectionStyles}>
          <p style={paragraphStyles}>
            <b>KASINA</b> is visual meditation software for those ready to deepen their concentration with a dynamic meditation object. 
            Inspired by ancient <i style={{ fontStyle: 'italic' }}>kasina</i> practices, reimagined for the modern meditator.
          </p>
          
          {/* "Featuring" header */}
          <p style={{
            color: "#9d64ff", /* A darker purple shade */
            fontSize: "20px", 
            fontWeight: "bold",
            marginBottom: "20px",
            textAlign: "center",
            maxWidth: "512px", // Match login card width
            margin: "0 auto 20px auto" // Center and maintain bottom margin
          }}>
            Featuring:
          </p>
          
          <div style={{ maxWidth: "512px", margin: "0 auto" }}>
            <p style={listItemStyles}>
              4️⃣ Color Orbs: ⚪ 🟡 🔴 🔵
              <span style={{ 
                color: "#4AA8D8", 
                fontSize: "12px", 
                fontWeight: "bold", 
                marginLeft: "8px", 
                backgroundColor: "rgba(74, 168, 216, 0.2)", 
                padding: "2px 6px", 
                borderRadius: "4px" 
              }}>
                ✧ FREEMIUM
              </span>
            </p>
            <p style={listItemStyles}>
              ♾️ Color Options: 🎨
              <span style={{ 
                color: "#FFD700", 
                fontSize: "12px", 
                fontWeight: "bold", 
                marginLeft: "8px", 
                backgroundColor: "rgba(138, 43, 226, 0.2)", 
                padding: "2px 6px", 
                borderRadius: "4px" 
              }}>
                ✦ PREMIUM
              </span>
            </p>
            <p style={listItemStyles}>
              6️⃣ Elemental Orbs: 🌎 💧 🔥 💨 ✨ ☀️
              <span style={{ 
                color: "#4AA8D8", 
                fontSize: "12px", 
                fontWeight: "bold", 
                marginLeft: "8px", 
                backgroundColor: "rgba(74, 168, 216, 0.2)", 
                padding: "2px 6px", 
                borderRadius: "4px" 
              }}>
                ✧ FREEMIUM
              </span>
            </p>
            <p style={listItemStyles}>
              6️⃣ Vajrayana Kasinas: 🕉️ 🔮 🌀 ⚡️ 🌈 Ⓐ
              <span style={{ 
                color: "#FFD700", 
                fontSize: "12px", 
                fontWeight: "bold", 
                marginLeft: "8px", 
                backgroundColor: "rgba(138, 43, 226, 0.2)", 
                padding: "2px 6px", 
                borderRadius: "4px" 
              }}>
                ✦ PREMIUM
              </span>
            </p>
            <p style={listItemStyles}>
              📊 Reflect on your meditation practice history
              <span style={{ 
                color: "#4AA8D8", 
                fontSize: "12px", 
                fontWeight: "bold", 
                marginLeft: "8px", 
                backgroundColor: "rgba(74, 168, 216, 0.2)", 
                padding: "2px 6px", 
                borderRadius: "4px" 
              }}>
                ✧ FREEMIUM
              </span>
            </p>
            <p style={listItemStyles}>
              ⏱️ Kasina selection mode with meditation timer
              <span style={{ 
                color: "#4AA8D8", 
                fontSize: "12px", 
                fontWeight: "bold", 
                marginLeft: "8px", 
                backgroundColor: "rgba(74, 168, 216, 0.2)", 
                padding: "2px 6px", 
                borderRadius: "4px" 
              }}>
                ✧ FREEMIUM
              </span>
            </p>
            <div style={{ height: "70px" }} className="w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
