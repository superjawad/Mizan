// =============================================================================
//  main.js — wires the MoroccanSalonGenerator module to the UI and 3D viewport.
//
//  All generation logic lives in MoroccanSalonGenerator.js.
//  This file handles: scene setup, sliders, view-mode toggle, BOM, dev console.
// =============================================================================

import * as THREE from 'three';
import { OrbitControls }    from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment }  from 'three/addons/environments/RoomEnvironment.js';
import { MoroccanSalonGenerator, CONFIG } from './MoroccanSalonGenerator.js';


// ── Asset Loading ────────────────────────────────────────────────────────────
const textureLoader = new THREE.TextureLoader();


const assets = {
  wood: {
    color:     textureLoader.load('./public/textures/Wood050/Wood050_1K-JPG_Color.jpg'),
    roughness: textureLoader.load('./public/textures/Wood050/Wood050_1K-JPG_Roughness.jpg'),
    normal:    textureLoader.load('./public/textures/Wood050/Wood050_1K-JPG_NormalGL.jpg'),
  },
  fabric: {
    color:     textureLoader.load('./public/textures/Fabric009/Fabric009_1K-JPG_Color.jpg'),
    roughness: textureLoader.load('./public/textures/Fabric009/Fabric009_1K-JPG_Roughness.jpg'),
    normal:    textureLoader.load('./public/textures/Fabric009/Fabric009_1K-JPG_NormalGL.jpg'),
  }
};


// Configure texture tiling
[assets.wood, assets.fabric].forEach(group => {
  Object.values(group).forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  });
});



// ── User-controlled dimensions (the four sliders in the UI) ──────────────────
const dimensions = {
  backLength: 4.50,
  leftDepth:  3.00,
  rightDepth: 3.00,
  seatDepth:  CONFIG.seatDepth,
};


// =============================================================================
//  Scene setup
// =============================================================================
const canvas   = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping       = THREE.ACESFilmicToneMapping;

renderer.outputColorSpace  = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0e0e0);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(6, 5, 7);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.04;      
controls.rotateSpeed   = 0.7;       
controls.target.set(0, 0.5, 0);

// Limits
controls.minPolarAngle = Math.PI / 4;    
controls.maxPolarAngle = Math.PI / 1.8;  
controls.minDistance   = 4;              
controls.maxDistance   = 12;             


scene.add(new THREE.HemisphereLight(0xffffff, 0xbebebe, 0.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);      
sun.position.set(-5, 8, 4); // Top-Left for Neumorphic feel
scene.add(sun);

// =============================================================================
//  Neumorphic Environment
// =============================================================================
renderer.toneMappingExposure = 0.9; 

const pmrem  = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envMap;

// Invisible ground (matches background exactly, no shadows)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);










// =============================================================================
//  Generator state & UI
// =============================================================================
let viewMode      = 'realistic';
let salonGroup    = null;

function rebuildSalon() {
    // Sync user-controlled values into CONFIG
    CONFIG.seatDepth                = dimensions.seatDepth;
    CONFIG.materials.diagrammatic   = (viewMode === 'diagram');

    // Dispose previous group
    if (salonGroup) {
      scene.remove(salonGroup);
      salonGroup.traverse(object => { if (object.geometry) object.geometry.dispose(); });
    }

    try {
      const generator = new MoroccanSalonGenerator(CONFIG, assets);
      salonGroup = generator.generate({
        type:       'U',
        backLength: dimensions.backLength,
        leftDepth:  dimensions.leftDepth,
        rightDepth: dimensions.rightDepth,
      });

      scene.add(salonGroup);

    } catch (err) {
      console.error(err);
    }

}

// UI Listeners
['backLength', 'leftDepth'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      dimensions[id] = parseFloat(el.value);
      rebuildSalon();
    });
  }
});

const btnDiagram = document.getElementById('modeDiagram');
const btnReal    = document.getElementById('modeReal');

if (btnDiagram && btnReal) {
  btnDiagram.addEventListener('click', () => {
    viewMode = 'diagram';
    btnDiagram.classList.add('active');
    btnReal.classList.remove('active');
    rebuildSalon();
  });

  btnReal.addEventListener('click', () => {
    viewMode = 'realistic';
    btnReal.classList.add('active');
    btnDiagram.classList.remove('active');
    rebuildSalon();
  });
}


// =============================================================================
//  Resize and animation loop
// =============================================================================
function onWindowResize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', onWindowResize);
onWindowResize();

(function animationLoop() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animationLoop);
})();


// =============================================================================
//  Boot
// =============================================================================
rebuildSalon();

