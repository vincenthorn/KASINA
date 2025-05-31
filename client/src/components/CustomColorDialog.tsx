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
      <DialogContent className="sm:max-w-md bg-white border-gray-300 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-800 text-center">
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
              className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelectColor}
              className="flex-1 text-white hover:opacity-90 rounded-lg"
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