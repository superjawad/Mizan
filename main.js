// =============================================================================
//  main.js — Mizan configurator wiring (Salon + Closet)
// =============================================================================

import * as THREE from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MoroccanSalonGenerator, CONFIG }           from './MoroccanSalonGenerator.js';
import { ParametricClosetGenerator, CLOSET_CONFIG } from './ParametricClosetGenerator.js';


// ── App state ────────────────────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const initialProduct = params.get('product') === 'closet' ? 'closet' : 'salon';

const state = {
  product:         initialProduct,

  // Salon
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

  // Closet
  closetWidth:    2.60,
  closetHeight:   2.20,
  closetDepth:    0.60,
  closetColCount: 4,
  closetColumns: [
    { type: 'drawers-hang', drawers: 3, widthFactor: 1.05 },
    { type: 'shelves',      shelves: 6, widthFactor: 0.55 },
    { type: 'hang',         widthFactor: 0.85 },
    { type: 'drawer-hang',  widthFactor: 1.10 },
  ],
  colorCase:     '#8a6a44',
  colorDrawer:   '#d9c9a8',
  colorInterior: '#bfb6a8',
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
controls.minDistance   = 3;
controls.maxDistance   = 16;

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
//  Generators
// =============================================================================
let currentGroup = null;

function rebuild() {
  if (currentGroup) {
    scene.remove(currentGroup);
    currentGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    currentGroup = null;
  }

  try {
    if (state.product === 'salon') {
      currentGroup = buildSalon();
      controls.target.set(0, 0.5, 0);
      camera.position.set(6, 5, 7);
    } else {
      currentGroup = buildCloset();
      controls.target.set(0, 1.1, 0);
      camera.position.set(0, 1.6, 4.2);
    }
    if (currentGroup) scene.add(currentGroup);
  } catch (err) {
    console.error(err);
  }

  updateBOM();
}

function buildSalon() {
  CONFIG.seatDepth                 = state.seatDepth;
  CONFIG.finishedSeatingHeight     = state.seatingHeight;
  CONFIG.sandoq.height             = state.sandoqHeight;
  CONFIG.mkhady.targetWidth        = state.cushionWidth;
  CONFIG.mkhady.height             = state.cushionHeight;
  CONFIG.mida.radius               = state.midaRadius;
  CONFIG.mida.height               = state.midaHeight;
  CONFIG.showMida                  = state.midaVisible;
  CONFIG.reach.midaCoverage        = 3.0;
  CONFIG.materials.diagrammatic    = true;
  CONFIG.materials.woodColor       = parseInt(state.colorWood.replace('#', ''), 16);
  CONFIG.materials.upholsteryColor = parseInt(state.colorUpholstery.replace('#', ''), 16);
  CONFIG.materials.accentColor     = parseInt(state.colorAccent.replace('#', ''), 16);
  CONFIG.materials.lehhafColor     = parseInt(state.colorLehhaf.replace('#', ''), 16);

  const generator = new MoroccanSalonGenerator(CONFIG, null);
  return generator.generate({
    type:       state.layout,
    backLength: state.backLength,
    leftDepth:  state.leftDepth,
    rightDepth: state.rightDepth,
  });
}

function buildCloset() {
  CLOSET_CONFIG.materials.diagrammatic  = true;
  CLOSET_CONFIG.materials.caseColor     = parseInt(state.colorCase.replace('#', ''), 16);
  CLOSET_CONFIG.materials.drawerColor   = parseInt(state.colorDrawer.replace('#', ''), 16);
  CLOSET_CONFIG.materials.interiorColor = parseInt(state.colorInterior.replace('#', ''), 16);

  const generator = new ParametricClosetGenerator(CLOSET_CONFIG, null);
  return generator.generate({
    totalWidth:  state.closetWidth,
    totalHeight: state.closetHeight,
    totalDepth:  state.closetDepth,
    columns:     state.closetColumns.slice(0, state.closetColCount),
  });
}


// =============================================================================
//  BOM — List of Materials
// =============================================================================
function computeSalonBOM() {
  const s   = state;
  const cfg = CONFIG;

  let linearSeating = s.backLength;
  if (s.layout === 'U') linearSeating += s.leftDepth + s.rightDepth;
  if (s.layout === 'L') linearSeating += s.leftDepth;

  const cushionCount   = Math.max(1, Math.round(linearSeating / s.cushionWidth));
  const segmentCount   = s.layout === 'U' ? 3 : s.layout === 'L' ? 2 : 1;
  const bolsterCount   = segmentCount * 2;
  const midaCount      = s.midaVisible ? Math.max(1, Math.round(s.backLength / 3.0)) : 0;
  const seatArea       = (linearSeating * s.seatDepth).toFixed(2);
  const sandoqSections = Math.ceil(linearSeating / cfg.sandoq.structuralMaxLength);
  const foamVolume     = (linearSeating * s.seatDepth * (s.seatingHeight - s.sandoqHeight - cfg.sandoq.legHeight)).toFixed(3);

  return { linearSeating: linearSeating.toFixed(2), seatArea, sandoqSections, cushionCount, bolsterCount, midaCount, foamVolume };
}

function computeClosetBOM() {
  const cols = state.closetColumns.slice(0, state.closetColCount);
  const W = state.closetWidth, H = state.closetHeight, D = state.closetDepth;

  let shelfCount = 1;
  let drawerCount = 0;
  let hangingRods = 0;
  let ledStripM = 0;

  cols.forEach(c => {
    if (c.type === 'shelves')       shelfCount += c.shelves || 5;
    if (c.type === 'hang')         { hangingRods += 1; ledStripM += W / cols.length; }
    if (c.type === 'drawers-hang') { drawerCount += c.drawers || 3; hangingRods += 1; ledStripM += W / cols.length; }
    if (c.type === 'drawer-hang')  { drawerCount += 1; hangingRods += 1; ledStripM += W / cols.length; }
  });

  const panelCount = 2 + 2 + (cols.length - 1) + 1;
  const boardArea  = (
    2 * (H * D) + 2 * (W * D) +
    (cols.length - 1) * (H * D) +
    W * H +
    shelfCount * (W / cols.length * D)
  ).toFixed(2);

  return {
    width: W.toFixed(2), height: H.toFixed(2), depth: D.toFixed(2),
    columns: cols.length, panelCount, shelfCount, drawerCount,
    hangingRods, ledStripM: ledStripM.toFixed(2), boardArea,
  };
}

function updateBOM() {
  const grid = document.getElementById('bomGrid');
  if (!grid) return;

  if (state.product === 'salon') {
    const b = computeSalonBOM();
    grid.innerHTML = `
      <span class="bom-key">Linear seating</span><span class="bom-val">${b.linearSeating} m</span>
      <span class="bom-key">Seat area</span><span class="bom-val">${b.seatArea} m²</span>
      <span class="bom-key">Foam volume</span><span class="bom-val">${b.foamVolume} m³</span>
      <div class="bom-divider"></div><div class="bom-divider"></div>
      <span class="bom-key">Sandoq sections</span><span class="bom-val">${b.sandoqSections}</span>
      <span class="bom-key">Mkhady cushions</span><span class="bom-val">${b.cushionCount}</span>
      <span class="bom-key">Mzaoud bolsters</span><span class="bom-val">${b.bolsterCount}</span>
      <span class="bom-key">Mida tables</span><span class="bom-val">${b.midaCount}</span>
    `;
  } else {
    const b = computeClosetBOM();
    grid.innerHTML = `
      <span class="bom-key">Width × Height</span><span class="bom-val">${b.width} × ${b.height} m</span>
      <span class="bom-key">Depth</span><span class="bom-val">${b.depth} m</span>
      <span class="bom-key">Columns</span><span class="bom-val">${b.columns}</span>
      <div class="bom-divider"></div><div class="bom-divider"></div>
      <span class="bom-key">Case panels</span><span class="bom-val">${b.panelCount}</span>
      <span class="bom-key">Shelves</span><span class="bom-val">${b.shelfCount}</span>
      <span class="bom-key">Drawers</span><span class="bom-val">${b.drawerCount}</span>
      <span class="bom-key">Hanging rods</span><span class="bom-val">${b.hangingRods}</span>
      <span class="bom-key">LED strip</span><span class="bom-val">${b.ledStripM} m</span>
      <div class="bom-divider"></div><div class="bom-divider"></div>
      <span class="bom-key">Board area</span><span class="bom-val">${b.boardArea} m²</span>
    `;
  }
}


// =============================================================================
//  UI wiring
// =============================================================================
function applyProductUI() {
  document.querySelectorAll('.product-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.product === state.product);
  });
  document.getElementById('salonPanel').style.display  = state.product === 'salon'  ? '' : 'none';
  document.getElementById('closetPanel').style.display = state.product === 'closet' ? '' : 'none';
  document.getElementById('salonColors').style.display  = state.product === 'salon'  ? '' : 'none';
  document.getElementById('closetColors').style.display = state.product === 'closet' ? '' : 'none';
  document.getElementById('productSubLabel').textContent =
    state.product === 'salon' ? 'Salon sur mesure — ميزان' : 'Closet sur mesure — خزانة';
}

