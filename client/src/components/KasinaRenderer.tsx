import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { KASINA_TYPES, KASINA_COLORS, KASINA_BACKGROUNDS } from '../lib/constants';
import WhiteAKasina from './WhiteAKasina';
import WhiteAThigle from './WhiteAThigle';
import OmKasina from './OmKasina';
import AhKasina from './AhKasina';
import HumKasina from './HumKasina';
import RainbowKasina from './RainbowKasina';
import * as THREE from 'three';

interface KasinaRendererProps {
  selectedKasina: string;
  sizeMultiplier: number;
  breathValue?: number;
  showImmersiveBackground?: boolean;
}

// Unified shader materials for elemental kasinas
const waterShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#0065b3") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      vec3 pos = position;
      pos += normal * sin(time * 2.0 + position.y * 10.0) * 0.01;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec2 uv = vUv;
      
      float wave1 = sin(uv.x * 20.0 + time * 2.0) * 0.1;
      float wave2 = sin(uv.y * 15.0 + time * 1.5) * 0.1;
      float combined = wave1 + wave2;
      
      vec3 waterColor = color + vec3(combined * 0.3);
      waterColor = mix(waterColor, vec3(0.4, 0.8, 1.0), combined * 0.2);
      
      gl_FragColor = vec4(waterColor, opacity);
    }
  `
};

const fireShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#FF6600") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      vec3 pos = position;
      float noise = sin(position.x * 10.0 + time * 3.0) * sin(position.z * 10.0 + time * 2.0);
      pos.y += noise * 0.02;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec2 uv = vUv;
      
      float flame1 = sin(uv.y * 30.0 + time * 4.0) * 0.2;
      float flame2 = sin(uv.x * 25.0 + time * 3.0) * 0.15;
      float flicker = flame1 + flame2;
      
      vec3 fireColor = color + vec3(flicker * 0.4, flicker * 0.2, 0.0);
      fireColor = mix(fireColor, vec3(1.0, 0.4, 0.0), abs(flicker) * 0.3);
      
      gl_FragColor = vec4(fireColor, opacity);
    }
  `
};

const airShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#a0d6f7") },
    opacity: { value: 0.7 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      vec3 pos = position;
      float wave = sin(time * 1.5 + position.x * 5.0) * sin(time * 2.0 + position.z * 3.0);
      pos += normal * wave * 0.015;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec2 uv = vUv;
      
      float swirl1 = sin(uv.x * 15.0 + time * 2.0) * 0.1;
      float swirl2 = cos(uv.y * 12.0 + time * 1.8) * 0.1;
      float movement = swirl1 + swirl2;
      
      vec3 airColor = color + vec3(movement * 0.2);
      airColor = mix(airColor, vec3(0.8, 0.9, 1.0), abs(movement) * 0.3);
      
      gl_FragColor = vec4(airColor, opacity);
    }
  `
};

const earthShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#CC6633") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      vec3 pos = position;
      float pulse = sin(time * 1.0) * 0.005;
      pos += normal * pulse;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec2 uv = vUv;
      
      float texture1 = sin(uv.x * 40.0) * sin(uv.y * 30.0) * 0.1;
      float texture2 = sin(uv.x * 25.0 + time * 0.5) * 0.05;
      float earthTexture = texture1 + texture2;
      
      vec3 earthColor = color + vec3(earthTexture * 0.3, earthTexture * 0.2, 0.0);
      earthColor = mix(earthColor, vec3(0.6, 0.4, 0.2), abs(earthTexture) * 0.4);
      
      gl_FragColor = vec4(earthColor, opacity);
    }
  `
};

const spaceShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#330066") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      vec3 pos = position;
      float cosmic = sin(time * 0.8 + length(position) * 3.0) * 0.008;
      pos += normalize(position) * cosmic;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec2 uv = vUv;
      
      float stars1 = sin(uv.x * 80.0) * sin(uv.y * 60.0);
      float stars2 = cos(uv.x * 50.0 + time * 0.3) * cos(uv.y * 40.0 + time * 0.2);
      float starField = max(0.0, stars1 * stars2) * 0.3;
      
      vec3 spaceColor = color + vec3(starField);
      spaceColor = mix(spaceColor, vec3(0.1, 0.0, 0.3), starField * 0.5);
      
      gl_FragColor = vec4(spaceColor, opacity);
    }
  `
};

const lightShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#FFFFCC") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      vec3 pos = position;
      float glow = sin(time * 2.0) * 0.01;
      pos += normal * glow;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vec2 uv = vUv;
      
      float radial = 1.0 - length(uv - 0.5) * 2.0;
      float pulse = sin(time * 3.0) * 0.2 + 0.8;
      float brightness = radial * pulse;
      
      vec3 lightColor = color * (1.0 + brightness * 0.5);
      lightColor = mix(lightColor, vec3(1.0, 1.0, 0.8), brightness * 0.3);
      
      gl_FragColor = vec4(lightColor, opacity);
    }
  `
};

