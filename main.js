// =============================================================================
//  main.js — wires generators (Salon / Closet) to the UI and 3D viewport.
// =============================================================================

import * as THREE from 'three';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MoroccanSalonGenerator, CONFIG }              from './MoroccanSalonGenerator.js';
import { ParametricClosetGenerator, CLOSET_CONFIG }    from './ParametricClosetGenerator.js';


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
const params = new URLSearchParams(location.search);
const initialProduct = params.get('product') === 'closet' ? 'closet' : 'salon';

const state = {
  product:  initialProduct,
  viewMode: 'realistic',

  // Salon
  layout:       'U',
  backLength:   4.50,
  leftDepth:    3.00,
  rightDepth:   3.00,
  seatDepth:    CONFIG.seatDepth,
  colorUpholstery: '#9e2a3a',
  colorWood:       '#5c3d1e',
  colorAccent:     '#c8892e',

  // Closet
  closetWidth:   2.60,
  closetHeight:  2.20,
  closetDepth:   0.60,
  closetColumns: [
    { type: 'drawers-hang', drawers: 3, widthFactor: 1.05 },
    { type: 'shelves',      shelves: 6, widthFactor: 0.55 },
    { type: 'hang',         widthFactor: 0.85 },
    { type: 'drawer-hang',  widthFactor: 1.10 },
  ],
  closetColCount:    4,
  colorCase:         '#8a6a44',
  colorDrawer:       '#d9c9a8',
  colorInterior:     '#bfb6a8',
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
controls.minDistance    = 3;
controls.maxDistance    = 16;

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
  }

  try {
    if (state.product === 'salon') {
      currentGroup = buildSalon();
      controls.target.set(0, 0.5, 0);
      camera.position.set(6, 5, 7);
    } else {
      currentGroup = buildCloset();
      controls.target.set(0, 1.1, 0);
      // Camera-front view of closet
      if (currentGroup) camera.position.set(0, 1.6, 4.2);
    }
    if (currentGroup) scene.add(currentGroup);
  } catch (err) {
    console.error(err);
  }

  updateBOM();
}

function buildSalon() {
  CONFIG.seatDepth                 = state.seatDepth;
  CONFIG.materials.diagrammatic    = (state.viewMode === 'diagram');
  CONFIG.materials.woodColor       = parseInt(state.colorWood.replace('#', ''), 16);
  CONFIG.materials.upholsteryColor = parseInt(state.colorUpholstery.replace('#', ''), 16);
  CONFIG.materials.accentColor     = parseInt(state.colorAccent.replace('#', ''), 16);

  const generator = new MoroccanSalonGenerator(CONFIG, state.viewMode === 'realistic' ? assets : null);
  return generator.generate({
    type:       state.layout,
    backLength: state.backLength,
    leftDepth:  state.leftDepth,
    rightDepth: state.rightDepth,
  });
}

function buildCloset() {
  CLOSET_CONFIG.materials.diagrammatic  = (state.viewMode === 'diagram');
  CLOSET_CONFIG.materials.caseColor     = parseInt(state.colorCase.replace('#', ''), 16);
  CLOSET_CONFIG.materials.drawerColor   = parseInt(state.colorDrawer.replace('#', ''), 16);
  CLOSET_CONFIG.materials.interiorColor = parseInt(state.colorInterior.replace('#', ''), 16);

  const generator = new ParametricClosetGenerator(
    CLOSET_CONFIG,
    state.viewMode === 'realistic' ? assets : null
  );
  return generator.generate({
    totalWidth:  state.closetWidth,
    totalHeight: state.closetHeight,
    totalDepth:  state.closetDepth,
    columns:     state.closetColumns.slice(0, state.closetColCount),
  });
}