document.querySelectorAll('.product-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.product = btn.dataset.product;
    applyProductUI();
    rebuild();
  });
});

function bindSlider(id, stateKey, valId, unit = ' m', decimals = 2) {
  const el  = document.getElementById(id);
  const val = document.getElementById(valId);
  if (!el) return;
  el.addEventListener('input', () => {
    state[stateKey] = parseFloat(el.value);
    if (val) val.textContent = parseFloat(el.value).toFixed(decimals) + unit;
    rebuild();
  });
}

function bindColor(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => { state[stateKey] = el.value; rebuild(); });
}

// Salon sliders
bindSlider('backLength',    'backLength',    'backLengthVal');
bindSlider('leftDepth',     'leftDepth',     'leftDepthVal');
bindSlider('rightDepth',    'rightDepth',    'rightDepthVal');
bindSlider('seatDepth',     'seatDepth',     'seatDepthVal');
bindSlider('seatingHeight', 'seatingHeight', 'seatingHeightVal');
bindSlider('sandoqHeight',  'sandoqHeight',  'sandoqHeightVal');
bindSlider('cushionWidth',  'cushionWidth',  'cushionWidthVal');
bindSlider('cushionHeight', 'cushionHeight', 'cushionHeightVal');
bindSlider('midaRadius',    'midaRadius',    'midaRadiusVal');
bindSlider('midaHeight',    'midaHeight',    'midaHeightVal');

