// =============================================================================
//  main.js — wires the MoroccanSalonGenerator module to the UI and 3D viewport.
// =============================================================================

import * as THREE from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MoroccanSalonGenerator, CONFIG } from './MoroccanSalonGenerator.js';


// ── Texture loader ───────────────────────────────────────────────────────────
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

[assets.wood, assets.fabric].forEach(group => {
  Object.values(group).forEach(tex => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; });
});


// ── App state ────────────────────────────────────────────────────────────────
const state = {
  layout:       'U',
  viewMode:     'realistic',
  backLength:   4.50,
  leftDepth:    3.00,
  rightDepth:   3.00,
  seatDepth:    CONFIG.seatDepth,
  colorUpholstery: '#9e2a3a',
  colorWood:       '#5c3d1e',
  colorAccent:     '#c8892e',
};


// =============================================================================
//  Scene setup
// =============================================================================
const canvas   = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace   = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe4e0db);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(6, 5, 7);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping  = true;
controls.dampingFactor  = 0.04;
controls.rotateSpeed    = 0.7;
controls.target.set(0, 0.5, 0);
controls.minPolarAngle  = Math.PI / 4;
controls.maxPolarAngle  = Math.PI / 1.8;
controls.minDistance    = 4;
controls.maxDistance    = 14;

scene.add(new THREE.HemisphereLight(0xffffff, 0xbebebe, 0.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(-5, 8, 4);
scene.add(sun);

const pmrem  = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envMap;

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0xe4e0db, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);


// =============================================================================
//  Generator
// =============================================================================
let salonGroup = null;

function rebuildSalon() {
  // Push state into CONFIG
  CONFIG.seatDepth                 = state.seatDepth;
  CONFIG.materials.diagrammatic    = (state.viewMode === 'diagram');
  CONFIG.materials.woodColor       = parseInt(state.colorWood.replace('#', ''), 16);
  CONFIG.materials.upholsteryColor = parseInt(state.colorUpholstery.replace('#', ''), 16);
  CONFIG.materials.accentColor     = parseInt(state.colorAccent.replace('#', ''), 16);

  if (salonGroup) {
    scene.remove(salonGroup);
    salonGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  try {
    const generator = new MoroccanSalonGenerator(CONFIG, state.viewMode === 'realistic' ? assets : null);
    salonGroup = generator.generate({
      type:       state.layout,
      backLength: state.backLength,
      leftDepth:  state.leftDepth,
      rightDepth: state.rightDepth,
    });
    scene.add(salonGroup);
  } catch (err) {
    console.error(err);
  }

  updateBOM();
}


// =============================================================================
//  BOM — Bill of Materials
// =============================================================================
function computeBOM() {
  const s = state;
  const cfg = CONFIG;

  // Linear seating
  let linearSeating = s.backLength;
  if (s.layout === 'U') linearSeating += s.leftDepth + s.rightDepth;
  if (s.layout === 'L') linearSeating += s.leftDepth;

  // Cushion count (Mkhady): ~1 per 0.6m
  const cushionCount = Math.max(1, Math.round(linearSeating / cfg.mkhady.targetWidth));

  // Bolsters (Mzaoud): 2 per bench segment
  const segmentCount = s.layout === 'U' ? 3 : s.layout === 'L' ? 2 : 1;
  const bolsterCount = segmentCount * 2;

  // Tables (Mida)
  const midaCount = Math.max(1, Math.round(s.backLength / cfg.reach.midaCoverage));

  // Wood length (Sandoq + Coin + ArmsideBox)
  const woodLength = linearSeating.toFixed(2);

  // Seat area (m²)
  const seatArea = (linearSeating * cfg.seatDepth).toFixed(2);

  return { linearSeating: linearSeating.toFixed(2), cushionCount, bolsterCount, midaCount, woodLength, seatArea, segmentCount };
}

function updateBOM() {
  const bom = computeBOM();
  const grid = document.getElementById('bomGrid');
  if (!grid) return;

  grid.innerHTML = `
    <span class="bom-key">Linear seating</span>
    <span class="bom-val">${bom.linearSeating} m</span>

    <span class="bom-key">Seat area</span>
    <span class="bom-val">${bom.seatArea} m²</span>

    <div class="bom-divider"></div><div class="bom-divider"></div>

    <span class="bom-key">Sandoq sections</span>
    <span class="bom-val">${bom.segmentCount}</span>

    <span class="bom-key">Mkhady cushions</span>
    <span class="bom-val">${bom.cushionCount}</span>

    <span class="bom-key">Mzaoud bolsters</span>
    <span class="bom-val">${bom.bolsterCount}</span>

    <span class="bom-key">Mida tables</span>
    <span class="bom-val">${bom.midaCount}</span>

    <div class="bom-divider"></div><div class="bom-divider"></div>

    <span class="bom-key">Wood length</span>
    <span class="bom-val">${bom.woodLength} m</span>
  `;
}


// =============================================================================
//  UI wiring
// =============================================================================

// ── Sliders ──────────────────────────────────────────────────────────────────
function bindSlider(id, stateKey, valId, unit = ' m') {
  const el  = document.getElementById(id);
  const val = document.getElementById(valId);
  if (!el) return;
  el.addEventListener('input', () => {
    state[stateKey] = parseFloat(el.value);
    if (val) val.textContent = parseFloat(el.value).toFixed(2) + unit;
    rebuildSalon();
  });
}

bindSlider('backLength',  'backLength',  'backLengthVal');
bindSlider('leftDepth',   'leftDepth',   'leftDepthVal');
bindSlider('rightDepth',  'rightDepth',  'rightDepthVal');


// ── Layout switcher ──────────────────────────────────────────────────────────
document.querySelectorAll('.layout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateLayoutUI();
    rebuildSalon();
  });
});

