import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import ColorWheelPicker from './ColorWheelPicker';

interface CustomColorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customColor: string;
  onColorChange: (color: string) => void;
  onSelect: () => void;
  children: React.ReactNode;
}

const CustomColorDialog: React.FC<CustomColorDialogProps> = ({
  isOpen,
  onOpenChange,
  customColor,
  onColorChange,
  onSelect,
  children
}) => {
  const handleColorChange = (newColor: string) => {
    onColorChange(newColor);
  };

  const handleSelectColor = () => {
    onSelect();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-center">
            Choose Your Custom Color
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Color Wheel Picker */}
          <ColorWheelPicker
            value={customColor}
            onChange={handleColorChange}
            className="flex flex-col items-center"
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelectColor}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              style={{ backgroundColor: customColor }}
            >
              Select Color
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomColorDialog;