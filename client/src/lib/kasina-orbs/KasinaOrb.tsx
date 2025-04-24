import { useEffect, useState } from "react";
import { KasinaType } from "../types";
import ColorKasina from "./ColorKasina";
import ElementalKasina from "./ElementalKasina";

interface KasinaOrbProps {
  type: KasinaType;
  color: string;
  emissive?: string;
  speed?: number;
  complexity?: number;
}

const KasinaOrb = ({ 
  type,
  color,
  emissive,
  speed = 0.5,
  complexity = 2
}: KasinaOrbProps) => {
  // Determine if this is a color or elemental kasina
  const isColorKasina = ["white", "blue", "red", "yellow"].includes(type);
  const isElementalKasina = ["water", "air", "fire", "earth", "space", "light"].includes(type);
  
  if (isColorKasina) {
    return (
      <ColorKasina
        color={color}
        emissive={emissive}
        speed={speed}
        pulsate={true}
      />
    );
  }
  
  if (isElementalKasina) {
    return (
      <ElementalKasina
        type={type as any}
        color={color}
        emissive={emissive}
        speed={speed}
        complexity={complexity}
      />
    );
  }
  
  // Fallback to blue color kasina if type is not recognized
  return <ColorKasina color="#0000FF" speed={0.4} />;
};

export default KasinaOrb;
