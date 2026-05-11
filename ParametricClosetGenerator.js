// =============================================================================
//  ParametricClosetGenerator.js
//  Procedural generator for a built-in parametric closet — Mizan Studio
// =============================================================================

import * as THREE from 'three';

export const CLOSET_CONFIG = {
  totalWidth:   2.60,
  totalHeight:  2.20,
  totalDepth:   0.60,

  panelThickness: 0.018,
  backThickness:  0.006,
  plinthHeight:   0.06,
  topShelfInset:  0.40,

  drawer: {
    faceGap:       0.003,
    faceThickness: 0.018,
    handleInset:   0.10,
    handleHeight:  0.020,
    handleDepth:   0.012,
  },

  shelf: {
    thickness: 0.018,
  },

  hangRod: {
    radius:        0.012,
    topOffset:     0.06,
    bottomOffset:  1.00,
  },

  led: {
    thickness:  0.008,
    inset:      0.04,
    yOffset:    0.04,
  },

  columns: [
    { type: 'drawers-hang', drawers: 3, widthFactor: 1.05 },
    { type: 'shelves',      shelves: 6, widthFactor: 0.55 },
    { type: 'hang',         widthFactor: 0.85 },
    { type: 'drawer-hang',  widthFactor: 1.10 },
  ],

  materials: {
    diagrammatic:  false,
    caseColor:     0x8a6a44,  // warm wood frame
    interiorColor: 0xbfb6a8,  // light beige/grey interior
    drawerColor:   0xd9c9a8,  // cream drawer fronts
    handleColor:   0x2a2a2a,
    rodColor:      0x9a9a9a,
    ledColor:      0xfff4d6,
    edgeColor:     0x111111,
  },
};

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export class ParametricClosetGenerator {

  constructor(config = CLOSET_CONFIG, assets = null) {
    this.config = config;
    this.assets = assets;
    this.materials = this._buildMaterials();
  }

  _buildMaterials() {
    const m = this.config.materials;
    const diag = m.diagrammatic;
    const assets = this.assets;

    const mats = {
      caseSide: new THREE.MeshStandardMaterial({
        color: m.caseColor,
        roughness: diag ? 0.9 : 0.55,
        metalness: 0,
        envMapIntensity: diag ? 0 : 1.2,
      }),
      interior: new THREE.MeshStandardMaterial({
        color: m.interiorColor,
        roughness: 0.8,
        metalness: 0,
      }),
      drawer: new THREE.MeshStandardMaterial({
        color: m.drawerColor,
        roughness: 0.5,
        metalness: 0.05,
        envMapIntensity: diag ? 0 : 1.0,
      }),
      handle: new THREE.MeshStandardMaterial({
        color: m.handleColor,
        roughness: 0.4,
        metalness: 0.6,
      }),
      rod: new THREE.MeshStandardMaterial({
        color: m.rodColor,
        roughness: 0.3,
        metalness: 0.85,
      }),
      led: new THREE.MeshStandardMaterial({
        color: m.ledColor,
        emissive: m.ledColor,
        emissiveIntensity: diag ? 0.2 : 1.4,
        roughness: 1,
      }),
      edge: new THREE.LineBasicMaterial({
        color: m.edgeColor,
        transparent: true,
        opacity: diag ? 0.5 : 0,
      }),
    };

    if (!diag && assets && assets.wood) {
      mats.caseSide.map = assets.wood.color;
      mats.caseSide.roughnessMap = assets.wood.roughness;
      mats.caseSide.normalMap = assets.wood.normal;
      mats.caseSide.color.set(0xffffff);
      [assets.wood.color, assets.wood.roughness, assets.wood.normal].forEach(t => {
        if (t) { t.repeat.set(1, 1); t.needsUpdate = true; }
      });
    }

    return mats;
  }

  generate(params = {}) {
    const cfg = this.config;
    const W = params.totalWidth  ?? cfg.totalWidth;
    const H = params.totalHeight ?? cfg.totalHeight;
    const D = params.totalDepth  ?? cfg.totalDepth;
    const columns = params.columns ?? cfg.columns;

    const root = new THREE.Group();
    root.name = 'ParametricCloset';

    const T = cfg.panelThickness;
    const innerH = H - 2 * T;
    const innerD = D - cfg.backThickness;

    // ── Case (wood frame) ──
    // Left side
    const left = box(T, H, D, this.materials.caseSide);
    left.position.set(-W / 2 + T / 2, H / 2, 0);
    root.add(left);

    // Right side
    const right = box(T, H, D, this.materials.caseSide);
    right.position.set(W / 2 - T / 2, H / 2, 0);
    root.add(right);

    // Top
    const top = box(W - 2 * T, T, D, this.materials.caseSide);
    top.position.set(0, H - T / 2, 0);
    root.add(top);

    // Bottom
    const bottom = box(W - 2 * T, T, D, this.materials.caseSide);
    bottom.position.set(0, T / 2, 0);
    root.add(bottom);

    // Back panel
    const back = box(W - 2 * T, innerH, cfg.backThickness, this.materials.interior);
    back.position.set(0, H / 2, -D / 2 + cfg.backThickness / 2);
    root.add(back);

    // ── Columns ──
    const innerW = W - 2 * T;
    const totalFactor = columns.reduce((s, c) => s + (c.widthFactor || 1), 0);
    const dividerCount = columns.length - 1;
    const availableW = innerW - dividerCount * T;

    let cursorX = -W / 2 + T;
    const columnRects = [];

    columns.forEach((col, i) => {
      const factor = col.widthFactor || 1;
      const colW = (availableW * factor) / totalFactor;

      const x0 = cursorX;
      const x1 = cursorX + colW;
      const centerX = (x0 + x1) / 2;

      columnRects.push({ col, x0, x1, centerX, width: colW });

      // Add right-side divider (except after the last column)
      if (i < columns.length - 1) {
        const div = box(T, innerH, D - cfg.backThickness, this.materials.caseSide);
        div.position.set(x1 + T / 2, H / 2, cfg.backThickness / 2);
        root.add(div);
        cursorX = x1 + T;
      } else {
        cursorX = x1;
      }
    });

    // ── Fill each column with content ──
    columnRects.forEach(rect => {
      this._fillColumn(root, rect, H, D, innerD);
    });

    // ── Top spanning shelf (across entire interior, like reference) ──
    const topShelfY = H - T - 0.30;
    const topShelf = box(innerW, cfg.shelf.thickness, innerD * 0.95, this.materials.interior);
    topShelf.position.set(0, topShelfY, cfg.backThickness / 2);
    root.add(topShelf);

    // Center root on ground
    root.position.y = 0;
    return root;
  }

  _fillColumn(root, rect, H, D, innerD) {
    const cfg = this.config;
    const T = cfg.panelThickness;
    const { col, x0, x1, centerX, width } = rect;
    const innerCol = width;

    const floorY = T;            // top of bottom panel
    const ceilingY = H - T - 0.30 - cfg.shelf.thickness; // under top shelf
    const usableH = ceilingY - floorY;

    switch (col.type) {
      case 'shelves': {
        const n = col.shelves || 5;
        for (let i = 1; i <= n; i++) {
          const y = floorY + (usableH * i) / (n + 1);
          const sh = box(innerCol - 0.004, cfg.shelf.thickness, innerD * 0.95, this.materials.interior);
          sh.position.set(centerX, y, cfg.backThickness / 2);
          root.add(sh);
        }
        break;
      }

      case 'hang': {
        this._addHangRod(root, centerX, ceilingY - cfg.hangRod.topOffset, innerCol, innerD);
        this._addLED(root, centerX, ceilingY - cfg.led.yOffset, innerCol, innerD);
        break;
      }

      case 'drawers-hang': {
        const drawers = col.drawers || 3;
        const drawerZoneH = 0.50;
        const drawerH = drawerZoneH / drawers;
        for (let i = 0; i < drawers; i++) {
          const y = floorY + i * drawerH + drawerH / 2;
          this._addDrawer(root, centerX, y, innerCol, drawerH, D);
        }
        // Hanging above drawers
        const hangBottom = floorY + drawerZoneH + 0.02;
        const rodY = ceilingY - cfg.hangRod.topOffset;
        this._addHangRod(root, centerX, rodY, innerCol, innerD);
        this._addLED(root, centerX, ceilingY - cfg.led.yOffset, innerCol, innerD);
        break;
      }

      case 'drawer-hang': {
        // One drawer roughly at hip height
        const drawerH = 0.16;
        const drawerY = floorY + 0.85;
        this._addDrawer(root, centerX, drawerY, innerCol, drawerH, D);
        // Mid hanging rod (above drawer)
        const midRodY = drawerY + drawerH / 2 + 0.55;
        this._addHangRod(root, centerX, Math.min(midRodY, ceilingY - cfg.hangRod.topOffset), innerCol, innerD);
        this._addLED(root, centerX, ceilingY - cfg.led.yOffset, innerCol, innerD);
        break;
      }

      default:
        break;
    }
  }

  _addHangRod(root, centerX, y, colWidth, innerD) {
    const cfg = this.config;
    const len = colWidth - 0.02;
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.hangRod.radius, cfg.hangRod.radius, len, 16),
      this.materials.rod
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.set(centerX, y, cfg.backThickness / 2);
    root.add(rod);
  }

  _addLED(root, centerX, y, colWidth, innerD) {
    const cfg = this.config;
    const len = colWidth - 2 * cfg.led.inset;
    const led = box(len, cfg.led.thickness, 0.025, this.materials.led);
    led.position.set(centerX, y, innerD / 2 - 0.05);
    root.add(led);
  }

  _addDrawer(root, centerX, y, colWidth, drawerH, totalD) {
    const cfg = this.config;
    const faceW = colWidth - 2 * cfg.drawer.faceGap;
    const faceH = drawerH - 2 * cfg.drawer.faceGap;

    // Drawer face (slightly proud of front)
    const face = box(faceW, faceH, cfg.drawer.faceThickness, this.materials.drawer);
    face.position.set(centerX, y, totalD / 2 - cfg.drawer.faceThickness / 2);
    root.add(face);

    // Drawer body (recessed box behind face — visible since closet has no doors)
    const bodyD = totalD * 0.85;
    const bodyMat = this.materials.interior;
    const bodyTop = box(faceW * 0.95, 0.004, bodyD, bodyMat);
    bodyTop.position.set(centerX, y + faceH / 2 - 0.002, totalD / 2 - cfg.drawer.faceThickness - bodyD / 2);
    // Skipping inner walls of drawer body for perf — face + handle is enough visually

    // Handle (cutout-style horizontal bar near top)
    const handle = box(faceW * 0.6, cfg.drawer.handleHeight, cfg.drawer.handleDepth, this.materials.handle);
    handle.position.set(
      centerX,
      y + faceH / 2 - cfg.drawer.handleHeight / 2 - 0.01,
      totalD / 2 - cfg.drawer.faceThickness / 2 - cfg.drawer.handleDepth / 2 + 0.001
    );
    root.add(handle);
  }
}