// Closet sliders
bindSlider('closetWidth',  'closetWidth',  'closetWidthVal');
bindSlider('closetHeight', 'closetHeight', 'closetHeightVal');
bindSlider('closetDepth',  'closetDepth',  'closetDepthVal');

const colCountEl  = document.getElementById('closetColCount');
const colCountVal = document.getElementById('closetColCountVal');
if (colCountEl) {
  colCountEl.addEventListener('input', () => {
    state.closetColCount = parseInt(colCountEl.value, 10);
    if (colCountVal) colCountVal.textContent = state.closetColCount;
    renderColumnEditors();
    rebuild();
  });
}

const COLUMN_TYPES = [
  { v: 'hang',         label: 'Hanging' },
  { v: 'shelves',      label: 'Shelves' },
  { v: 'drawers-hang', label: 'Drawers + Hang' },
  { v: 'drawer-hang',  label: 'Drawer + Hang' },
];

function renderColumnEditors() {
  const wrap = document.getElementById('columnEditors');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < state.closetColCount; i++) {
    if (!state.closetColumns[i]) state.closetColumns[i] = { type: 'hang', widthFactor: 1 };
    const col = state.closetColumns[i];
    const row = document.createElement('div');
    row.className = 'col-editor';
    row.innerHTML = `
      <span class="col-idx">${i + 1}</span>
      <select class="col-type">
        ${COLUMN_TYPES.map(t => `<option value="${t.v}"${t.v === col.type ? ' selected' : ''}>${t.label}</option>`).join('')}
      </select>
    `;
    row.querySelector('.col-type').addEventListener('change', e => {
      col.type = e.target.value;
      if (col.type === 'shelves'      && !col.shelves) col.shelves = 6;
      if (col.type === 'drawers-hang' && !col.drawers) col.drawers = 3;
      rebuild();
    });
    wrap.appendChild(row);
  }
}

// Layout switcher
document.querySelectorAll('.layout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateLayoutUI();
    rebuild();
  });
});

function updateLayoutUI() {
  const leftRow   = document.getElementById('leftDepthRow');
  const rightRow  = document.getElementById('rightDepthRow');
  const leftLabel = document.getElementById('leftDepthLabel');
  if (!leftRow) return;
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

const btnMidaOn  = document.getElementById('midaOn');
const btnMidaOff = document.getElementById('midaOff');
if (btnMidaOn && btnMidaOff) {
  btnMidaOn.addEventListener('click', () => {
    state.midaVisible = true;
    btnMidaOn.classList.add('active');
    btnMidaOff.classList.remove('active');
    document.getElementById('midaRadiusRow').style.display = '';
    document.getElementById('midaHeightRow').style.display = '';
    rebuild();
  });
  btnMidaOff.addEventListener('click', () => {
    state.midaVisible = false;
    btnMidaOff.classList.add('active');
    btnMidaOn.classList.remove('active');
    document.getElementById('midaRadiusRow').style.display = 'none';
    document.getElementById('midaHeightRow').style.display = 'none';
    rebuild();
  });
}

// Colors
bindColor('colorUpholstery', 'colorUpholstery');
bindColor('colorWood',       'colorWood');
bindColor('colorAccent',     'colorAccent');
bindColor('colorLehhaf',     'colorLehhaf');
bindColor('colorCase',       'colorCase');
bindColor('colorDrawer',     'colorDrawer');
bindColor('colorInterior',   'colorInterior');

// Collapsible BOM
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
applyProductUI();
updateLayoutUI();
renderColumnEditors();
rebuild();