function updateLayoutUI() {
  const leftRow  = document.getElementById('leftDepthRow');
  const rightRow = document.getElementById('rightDepthRow');
  const leftLabel = document.getElementById('leftDepthLabel');

  if (state.layout === 'U') {
    leftRow.style.display  = '';
    rightRow.style.display = '';
    if (leftLabel) leftLabel.textContent = 'Left Depth';
  } else if (state.layout === 'L') {
    leftRow.style.display  = '';
    rightRow.style.display = 'none';
    if (leftLabel) leftLabel.textContent = 'Side Depth';
  } else {
    // I — no depth sliders needed
    leftRow.style.display  = 'none';
    rightRow.style.display = 'none';
  }
}


// ── View mode ────────────────────────────────────────────────────────────────
const btnReal    = document.getElementById('modeReal');
const btnDiagram = document.getElementById('modeDiagram');

btnReal.addEventListener('click', () => {
  state.viewMode = 'realistic';
  btnReal.classList.add('active');
  btnDiagram.classList.remove('active');
  rebuildSalon();
});

btnDiagram.addEventListener('click', () => {
  state.viewMode = 'diagram';
  btnDiagram.classList.add('active');
  btnReal.classList.remove('active');
  rebuildSalon();
});


// ── Color pickers ────────────────────────────────────────────────────────────
function bindColor(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    state[stateKey] = el.value;
    rebuildSalon();
  });
}

bindColor('colorUpholstery', 'colorUpholstery');
bindColor('colorWood',       'colorWood');
bindColor('colorAccent',     'colorAccent');


// ── Collapsible BOM ──────────────────────────────────────────────────────────
const bomToggle = document.getElementById('bomToggle');
const bomBody   = document.getElementById('bomBody');

bomToggle.addEventListener('click', () => {
  const isOpen = bomBody.classList.contains('open');
  bomBody.classList.toggle('open', !isOpen);
  bomToggle.classList.toggle('open', !isOpen);
});


// =============================================================================
//  Resize + animation loop
// =============================================================================
function onResize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', onResize);
onResize();

(function loop() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();


// =============================================================================
//  Boot
// =============================================================================
updateLayoutUI();
rebuildSalon();
