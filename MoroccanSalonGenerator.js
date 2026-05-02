// =============================================================================
//  MoroccanSalonGenerator.js
//  Procedural generator for an authentic Moroccan Salon — Mizan Studio (ميزان)
// =============================================================================

import * as THREE from 'three';

// =============================================================================
//  CONFIG — All master dimensions and parameters
// =============================================================================
export const CONFIG = {
  // ── 1. Master Constraints ──────────────────────────────────────────────────
  finishedSeatingHeight: 0.50,   
  seatDepth:             0.70,   

  // ── 2. Sandoq — wooden base / coffre ───────────────────────────────────────
  sandoq: {
    height:                 0.30,  
    legHeight:              0.04,  
    legSize:                0.06,  
    legInset:               0.04,  
    apronHeight:            0.10,  
    apronProtrusion:        0.018, 
    apronPanelsPerMetre:    3,     
    structuralMaxLength:    2.00,  
    structuralJointGap:     0.003, 
  },

  // ── 3. Ponj — primary foam mattress ────────────────────────────────────────
  ponj: {
    minHeight: 0.10,                
    maxHeight: 0.30,                
  },

  // ── 4. Tlamet — upholstery skin ────────────────────────────────────────────
  tlamet: {
    overhang:   0.010,              
    thickness:  0.004,              
  },

  // ── 5. Lehhaf — decorative quilted topper ─────────────────────────────────
  lehhaf: {
    height:       0.02,             
    inset:        0.015,            
    quiltLines:   1,                
  },

  // ── 6. Mkhady — back cushions ──────────────────────────────────────────────
  mkhady: {
    targetWidth: 0.60,              
    height:      0.60,              
    thickness:   0.20,              
    gap:         0.005,             
  },

  // ── 7. Mzaoud — cylindrical side bolsters ──────────────────────────────────
  mzaoud: {
    radius:  0.13,
  },

  // ── 8. Small accent pillows ───────────────────────────────────────────────
  accent: {
    size:      0.32,
    thickness: 0.12,
    everyN:    3,                    
  },

  // ── 9. Coin — square wooden corner box ────────────────────────────────────
  coin: {
    heightOffset: 0.20, 
  },

  // ── 10. Armside Box — end cap blocks ──────────────────────────────────────
  armsideBox: {
    width: 0.25,
    heightOffset: 0.20, 
  },

  // ── 11. Mida Table (Central Table) ─────────────────────────────────────────
  mida: {
    radius:               0.55,              
    height:               0.55,  
    topThickness:         0.035,
    pedestalTopRadius:    0.06,
    pedestalBaseRadius:   0.09,
    footRadiusFactor:     0.50,     
    footThickness:        0.025,
  },

  // ── 12. Reach & Placement Logic ───────────────────────────────────────────
  reach: {
    midaClearance:       0.40,  // 40cm mandatory legroom 
    midaCoverage:        3.0,   // 1 Mida per 3m of linear seating
  },

  // ── 13. Materials ─────────────────────────────────────────────────────────
  materials: {
    diagrammatic:        true,            
    woodColor:           0x5c3d1e,
    foamColor:           0xddd5c0,
    upholsteryColor:     0x9e2a3a,   
    accentColor:         0xc8892e,
    lehhafColor:         0xd4a86a,   
    edgeColor:           0x111111,
  },

  // ── 14. Mida visibility ───────────────────────────────────────────────────
  showMida: true,
};

// =============================================================================
//  Helpers
// =============================================================================
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function attachEdges(mesh, edgeMaterial, parentGroup) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    edgeMaterial
  );
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  parentGroup.add(edges);
  return edges;
}

// =============================================================================
//  MoroccanSalonGenerator
// =============================================================================
export class MoroccanSalonGenerator {

  constructor(config = CONFIG, assets = null) {
    this.config    = config;
    this.assets    = assets;
    this.materials = this._buildMaterials();
    this._enforceVerticalHierarchy();
  }

  generate(layout) {
    const root = new THREE.Group();
    root.name = 'MoroccanSalon';

    switch (layout.type) {
      case 'U':  this._assembleU(root, layout); break;
      case 'L':  this._assembleL(root, layout); break;
      case 'I':  this._assembleI(root, layout); break;
      default:
        throw new Error(`Unknown layout type "${layout.type}". Use U / L / I.`);
    }
    return root;
  }