// =============================================================================
//  BOM
// =============================================================================
function computeSalonBOM() {
  const s = state;
  const cfg = CONFIG;
  let linearSeating = s.backLength;
  if (s.layout === 'U') linearSeating += s.leftDepth + s.rightDepth;
  if (s.layout === 'L') linearSeating += s.leftDepth;
  const cushionCount = Math.max(1, Math.round(linearSeating / cfg.mkhady.targetWidth));
  const segmentCount = s.layout === 'U' ? 3 : s.layout === 'L' ? 2 : 1;
  const bolsterCount = segmentCount * 2;
  const midaCount = Math.max(1, Math.round(s.backLength / cfg.reach.midaCoverage));
  const woodLength = linearSeating.toFixed(2);
  const seatArea = (linearSeating * cfg.seatDepth).toFixed(2);
  return { linearSeating: linearSeating.toFixed(2), cushionCount, bolsterCount, midaCount, woodLength, seatArea, segmentCount };
}

function computeClosetBOM() {
  const cols = state.closetColumns.slice(0, state.closetColCount);
  const W = state.closetWidth, H = state.closetHeight, D = state.closetDepth;

  let shelfCount = 1; // top spanning shelf
  let drawerCount = 0;
  let hangingRods = 0;
  let ledStripM = 0;

  cols.forEach(c => {
    if (c.type === 'shelves')       shelfCount += c.shelves || 5;
    if (c.type === 'hang')         { hangingRods += 1; ledStripM += W / cols.length; }
    if (c.type === 'drawers-hang') { drawerCount += c.drawers || 3; hangingRods += 1; ledStripM += W / cols.length; }
    if (c.type === 'drawer-hang')  { drawerCount += 1; hangingRods += 1; ledStripM += W / cols.length; }
  });

  const panelCount = 2 /*sides*/ + 2 /*top+bottom*/ + (cols.length - 1) /*dividers*/ + 1 /*back*/;
  const boardArea = (
    2 * (H * D) +              // sides
    2 * (W * D) +              // top+bottom
    (cols.length - 1) * (H * D) + // dividers
    (W * H) +                  // back
    shelfCount * (W / cols.length * D) // shelves
  ).toFixed(2);

  return {
    width:  W.toFixed(2),
    height: H.toFixed(2),
    depth:  D.toFixed(2),
    columns: cols.length,
    panelCount,
    shelfCount,
    drawerCount,
    hangingRods,
    ledStripM: ledStripM.toFixed(2),
    boardArea,
  };
}

function updateBOM() {
  const grid = document.getElementById('bomGrid');
  if (!grid) return;

  if (state.product === 'salon') {
    const bom = computeSalonBOM();
    grid.innerHTML = `
      <span class="bom-key">Linear seating</span><span class="bom-val">${bom.linearSeating} m</span>
      <span class="bom-key">Seat area</span><span class="bom-val">${bom.seatArea} m²</span>
      <div class="bom-divider"></div><div class="bom-divider"></div>
      <span class="bom-key">Sandoq sections</span><span class="bom-val">${bom.segmentCount}</span>
      <span class="bom-key">Mkhady cushions</span><span class="bom-val">${bom.cushionCount}</span>
      <span class="bom-key">Mzaoud bolsters</span><span class="bom-val">${bom.bolsterCount}</span>
      <span class="bom-key">Mida tables</span><span class="bom-val">${bom.midaCount}</span>
      <div class="bom-divider"></div><div class="bom-divider"></div>
      <span class="bom-key">Wood length</span><span class="bom-val">${bom.woodLength} m</span>
    `;
  } else {
    const bom = computeClosetBOM();
    grid.innerHTML = `
      <span class="bom-key">Width × Height</span><span class="bom-val">${bom.width} × ${bom.height} m</span>
      <span class="bom-key">Depth</span><span class="bom-val">${bom.depth} m</span>
      <span class="bom-key">Columns</span><span class="bom-val">${bom.columns}</span>
      <div class="bom-divider"></div><div class="bom-divider"></div>
      <span class="bom-key">Case panels</span><span class="bom-val">${bom.panelCount}</span>
      <span class="bom-key">Shelves</span><span class="bom-val">${bom.shelfCount}</span>
      <span class="bom-key">Drawers</span><span class="bom-val">${bom.drawerCount}</span>
      <span class="bom-key">Hanging rods</span><span class="bom-val">${bom.hangingRods}</span>
      <span class="bom-key">LED strip</span><span class="bom-val">${bom.ledStripM} m</span>
      <div class="bom-divider"></div><div class="bom-divider"></div>
      <span class="bom-key">Board area</span><span class="bom-val">${bom.boardArea} m²</span>
    `;
  }
}


