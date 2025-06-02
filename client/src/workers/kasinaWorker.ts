// Web Worker for offscreen kasina rendering
// This moves intensive WebGL operations off the main thread to prevent platform timeouts

import * as THREE from 'three';

interface WorkerMessage {
  type: 'init' | 'updateConfig' | 'destroy';
  canvas?: OffscreenCanvas;
  config?: {
    color: string;
    kasinaType: string;
    size: number;
  };
}

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let mesh: THREE.Mesh | null = null;
let animationId: number | null = null;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, canvas, config } = event.data;

  switch (type) {
    case 'init':
      if (canvas) {
        initializeRenderer(canvas, config);
      }
      break;
    
    case 'updateConfig':
      if (config) {
        updateKasinaConfig(config);
      }
      break;
    
    case 'destroy':
      cleanup();
      break;
  }
};

function initializeRenderer(canvas: OffscreenCanvas, config?: any) {
  try {
    // Create Three.js renderer with offscreen canvas
    renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    renderer.setSize(canvas.width, canvas.height);
    renderer.setClearColor(0x000000, 1);

    // Create scene
    scene = new THREE.Scene();

    // Create camera
    camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 3;

    // Create kasina orb
    createKasinaOrb(config?.color || '#FF0000', config?.size || 1);

    // Start render loop
    startRenderLoop();

    // Notify main thread that worker is ready
    self.postMessage({ type: 'ready' });
    
  } catch (error) {
    console.error('Worker initialization failed:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

function createKasinaOrb(color: string, size: number) {
  if (!scene) return;

  // Remove existing mesh
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry?.dispose();
    (mesh.material as THREE.Material)?.dispose();
  }

  // Create sphere geometry
  const geometry = new THREE.SphereGeometry(size, 32, 32);
  
  // Create material
  const material = new THREE.MeshBasicMaterial({ 
    color: new THREE.Color(color),
    depthWrite: true,
    depthTest: true
  });

  // Create mesh
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}

function updateKasinaConfig(config: { color: string; kasinaType: string; size: number }) {
  if (mesh && mesh.material) {
    // Update color
    (mesh.material as THREE.MeshBasicMaterial).color.set(config.color);
    
    // Update size
    mesh.scale.setScalar(config.size);
  }
}

function startRenderLoop() {
  if (!renderer || !scene || !camera) return;

  const render = () => {
    try {
      // Gentle rotation for visual interest
      if (mesh) {
        mesh.rotation.y += 0.005;
        mesh.rotation.x += 0.002;
      }

      renderer!.render(scene!, camera!);
      
      // Continue render loop
      animationId = requestAnimationFrame(render);
      
    } catch (error) {
      console.error('Render loop error:', error);
      self.postMessage({ type: 'error', error: error.message });
    }
  };

  render();
}

function cleanup() {
  // Cancel animation frame
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Clean up Three.js objects
  if (mesh) {
    mesh.geometry?.dispose();
    (mesh.material as THREE.Material)?.dispose();
    mesh = null;
  }

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;

  self.postMessage({ type: 'destroyed' });
}

// Handle worker termination
self.addEventListener('beforeunload', cleanup);