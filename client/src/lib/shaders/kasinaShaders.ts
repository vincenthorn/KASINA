import * as THREE from 'three';

// Universal Kasina Shaders - Shared across Visual and Breath modes
// This ensures consistent appearance and easier maintenance

export const waterShader = {
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
      float deformAmount = 0.025;
      pos += normal * sin(position.x * 2.0 + position.y * 3.0 + time * 0.7) * deformAmount;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }
    
    float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      
      float n = p.x + p.y * 57.0 + p.z * 113.0;
      return mix(
        mix(
          mix(hash(n), hash(n + 1.0), f.x),
          mix(hash(n + 57.0), hash(n + 58.0), f.x),
          f.y),
        mix(
          mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x),
          f.y),
        f.z);
    }
    
    float waterFlow(vec3 p, float t) {
      // Use 3D position directly instead of spherical coordinates to avoid seams
      vec3 pos = normalize(p);
      
      float flow = 0.0;
      for (float i = 1.0; i <= 4.0; i++) {
        float speed = 0.4 - 0.05 * i;
        float scale = pow(1.8, i - 1.0);
        float intensity = pow(0.7, i);
        
        // Use seamless 3D coordinates instead of spherical
        vec3 flowCoord = pos * 3.0 * scale + vec3(
          t * speed * 0.3,
          t * speed * 0.5,
          t * speed * 0.7
        );
        
        flow += noise(flowCoord) * intensity;
      }
      
      return flow * 0.6;
    }
    
    void main() {
      float flowValue = waterFlow(vPosition, time);
      
      // Brighter, more vibrant water colors for better contrast against dark background
      vec3 deepBlue = vec3(0.1, 0.4, 0.8);      // Brighter deep blue
      vec3 oceanBlue = vec3(0.2, 0.5, 0.9);     // Bright ocean blue
      vec3 aquaBlue = vec3(0.3, 0.7, 1.0);      // Bright aqua
      vec3 lightAqua = vec3(0.4, 0.8, 1.0);     // Light aqua
      vec3 crystalBlue = vec3(0.6, 0.9, 1.0);   // Crystal blue highlights
      
      vec3 p = normalize(vPosition);
      float waves = 0.0;
      waves += sin(p.x * 8.0 + p.y * 4.0 + time * 0.8) * 0.08;
      waves += sin(p.y * 7.0 - p.z * 5.0 + time * 0.6) * 0.06;
      waves += sin(p.z * 6.0 + p.x * 3.0 + time * 0.4) * 0.04;
      
      flowValue += waves;
      
      vec3 waterColor;
      if (flowValue < 0.25) {
        float t = flowValue / 0.25;
        waterColor = mix(deepBlue, oceanBlue, t);
      } else if (flowValue < 0.5) {
        float t = (flowValue - 0.25) / 0.25;
        waterColor = mix(oceanBlue, aquaBlue, t);
      } else if (flowValue < 0.75) {
        float t = (flowValue - 0.5) / 0.25;
        waterColor = mix(aquaBlue, lightAqua, t);
      } else {
        float t = (flowValue - 0.75) / 0.25;
        waterColor = mix(lightAqua, crystalBlue, t);
      }
      
      float fresnel = pow(1.0 - max(0.0, dot(normalize(vPosition), vec3(0.0, 0.0, 1.0))), 2.0);
      // Enhanced ripples for more dynamic water effect
      float ripples = sin(length(p) * 30.0 - time * 1.0) * 0.015;
      ripples += sin(p.x * 12.0 + p.y * 12.0 + p.z * 8.0 + time * 0.8) * 0.025;
      ripples += sin(p.y * 8.0 + p.z * 8.0 + p.x * 6.0 + time * 1.2) * 0.02;
      
      // Enhanced glow and highlights for better visibility
      float glow = pow(1.0 - length(vPosition) * 0.5, 2.0) * 0.25;
      float highlight = fresnel * 0.25;
      
      vec3 finalColor = waterColor + ripples + glow + highlight;
      gl_FragColor = vec4(finalColor, opacity * 0.95);
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
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    void main() {
      vec2 p = -1.0 + 2.0 * vUv;
      float a = time * 0.05;
      float s = sin(a * 2.0);
      float c = cos(a * 2.0);
      
      float d = pow(1.0 - length(p), 2.0);
      vec2 q = vec2(p.x * c - p.y * s, p.x * s + p.y * c) * d;
      
      float f = 0.0;
      for(float i = 1.0; i < 6.0; i++) {
        float t = time * (0.1 + 0.05 * i);
        f += sin(q.x * i + t) * sin(q.y * i + t);
      }
      
      vec3 finalColor = color + 0.15 * sin(f);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export const earthShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#CD853F") }, // Terra cotta base color
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
    
    // Simple noise function for subtle terra cotta texture
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }
    
    float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      
      float n = p.x + p.y * 57.0 + p.z * 113.0;
      return mix(
        mix(
          mix(hash(n), hash(n + 1.0), f.x),
          mix(hash(n + 57.0), hash(n + 58.0), f.x),
          f.y),
        mix(
          mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x),
          f.y),
        f.z);
    }
    
    void main() {
      // Terra cotta color palette - warm, earthy tones
      vec3 deepTerra = vec3(0.6, 0.35, 0.2);     // Deep terra cotta
      vec3 baseTerra = vec3(0.8, 0.52, 0.25);    // Base terra cotta  
      vec3 lightTerra = vec3(0.9, 0.65, 0.4);    // Light terra cotta
      vec3 warmTerra = vec3(0.95, 0.7, 0.45);    // Warm highlights
      
      // Use 3D position for seamless texture
      vec3 pos = normalize(vPosition);
      
      // Create subtle terra cotta variations with multiple noise layers
      float earthFlow = 0.0;
      for (float i = 1.0; i <= 3.0; i++) {
        float speed = 0.02 - 0.005 * i; // Very slow, earthy movement
        float scale = pow(2.0, i - 1.0);
        float intensity = pow(0.8, i);
        
        vec3 flowCoord = pos * 2.0 * scale + vec3(
          time * speed * 0.1,
          time * speed * 0.15,
          time * speed * 0.08
        );
        
        earthFlow += noise(flowCoord) * intensity;
      }
      
      earthFlow = earthFlow * 0.4; // Subtle variation
      
      // Add gentle breathing-like variation
      float pulse = sin(time * 0.3) * 0.05 + sin(time * 0.7) * 0.03;
      earthFlow += pulse;
      
      // Smooth color gradients for terra cotta appearance
      vec3 terraCottaColor;
      if (earthFlow < 0.25) {
        float t = earthFlow / 0.25;
        terraCottaColor = mix(deepTerra, baseTerra, t);
      } else if (earthFlow < 0.5) {
        float t = (earthFlow - 0.25) / 0.25;
        terraCottaColor = mix(baseTerra, lightTerra, t);
      } else if (earthFlow < 0.75) {
        float t = (earthFlow - 0.5) / 0.25;
        terraCottaColor = mix(lightTerra, warmTerra, t);
      } else {
        float t = (earthFlow - 0.75) / 0.25;
        terraCottaColor = mix(warmTerra, lightTerra, t);
      }
      
      // Subtle surface variations that maintain smoothness
      float surfaceVariation = sin(pos.x * 6.0 + pos.y * 4.0 + time * 0.1) * 0.03;
      surfaceVariation += sin(pos.y * 5.0 - pos.z * 3.0 + time * 0.15) * 0.02;
      surfaceVariation += sin(pos.z * 4.0 + pos.x * 7.0 + time * 0.08) * 0.025;
      
      // Apply surface variation
      terraCottaColor += surfaceVariation;
      
      // Gentle ambient lighting for dimensionality without harsh contrasts
      float fresnel = pow(1.0 - max(0.0, dot(normalize(vPosition), vec3(0.0, 0.0, 1.0))), 1.5);
      float ambientGlow = 0.1 + fresnel * 0.15;
      
      // Soft inner glow for terra cotta warmth
      float innerGlow = pow(1.0 - length(vPosition) * 0.4, 1.2) * 0.1;
      
      vec3 finalColor = terraCottaColor + ambientGlow + innerGlow;
      
      // Ensure the color stays within terra cotta range
      finalColor = clamp(finalColor, vec3(0.5, 0.3, 0.15), vec3(1.0, 0.8, 0.6));
      
      gl_FragColor = vec4(finalColor, opacity);
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
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      // Perfect uniform sphere - no lighting effects
      vec3 baseColor = color;
      
      // Add very subtle star-like sparkle effect for space theme
      vec2 sparkleUv = vUv * 30.0 + time * 0.05;
      float sparkle = rand(floor(sparkleUv)) * step(0.99, rand(floor(sparkleUv) + 0.1));
      sparkle *= sin(time * 8.0 + rand(floor(sparkleUv)) * 6.28) * 0.5 + 0.5;
      
      vec3 finalColor = baseColor + vec3(sparkle * 0.1);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export const lightShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#fffaf0") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    
    void main() {
      // Perfect uniform sphere - no lighting effects
      vec3 baseColor = color;
      
      // Add very gentle pulsing effect (uniform across the sphere)
      float pulse = 0.05 * sin(time * 1.5) + 1.0;
      
      vec3 finalColor = baseColor * pulse;
      gl_FragColor = vec4(finalColor, 1.0);
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