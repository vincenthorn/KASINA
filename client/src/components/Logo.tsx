import React from "react";
import AnimatedOrb from "./AnimatedOrb";
import { useColor } from "../lib/contexts/ColorContext";

// Adding html2canvas type declaration
declare const html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;

interface LogoProps {
  size?: "small" | "medium" | "large";
  showTagline?: boolean;
  showOrb?: boolean;
  sidebarMode?: boolean; // Special mode for sidebar with extra-small tagline
  loginPage?: boolean; // Special mode for login page with reduced glow
  alwaysVertical?: boolean; // Force vertical layout regardless of screen size
}

const Logo: React.FC<LogoProps & { onExport?: (format: 'svg' | 'png') => void }> = ({ 
  size = "medium", 
  showTagline = true, 
  showOrb = true,
  sidebarMode = false,
  loginPage = false,
  alwaysVertical = false,
  onExport
}) => {

  const exportLogo = (format: 'svg' | 'png') => {
    const logoElement = document.querySelector('.logo-container');
    if (!logoElement) return;

    if (format === 'svg') {
      const svgData = new XMLSerializer().serializeToString(logoElement as SVGElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'kasina-logo.svg';
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png') {
      html2canvas(logoElement as HTMLElement).then((canvas: HTMLCanvasElement) => {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = 'kasina-logo.png';
        link.click();
      });
    }
  };
  // Use shared color context
  const { currentColor } = useColor();
  
  const sizeClasses = {
    small: "text-xl",
    medium: "text-3xl",
    large: "text-5xl",
  };
  
  const orbSizes = {
    small: 60,
    medium: 90,
    large: 160, // Increased from 120 to 160 for better visibility on login page
  };

  return (
    <div className={`${alwaysVertical ? 'flex-col' : 'md:flex-col flex'} items-center justify-center text-center w-full logo-container`}>
      {showOrb && (
        <div className={`${alwaysVertical ? 'mb-4 flex justify-center' : 'md:mb-4 mb-0 mr-3 md:mr-0'}`}>
          <AnimatedOrb 
            size={orbSizes[size]} 
            reducedGlow={loginPage} 
          />
        </div>
      )}
      <div className={`flex flex-col w-full ${alwaysVertical ? 'items-center text-center' : ''}`}>
        <h1 
          className={`font-bold ${sizeClasses[size]} text-center`}
          style={{ 
            color: currentColor,
            transition: "color 3s ease-in-out",
            fontFamily: "'Nunito', sans-serif", 
            letterSpacing: "2px",
            fontWeight: 700,
            textTransform: "uppercase"
          }}
        >
          KASINA
        </h1>
        {showTagline && (
          <p className={`text-white text-center w-full ${sidebarMode ? "-mt-1" : ""} ${
            sidebarMode ? "text-[10px]" : // Extra small for sidebar
            size === "large" ? "text-base" : 
            size === "medium" ? "text-sm" : 
            "text-xs"
          }`}>A Dynamic Meditation Object</p>
        )}
      </div>
    </div>
  );
};

export default Logo;