  _enforceVerticalHierarchy() {
    const cfg = this.config;
    const computedPonjHeight = cfg.finishedSeatingHeight - cfg.sandoq.legHeight - cfg.sandoq.height;
    cfg.ponj.height = clamp(computedPonjHeight, cfg.ponj.minHeight, cfg.ponj.maxHeight);
  }

  _buildMaterials() {
    const m = this.config.materials;
    const assets = this.assets;
    const diagrammatic = m.diagrammatic;

    const materials = {
      wood:       new THREE.MeshStandardMaterial({ 
        color: m.woodColor, 
        roughness: diagrammatic ? 0.9 : 0.4, 
        metalness: diagrammatic ? 0.0 : 0.2, 
        envMapIntensity: diagrammatic ? 0 : 1.5 
      }),
      foam:       new THREE.MeshStandardMaterial({ 
        color: m.foamColor, 
        roughness: 0.95 
      }),
      upholstery: new THREE.MeshStandardMaterial({ 
        color: m.upholsteryColor, 
        roughness: diagrammatic ? 0.9 : 0.6, 
        metalness: diagrammatic ? 0.0 : 0.05, 
        envMapIntensity: diagrammatic ? 0 : 1.0 
      }),
      accent:     new THREE.MeshStandardMaterial({ 
        color: m.accentColor, 
        roughness: diagrammatic ? 0.9 : 0.6, 
        metalness: diagrammatic ? 0.0 : 0.05, 
        envMapIntensity: diagrammatic ? 0 : 1.0 
      }),
      lehhaf:     new THREE.MeshStandardMaterial({ 
        color: m.lehhafColor, 
        roughness: diagrammatic ? 0.9 : 0.6, 
        metalness: diagrammatic ? 0.0 : 0.05, 
        envMapIntensity: diagrammatic ? 0 : 1.0 
      }),
      edge:       new THREE.LineBasicMaterial({ color: m.edgeColor, transparent: true, opacity: diagrammatic ? 0.5 : 0 }),
      accentLine: new THREE.LineBasicMaterial({ color: m.accentColor }),
    };

    // Only apply textures in realistic mode and when assets are available
    if (!diagrammatic && assets) {
      if (assets.wood) {
        materials.wood.map          = assets.wood.color;
        materials.wood.roughnessMap = assets.wood.roughness;
        materials.wood.normalMap    = assets.wood.normal;
        materials.wood.color.set(0xffffff); 
      }
      if (assets.fabric) {
        materials.upholstery.map          = assets.fabric.color;
        materials.upholstery.roughnessMap = assets.fabric.roughness;
        materials.upholstery.normalMap    = assets.fabric.normal;
        materials.upholstery.color.set(0xffffff);
        
        materials.accent.map          = assets.fabric.color;
        materials.accent.roughnessMap = assets.fabric.roughness;
        materials.accent.normalMap    = assets.fabric.normal;
        materials.accent.color.set(m.accentColor); 
      }
    }

    return materials;
  }

  _getTiledMaterial(materialName, width, height) {
    const mat = this.materials[materialName].clone();
    const repeatX = width;
    const repeatY = height;
    
    if (mat.map) {
      mat.map = mat.map.clone();
      mat.map.repeat.set(repeatX, repeatY);
      mat.map.needsUpdate = true;
    }
    if (mat.roughnessMap) {
      mat.roughnessMap = mat.roughnessMap.clone();
      mat.roughnessMap.repeat.set(repeatX, repeatY);
      mat.roughnessMap.needsUpdate = true;
    }
    if (mat.normalMap) {
      mat.normalMap = mat.normalMap.clone();
      mat.normalMap.repeat.set(repeatX, repeatY);
      mat.normalMap.needsUpdate = true;
    }
    return mat;
  }



