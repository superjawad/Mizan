// =============================================================================
//  main.js — Mizan configurator wiring
// =============================================================================

import * as THREE from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MoroccanSalonGenerator, CONFIG } from './MoroccanSalonGenerator.js';


// ── App state ────────────────────────────────────────────────────────────────
const state = {
  layout:          'U',
  backLength:      6.00,
  leftDepth:       3.50,
  rightDepth:      4.00,
  seatDepth:       0.70,
  seatingHeight:   0.50,
  sandoqHeight:    0.20,
  cushionWidth:    1.00,
  cushionHeight:   0.60,
  midaVisible:     true,
  midaRadius:      0.60,
  midaHeight:      0.55,
  colorUpholstery: '#9e2a3a',
  colorWood:       '#5c3d1e',
  colorAccent:     '#c8892e',
  colorLehhaf:     '#d4a86a',
};


// =============================================================================
//  Scene setup
// =============================================================================
const canvas   = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace    = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe4e0db);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(6, 5, 7);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.rotateSpeed   = 0.7;
controls.target.set(0, 0.5, 0);
controls.minPolarAngle = Math.PI / 4;
controls.maxPolarAngle = Math.PI / 1.8;
controls.minDistance   = 4;
controls.maxDistance   = 14;

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
  // Push all state into CONFIG
  CONFIG.seatDepth                   = state.seatDepth;
  CONFIG.finishedSeatingHeight       = state.seatingHeight;
  CONFIG.sandoq.height               = state.sandoqHeight;
  CONFIG.mkhady.targetWidth          = state.cushionWidth;
  CONFIG.mkhady.height               = state.cushionHeight;
  CONFIG.mida.radius                 = state.midaRadius;
  CONFIG.mida.height                 = state.midaHeight;
  CONFIG.showMida                    = state.midaVisible;
  CONFIG.reach.midaCoverage          = 3.0;
  CONFIG.materials.diagrammatic      = true; // always diagram mode
  CONFIG.materials.woodColor         = parseInt(state.colorWood.replace('#', ''), 16);
  CONFIG.materials.upholsteryColor   = parseInt(state.colorUpholstery.replace('#', ''), 16);
  CONFIG.materials.accentColor       = parseInt(state.colorAccent.replace('#', ''), 16);
  CONFIG.materials.lehhafColor       = parseInt(state.colorLehhaf.replace('#', ''), 16);

  if (salonGroup) {
    scene.remove(salonGroup);
    salonGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  try {
    const generator = new MoroccanSalonGenerator(CONFIG, null);
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
//  BOM — List of Materials
// =============================================================================
function computeBOM() {
  const s   = state;
  const cfg = CONFIG;

  let linearSeating = s.backLength;
  if (s.layout === 'U') linearSeating += s.leftDepth + s.rightDepth;
  if (s.layout === 'L') linearSeating += s.leftDepth;

  const cushionCount  = Math.max(1, Math.round(linearSeating / s.cushionWidth));
  const segmentCount  = s.layout === 'U' ? 3 : s.layout === 'L' ? 2 : 1;
  const bolsterCount  = segmentCount * 2;
  const midaCount     = s.midaVisible ? Math.max(1, Math.round(s.backLength / 3.0)) : 0;
  const seatArea      = (linearSeating * s.seatDepth).toFixed(2);
  const sandoqSections = Math.ceil(linearSeating / cfg.sandoq.structuralMaxLength);
  const foamVolume    = (linearSeating * s.seatDepth * (s.seatingHeight - s.sandoqHeight - cfg.sandoq.legHeight)).toFixed(3);

  return {
    linearSeating: linearSeating.toFixed(2),
    seatArea,
    sandoqSections,
    cushionCount,
    bolsterCount,
    midaCount,
    foamVolume,
  };
}

function updateBOM() {
  const b    = computeBOM();
  const grid = document.getElementById('bomGrid');
  if (!grid) return;

  grid.innerHTML = `
    <span class="bom-key">Linear seating</span>
    <span class="bom-val">${b.linearSeating} m</span>

    <span class="bom-key">Seat area</span>
    <span class="bom-val">${b.seatArea} m²</span>

    <span class="bom-key">Foam volume</span>
    <span class="bom-val">${b.foamVolume} m³</span>

    <div class="bom-divider"></div><div class="bom-divider"></div>

    <span class="bom-key">Sandoq sections</span>
    <span class="bom-val">${b.sandoqSections}</span>

    <span class="bom-key">Mkhady cushions</span>
    <span class="bom-val">${b.cushionCount}</span>

    <span class="bom-key">Mzaoud bolsters</span>
    <span class="bom-val">${b.bolsterCount}</span>

    <span class="bom-key">Mida tables</span>
    <span class="bom-val">${b.midaCount}</span>
  `;
}


// =============================================================================
//  UI wiring
// =============================================================================

// ── Generic slider binder ────────────────────────────────────────────────────
function bindSlider(id, stateKey, valId, unit = ' m', decimals = 2) {
  const el  = document.getElementById(id);
  const val = document.getElementById(valId);
  if (!el) return;
  el.addEventListener('input', () => {
    state[stateKey] = parseFloat(el.value);
    if (val) val.textContent = parseFloat(el.value).toFixed(decimals) + unit;
    rebuildSalon();
  });
}

// Layout sliders
bindSlider('backLength',   'backLength',   'backLengthVal');
bindSlider('leftDepth',    'leftDepth',    'leftDepthVal');
bindSlider('rightDepth',   'rightDepth',   'rightDepthVal');

// Seating sliders
bindSlider('seatDepth',    'seatDepth',    'seatDepthVal');
bindSlider('seatingHeight','seatingHeight','seatingHeightVal');
bindSlider('sandoqHeight', 'sandoqHeight', 'sandoqHeightVal');

// Cushion sliders
bindSlider('cushionWidth', 'cushionWidth', 'cushionWidthVal');
bindSlider('cushionHeight','cushionHeight','cushionHeightVal');

// Mida sliders
bindSlider('midaRadius',   'midaRadius',   'midaRadiusVal');
bindSlider('midaHeight',   'midaHeight',   'midaHeightVal');


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
  const leftRow   = document.getElementById('leftDepthRow');
  const rightRow  = document.getElementById('rightDepthRow');
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
    leftRow.style.display  = 'none';
    rightRow.style.display = 'none';
  }
}


