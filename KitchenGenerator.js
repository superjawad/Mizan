// =============================================================================
//  KitchenGenerator.js
//  Procedural generator for a built-in sur mesure kitchen — Mizan Studio
//  Linear (single-wall) layout: sink zone | cooktop zone | tall appliance column
// =============================================================================

import * as THREE from 'three';

export const KITCHEN_CONFIG = {
  totalWidth:    2.60,
  totalHeight:   2.50,
  counterDepth:  0.60,
  counterHeight: 0.90,
  counterThickness: 0.04,
  counterOverhang:  0.02,

  plinthHeight: 0.15,
  plinthInset:  0.06,

  upperCabHeight: 0.76,
  upperCabDepth:  0.35,
  backsplashThickness: 0.02,

  columnWidth:    0.60,
  sinkZoneRatio:  0.45,

  doorGap:        0.004,
  panelThickness: 0.018,

  showHood:       true,
  showFaucet:     true,
  showMicrowave:  true,
  showOven:       true,
  showBackWall:   true,

  hood: {
    width:  0.85,
    depth:  0.40,
    height: 0.06,
    skirt:  0.04,
  },

  sink: {
    widthRatio: 0.70,
    depthRatio: 0.62,
    depth:      0.16,
    rimWidth:   0.025,
  },

  cooktop: {
    widthRatio: 0.78,
    depthRatio: 0.55,
    plateHeight: 0.008,
    burnerRadius: 0.07,
  },

  appliance: {
    inset:        0.012,
    bezelDepth:   0.008,
    microwaveH:   0.42,
    ovenH:        0.60,
    gapBetween:   0.04,
    topCabH:      0.50,
  },

  materials: {
    diagrammatic:    false,
    upperCabColor:   0x3a3833,
    baseCabColor:    0xc7beb1,
    counterColor:    0xe6e0d2,
    backsplashColor: 0xe6e0d2,
    applianceColor:  0x141414,
    glassColor:      0x1c1f22,
    metalColor:      0xb8b8b8,
    plinthColor:     0x141414,
    wallColor:       0xece5d6,
    handleColor:     0x222222,
    ledColor:        0xfff4d6,
  },
};

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export class KitchenGenerator {

  constructor(config = KITCHEN_CONFIG, assets = null) {
    this.config = config;
    this.assets = assets;
    this.materials = this._buildMaterials();
  }

  _buildMaterials() {
    const m = this.config.materials;
    return {
      upperCab: new THREE.MeshStandardMaterial({ color: m.upperCabColor, roughness: 0.55, metalness: 0.05 }),
      baseCab:  new THREE.MeshStandardMaterial({ color: m.baseCabColor,  roughness: 0.55, metalness: 0.05 }),
      counter:  new THREE.MeshStandardMaterial({ color: m.counterColor,  roughness: 0.35, metalness: 0.05 }),
      backsplash: new THREE.MeshStandardMaterial({ color: m.backsplashColor, roughness: 0.35, metalness: 0.05 }),
      appliance: new THREE.MeshStandardMaterial({ color: m.applianceColor, roughness: 0.45, metalness: 0.30 }),
      glass:     new THREE.MeshStandardMaterial({ color: m.glassColor, roughness: 0.18, metalness: 0.55 }),
      metal:     new THREE.MeshStandardMaterial({ color: m.metalColor, roughness: 0.25, metalness: 0.85 }),
      plinth:    new THREE.MeshStandardMaterial({ color: m.plinthColor, roughness: 0.7, metalness: 0.05 }),
      wall:      new THREE.MeshStandardMaterial({ color: m.wallColor, roughness: 0.95, metalness: 0 }),
      handle:    new THREE.MeshStandardMaterial({ color: m.handleColor, roughness: 0.4, metalness: 0.6 }),
      led:       new THREE.MeshStandardMaterial({ color: m.ledColor, emissive: m.ledColor, emissiveIntensity: 1.0, roughness: 1 }),
    };
  }

  generate(params = {}) {
    const cfg = this.config;
    const W = params.totalWidth    ?? cfg.totalWidth;
    const H = params.totalHeight   ?? cfg.totalHeight;
    const D = params.counterDepth  ?? cfg.counterDepth;
    const counterY  = params.counterHeight ?? cfg.counterHeight;
    const plinthH   = params.plinthHeight  ?? cfg.plinthHeight;
    const upperH    = params.upperCabHeight ?? cfg.upperCabHeight;
    const upperD    = params.upperCabDepth  ?? cfg.upperCabDepth;
    const columnW   = params.columnWidth    ?? cfg.columnWidth;
    const sinkRatio = params.sinkZoneRatio  ?? cfg.sinkZoneRatio;
    const showHood  = params.showHood ?? cfg.showHood;
    const showFaucet = params.showFaucet ?? cfg.showFaucet;
    const showMW    = params.showMicrowave ?? cfg.showMicrowave;
    const showOven  = params.showOven ?? cfg.showOven;
    const showWall  = params.showBackWall ?? cfg.showBackWall;

    const root = new THREE.Group();
    root.name = 'ParametricKitchen';

    // ── Horizontal zone layout (X-axis) ──
    const counterRunW = Math.max(0.4, W - columnW);
    const sinkW    = counterRunW * sinkRatio;
    const cooktopW = counterRunW - sinkW;

    const xLeft = -W / 2;
    const sinkX0    = xLeft;
    const sinkX1    = sinkX0 + sinkW;
    const cooktopX0 = sinkX1;
    const cooktopX1 = cooktopX0 + cooktopW;
    const columnX0  = cooktopX1;
    const columnX1  = W / 2;

    const sinkCx    = (sinkX0 + sinkX1) / 2;
    const cooktopCx = (cooktopX0 + cooktopX1) / 2;
    const columnCx  = (columnX0 + columnX1) / 2;

    // ── Vertical layout (Y-axis) ──
    const baseTopY    = counterY - cfg.counterThickness;
    const upperBottomY = H - cfg.upperCabHeight - 0.02 - 0.22;          // gap to ceiling ≈ 0.24
    const backsplashH  = upperBottomY - counterY;

    // ── Depth (Z) — kitchen sits against a back wall ──
    // back wall plane at z = -D/2 - tiny; cabinets extend forward to z = +D/2
    const zBack  = -D / 2;
    const zFront =  D / 2;

    // ── Back wall ──
    if (showWall) {
      const wallW = W + 0.8;
      const wallH = H + 0.2;
      const wall = box(wallW, wallH, 0.04, this.materials.wall);
      wall.position.set(0, wallH / 2 - 0.1, zBack - 0.02);
      root.add(wall);
    }

    // ── Plinth (recessed toe-kick, full width) ──
    {
      const plinthD = D - cfg.plinthInset;
      const plinth = box(W, plinthH, plinthD, this.materials.plinth);
      plinth.position.set(0, plinthH / 2, zBack + plinthD / 2);
      root.add(plinth);
    }

    // ── Base cabinets — sink zone ──
    this._buildBaseSink(root, {
      x0: sinkX0, x1: sinkX1, cx: sinkCx,
      yBottom: plinthH, yTop: baseTopY,
      D, zBack, zFront, showFaucet,
    });

    // ── Base cabinets — cooktop zone (drawer stack) ──
    this._buildBaseCooktop(root, {
      x0: cooktopX0, x1: cooktopX1, cx: cooktopCx,
      yBottom: plinthH, yTop: baseTopY,
      D, zBack, zFront,
    });

    // ── Counter slab (covers sink + cooktop zones only; column has its own top) ──
    {
      const counterRunFullW = counterRunW;
      const counter = box(
        counterRunFullW,
        cfg.counterThickness,
        D + cfg.counterOverhang,
        this.materials.counter
      );
      counter.position.set(
        (sinkX0 + cooktopX1) / 2,
        counterY - cfg.counterThickness / 2,
        zBack + (D + cfg.counterOverhang) / 2
      );
      root.add(counter);

      // Sink basin (recessed box on counter surface)
      this._buildSinkBasin(root, sinkCx, counterY, D);

      // Cooktop plate (on counter surface) — sized to the cooktop zone
      this._buildCooktopPlate(root, cooktopCx, counterY, D, cooktopW);
    }

    // ── Backsplash slab ──
    {
      const bsplash = box(counterRunW, backsplashH, cfg.backsplashThickness, this.materials.backsplash);
      bsplash.position.set(
        (sinkX0 + cooktopX1) / 2,
        counterY + backsplashH / 2,
        zBack + cfg.backsplashThickness / 2
      );
      root.add(bsplash);
    }

    // ── Upper cabinets (over sink + cooktop zones) ──
    this._buildUpperCabinets(root, {
      x0: sinkX0, x1: cooktopX1,
      yBottom: upperBottomY, yTop: upperBottomY + upperH,
      depth: upperD, zBack,
    });

    // ── Range hood (under upper cabinets, centered over cooktop) ──
    if (showHood) {
      this._buildHood(root, cooktopCx, upperBottomY, zBack, upperD);
    }

    // ── Under-cabinet LED strip ──
    {
      const ledLen = counterRunW - 0.1;
      const led = box(ledLen, 0.005, 0.02, this.materials.led);
      led.position.set(
        (sinkX0 + cooktopX1) / 2,
        upperBottomY - 0.005,
        zBack + upperD - 0.04
      );
      root.add(led);
    }

    // ── Appliance column (right side, floor to ceiling) ──
    this._buildApplianceColumn(root, {
      x0: columnX0, x1: columnX1, cx: columnCx, width: columnW,
      yBottom: plinthH, yTop: H,
      D, zBack, zFront,
      showMW, showOven,
      counterY,
    });

    return root;
  }

  // ── Sink base cabinet (single door under sink) ───────────────────────────
  _buildBaseSink(root, ctx) {
    const cfg = this.config;
    const { x0, x1, cx, yBottom, yTop, D, zBack, zFront, showFaucet } = ctx;
    const w = x1 - x0;
    const h = yTop - yBottom;

    // Carcass box
    const body = box(w, h, D, this.materials.baseCab);
    body.position.set(cx, (yBottom + yTop) / 2, zBack + D / 2);
    root.add(body);

    // Door (single, slightly recessed)
    const door = box(w - 2 * cfg.doorGap, h - 2 * cfg.doorGap, 0.018, this.materials.baseCab);
    door.position.set(cx, (yBottom + yTop) / 2, zFront - 0.009);
    root.add(door);

    // Push-to-open shadow line (subtle handle-less notch at top of door)
    const notch = box(w * 0.5, 0.004, 0.004, this.materials.handle);
    notch.position.set(cx, yTop - 0.02, zFront + 0.001);
    root.add(notch);

    // Faucet (placed AFTER counter built — we add later via reference position)
    if (showFaucet) this._faucetPending = { cx, zBack, yCounter: yTop + this.config.counterThickness };
  }

  // ── Cooktop base cabinet (drawer stack) ──────────────────────────────────
  _buildBaseCooktop(root, ctx) {
    const cfg = this.config;
    const { x0, x1, cx, yBottom, yTop, D, zBack, zFront } = ctx;
    const w = x1 - x0;
    const h = yTop - yBottom;

    // Carcass
    const body = box(w, h, D, this.materials.baseCab);
    body.position.set(cx, (yBottom + yTop) / 2, zBack + D / 2);
    root.add(body);

    // 3 drawer faces stacked
    const drawerN = 3;
    const drawerH = h / drawerN;
    for (let i = 0; i < drawerN; i++) {
      const dy = yBottom + drawerH * (i + 0.5);
      const face = box(w - 2 * cfg.doorGap, drawerH - 2 * cfg.doorGap, 0.018, this.materials.baseCab);
      face.position.set(cx, dy, zFront - 0.009);
      root.add(face);
      // Push-to-open notch at top of each drawer
      const notch = box(w * 0.45, 0.003, 0.003, this.materials.handle);
      notch.position.set(cx, dy + drawerH / 2 - 0.018, zFront + 0.001);
      root.add(notch);
    }
  }

  // ── Sink basin (recessed, on top of counter) ─────────────────────────────
  _buildSinkBasin(root, cx, counterY, D) {
    const cfg = this.config;
    const sw = (D * cfg.sink.depthRatio);    // along depth (Z)
    const sl = 0.46;                          // along width (X) — typical 460mm bowl
    const sd = cfg.sink.depth;

    // Bowl (open box — render as 4 walls + floor)
    const floorMat = this.materials.metal;
    const basinFloor = box(sl, 0.004, sw, floorMat);
    basinFloor.position.set(cx, counterY - sd + 0.002, this.config.counterOverhang ? 0 : 0);
    // re-anchor in Z relative to counter: center counter on z = zBack + (D+overhang)/2; basin centered at z=0 same as counter
    // Counter center Z computed elsewhere; we'll position basin at z = 0 (which is the kitchen midline) — but we want basin centered over its zone.
    // Simpler: anchor basin at z = (zBack + zFront)/2 = 0 in our local frame (since zBack = -D/2)
    basinFloor.position.z = 0;
    root.add(basinFloor);

    // Walls
    const wallMat = this.materials.metal;
    const ws = [
      [sl, sd, 0.004,  0,           counterY - sd / 2 + 0.002, -sw / 2 + 0.002],
      [sl, sd, 0.004,  0,           counterY - sd / 2 + 0.002,  sw / 2 - 0.002],
      [0.004, sd, sw,  -sl / 2 + 0.002, counterY - sd / 2 + 0.002, 0],
      [0.004, sd, sw,   sl / 2 - 0.002, counterY - sd / 2 + 0.002, 0],
    ];
    ws.forEach(([w, h, d, x, y, z]) => {
      const m = box(w, h, d, wallMat);
      m.position.set(cx + x, y, z);
      root.add(m);
    });

    // Faucet
    if (this._faucetPending) {
      this._addFaucet(root, cx, counterY, 0);
      this._faucetPending = null;
    }
  }

  _addFaucet(root, cx, counterY, cz) {
    const mat = this.materials.metal;
    // Base disk
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.02, 24), mat);
    base.position.set(cx, counterY + 0.01, cz - 0.18);
    root.add(base);
    // Vertical neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.30, 16), mat);
    neck.position.set(cx, counterY + 0.17, cz - 0.18);
    root.add(neck);
    // Horizontal arm
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 16), mat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(cx, counterY + 0.32, cz - 0.10);
    root.add(arm);
    // Spout drop
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.014, 0.06, 16), mat);
    spout.position.set(cx, counterY + 0.29, cz - 0.02);
    root.add(spout);
  }

  // ── Cooktop plate (4 burners) ────────────────────────────────────────────
  _buildCooktopPlate(root, cx, counterY, D, cooktopZoneW) {
    const cfg = this.config;
    const cw = cooktopZoneW * cfg.cooktop.widthRatio;
    const cd = D * cfg.cooktop.depthRatio;
    const plate = box(cw, cfg.cooktop.plateHeight, cd, this.materials.glass);
    plate.position.set(cx, counterY + cfg.cooktop.plateHeight / 2, 0);
    root.add(plate);

    // 4 burners — 2x2 grid
    const r = cfg.cooktop.burnerRadius;
    const dx = cw * 0.25, dz = cd * 0.25;
    const positions = [
      [-dx, -dz], [ dx, -dz], [-dx, dz], [ dx, dz],
    ];
    positions.forEach(([px, pz]) => {
      const burner = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, 0.006, 24),
        this.materials.metal
      );
      burner.position.set(cx + px, counterY + cfg.cooktop.plateHeight + 0.003, pz);
      root.add(burner);
      // grate cross
      const g1 = box(r * 1.8, 0.004, 0.006, this.materials.appliance);
      g1.position.set(cx + px, counterY + cfg.cooktop.plateHeight + 0.008, pz);
      root.add(g1);
      const g2 = box(0.006, 0.004, r * 1.8, this.materials.appliance);
      g2.position.set(cx + px, counterY + cfg.cooktop.plateHeight + 0.008, pz);
      root.add(g2);
    });
  }

  // ── Range hood ───────────────────────────────────────────────────────────
  _buildHood(root, cx, upperBottomY, zBack, upperD) {
    const cfg = this.config;
    const w = cfg.hood.width;
    const d = cfg.hood.depth;
    const h = cfg.hood.height;
    const skirt = cfg.hood.skirt;

    // Main body — under upper cabinets, slightly proud of them
    const hood = box(w, h, d, this.materials.appliance);
    hood.position.set(cx, upperBottomY - h / 2, zBack + d / 2 + 0.04);
    root.add(hood);

    // Skirt (thin glass-like front strip under hood)
    const skirtMesh = box(w * 0.85, skirt, 0.01, this.materials.glass);
    skirtMesh.position.set(cx, upperBottomY - h - skirt / 2, zBack + d + 0.04);
    root.add(skirtMesh);

    // LED line on hood front
    const led = box(w * 0.6, 0.005, 0.005, this.materials.led);
    led.position.set(cx, upperBottomY - h + 0.01, zBack + d + 0.05);
    root.add(led);
  }

  // ── Upper cabinets (one continuous run, divided into 3 visual doors) ─────
  _buildUpperCabinets(root, ctx) {
    const cfg = this.config;
    const { x0, x1, yBottom, yTop, depth, zBack } = ctx;
    const w = x1 - x0;
    const cx = (x0 + x1) / 2;
    const h = yTop - yBottom;

    // Carcass
    const body = box(w, h, depth, this.materials.upperCab);
    body.position.set(cx, (yBottom + yTop) / 2, zBack + depth / 2);
    root.add(body);

    // Doors — visually split into 3 panels with thin reveals
    const doorCount = 3;
    const doorW = w / doorCount;
    for (let i = 0; i < doorCount; i++) {
      const dcx = x0 + doorW * (i + 0.5);
      const door = box(doorW - 2 * cfg.doorGap, h - 2 * cfg.doorGap, 0.018, this.materials.upperCab);
      door.position.set(dcx, (yBottom + yTop) / 2, zBack + depth - 0.009);
      root.add(door);
      // Push-to-open notch at bottom of door
      const notch = box(doorW * 0.4, 0.003, 0.003, this.materials.handle);
      notch.position.set(dcx, yBottom + 0.018, zBack + depth + 0.001);
      root.add(notch);
    }
  }

  // ── Appliance column (right side: top cab / microwave / oven / drawer) ──
  _buildApplianceColumn(root, ctx) {
    const cfg = this.config;
    const { x0, x1, cx, width, yBottom, yTop, D, zBack, zFront, showMW, showOven, counterY } = ctx;
    const w = x1 - x0;
    const totalH = yTop - yBottom;

    // Full carcass (single tall box, floor-to-ceiling, full depth at bottom but stepped to upper depth above counter?)
    // Reference image shows the column at full counter depth all the way up — simpler and matches the photo.
    const body = box(w, totalH, D, this.materials.upperCab);
    body.position.set(cx, (yBottom + yTop) / 2, zBack + D / 2);
    root.add(body);

    // Decide vertical breakdown (from bottom up):
    //   • bottom drawer (height = counterY - plinthH)   — looks like a base drawer cabinet
    //   • oven (showOven)
    //   • microwave (showMW)
    //   • top cabinet door (remaining)
    let y = yBottom;

    // Bottom drawer (matches base cabinet height so counter line is preserved)
    const bottomDrawerH = counterY - yBottom;
    {
      const face = box(w - 2 * cfg.doorGap, bottomDrawerH - 2 * cfg.doorGap, 0.018, this.materials.upperCab);
      face.position.set(cx, y + bottomDrawerH / 2, zFront - 0.009);
      root.add(face);
      const notch = box(w * 0.5, 0.003, 0.003, this.materials.handle);
      notch.position.set(cx, y + bottomDrawerH - 0.018, zFront + 0.001);
      root.add(notch);
    }
    y += bottomDrawerH;

    // Oven
    if (showOven) {
      const ovenH = cfg.appliance.ovenH;
      this._buildBuiltInAppliance(root, cx, y + ovenH / 2, zFront, w, ovenH, 'oven');
      y += ovenH + cfg.appliance.gapBetween;
    }

    // Microwave
    if (showMW) {
      const mwH = cfg.appliance.microwaveH;
      this._buildBuiltInAppliance(root, cx, y + mwH / 2, zFront, w, mwH, 'microwave');
      y += mwH + cfg.appliance.gapBetween;
    }

    // Top cabinet door — fill remaining
    const topH = yTop - y;
    if (topH > 0.05) {
      const face = box(w - 2 * cfg.doorGap, topH - 2 * cfg.doorGap, 0.018, this.materials.upperCab);
      face.position.set(cx, y + topH / 2, zFront - 0.009);
      root.add(face);
      const notch = box(w * 0.5, 0.003, 0.003, this.materials.handle);
      notch.position.set(cx, y + 0.018, zFront + 0.001);
      root.add(notch);
    }
  }

  _buildBuiltInAppliance(root, cx, cy, zFront, columnW, h, kind) {
    const cfg = this.config;
    const insetX = cfg.appliance.inset;
    const bezelW = columnW - 2 * insetX;
    const bezelH = h - 2 * cfg.appliance.inset;
    const bezelD = cfg.appliance.bezelDepth;

    // Black bezel/frame
    const bezel = box(bezelW, bezelH, bezelD, this.materials.appliance);
    bezel.position.set(cx, cy, zFront - bezelD / 2);
    root.add(bezel);

    // Glass front
    const glassW = bezelW * 0.88;
    const glassH = bezelH * 0.70;
    const glass = box(glassW, glassH, 0.005, this.materials.glass);
    glass.position.set(cx, cy - bezelH * 0.05, zFront + 0.001);
    root.add(glass);

    // Top control strip
    const strip = box(bezelW * 0.85, bezelH * 0.10, 0.004, this.materials.glass);
    strip.position.set(cx, cy + bezelH * 0.40, zFront + 0.001);
    root.add(strip);

    // Handle bar across full width (just under control strip)
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, bezelW * 0.78, 12),
      this.materials.metal
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(cx, cy + bezelH * 0.28, zFront + 0.012);
    root.add(handle);
    // Handle posts
    [-1, 1].forEach(s => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.022, 10),
        this.materials.metal
      );
      post.position.set(cx + s * bezelW * 0.39, cy + bezelH * 0.28, zFront + 0.005);
      root.add(post);
    });

    // Indicator dot for microwave
    if (kind === 'microwave') {
      const dot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.002, 10),
        this.materials.led
      );
      dot.rotation.x = Math.PI / 2;
      dot.position.set(cx + bezelW * 0.30, cy + bezelH * 0.40, zFront + 0.005);
      root.add(dot);
    }
  }
}
