import * as THREE from 'three';

// Universal Kasina Shaders - Shared across Visual and Breath modes
// This ensures consistent appearance and easier maintenance

export const waterShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#4fc3f7") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vec3 pos = vPosition;
      
      // Water base color
      vec3 waterColor = vec3(0.2, 0.6, 0.9);
      
      // Create ripple patterns using seamless 3D coordinates
      float ripple1 = sin(pos.x * 8.0 + time * 2.0) * 0.3;
      float ripple2 = sin(pos.y * 6.0 + time * 1.5) * 0.2;
      float ripple3 = sin(pos.z * 10.0 + time * 3.0) * 0.1;
      
      vec3 ripples = vec3(ripple1, ripple2, ripple3) * 0.4;
      
      // Glow effect
      float glow = sin(time * 1.5) * 0.1 + 0.9;
      
      // Highlight
      vec3 highlight = vec3(0.1, 0.3, 0.5) * sin(time * 4.0 + pos.x * 3.0) * 0.3;
      
      vec3 finalColor = waterColor + ripples + glow + highlight;
      gl_FragColor = vec4(finalColor, opacity * 0.9);
    }
  `
};

export const fireShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#ff6600") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vec3 pos = vPosition;
      
      // Fire base color
      vec3 fireColor = vec3(1.0, 0.4, 0.0);
      
      // Create flame patterns similar to water but with different frequencies
      float flame1 = sin(pos.x * 10.0 + time * 4.0) * 0.4;
      float flame2 = sin(pos.y * 8.0 + time * 3.5) * 0.3;
      float flame3 = sin(pos.z * 12.0 + time * 5.0) * 0.2;
      
      vec3 flames = vec3(flame1 + 0.3, flame2 + 0.2, flame3) * 0.6;
      
      // Glow effect
      float glow = sin(time * 2.0) * 0.1 + 0.9;
      
      // Highlight
      vec3 highlight = vec3(0.3, 0.1, 0.0) * sin(time * 6.0 + pos.x * 5.0) * 0.2;
      
      vec3 finalColor = fireColor + flames + glow + highlight;
      gl_FragColor = vec4(finalColor, opacity * 0.9);
    }
  `
};

export const airShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#d3f0ff") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vec3 pos = vPosition;
      
      vec3 airColor = vec3(0.7, 0.9, 1.0);
      
      float flow1 = sin(pos.x * 4.0 + time * 1.5) * 0.2;
      float flow2 = sin(pos.y * 3.0 + time * 1.2) * 0.15;
      float flow3 = sin(pos.z * 5.0 + time * 2.0) * 0.1;
      
      vec3 flows = vec3(flow1, flow2, flow3) * 0.5;
      
      float transparency = sin(time * 1.0) * 0.1 + 0.7;
      
      vec3 finalColor = airColor + flows;
      gl_FragColor = vec4(finalColor, opacity * transparency);
    }
  `
};

export const earthShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#8b4513") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vec3 pos = vPosition;
      
      vec3 earthColor = vec3(0.6, 0.4, 0.2);
      
      float texture1 = sin(pos.x * 12.0 + time * 0.5) * 0.1;
      float texture2 = sin(pos.y * 8.0 + time * 0.3) * 0.08;
      float texture3 = sin(pos.z * 15.0 + time * 0.7) * 0.06;
      
      vec3 textures = vec3(texture1, texture2, texture3) * 0.3;
      
      float stability = sin(time * 0.5) * 0.05 + 0.95;
      
      vec3 finalColor = earthColor + textures;
      gl_FragColor = vec4(finalColor, opacity * stability);
    }
  `
};

export const spaceShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#000000") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vec3 pos = vPosition;
      
      vec3 spaceColor = vec3(0.05, 0.05, 0.15);
      
      float depth1 = sin(pos.x * 6.0 + time * 0.8) * 0.1;
      float depth2 = sin(pos.y * 4.0 + time * 0.6) * 0.08;
      float depth3 = sin(pos.z * 8.0 + time * 1.0) * 0.06;
      
      vec3 depths = vec3(depth1, depth2, depth3) * 0.4;
      
      float void_effect = sin(time * 0.3) * 0.05 + 0.9;
      
      vec3 finalColor = spaceColor + depths;
      gl_FragColor = vec4(finalColor, opacity * void_effect);
    }
  `
};

export const lightShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#ffffff") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vec3 pos = vPosition;
      
      vec3 lightColor = vec3(1.0, 1.0, 0.95);
      
      float radiance1 = sin(pos.x * 5.0 + time * 1.2) * 0.1;
      float radiance2 = sin(pos.y * 3.0 + time * 0.9) * 0.08;
      float radiance3 = sin(pos.z * 7.0 + time * 1.5) * 0.06;
      
      vec3 radiances = vec3(radiance1, radiance2, radiance3) * 0.3;
      
      float brightness = sin(time * 0.8) * 0.1 + 0.95;
      
      vec3 finalColor = lightColor + radiances;
      gl_FragColor = vec4(finalColor, opacity * brightness);
    }
  `
};

// Shader selection utility
export const getKasinaShader = (kasinaType: string) => {
  switch (kasinaType?.toLowerCase()) {
    case 'water':
      return waterShader;
    case 'fire':
      return fireShader;
    case 'air':
      return airShader;
    case 'earth':
      return earthShader;
    case 'space':
      return spaceShader;
    case 'light':
      return lightShader;
    default:
      return lightShader; // Default fallback
  }
};