  createSandoq(length) {
    const cfg = this.config, sandoq = cfg.sandoq, depth = cfg.seatDepth;
    const group = new THREE.Group();
    const sectionCount = Math.ceil(length / sandoq.structuralMaxLength);
    const sectionLength = length / sectionCount;
    const sectionInnerLength = sectionLength - sandoq.structuralJointGap;

    for (let section = 0; section < sectionCount; section++) {
      const sectionCenterX = -length / 2 + sectionLength * (section + 0.5);

      // Main wood box
      const boxMesh = new THREE.Mesh(
        new THREE.BoxGeometry(sectionInnerLength, sandoq.height, depth),
        this._getTiledMaterial('wood', sectionInnerLength * 2, depth * 2)
      );
      boxMesh.position.set(sectionCenterX, sandoq.legHeight + sandoq.height / 2, 0);
      group.add(boxMesh);
      attachEdges(boxMesh, this.materials.edge, group);

      // Accent apron — full height of sandoq on front face
      const apron = new THREE.Mesh(
        new THREE.BoxGeometry(sectionInnerLength - 0.02, sandoq.height, 0.008),
        this.materials.accent
      );
      apron.position.set(
        sectionCenterX,
        sandoq.legHeight + sandoq.height / 2,
        depth / 2 + 0.005
      );
      group.add(apron);
    }

    return group;
  }

  createPonj(length) {
    const cfg = this.config;
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(length, cfg.ponj.height, cfg.seatDepth),
      this._getTiledMaterial('upholstery', length * 1.5, cfg.seatDepth * 1.5)
    );