// =============================================================================
//  UI wiring — Product switcher
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


// ── Salon sliders ────────────────────────────────────────────────────────────
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
bindSlider('backLength',  'backLength',  'backLengthVal');
bindSlider('leftDepth',   'leftDepth',   'leftDepthVal');
bindSlider('rightDepth',  'rightDepth',  'rightDepthVal');


// ── Closet sliders ───────────────────────────────────────────────────────────
bindSlider('closetWidth',  'closetWidth',  'closetWidthVal');
bindSlider('closetHeight', 'closetHeight', 'closetHeightVal');
bindSlider('closetDepth',  'closetDepth',  'closetDepthVal');

// Column count slider
const colCountEl = document.getElementById('closetColCount');
const colCountVal = document.getElementById('closetColCountVal');
if (colCountEl) {
  colCountEl.addEventListener('input', () => {
    state.closetColCount = parseInt(colCountEl.value, 10);
    if (colCountVal) colCountVal.textContent = state.closetColCount;
    renderColumnEditors();
    rebuild();
  });
}


// ── Column editors ───────────────────────────────────────────────────────────
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
    if (!state.closetColumns[i]) {
      state.closetColumns[i] = { type: 'hang', widthFactor: 1 };
    }
    const col = state.closetColumns[i];
    const row = document.createElement('div');
    row.className = 'col-editor';
    row.innerHTML = `
      <span class="col-idx">${i + 1}</span>
      <select class="col-type">
        ${COLUMN_TYPES.map(t => `<option value="${t.v}" ${t.v === col.type ? 'selected' : ''}>${t.label}</option>`).join('')}
      </select>
    `;
    const sel = row.querySelector('.col-type');
    sel.addEventListener('change', () => {
      col.type = sel.value;
      if (col.type === 'shelves' && !col.shelves) col.shelves = 6;
      if (col.type === 'drawers-hang' && !col.drawers) col.drawers = 3;
      rebuild();
    });
    wrap.appendChild(row);
  }
}


// ── Layout switcher (salon) ──────────────────────────────────────────────────
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
  const leftRow  = document.getElementById('leftDepthRow');
  const rightRow = document.getElementById('rightDepthRow');
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


// ── View mode ────────────────────────────────────────────────────────────────
const btnReal    = document.getElementById('modeReal');
const btnDiagram = document.getElementById('modeDiagram');
btnReal.addEventListener('click', () => {
  state.viewMode = 'realistic';
  btnReal.classList.add('active');
  btnDiagram.classList.remove('active');
  rebuild();
});
btnDiagram.addEventListener('click', () => {
  state.viewMode = 'diagram';
  btnDiagram.classList.add('active');
  btnReal.classList.remove('active');
  rebuild();
});


// ── Color pickers ────────────────────────────────────────────────────────────
function bindColor(id, stateKey) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    state[stateKey] = el.value;
    rebuild();
  });
}
bindColor('colorUpholstery', 'colorUpholstery');
bindColor('colorWood',       'colorWood');
bindColor('colorAccent',     'colorAccent');
bindColor('colorCase',       'colorCase');
bindColor('colorDrawer',     'colorDrawer');
bindColor('colorInterior',   'colorInterior');


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
applyProductUI();
updateLayoutUI();
renderColumnEditors();
rebuild();
