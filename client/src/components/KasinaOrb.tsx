import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useKasina } from "../lib/stores/useKasina";
import { KASINA_TYPES, KASINA_COLORS, KASINA_BACKGROUNDS } from "../lib/constants";
import { KasinaType } from "../lib/types";
import { useAuth } from "../lib/stores/useAuth";
import WhiteAThigle from "./WhiteAThigle";

// Shader materials for the elemental kasinas
const waterShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#0065b3") }, // Deeper water base color
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    // Add slight vertex displacement for more dynamic water surface
    void main() {
      vUv = uv;
      vPosition = position;
      
      // Apply subtle vertex displacement for wave effect
      vec3 pos = position;
      
      // Only deform surface slightly, not too much to keep spherical shape
      float deformAmount = 0.025; // 2.5% deformation
      
      // Gentle wave motion on the surface
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
    
    // Hash function for noise
    float hash(float n) {
      return fract(sin(n) * 43758.5453);
    }
    
    // 3D noise function
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
    
    // Wave movement function
    vec3 waveDisplacement(vec3 p, float t) {
      // Convert to spherical coordinates for smooth mapping
      float radius = length(p);
      float theta = acos(p.z / radius);
      float phi = atan(p.y, p.x);
      
      // Create wave patterns
      // Fast primary wave
      float wave1 = sin(phi * 3.0 + theta * 4.0 + t * 0.6) * 0.5 + 0.5;
      // Secondary intersecting wave
      float wave2 = sin(phi * 5.0 - theta * 2.0 + t * 0.4) * 0.5 + 0.5;
      // Slow undulating wave
      float wave3 = sin(phi * 1.0 + t * 0.2) * 0.5 + 0.5;
      
      // Combine waves with different strengths for natural water movement
      float wave = wave1 * 0.6 + wave2 * 0.3 + wave3 * 0.1;
      
      // Return wave displacement vector
      return vec3(wave);
    }
    
    // Function to create fluid water currents
    float waterFlow(vec3 p, float t) {
      // Get basic wave displacement
      vec3 wave = waveDisplacement(p, t);
      
      // Convert to spherical for base mapping
      float radius = length(p);
      float theta = acos(p.z / radius);
      float phi = atan(p.y, p.x);
      
      // Apply wave displacement to coordinates for fluid motion
      phi += sin(wave.x * 3.1415) * 0.2; // Displace angle based on wave
      theta += cos(wave.y * 3.1415) * 0.15; // Displace another angle
      
      // Build layered water currents
      float flow = 0.0;
      
      // Add several layers of flowing noise
      for (float i = 1.0; i <= 4.0; i++) {
        // Faster flow speeds for more layers
        float speed = 0.4 - 0.05 * i;
        float scale = pow(1.8, i - 1.0);
        float intensity = pow(0.7, i); // Higher intensity for water currents
        
        // Create flowing water currents
        vec3 flowCoord = vec3(
          phi * 2.5 * scale + t * speed * sin(theta),
          theta * 2.5 * scale + t * speed * 0.5,
          radius * scale + t * speed
        );
        
        // Add noise layer with flowing water effect
        flow += noise(flowCoord) * intensity;
      }
      
      return flow * 0.6; // Adjust flow intensity
    }
    
    void main() {
      // Get dynamic water current flows
      float flowValue = waterFlow(vPosition, time);
      
      // Create a palette of vibrant water colors
      vec3 deepOceanBlue = vec3(0.0, 0.2, 0.5);     // Deep ocean blue
      vec3 midnightBlue = vec3(0.05, 0.25, 0.6);    // Midnight ocean blue
      vec3 azureBlue = vec3(0.1, 0.4, 0.75);        // Azure water blue
      vec3 caribbeanBlue = vec3(0.0, 0.5, 0.8);     // Caribbean blue
      vec3 tropicalBlue = vec3(0.2, 0.65, 0.9);     // Tropical turquoise
      
      // Build complex wave patterns
      vec3 p = normalize(vPosition); // Use normalized position
      
      // Create dynamic wave patterns with different frequencies
      float waves = 0.0;
      waves += sin(p.x * 8.0 + p.y * 4.0 + time * 0.8) * 0.08;
      waves += sin(p.y * 7.0 - p.z * 5.0 + time * 0.6) * 0.06;
      waves += sin(p.z * 6.0 + p.x * 3.0 + time * 0.4) * 0.04;
      
      // Add waves to flowValue for more complex patterns
      flowValue += waves;
      
      // Calculate water color based on flow patterns
      vec3 waterColor;
      if (flowValue < 0.25) {
        float t = flowValue / 0.25;
        waterColor = mix(deepOceanBlue, midnightBlue, t);
      } else if (flowValue < 0.5) {
        float t = (flowValue - 0.25) / 0.25;
        waterColor = mix(midnightBlue, azureBlue, t);
      } else if (flowValue < 0.75) {
        float t = (flowValue - 0.5) / 0.25;
        waterColor = mix(azureBlue, caribbeanBlue, t);
      } else {
        float t = (flowValue - 0.75) / 0.25;
        waterColor = mix(caribbeanBlue, tropicalBlue, t);
      }
      
      // Add specular highlights for water surface
      float fresnel = pow(1.0 - max(0.0, dot(normalize(vPosition), vec3(0.0, 0.0, 1.0))), 2.0);
      
      // Surface ripples and circular wave patterns
      float ripples = 0.0;
      // Small fast ripples
      ripples += sin(length(p) * 40.0 - time * 1.0) * 0.01;
      // Medium ripples
      ripples += sin(p.x * 15.0 + p.y * 15.0 + time * 0.8) * sin(p.y * 10.0 + p.z * 10.0 + time * 1.2) * 0.025;
      
      // Add soft underwater glow/light rays
      float glow = pow(1.0 - length(vPosition) * 0.5, 2.0) * 0.15;
      
      // Add water surface highlights based on viewing angle
      float highlight = fresnel * 0.15;
      
      // Final water color with all effects combined
      vec3 finalColor = waterColor + ripples + glow + highlight;
      
      // Final color with slightly enhanced transparency for water
      gl_FragColor = vec4(finalColor, opacity * 0.9);
    }
  `
};

const fireShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#ff6600") }, // Fiery orange base color
    opacity: { value: 1.0 },
    pulseIntensity: { value: 0.0 } // Added for external pulsing effect
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
    uniform float pulseIntensity; // External pulsing effect intensity
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    // Noise functions for fire effect
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      
      // Four corners in 2D of a tile
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      
      // Smooth interpolation
      vec2 u = f * f * (3.0 - 2.0 * f);
      
      // Mix 4 corners
      return mix(a, b, u.x) + 
            (c - a)* u.y * (1.0 - u.x) + 
            (d - b) * u.x * u.y;
    }
    
    // Layered noise for organic fire movement
    float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      // Loop of octaves
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(st * frequency);
        st *= 2.0; // frequency doubles each octave
        amplitude *= 0.5; // amplitude halves each octave
      }
      
      return value;
    }
    
    void main() {
      // Authentic fire has these key elements:
      // 1. Moving, licking flames that travel upward
      // 2. Varied colors from deep reds to bright yellows and occasional blues
      // 3. Constant, irregular flickering and dancing motion
      // 4. Embers and glowing particles within the flame
      
      // Normalize position for consistent calculations
      vec3 nPos = normalize(vPosition);
      
      // DEFINE FIRE COLOR PALETTE
      // Authentic fire has a spectrum from deep red to bright yellow/white
      vec3 emberColor = vec3(0.6, 0.05, 0.0);   // Deep ember red (cooler)
      vec3 darkRed = vec3(0.8, 0.1, 0.0);       // Dark red flame
      vec3 fireRed = vec3(1.0, 0.2, 0.0);       // Vibrant red flame
      vec3 fireOrange = vec3(1.0, 0.4, 0.0);    // Rich orange flame
      vec3 fireYellow = vec3(1.0, 0.7, 0.1);    // Bright yellow flame
      vec3 hotYellow = vec3(1.0, 0.9, 0.3);     // Hot yellow core
      vec3 coreColor = vec3(1.0, 0.95, 0.8);    // White-hot core
      vec3 blueColor = vec3(0.4, 0.5, 1.0);     // Blue flame base (hottest)
      
      // FLAME SHAPE AND MOVEMENT
      // Transform sphere coordinates to create upward licking flames
      
      // Basic position mapping for flame 
      // We want flames to appear to rise upward and flicker outward
      float height = nPos.y * 0.5 + 0.5; // Transform Y from [-1,1] to [0,1]
      
      // Create basic flame shape (taller in center, shorter at edges)
      float distFromCenter = length(vec2(nPos.x, nPos.z));
      float baseShape = 1.0 - smoothstep(0.0, 0.8, distFromCenter); // Base intensity is brighter in center
      
      // Create "tongues" of flame that lick upward
      // Multiple flame layers moving at different speeds and scales
      float flames = 0.0;
      
      // Large slow-moving flames
      vec2 largeFlameCoord = vec2(
        nPos.x * 2.0 + sin(time * 0.7) * 0.2, 
        nPos.y * 2.0 + time * 0.8
      );
      float largeFlame = fbm(largeFlameCoord) * 0.6;
      
      // Medium flames with more detail and faster movement
      vec2 medFlameCoord = vec2(
        nPos.x * 4.0 + sin(time * 1.2 + nPos.z) * 0.3, 
        nPos.y * 3.0 + time * 1.5
      );
      float medFlame = fbm(medFlameCoord) * 0.3;
      
      // Small flickering detail flames that move quickly
      vec2 detailFlameCoord = vec2(
        nPos.x * 8.0 + sin(time * 2.0 + nPos.z * 2.0) * 0.4, 
        nPos.y * 5.0 + time * 3.0
      );
      float detailFlame = fbm(detailFlameCoord) * 0.15;
      
      // Create lateral flame movement (side to side flicker)
      float lateralMovement = sin(nPos.y * 4.0 + time * 2.5) * cos(time * 1.8) * 0.15;
      
      // Combine all flame layers
      flames = largeFlame + medFlame + detailFlame + lateralMovement;
      
      // Adjust flame shape to look more like licking flames
      // Higher values toward top of sphere, creating upward licking flame effect
      flames *= smoothstep(-0.2, 0.8, nPos.y); // Stronger at top
      
      // FIRE FLICKER AND TURBULENCE
      // Create realistic fire flickering at different rates
      
      // Slow, medium and fast flicker components
      float slowFlicker = noise(vec2(time * 1.5, 0.0)) * 0.5 + 0.5;
      float medFlicker = noise(vec2(time * 3.0, 0.5)) * 0.3 + 0.7;
      float fastFlicker = noise(vec2(time * 8.0, 1.0)) * 0.2 + 0.8;
      
      // Combine flicker components for natural, varied rhythm
      float flicker = slowFlicker * medFlicker * fastFlicker;
      
      // EMBERS AND HOTSPOTS
      // Create glowing embers and hotspots within the flame
      float emberNoise = fbm(vec2(nPos.x * 5.0 + time * 0.2, nPos.z * 5.0 - time * 0.3)) * 0.5 + 0.5;
      float hotspotNoise = fbm(vec2(nPos.x * 3.0 - time * 0.4, nPos.z * 3.0 + time * 0.5)) * 0.5 + 0.5;
      
      // Create ember spots that glow and fade
      float embers = smoothstep(0.6, 0.8, emberNoise) * (1.0 - baseShape) * 0.8;
      
      // Create hotter spots within the flame
      float hotspots = smoothstep(0.7, 0.9, hotspotNoise) * baseShape * 0.7;
      
      // BLUE FLAME BASE
      // Create occasional blue flame at the base (hottest part of flame)
      float blueFlameNoise = fbm(vec2(nPos.x * 4.0 - time * 0.3, nPos.z * 4.0 + time * 0.2)) * 0.5 + 0.5;
      float blueFlame = smoothstep(0.7, 0.9, blueFlameNoise) * smoothstep(0.0, 0.4, nPos.y + 0.6) * 0.8;
      
      // COMBINE ALL FIRE COMPONENTS
      // Final intensity combines base shape, flames, flicker
      float fireIntensity = (baseShape * 0.6 + flames * 0.8) * flicker;
      
      // Ensure reasonable range
      fireIntensity = clamp(fireIntensity, 0.0, 1.0);
      
      // COLOR MAPPING based on intensity and special effects
      vec3 fireColor;
      
      if (fireIntensity > 0.85) {
        // Hottest core - blend from yellow to white core
        fireColor = mix(hotYellow, coreColor, (fireIntensity - 0.85) * 6.67);
        
        // Add blue flame to the hottest regions (but only at certain angles)
        fireColor = mix(fireColor, blueColor, blueFlame * (fireIntensity - 0.85) * 3.0);
      } 
      else if (fireIntensity > 0.6) {
        // Hot regions - blend from orange to yellow
        fireColor = mix(fireOrange, fireYellow, (fireIntensity - 0.6) * 4.0);
        
        // Add some hotspots in these regions
        fireColor = mix(fireColor, hotYellow, hotspots * 0.6);
      } 
      else if (fireIntensity > 0.3) {
        // Mid-heat regions - blend from reds to orange
        fireColor = mix(fireRed, fireOrange, (fireIntensity - 0.3) * 3.33);
        
        // Add some blue at the base of the flames
        fireColor = mix(fireColor, blueColor * 0.7, blueFlame * 0.3);
        
        // Add occasional ember colors
        fireColor = mix(fireColor, emberColor, embers * 0.3);
      } 
      else {
        // Coolest regions - deep reds and embers
        fireColor = mix(emberColor, darkRed, fireIntensity * 3.33);
        
        // More pronounced embers in cooler regions
        fireColor = mix(fireColor, emberColor * 0.8, embers * 0.7);
      }
      
      // FIRE SHAPE ENHANCEMENT
      // Enhance vertical flame movement - stronger at top
      float verticalGradient = smoothstep(-1.0, 1.0, nPos.y);
      fireColor *= mix(0.7, 1.3, verticalGradient);
      
      // FLICKERING AND MOTION ENHANCEMENT
      // Add micro-flicker for flame edge details
      float microFlicker = noise(vec2(time * 12.0, nPos.y * 8.0)) * 0.15 + 0.925;
      fireColor *= microFlicker;
      
      // BRIGHTNESS AND GLOW
      // Fire has extreme brightness in the center      
      // Apply distance-based falloff for natural glow
      float glowFalloff = 1.0 / (1.0 + distFromCenter * 3.0);
      fireColor *= mix(1.0, 3.0, glowFalloff);
      
      // Add emissive boost to make it look truly incandescent
      fireColor += vec3(0.2, 0.05, 0.0) * fireIntensity;
      
      // SPECIAL EFFECTS
      // Add pulsing glow that simulates radiating heat
      vec3 pulseColor = vec3(1.0, 0.6, 0.2); // Warm orange-red glow
      float pulseStrength = pulseIntensity * 0.6; // External pulse from uniform
      
      // Apply pulse glow with distance falloff
      float edgeGlow = smoothstep(0.7, 1.0, length(nPos));
      fireColor += pulseColor * pulseStrength * edgeGlow * 2.0; 
      
      // Add occasional blue flame flashes at the base
      float blueFlash = noise(vec2(time * 3.0, nPos.x * 4.0)) * blueFlame * 0.3;
      fireColor = mix(fireColor, blueColor * 1.2, blueFlash * (1.0 - verticalGradient));
      
      // FINAL ADJUSTMENTS
      // Gamma correction for better visibility
      fireColor = pow(fireColor, vec3(0.6));
      
      // Final output with high minimum opacity for visibility
      float alpha = max(fireIntensity * 0.95, 0.8);
      
      gl_FragColor = vec4(fireColor, alpha);
    }
  `
};

