import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ColorWheelPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

interface HSV {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

const ColorWheelPicker: React.FC<ColorWheelPickerProps> = ({ value, onChange, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brightnessRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBrightnessDragging, setIsBrightnessDragging] = useState(false);
  const [hsv, setHSV] = useState<HSV>({ h: 0, s: 1, v: 1 });
  const [hexInput, setHexInput] = useState(value);

  // Convert HSV to RGB
  const hsvToRgb = useCallback((h: number, s: number, v: number): RGB => {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }, []);

  // Convert RGB to HSV
  const rgbToHsv = useCallback((r: number, g: number, b: number): HSV => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
      if (max === r) {
        h = ((g - b) / diff) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    return { h, s, v };
  }, []);

  // Convert RGB to HEX
  const rgbToHex = useCallback((r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }, []);

  // Convert HEX to RGB
  const hexToRgb = useCallback((hex: string): RGB | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }, []);

  // Draw the color wheel
  const drawColorWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;

      for (let r = 0; r < radius; r += 1) {
        const sat = r / radius;
        const rgb = hsvToRgb(angle, sat, hsv.v);
        
        ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, startAngle, endAngle);
        ctx.stroke();
      }
    }

    // Draw current position indicator
    const currentRadius = hsv.s * radius;
    const currentAngle = hsv.h * Math.PI / 180;
    const indicatorX = centerX + currentRadius * Math.cos(currentAngle);
    const indicatorY = centerY + currentRadius * Math.sin(currentAngle);

    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }, [hsv, hsvToRgb]);

  // Draw brightness slider
  const drawBrightnessSlider = useCallback(() => {
    const canvas = brightnessRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Create gradient from black to the current hue at full saturation
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#000000');
    
    const fullSatRgb = hsvToRgb(hsv.h, hsv.s, 1);
    gradient.addColorStop(1, `rgb(${fullSatRgb.r}, ${fullSatRgb.g}, ${fullSatRgb.b})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw current brightness position
    const indicatorX = hsv.v * width;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(indicatorX - 3, 0, 6, height);
    ctx.fill();
    ctx.stroke();
  }, [hsv, hsvToRgb]);

  // Handle wheel click/drag
  const handleWheelInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const normalizedAngle = angle < 0 ? angle + 360 : angle;
      const saturation = Math.min(distance / radius, 1);

      const newHSV = { ...hsv, h: normalizedAngle, s: saturation };
      setHSV(newHSV);

      const rgb = hsvToRgb(newHSV.h, newHSV.s, newHSV.v);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      setHexInput(hex);
      onChange(hex);
    }
  }, [hsv, hsvToRgb, rgbToHex, onChange]);

  // Handle brightness slider interaction
  const handleBrightnessInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = brightnessRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const brightness = Math.max(0, Math.min(1, x / canvas.width));

    const newHSV = { ...hsv, v: brightness };
    setHSV(newHSV);

    const rgb = hsvToRgb(newHSV.h, newHSV.s, newHSV.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
    onChange(hex);
  }, [hsv, hsvToRgb, rgbToHex, onChange]);

  // Handle hex input change
  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setHexInput(newHex);

    // Validate and convert hex to HSV
    if (/^#[0-9A-F]{6}$/i.test(newHex)) {
      const rgb = hexToRgb(newHex);
      if (rgb) {
        const newHSV = rgbToHsv(rgb.r, rgb.g, rgb.b);
        setHSV(newHSV);
        onChange(newHex);
      }
    }
  }, [hexToRgb, rgbToHsv, onChange]);

  // Initialize HSV from current value
  useEffect(() => {
    const rgb = hexToRgb(value);
    if (rgb) {
      const newHSV = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHSV(newHSV);
    }
    setHexInput(value);
  }, [value, hexToRgb, rgbToHsv]);

  // Redraw canvases when HSV changes
  useEffect(() => {
    drawColorWheel();
    drawBrightnessSlider();
  }, [drawColorWheel, drawBrightnessSlider]);

  // Mouse move handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          const normalizedAngle = angle < 0 ? angle + 360 : angle;
          const saturation = Math.min(distance / radius, 1);

          const newHSV = { ...hsv, h: normalizedAngle, s: saturation };
          setHSV(newHSV);

          const rgb = hsvToRgb(newHSV.h, newHSV.s, newHSV.v);
          const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
          setHexInput(hex);
          onChange(hex);
        }
      }

      if (isBrightnessDragging) {
        const canvas = brightnessRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const brightness = Math.max(0, Math.min(1, x / canvas.width));

        const newHSV = { ...hsv, v: brightness };
        setHSV(newHSV);

        const rgb = hsvToRgb(newHSV.h, newHSV.s, newHSV.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        setHexInput(hex);
        onChange(hex);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsBrightnessDragging(false);
    };

    if (isDragging || isBrightnessDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isBrightnessDragging, hsv, hsvToRgb, rgbToHex, onChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Color Wheel */}
      <div className="flex flex-col items-center space-y-2">
        <Label className="text-sm font-medium text-gray-700">Color Wheel</Label>
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="border border-gray-300 rounded-xl cursor-crosshair"
          onMouseDown={(e) => {
            setIsDragging(true);
            handleWheelInteraction(e);
          }}
          onClick={handleWheelInteraction}
        />
      </div>

      {/* Brightness Slider */}
      <div className="flex flex-col items-center space-y-2">
        <Label className="text-sm font-medium text-gray-700">Brightness</Label>
        <canvas
          ref={brightnessRef}
          width={200}
          height={20}
          className="border border-gray-300 rounded-lg cursor-pointer"
          onMouseDown={(e) => {
            setIsBrightnessDragging(true);
            handleBrightnessInteraction(e);
          }}
          onClick={handleBrightnessInteraction}
        />
      </div>

      {/* HEX Input */}
      <div className="flex flex-col space-y-2">
        <Label htmlFor="hex-input" className="text-sm font-medium text-gray-700">
          HEX Color Code
        </Label>
        <Input
          id="hex-input"
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          placeholder="#RRGGBB"
          pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
          className="bg-gray-50 text-gray-800 border-gray-300 focus:border-blue-400 text-center font-mono rounded-lg"
          maxLength={7}
        />
      </div>

      {/* Color Preview */}
      <div className="flex flex-col items-center space-y-2">
        <Label className="text-sm font-medium text-gray-700">Preview</Label>
        <div 
          className="w-12 h-12 border border-gray-300 rounded-full mx-auto"
          style={{ backgroundColor: hexInput }}
        />
      </div>
    </div>
  );
};

export default ColorWheelPicker;