// ── Mida toggle ──────────────────────────────────────────────────────────────
const btnMidaOn  = document.getElementById('midaOn');
const btnMidaOff = document.getElementById('midaOff');

if (btnMidaOn && btnMidaOff) {
  btnMidaOn.addEventListener('click', () => {
    state.midaVisible = true;
    btnMidaOn.classList.add('active');
    btnMidaOff.classList.remove('active');
    document.getElementById('midaRadiusRow').style.display = '';
    document.getElementById('midaHeightRow').style.display = '';
    rebuildSalon();
  });
  btnMidaOff.addEventListener('click', () => {
    state.midaVisible = false;
    btnMidaOff.classList.add('active');
    btnMidaOn.classList.remove('active');
    document.getElementById('midaRadiusRow').style.display = 'none';
    document.getElementById('midaHeightRow').style.display = 'none';
    rebuildSalon();
  });
}


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
bindColor('colorLehhaf',     'colorLehhaf');


// ── Collapsible BOM ──────────────────────────────────────────────────────────
const bomToggle = document.getElementById('bomToggle');
const bomBody   = document.getElementById('bomBody');

if (bomToggle && bomBody) {
  bomToggle.addEventListener('click', () => {
    const isOpen = bomBody.classList.contains('open');
    bomBody.classList.toggle('open', !isOpen);
    bomToggle.classList.toggle('open', !isOpen);
  });
}


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