const airShader = {
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

const earthShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#CC6633") }, // Warm terracotta clay color
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
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    // Noise function for clay-like texture
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // Worley noise for natural clay texture
    float worleyNoise(vec2 uv, float scale) {
      vec2 id = floor(uv * scale);
      vec2 lv = fract(uv * scale);
      
      float minDist = 1.0;
      
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 pos = offset + 0.5 + 0.3 * vec2(
            sin(rand(id + offset) * 6.28),
            cos(rand(id + offset + vec2(1.0, 2.0)) * 6.28)
          );
          float dist = length(pos - lv);
          minDist = min(minDist, dist);
        }
      }
      
      return minDist;
    }
    
    void main() {
      // Base terracotta clay color
      vec3 baseColor = color;
      
      // Create natural clay-like texture with granular detail
      // Combine multiple scales of Worley noise patterns
      float clayTexture = 0.0;
      
      // Clay granular structure at different scales
      float large = worleyNoise(vUv * 2.0, 4.0);
      float medium = worleyNoise(vUv * 4.0, 8.0);
      float small = worleyNoise(vUv * 8.0, 16.0);
      
      // Combine the different scales with varying weights
      clayTexture = large * 0.6 + medium * 0.3 + small * 0.1;
      
      // Add some slow-moving subtle variation
      float timeShift = sin(time * 0.05) * 0.02;
      clayTexture += timeShift;
      
      // Distance from center for lighting effect
      float d = length(vUv - vec2(0.5, 0.5));
      
      // Create a solid, firm appearance with subtle lighting
      // Make the edges a bit darker to enhance the 3D solid appearance
      float lightIntensity = 1.0 - smoothstep(0.0, 0.8, d);
      
      // Add shading based on normal direction for 3D effect
      float normalShading = 0.5 + 0.5 * dot(vNormal, vec3(0.5, 0.5, 0.5));
      
      // Mix darker and lighter variations of the clay color
      vec3 darkClay = baseColor * 0.7;  // Darker variation
      vec3 lightClay = baseColor * 1.3; // Lighter variation
      
      // Create the final clay appearance with texture and lighting
      vec3 clayColor = mix(darkClay, lightClay, clayTexture);
      
      // Apply subtle ambient and directional lighting
      clayColor *= 0.7 + 0.3 * normalShading + 0.2 * lightIntensity;
      
      // Add very subtle surface irregularities
      float surfaceNoise = rand(vUv * 100.0) * 0.05;
      clayColor *= 0.97 + surfaceNoise;
      
      gl_FragColor = vec4(clayColor, 1.0);
    }
  `
};

const spaceShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#000000") }, // Black color for the inverted space orb
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
      vec2 uv = vUv;
      vec3 baseColor = color;
      
      // Center dark effect for black orb
      float d = length(uv - vec2(0.5, 0.5));
      
      // Subtle purple edge glow for the black orb
      float edgeGlow = smoothstep(0.45, 0.5, d);
      vec3 edgeColor = vec3(0.16, 0.0, 0.33); // Dark purple tint
      
      // Add very subtle ripple effect
      float ripple = sin(d * 20.0 - time * 0.2) * 0.02;
      float intensity = smoothstep(0.0, 0.5, d + ripple);
      
      // Mix with a subtle deep purple at the edges
      vec3 finalColor = mix(baseColor, edgeColor, intensity * edgeGlow);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const lightShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#fffaf0") },
    opacity: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vec2 uv = vUv;
      float d = length(uv - vec2(0.5, 0.5));
      
      // Much more gentle falloff at edges, keeping most of the orb bright
      float brightness = 1.0 - smoothstep(0.45, 0.5, d);
      
      // Gentle pulsing effect
      float pulse = 0.05 * sin(time * 1.5);
      
      // Calculate lighting factor based on normal
      // This makes the light source always come from the viewer's direction
      vec3 lightDir = vec3(0.0, 0.0, 1.0); // Light from camera direction
      float lightFactor = max(0.85, dot(vNormal, lightDir)); // Minimum 85% brightness
      
      // Add extra brightness to the whole orb with lightFactor to eliminate dark side
      vec3 finalColor = color * (brightness + pulse + 0.25) * lightFactor;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Dynamic Orb component with shader materials
const DynamicOrb: React.FC<{ remainingTime?: number | null }> = ({ remainingTime = null }) => {
  const { selectedKasina, customColor } = useKasina();
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | THREE.MeshBasicMaterial | null>(null);
  const { email } = useAuth(); // Get user email to check if admin
  
  // Check if user is admin
  const isAdmin = email === "admin@kasina.app";
  
  // For White A Thigle - load the simple concentric rings
  const whiteATexture = useTexture('/images/vajrayana/white-a-thigle.svg');
  const whiteAImageTexture = useTexture('/images/vajrayana/concentric-rings-simple.svg');
  
  useFrame(({ clock, camera }) => {
    if (meshRef.current) {
      // White A Thigle - make the plane always face the camera
      if (selectedKasina === KASINA_TYPES.WHITE_A_THIGLE && isAdmin) {
        // Get camera position and make the plane face it
        meshRef.current.lookAt(camera.position);
        
        // Add more dynamic floating motion
        const time = clock.getElapsedTime();
        meshRef.current.position.y = Math.sin(time * 0.5) * 0.08;
        meshRef.current.position.x = Math.sin(time * 0.3) * 0.04;
        
        // Add a very subtle rotation while still facing the camera
        meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.05;
        
        // Animate subtle scale pulsing for depth effect
        const pulseScale = 1.0 + Math.sin(time * 0.7) * 0.03;
        meshRef.current.scale.set(pulseScale, pulseScale, pulseScale);
        
        // Update shader uniforms for animation effects
        if (materialRef.current && 'uniforms' in materialRef.current) {
          const material = materialRef.current as THREE.ShaderMaterial;
          
          // Update time uniform
          if (material.uniforms.time) {
            material.uniforms.time.value = time;
          }
          
          // Debug info
          if (time % 10 < 0.1) { // Log only occasionally to reduce console spam
            console.log("Rendering White A Thigle kasina with rainbow effects");
          }
        }
      }
      // Special rotation handling for Light kasina
      else if (selectedKasina === KASINA_TYPES.LIGHT) {
        // Limited 180 degree oscillation with dark side always facing away
        const time = clock.getElapsedTime();
        // Use sine wave to create oscillation between -0.5 and 0.5 (radians)
        meshRef.current.rotation.y = Math.sin(time * 0.1) * 0.5;
        
        // Always keep the initial orientation facing the camera
        // This ensures the brighter side faces the user
        meshRef.current.rotation.x = 0;
        meshRef.current.rotation.z = 0;
      } else {
        // Regular rotation for other kasinas at half the original speed
        meshRef.current.rotation.y = clock.getElapsedTime() * 0.05; // Reduced from 0.1 to 0.05 (half speed)
      }
      
      // Shrinking effect for end of session (when remaining time is <= 60 seconds)
      if (remainingTime !== null && remainingTime <= 60) {
        // Calculate scale factor: from 1.0 (at 60s) to 0.0 (at 0s)
        // This creates a smooth shrinking effect over the last 60 seconds
        const endingScale = remainingTime / 60;
        
        // Apply the shrinking scale
        meshRef.current.scale.set(endingScale, endingScale, endingScale);
        
        // Optional: make the orb fade out as well
        if (materialRef.current) {
          if ('opacity' in materialRef.current) {
            (materialRef.current as THREE.MeshBasicMaterial).opacity = endingScale;
            (materialRef.current as THREE.MeshBasicMaterial).transparent = true;
          } else if ('uniforms' in materialRef.current && 
                    (materialRef.current as THREE.ShaderMaterial).uniforms.opacity) {
            (materialRef.current as THREE.ShaderMaterial).uniforms.opacity.value = endingScale;
            (materialRef.current as THREE.ShaderMaterial).transparent = true;
          }
        }
        
        // Log the shrinking effect (for debugging)
        // console.log(`Shrinking kasina: ${remainingTime}s remaining, scale: ${endingScale.toFixed(2)} (of 60s fade)`);
      } 
      // Breathing effects for Space kasina and Fire kasina when not in end-of-session shrinking
      else if ((selectedKasina === KASINA_TYPES.SPACE || selectedKasina === KASINA_TYPES.FIRE) && 
              (remainingTime === null || remainingTime > 60)) {
        const time = clock.getElapsedTime();
        
        // Use cubic-bezier-like timing function for smoother animation
        // Different timing for each kasina type
        let breatheCycle = 0;
        let breatheFactor = 1;

        if (selectedKasina === KASINA_TYPES.SPACE) {
          // Space kasina: Subtle 10-second breathing cycle
          const t = time % 10 / 10; // Normalized time in the cycle (0-1) - 10 second cycle
          const easeValue = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          breatheCycle = Math.sin(easeValue * Math.PI);
          
          // Extremely subtle scale factor (0.98 to 1.02 = 4% change, matching CSS animation)
          breatheFactor = 1 + breatheCycle * 0.04; 
          
          // Apply a micro-subtle scaling effect
          meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
          
          // Apply an extremely subtle pulsing effect to the orb's position
          meshRef.current.position.z = breatheCycle * 0.05; // Minimal movement in z-direction
        } 
        else if (selectedKasina === KASINA_TYPES.FIRE) {
          // Fire kasina: Very slow 12-second breathing cycle with subtle flame-like pulsation
          const t = time % 12 / 12; // Normalized time in the cycle (0-1) - 12 second cycle (3x slower than original)
          
          // A more asymmetric easing function to mimic flame behavior but extremely subtle
          // Quick expansion, slower contraction 
          const fireEase = t < 0.3 
            ? t / 0.3 // Fast rise (0-0.3 of cycle)
            : 1.0 - ((t - 0.3) / 0.7); // Slower fall (0.3-1.0 of cycle)
            
          breatheCycle = Math.pow(fireEase, 1.6); // Increased power for even smoother fire-like behavior
          
          // Subtle scale factor (0.99 to 1.01 = 2% change, adjusted to be just noticeable)
          // This creates a gentle flame pulsation effect that's still quite subtle
          breatheFactor = 0.99 + breatheCycle * 0.02;
          
          // Apply the very subtle fire pulsing effect
          meshRef.current.scale.set(breatheFactor, breatheFactor, breatheFactor);
          
          // Add subtle flame-like wobble
          const wobble = Math.sin(time * 0.5) * 0.004; // Slightly increased amplitude while keeping lower frequency
          meshRef.current.rotation.z = wobble;
        }
        
        // Try to adjust any shader uniforms that might be available
        if (materialRef.current && 'uniforms' in materialRef.current) {
          try {
            // Attempt to modify any shader uniforms that might affect the appearance
            const material = materialRef.current as THREE.ShaderMaterial;
            
            if (selectedKasina === KASINA_TYPES.FIRE) {
              // Animate the pulse intensity with a different rhythm than the scale animation
              // This creates a more dynamic, interesting fire effect with multiple layers of movement
              if (material.uniforms.pulseIntensity !== undefined) {
                // Create a slower, more dramatic pulsing for the illumination effect
                // This creates the effect of fire light radiating outward
                const pulseTime = time * 0.5; // Slower than the main animation
                const pulseCycle = (Math.sin(pulseTime) * 0.5 + 0.5); // 0 to 1 range
                
                // Create a more dramatic pulse with clear peaks and valleys
                const adjustedPulse = Math.pow(pulseCycle, 1.2); // Steeper curve for more dramatic effect
                material.uniforms.pulseIntensity.value = adjustedPulse * 1.0; // Stronger effect
              }
            }
            else if (selectedKasina === KASINA_TYPES.SPACE) {
              if (material.uniforms.glowIntensity !== undefined) {
                material.uniforms.glowIntensity.value = 0.5 + breatheCycle * 0.3;
              }
              
              if (material.uniforms.intensity !== undefined) {
                material.uniforms.intensity.value = 0.5 + breatheCycle * 0.3;
              }
              
              // Update opacity to create a pulsing effect
              if (material.uniforms.opacity !== undefined) {
                material.uniforms.opacity.value = 0.8 + breatheCycle * 0.2;
              }
            }
            else if (selectedKasina === KASINA_TYPES.FIRE) {
              // Fire-specific adjustments to shader uniforms
              // Flame color pulsation
              if (material.uniforms.color !== undefined) {
                // Extremely subtle transition from orange to slightly yellower orange
                // This creates an almost imperceptible color shift
                const baseColor = new THREE.Color("#ff6600"); // Base orange
                const peakColor = new THREE.Color("#ff8800"); // Slightly yellower orange (much less dramatic than before)
                material.uniforms.color.value.copy(baseColor).lerp(peakColor, breatheCycle * 0.25); // Halved interpolation factor
              }
            }
          } catch (e) {
            // Silently catch errors if uniforms don't exist
          }
        }
      }
      // Reset scale to normal for all other cases
      else if (remainingTime === null || remainingTime > 60) {
        // Make sure the orb is at normal scale when not in shrinking mode
        meshRef.current.scale.set(1, 1, 1);
        
        // Reset opacity if needed
        if (materialRef.current) {
          if ('opacity' in materialRef.current) {
            (materialRef.current as THREE.MeshBasicMaterial).opacity = 1;
          } else if ('uniforms' in materialRef.current && 
                    (materialRef.current as THREE.ShaderMaterial).uniforms.opacity) {
            (materialRef.current as THREE.ShaderMaterial).uniforms.opacity.value = 1;
          }
        }
      }
    }
    
    // Update time uniform for shader materials
    if (materialRef.current && 'uniforms' in materialRef.current) {
      (materialRef.current as THREE.ShaderMaterial).uniforms.time.value = clock.getElapsedTime();
    }
  });

  const getShaderMaterial = () => {
    switch (selectedKasina) {
      case KASINA_TYPES.WATER:
        return new THREE.ShaderMaterial({...waterShader, transparent: true});
      case KASINA_TYPES.FIRE:
        return new THREE.ShaderMaterial({...fireShader, transparent: true});
      case KASINA_TYPES.AIR:
        return new THREE.ShaderMaterial({...airShader, transparent: true});
      case KASINA_TYPES.EARTH:
        return new THREE.ShaderMaterial({...earthShader, transparent: true});
      case KASINA_TYPES.SPACE:
        return new THREE.ShaderMaterial({...spaceShader, transparent: true});
      case KASINA_TYPES.LIGHT:
        return new THREE.ShaderMaterial({...lightShader, transparent: true});
      case KASINA_TYPES.WHITE_A_THIGLE:
        // Only for admin users, else fall back to white kasina
        if (isAdmin) {
          console.log("Creating White A Thigle shader material for admin");
          
          // Let's create our own shader material directly for more control
          const material = new THREE.ShaderMaterial({
            ...whiteAThigleShader, 
            transparent: true,
            side: THREE.DoubleSide, // Make it visible from both sides
            depthTest: false, // Ensure it's always visible
            depthWrite: false // Don't write to depth buffer
          });
          
          // Set the texture and make sure it's properly loaded
          if (whiteATexture) {
            console.log("White A Thigle texture loaded successfully");
            
            // Set the texture on the shader
            material.uniforms.map.value = whiteATexture;
            
            // Force shader parameters for better appearance
            material.uniforms.opacity.value = 1.0;
            material.uniforms.color.value = new THREE.Color(0xffffff);
            
            // Set blending for better rainbow effects
            material.blending = THREE.AdditiveBlending;
            
            // Set the resolution for proper scaling
            material.uniforms.resolution.value.set(512, 512);
            
            console.log("White A Thigle shader configured successfully");
          } else {
            console.error("Failed to load White A Thigle texture");
          }
          
          return material;
        } else {
          console.log("Non-admin tried to access White A Thigle kasina, falling back to white");
          return new THREE.MeshBasicMaterial({ 
            color: KASINA_COLORS.white,
            transparent: true
          });
        }
      case KASINA_TYPES.CUSTOM:
        // For custom color kasina
        return new THREE.MeshBasicMaterial({ 
          color: customColor,
          transparent: true
        });
      default:
        // For standard color kasinas
        return new THREE.MeshBasicMaterial({ 
          color: KASINA_COLORS[selectedKasina],
          transparent: true
        });
    }
  };

  useEffect(() => {
    if (meshRef.current) {
      const material = getShaderMaterial();
      meshRef.current.material = material;
      materialRef.current = material;
    }
  }, [selectedKasina, customColor]);

  // For White A Thigle, we want a flat plane that faces the camera
  // rather than a sphere, to show the Tibetan letter properly
  const isWhiteAThigle = selectedKasina === KASINA_TYPES.WHITE_A_THIGLE && isAdmin;
  
  // Debug
  useEffect(() => {
    if (selectedKasina === KASINA_TYPES.WHITE_A_THIGLE) {
      console.log("White A Thigle selected, admin status:", isAdmin);
    }
  }, [selectedKasina, isAdmin]);
  
  // Use our new WhiteAThigle component for White A Thigle, regular mesh for others
  if (isWhiteAThigle) {
    return <WhiteAThigle />;
  } else {
    return (
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        {/* The material will be set by the effect above based on kasina type */}
      </mesh>
    );
  }
};

// Shader definition moved inside the DynamicOrb component to avoid reference issues

// Scene setup component
const Scene: React.FC<{ enableZoom?: boolean, remainingTime?: number | null }> = ({ 
  enableZoom = false,
  remainingTime = null
}) => {
  const { gl, camera } = useThree();
  const { selectedKasina } = useKasina();
  
  // Debug mount/unmount for troubleshooting
  useEffect(() => {
    console.log("Scene component mounted with kasina:", selectedKasina);
    
    // Helper function to clean up WebGL resources
    const cleanupWebGL = () => {
      try {
        // Clear any render lists
        gl.renderLists.dispose();
        
        // Reset renderer state to avoid memory leaks
        gl.info.reset();
        
        // Force garbage collection hint (though browser decides when to run GC)
        if (typeof window !== 'undefined' && window.gc) {
          window.gc();
        }
      } catch (err) {
        console.error("Error cleaning up WebGL resources", err);
      }
    };
    
    // Make sure to clean up WebGL resources properly when scene unmounts
    return () => {
      console.log("Scene component unmounted, releasing resources");
      cleanupWebGL();
    };
  }, []);
  
  // Set the background color based on the selected kasina
  useEffect(() => {
    const bgColor = KASINA_BACKGROUNDS[selectedKasina as KasinaType] || "#000000";
    gl.setClearColor(new THREE.Color(bgColor), 1);
  }, [gl, selectedKasina]);

  // Add camera ref to work with zoom 
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useEffect(() => {
    // When zoom is enabled, set a slightly larger initial distance
    if (enableZoom && cameraRef.current) {
      cameraRef.current.position.z = 4;
    }
  }, [enableZoom]);

  // Add a dynamic light that follows the camera
  const [cameraLight, setCameraLight] = useState(new THREE.Vector3(0, 0, 5));
  
  useFrame(() => {
    if (cameraRef.current) {
      // Update light position to follow camera - with memory optimization
      // Instead of creating a new Vector3 on every frame, just copy the values directly
      // This avoids creating thousands of Vector3 objects that need to be garbage collected
      const newPos = cameraRef.current.position;
      setCameraLight(prev => {
        prev.set(newPos.x, newPos.y, newPos.z);
        return prev;
      });
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} ref={cameraRef} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={cameraLight} intensity={0.8} distance={10} />
      <DynamicOrb remainingTime={remainingTime} />
      <OrbitControls 
        enableZoom={enableZoom} 
        enablePan={false} 
        rotateSpeed={0.5}
        minDistance={0.05}  // Allow zooming in very close
        maxDistance={20}    // Allow zooming out quite far
        zoomSpeed={0.08}    // Adjusted zoom speed to exact value requested
      />
    </>
  );
};

// Main KasinaOrb component
interface KasinaOrbProps {
  enableZoom?: boolean;
  type?: KasinaType;     // Kasina type (water, fire, etc.)
  color?: string;        // Color code for the orb
  speed?: number;        // Animation speed
  complexity?: number;   // Detail level for the orb
  remainingTime?: number | null; // Remaining time in seconds, used for end-session effects
}

const KasinaOrb: React.FC<KasinaOrbProps> = ({ 
  enableZoom = false,
  type,
  color,
  speed,
  complexity,
  remainingTime = null
}) => {
  // Get access to the current selectedKasina
  const { selectedKasina } = useKasina();
  
  // If type is provided, update the selected kasina in the store
  useEffect(() => {
    if (type) {
      const kasinaStore = useKasina.getState();
      kasinaStore.setSelectedKasina(type);
      console.log("KasinaOrb: Setting kasina type to", type);
    }
  }, [type]);
  
  // When component mounts or unmounts, log for debugging
  useEffect(() => {
    console.log("KasinaOrb component mounted with type:", type || selectedKasina);
    
    return () => {
      console.log("KasinaOrb component unmounted, had type:", type || selectedKasina);
    };
  }, []);
  
  // Get the background color for the selected kasina
  const bgColor = KASINA_BACKGROUNDS[selectedKasina as KasinaType] || "#000000";
  
  return (
    <div className="w-full h-full orb-content">
      <Canvas>
        <Scene enableZoom={enableZoom} remainingTime={remainingTime} />
      </Canvas>
    </div>
  );
};

// White A Thigle Shader with concentric rainbow rings
const whiteAThigleShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color("#FFFFFF") },
    opacity: { value: 1.0 },
    map: { value: null },
    resolution: { value: new THREE.Vector2(512, 512) }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    uniform sampler2D map;
    uniform vec2 resolution;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    // Noise function for sparkle effects
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // Function to create a smooth circle
    float circle(vec2 uv, float radius, float softness) {
      float dist = length(uv - vec2(0.5, 0.5));
      return 1.0 - smoothstep(radius - softness, radius, dist);
    }
    
    void main() {
      // Sample the texture for the Tibetan A letter
      vec4 texSample = texture2D(map, vUv);
      
      // Calculate distance from center
      vec2 center = vec2(0.5, 0.5);
      float distToCenter = length(vUv - center) * 2.0;
      
      // Animation values
      float t = time * 0.2; // Slow animation
      float pulse = sin(time * 0.4) * 0.03; // Very subtle pulsing
      
      // Create concentric rings with authentic colors from the reference image
      
      // Outer blue background and glow - radius 1.0
      vec3 blueBackground = mix(vec3(0.0, 0.0, 0.8), vec3(0.0, 0.0, 0.5), distToCenter);
      
      // Yellow ring - radius approx 0.75
      float yellowRingRadius = 0.75 + pulse;
      float yellowRing = circle(vUv, yellowRingRadius, 0.02) - circle(vUv, yellowRingRadius - 0.08, 0.02);
      vec3 yellowColor = vec3(1.0, 1.0, 0.0);
      
      // Red ring - radius approx 0.6
      float redRingRadius = 0.6 + pulse * 0.8;
      float redRing = circle(vUv, redRingRadius, 0.02) - circle(vUv, redRingRadius - 0.07, 0.02);
      vec3 redColor = vec3(1.0, 0.0, 0.0);
      
      // White ring - radius approx 0.48
      float whiteRingRadius = 0.48 + pulse * 0.6;
      float whiteRing = circle(vUv, whiteRingRadius, 0.02) - circle(vUv, whiteRingRadius - 0.05, 0.02);
      vec3 whiteColor = vec3(1.0, 1.0, 1.0);
      
      // Green ring - radius approx 0.36
      float greenRingRadius = 0.36 + pulse * 0.4;
      float greenRing = circle(vUv, greenRingRadius, 0.02) - circle(vUv, greenRingRadius - 0.05, 0.02);
      vec3 greenColor = vec3(0.0, 0.8, 0.0);
      
      // Blue center - radius approx 0.26
      float blueCenter = circle(vUv, 0.26 + pulse * 0.2, 0.02);
      vec3 blueCenterColor = vec3(0.0, 0.2, 1.0);
      
      // Combine all rings
      vec3 finalColor = blueBackground;
      finalColor = mix(finalColor, yellowColor, yellowRing);
      finalColor = mix(finalColor, redColor, redRing);
      finalColor = mix(finalColor, whiteColor, whiteRing);
      finalColor = mix(finalColor, greenColor, greenRing);
      finalColor = mix(finalColor, blueCenterColor, blueCenter);
      
      // Add subtle shimmer
      float shimmer = noise(vUv * 30.0 + time * 0.1) * 0.05;
      finalColor += vec3(shimmer);
      
      // Add a subtle glow effect
      float glow = (1.0 - distToCenter * 0.5) * 0.1;
      finalColor += vec3(glow);
      
      // If we have a texture (the Tibetan A), overlay it in the center
      if (texSample.a > 0.1 && distToCenter < 0.5) {
        // Add the white "A" letter only in the center blue area
        finalColor = mix(finalColor, vec3(1.0), texSample.a * blueCenter);
      }
      
      // Final output with full opacity
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export default KasinaOrb;