    mesh.position.set(0, cfg.sandoq.legHeight + cfg.sandoq.height + cfg.ponj.height / 2, 0);
    group.add(mesh);
    return group;
  }

  createTlamet(length) {
    const cfg = this.config, t = cfg.tlamet, depth = cfg.seatDepth;
    const group = new THREE.Group();

    const seatTopY = cfg.sandoq.legHeight + cfg.sandoq.height + cfg.ponj.height;
    const ponjBottomY = cfg.sandoq.legHeight + cfg.sandoq.height;

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(length + t.overhang, t.thickness, depth + t.overhang),
      this._getTiledMaterial('upholstery', length, depth)
    );

    top.position.set(0, seatTopY + t.thickness / 2, 0);
    group.add(top);

    const sectionCount = Math.ceil(length / cfg.sandoq.structuralMaxLength);
    const sectionLength = length / sectionCount;
    const sectionInnerLength = sectionLength - cfg.sandoq.structuralJointGap;

    for (let section = 0; section < sectionCount; section++) {
      const sectionCenterX = -length / 2 + sectionLength * (section + 0.5);
      const faceFront = new THREE.Mesh(
        new THREE.BoxGeometry(sectionInnerLength, cfg.ponj.height, t.thickness),
        this._getTiledMaterial('upholstery', sectionInnerLength, cfg.ponj.height)
      );
      faceFront.position.set(sectionCenterX, ponjBottomY + cfg.ponj.height / 2, depth / 2 + t.thickness / 2);
      group.add(faceFront);
      attachEdges(faceFront, this.materials.edge, group);
    }


    return group;
  }

  createLehhaf(length) {
    const cfg = this.config;
    const group = new THREE.Group();
    const seatTopY = cfg.sandoq.legHeight + cfg.sandoq.height + cfg.ponj.height + cfg.tlamet.thickness;
    
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(length - cfg.lehhaf.inset * 2, cfg.lehhaf.height, cfg.seatDepth - cfg.lehhaf.inset * 2),
      this.materials.lehhaf
    );

    mesh.position.set(0, seatTopY + cfg.lehhaf.height / 2, 0);
    group.add(mesh);
    return group;
  }

  createMkhady(span) {
    const cfg = this.config, cush = cfg.mkhady;
    const group = new THREE.Group();

    const cushionCount  = Math.max(1, Math.round(span / cush.targetWidth));
    const actualWidth   = span / cushionCount;
    const visibleWidth  = actualWidth - cush.gap;

    const seatTopY = cfg.sandoq.legHeight + cfg.sandoq.height + cfg.ponj.height + cfg.tlamet.thickness + cfg.lehhaf.height;
    const cushionCenterY = seatTopY + cush.height / 2;
    const cushionCenterZ = -cfg.seatDepth / 2 + cush.thickness / 2; 
    const startX = -span / 2 + actualWidth / 2;

    for (let i = 0; i < cushionCount; i++) {
      const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(visibleWidth, cush.height, cush.thickness),
        this._getTiledMaterial('accent', visibleWidth * 1.5, cush.height * 1.5)
      );

      cushion.position.set(startX + i * actualWidth, cushionCenterY, cushionCenterZ);
      group.add(cushion);
      attachEdges(cushion, this.materials.edge, group);
    }
    return group;
  }

  createMzaoud() {
    const cfg = this.config;
    const group = new THREE.Group();
    const geom = new THREE.CylinderGeometry(cfg.mzaoud.radius, cfg.mzaoud.radius, cfg.seatDepth, 24);
    const mesh = new THREE.Mesh(geom, this._getTiledMaterial('upholstery', 1, 2));

    
    mesh.rotation.x = Math.PI / 2;  
    group.add(mesh);
    attachEdges(mesh, this.materials.edge, group);
    return group;
  }

  createCoin() {
    const cfg = this.config;
    const size = cfg.seatDepth;                                    
    const totalHeight = cfg.finishedSeatingHeight + cfg.coin.heightOffset;
    const group = new THREE.Group();

    const box = new THREE.Mesh(new THREE.BoxGeometry(size, totalHeight, size), this._getTiledMaterial('wood', 1.5, 2));

    box.position.set(0, totalHeight / 2, 0);
    group.add(box);
    attachEdges(box, this.materials.edge, group);
    return group;
  }

  createArmsideBox() {
    const cfg = this.config;
    const totalHeight = cfg.finishedSeatingHeight + cfg.armsideBox.heightOffset;
    const group = new THREE.Group();

    const box = new THREE.Mesh(new THREE.BoxGeometry(cfg.armsideBox.width, totalHeight, cfg.seatDepth), this._getTiledMaterial('wood', 1, 2));

    box.position.set(0, totalHeight / 2, 0);
    group.add(box);
    attachEdges(box, this.materials.edge, group);
    return group;
  }

  createBenchSegment(options) {
    const cfg = this.config;
    const bench = new THREE.Group();

    bench.add(this.createSandoq(options.length));
    bench.add(this.createPonj(options.length));
    bench.add(this.createTlamet(options.length));
    bench.add(this.createLehhaf(options.length));

    const mzaoudDiameter = cfg.mzaoud.radius * 2;
    const leftPad = options.mzaoudLeft ? mzaoudDiameter : 0;
    const rightPad = options.mzaoudRight ? mzaoudDiameter : 0;
    
    const mkhadySpan = options.length - leftPad - rightPad;
    const mkhadyShift = (leftPad - rightPad) / 2; 

    if (mkhadySpan > 0) {
      const mkhadyRow = this.createMkhady(mkhadySpan);
      mkhadyRow.position.x = mkhadyShift;
      bench.add(mkhadyRow);
    }

    const seatTopY = cfg.sandoq.legHeight + cfg.sandoq.height + cfg.ponj.height + cfg.tlamet.thickness + cfg.lehhaf.height;
    const bolsterCenterY = seatTopY + cfg.mzaoud.radius;
    const mzaoudZ = 0; 

    if (options.mzaoudLeft) {
      const b = this.createMzaoud();
      b.position.set(-options.length / 2 + cfg.mzaoud.radius, bolsterCenterY, mzaoudZ);
      bench.add(b);
    }
    if (options.mzaoudRight) {
      const b = this.createMzaoud();
      b.position.set(options.length / 2 - cfg.mzaoud.radius, bolsterCenterY, mzaoudZ);
      bench.add(b);
    }

    return bench;
  }

  // ── Mida ───────────────────────────────────────────────────────────────────
  createMida() {
    const spec = this.config.mida;
    const group = new THREE.Group();
    
    const top = new THREE.Mesh(new THREE.CylinderGeometry(spec.radius, spec.radius, spec.topThickness, 40), this._getTiledMaterial('accent', 2, 2));

    top.position.set(0, spec.height - spec.topThickness / 2, 0);
    group.add(top);
    attachEdges(top, this.materials.edge, group);

    const pedHeight = spec.height - spec.topThickness - spec.footThickness;
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(spec.pedestalTopRadius, spec.pedestalBaseRadius, pedHeight, 20), this._getTiledMaterial('wood', 1, 2));

    pedestal.position.set(0, spec.footThickness + pedHeight / 2, 0);
    group.add(pedestal);

    const footRadius = spec.radius * spec.footRadiusFactor;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(footRadius * 0.9, footRadius, spec.footThickness, 28), this._getTiledMaterial('accent', 1, 1));

    foot.position.set(0, spec.footThickness / 2, 0);
    group.add(foot);
    attachEdges(foot, this.materials.edge, group);

    return group;
  }

  // ===========================================================================
  //  Layout Composers
  // ===========================================================================

  _assembleU(root, layout) {
    const cfg = this.config, coinSize = cfg.seatDepth, armsideW = cfg.armsideBox.width;
    
    const backBenchLength  = Math.max(0.10, layout.backLength  - coinSize * 2);
    const leftBenchLength  = Math.max(0.10, layout.leftDepth   - coinSize - armsideW);
    const rightBenchLength = Math.max(0.10, layout.rightDepth  - coinSize - armsideW);
    const backWallZ = -Math.max(layout.leftDepth, layout.rightDepth);

    const backBench = this.createBenchSegment({ length: backBenchLength, mzaoudLeft: true, mzaoudRight: true });
    backBench.position.set(0, 0, backWallZ + coinSize / 2);
    root.add(backBench);

    const leftBench = this.createBenchSegment({ length: leftBenchLength, mzaoudLeft: true, mzaoudRight: true });
    leftBench.rotation.y = Math.PI / 2;
    leftBench.position.set(-layout.backLength / 2 + coinSize / 2, 0, backWallZ + coinSize + leftBenchLength / 2);
    root.add(leftBench);

    const rightBench = this.createBenchSegment({ length: rightBenchLength, mzaoudLeft: true, mzaoudRight: true });
    rightBench.rotation.y = -Math.PI / 2;
    rightBench.position.set(layout.backLength / 2 - coinSize / 2, 0, backWallZ + coinSize + rightBenchLength / 2);
    root.add(rightBench);

    const leftCoin = this.createCoin();
    leftCoin.position.set(-layout.backLength / 2 + coinSize / 2, 0, backWallZ + coinSize / 2);
    root.add(leftCoin);

    const rightCoin = this.createCoin();
    rightCoin.position.set(layout.backLength / 2 - coinSize / 2, 0, backWallZ + coinSize / 2);
    root.add(rightCoin);

    const leftArmside = this.createArmsideBox();
    leftArmside.rotation.y = Math.PI / 2;
    leftArmside.position.set(-layout.backLength / 2 + coinSize / 2, 0, backWallZ + coinSize + leftBenchLength + armsideW / 2);
    root.add(leftArmside);

    const rightArmside = this.createArmsideBox();
    rightArmside.rotation.y = -Math.PI / 2;
    rightArmside.position.set(layout.backLength / 2 - coinSize / 2, 0, backWallZ + coinSize + rightBenchLength + armsideW / 2);
    root.add(rightArmside);

    const roomDepth = Math.max(layout.leftDepth || 0, layout.rightDepth || 0);
    this._placeTables(root, layout, backWallZ, roomDepth);
  }

  _assembleL(root, layout) {
    const cfg = this.config, coinSize = cfg.seatDepth, armsideW = cfg.armsideBox.width;
    const backBenchLength = Math.max(0.10, layout.backLength - coinSize - armsideW);
    const leftBenchLength = Math.max(0.10, layout.leftDepth  - coinSize - armsideW);
    const backWallZ = -layout.leftDepth;

    const backBench = this.createBenchSegment({ length: backBenchLength, mzaoudLeft: true, mzaoudRight: true });
    backBench.position.set(-layout.backLength / 2 + coinSize + backBenchLength / 2, 0, backWallZ + coinSize / 2);
    root.add(backBench);

    const rightArmside = this.createArmsideBox();
    rightArmside.position.set(-layout.backLength / 2 + coinSize + backBenchLength + armsideW / 2, 0, backWallZ + coinSize / 2);
    root.add(rightArmside);

    const leftBench = this.createBenchSegment({ length: leftBenchLength, mzaoudLeft: true, mzaoudRight: true });
    leftBench.rotation.y = Math.PI / 2;
    leftBench.position.set(-layout.backLength / 2 + coinSize / 2, 0, backWallZ + coinSize + leftBenchLength / 2);
    root.add(leftBench);

    const leftArmside = this.createArmsideBox();
    leftArmside.rotation.y = Math.PI / 2;
    leftArmside.position.set(-layout.backLength / 2 + coinSize / 2, 0, backWallZ + coinSize + leftBenchLength + armsideW / 2);
    root.add(leftArmside);

    const coin = this.createCoin();
    coin.position.set(-layout.backLength / 2 + coinSize / 2, 0, backWallZ + coinSize / 2);
    root.add(coin);

    this._placeTables(root, layout, backWallZ, layout.leftDepth);
  }

  _assembleI(root, layout) {
    const cfg = this.config, armsideW = cfg.armsideBox.width, backWallZ = -cfg.seatDepth;
    const benchLength = Math.max(0.10, layout.backLength - armsideW * 2);

    const bench = this.createBenchSegment({ length: benchLength, mzaoudLeft: true, mzaoudRight: true });
    bench.position.set(0, 0, backWallZ + cfg.seatDepth / 2);
    root.add(bench);

    const leftArmside = this.createArmsideBox();
    leftArmside.position.set(-benchLength / 2 - armsideW / 2, 0, backWallZ + cfg.seatDepth / 2);
    root.add(leftArmside);

    const rightArmside = this.createArmsideBox();
    rightArmside.position.set(benchLength / 2 + armsideW / 2, 0, backWallZ + cfg.seatDepth / 2);
    root.add(rightArmside);

    this._placeTables(root, layout, backWallZ, cfg.seatDepth);
  }

  // ── Unified, Dynamic Table Placement Logic (Mida Only) ──────────────────────
  _placeTables(root, layout, backWallZ, roomDepth) {
    if (!this.config.showMida) return;

    const cfg = this.config;
    const span = layout.backLength;
    const sofaDepth = cfg.seatDepth; 
    
    const midaRadius    = cfg.mida.radius;
    const midaClearance = cfg.reach.midaClearance;

    const backSofaInnerZ  = backWallZ + sofaDepth;
    const leftSofaInnerX  = -span / 2 + sofaDepth;
    const rightSofaInnerX = span / 2 - sofaDepth;

    const midaFrontClearanceZ = backSofaInnerZ + midaClearance + midaRadius;
    const centerOfRoomZ = backWallZ + (roomDepth / 2);
    const midaZ = Math.max(midaFrontClearanceZ, centerOfRoomZ);

    // ONLY calculate count based on the back wall span. Side wings do not increase table count.
    const midaCount = Math.max(1, Math.round(span / cfg.reach.midaCoverage));
    const midaPositions = [];

    if (midaCount === 1) {
      midaPositions.push(0); // Absolute center for single mida
    } else {
      const spacing = span / midaCount;
      for (let i = 0; i < midaCount; i++) {
        midaPositions.push(-span / 2 + spacing / 2 + i * spacing);
      }
    }

    const placedXPos = [];

    midaPositions.forEach(x => {
      let adjustedX = x;
      
      let minX = -Infinity;
      let maxX = Infinity;

      if (layout.type === 'U' || layout.type === 'L') {
         minX = leftSofaInnerX + midaClearance + midaRadius;
      }
      if (layout.type === 'U') {
         maxX = rightSofaInnerX - midaClearance - midaRadius;
      }

      // The Narrow Room Paradox Resolver:
      // If the room is physically too narrow to respect the 40cm clearance on both sides,
      // it abandons the side constraints and forces the table to the absolute center.
      if (minX > maxX) {
          adjustedX = 0; 
      } else {
          if (adjustedX < minX) adjustedX = minX;
          if (adjustedX > maxX) adjustedX = maxX;
      }

      let isColliding = false;
      for (let px of placedXPos) {
          if (Math.abs(adjustedX - px) < (midaRadius * 2 + 0.1)) {
              isColliding = true;
              break;
          }
      }

      if (!isColliding && (midaZ - midaRadius >= backSofaInnerZ)) {
        const mida = this.createMida();
        mida.position.set(adjustedX, 0, midaZ);
        root.add(mida);
        placedXPos.push(adjustedX);
      }
    });
  }
}
export default MoroccanSalonGenerator;