export default function KasinaRenderer({ 
  selectedKasina, 
  sizeMultiplier, 
  breathValue = 1.0, 
  showImmersiveBackground = false 
}: KasinaRendererProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const immersionBackgroundRef = useRef<THREE.Mesh>(null);
  const waterMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const fireMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const airMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const earthMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const spaceMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const lightMaterialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Apply breathing animation
      const scale = sizeMultiplier * breathValue;
      meshRef.current.scale.setScalar(scale);
      
      // Gentle rotation for sphere kasinas
      if (isSphericalKasina(selectedKasina)) {
        meshRef.current.rotation.y += 0.002;
      }
    }

    // Update immersion background if enabled
    if (immersionBackgroundRef.current && showImmersiveBackground) {
      const scale = 150 * breathValue;
      immersionBackgroundRef.current.scale.setScalar(scale);
    }

    // Update shader uniforms
    const time = state.clock.getElapsedTime();
    if (waterMaterialRef.current) waterMaterialRef.current.uniforms.time.value = time;
    if (fireMaterialRef.current) fireMaterialRef.current.uniforms.time.value = time;
    if (airMaterialRef.current) airMaterialRef.current.uniforms.time.value = time;
    if (earthMaterialRef.current) earthMaterialRef.current.uniforms.time.value = time;
    if (spaceMaterialRef.current) spaceMaterialRef.current.uniforms.time.value = time;
    if (lightMaterialRef.current) lightMaterialRef.current.uniforms.time.value = time;
  });

  // Determine if kasina should be rendered as sphere
  const isSphericalKasina = (kasina: string) => {
    return ![
      KASINA_TYPES.WHITE_A_THIGLE,
      KASINA_TYPES.WHITE_A_KASINA,
      KASINA_TYPES.OM_KASINA,
      KASINA_TYPES.AH_KASINA,
      KASINA_TYPES.HUM_KASINA,
      KASINA_TYPES.RAINBOW_KASINA
    ].includes(kasina);
  };

  // Get background color for current kasina
  const getBackgroundColor = () => {
    return KASINA_BACKGROUNDS[selectedKasina] || '#000000';
  };

  // Render Vajrayana kasinas (text-based)
  if (!isSphericalKasina(selectedKasina)) {
    return (
      <>
        {/* Invisible sphere for breath animation reference */}
        <mesh ref={meshRef} visible={false} position={[0, 0, -100]}>
          <sphereGeometry args={[1, 64, 64]} />
        </mesh>
        
        {/* Render the appropriate Vajrayana component */}
        {selectedKasina === KASINA_TYPES.WHITE_A_THIGLE && <WhiteAThigle />}
        {selectedKasina === KASINA_TYPES.WHITE_A_KASINA && <WhiteAKasina />}
        {selectedKasina === KASINA_TYPES.OM_KASINA && <OmKasina />}
        {selectedKasina === KASINA_TYPES.AH_KASINA && <AhKasina />}
        {selectedKasina === KASINA_TYPES.HUM_KASINA && <HumKasina />}
        {selectedKasina === KASINA_TYPES.RAINBOW_KASINA && <RainbowKasina />}
      </>
    );
  }

  // Render elemental kasinas with shaders
  if (selectedKasina === KASINA_TYPES.WATER) {
    return (
      <>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={waterMaterialRef}
            uniforms={waterShader.uniforms}
            vertexShader={waterShader.vertexShader}
            fragmentShader={waterShader.fragmentShader}
            transparent={true}
          />
        </mesh>
        {showImmersiveBackground && (
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={waterShader.uniforms}
              vertexShader={waterShader.vertexShader}
              fragmentShader={waterShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </>
    );
  }

  if (selectedKasina === KASINA_TYPES.FIRE) {
    return (
      <>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={fireMaterialRef}
            uniforms={fireShader.uniforms}
            vertexShader={fireShader.vertexShader}
            fragmentShader={fireShader.fragmentShader}
            transparent={true}
          />
        </mesh>
        {showImmersiveBackground && (
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={fireShader.uniforms}
              vertexShader={fireShader.vertexShader}
              fragmentShader={fireShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </>
    );
  }

  if (selectedKasina === KASINA_TYPES.AIR) {
    return (
      <>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={airMaterialRef}
            uniforms={airShader.uniforms}
            vertexShader={airShader.vertexShader}
            fragmentShader={airShader.fragmentShader}
            transparent={true}
          />
        </mesh>
        {showImmersiveBackground && (
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={airShader.uniforms}
              vertexShader={airShader.vertexShader}
              fragmentShader={airShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </>
    );
  }

  if (selectedKasina === KASINA_TYPES.EARTH) {
    return (
      <>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={earthMaterialRef}
            uniforms={earthShader.uniforms}
            vertexShader={earthShader.vertexShader}
            fragmentShader={earthShader.fragmentShader}
            transparent={true}
          />
        </mesh>
        {showImmersiveBackground && (
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={earthShader.uniforms}
              vertexShader={earthShader.vertexShader}
              fragmentShader={earthShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </>
    );
  }

  if (selectedKasina === KASINA_TYPES.SPACE) {
    return (
      <>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={spaceMaterialRef}
            uniforms={spaceShader.uniforms}
            vertexShader={spaceShader.vertexShader}
            fragmentShader={spaceShader.fragmentShader}
            transparent={true}
          />
        </mesh>
        {showImmersiveBackground && (
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={spaceShader.uniforms}
              vertexShader={spaceShader.vertexShader}
              fragmentShader={spaceShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </>
    );
  }

  if (selectedKasina === KASINA_TYPES.LIGHT) {
    return (
      <>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1, 64, 64]} />
          <shaderMaterial
            ref={lightMaterialRef}
            uniforms={lightShader.uniforms}
            vertexShader={lightShader.vertexShader}
            fragmentShader={lightShader.fragmentShader}
            transparent={true}
          />
        </mesh>
        {showImmersiveBackground && (
          <mesh ref={immersionBackgroundRef}>
            <sphereGeometry args={[1, 64, 64]} />
            <shaderMaterial
              uniforms={lightShader.uniforms}
              vertexShader={lightShader.vertexShader}
              fragmentShader={lightShader.fragmentShader}
              transparent={true}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </>
    );
  }

  // Render basic color kasinas
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial color={KASINA_COLORS[selectedKasina]} />
    </mesh>
  );
}

// Export background color helper
export const getKasinaBackgroundColor = (selectedKasina: string) => {
  return KASINA_BACKGROUNDS[selectedKasina] || '#000000';
};