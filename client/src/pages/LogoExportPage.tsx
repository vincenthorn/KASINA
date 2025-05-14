import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import Layout from '../components/Layout';
import '../styles/logoExport.css';

// Yellow color for KASINA branding
const YELLOW_COLOR = '#F9D923';

const LogoExportPage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const navigate = useNavigate();
  
  // Render the logo when the component mounts
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const size = canvas.width; // Square canvas
    
    // Clear canvas to ensure transparency
    ctx.clearRect(0, 0, size, size);
    
    // Calculate dimensions
    const orbSize = size * 0.4; // 40% of canvas size
    const orbX = size / 2;
    const orbY = size * 0.35; // Position orb at 35% from top
    
    // Draw orb glow
    const gradient = ctx.createRadialGradient(orbX, orbY, orbSize * 0.4, orbX, orbY, orbSize);
    gradient.addColorStop(0, YELLOW_COLOR);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbSize, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw solid orb
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbSize * 0.8, 0, 2 * Math.PI);
    ctx.fillStyle = YELLOW_COLOR;
    ctx.fill();
    
    // Make sure Nunito font is loaded before drawing text
    const font = new FontFace('Nunito', 'url(https://fonts.gstatic.com/s/nunito/v25/XRXV3I6Li01BKofINeaB.woff2)');
    
    font.load().then(() => {
      // Add font to document
      document.fonts.add(font);
      
      // Draw KASINA text
      const fontSize = size * 0.14; // 14% of canvas size
      ctx.font = `bold ${fontSize}px 'Nunito', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = YELLOW_COLOR;
      ctx.textBaseline = 'middle';
      
      // Position text below orb
      const textY = size * 0.7; // 70% from top
      ctx.fillText('KASINA', size / 2, textY);
    }).catch(err => {
      console.error('Error loading Nunito font:', err);
      
      // Fallback to standard sans-serif if Nunito fails to load
      const fontSize = size * 0.14;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = YELLOW_COLOR;
      ctx.textBaseline = 'middle';
      
      // Position text below orb
      const textY = size * 0.7;
      ctx.fillText('KASINA', size / 2, textY);
    });
  }, []);
  
  // Function to download the logo as a PNG
  const downloadLogo = () => {
    if (!canvasRef.current) return;
    
    setIsDownloading(true);
    
    try {
      // Convert canvas to data URL
      const dataURL = canvasRef.current.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.download = 'kasina-logo-yellow.png';
      link.href = dataURL;
      link.click();
      
      // Clean up
      setTimeout(() => {
        setIsDownloading(false);
      }, 1000);
    } catch (error) {
      console.error('Error downloading logo:', error);
      setIsDownloading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="logo-export-container flex flex-col items-center justify-center bg-white rounded-lg shadow-sm py-8 px-6 mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-2">KASINA Yellow Logo Export</h1>
          <p className="text-gray-600">Generate a transparent PNG of the KASINA logo with yellow orb</p>
        </header>
        
        <div className="canvas-container relative mb-8">
          <canvas 
            ref={canvasRef} 
            width={512} 
            height={512} 
            className="bg-grid rounded-md border border-gray-300 w-full"
          />
        </div>
        
        <div className="flex flex-wrap gap-4 justify-center">
          <Button 
            onClick={downloadLogo} 
            disabled={isDownloading}
            style={{ backgroundColor: YELLOW_COLOR, borderColor: YELLOW_COLOR }}
            className="hover:bg-yellow-600 text-white font-medium"
          >
            {isDownloading ? 'Downloading...' : 'Download PNG'}
          </Button>
          
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
          >
            Back to KASINA
          </Button>
        </div>
        
        <div className="mt-8 max-w-md text-center text-gray-600">
          <p>This is a square ratio PNG (512×512px) of the KASINA logo with a yellow orb above the text, all on a transparent background. Perfect for website favicons and promotional materials.</p>
        </div>
      </div>
    </div>
  );
};

export default LogoExportPage;