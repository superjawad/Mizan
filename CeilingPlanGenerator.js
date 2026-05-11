// =============================================================================
//  CeilingPlanGenerator.js
//  Procedural 2D reflected-ceiling-plan (RCP) generator — Mizan Studio
//  Outputs an SVG string from a parametric room boundary + tray layers.
// =============================================================================

export const CEILING_CONFIG = {
  roomWidth:  4.36,      // interior, X (m)
  roomLength: 5.50,      // interior, Y (m)
  wallThickness: 0.20,
  margin:     0.30,      // page margin around drawing (m equivalent)

  layers: [
    { offset: 0.30, label: '0.30' },
    { offset: 0.40, label: '0.40' },
    { offset: 0.55, label: '0.55' },
  ],

  ledPockets: {
    enabled:    true,
    insetX:     0.40,    // distance from inner-tray edge (left/right)
    insetY:     0.40,    // distance from inner-tray short edges
    width:      0.20,    // pocket width (X)
    runRatio:   0.55,    // pocket length as ratio of inner tray Y
  },

  medallion: {
    enabled:  true,
    arms:     8,
    radius:   0.55,
    centerR:  0.10,
    endR:     0.07,
  },

  downlights: {
    enabled:  true,
    perSide:  3,         // per long side
    perEnd:   2,         // per short side
    size:     0.12,
    insetFromBand: 0.20,
  },

  sconces: {
    enabled: true,
    perSide: 2,          // sconces per long side, placed on outer wall band
    perEnd:  1,
    size:    0.15,
    insetFromBand: 0.06,
  },

  annotations: {
    enabled:  true,
    fontSize: 8,
    color:    '#222',
    dimColor: '#444',
    tick:     6,
  },

  colors: {
    paper:        '#ffffff',
    wallHatch:    '#0e0c0a',
    wallFill:     '#f6f3ec',
    layerStroke:  '#0e0c0a',
    layerStrokeSoft: '#5a5247',
    pocketFill:   '#0e0c0a',
    pocketHatch:  '#ffffff',
    medallionStroke: '#0e0c0a',
    downlight:    '#0e0c0a',
    sconce:       '#0e0c0a',
    accent:       '#c8922a',
    centerline:   '#c8922a',
  },

  scale: 90,             // SVG units per metre
};

export class CeilingPlanGenerator {

  constructor(config = CEILING_CONFIG) {
    this.config = { ...CEILING_CONFIG, ...config };
  }

  generate(params = {}) {
    const cfg = this.config;
    const W   = params.roomWidth     ?? cfg.roomWidth;
    const L   = params.roomLength    ?? cfg.roomLength;
    const T   = params.wallThickness ?? cfg.wallThickness;
    const margin = params.margin     ?? cfg.margin;
    const layers = params.layers     ?? cfg.layers;
    const med  = { ...cfg.medallion,  ...(params.medallion  || {}) };
    const led  = { ...cfg.ledPockets, ...(params.ledPockets || {}) };
    const dl   = { ...cfg.downlights, ...(params.downlights || {}) };
    const sc   = { ...cfg.sconces,    ...(params.sconces    || {}) };
    const annot = { ...cfg.annotations, ...(params.annotations || {}) };
    const colors = { ...cfg.colors, ...(params.colors || {}) };
    const s = cfg.scale;
    const m2u = (m) => m * s;

    // ── Drawing geometry (in metres) ──
    // Outer drawing box includes walls + margin
    const outerW = W + 2 * T;
    const outerL = L + 2 * T;
    const totalW = outerW + 2 * margin;
    const totalL = outerL + 2 * margin;

    // origin (top-left of svg viewport) is at 0,0; we'll lay out in user units
    const x0 = margin;            // outer wall left edge (m)
    const y0 = margin;            // outer wall top edge
    const x1 = margin + outerW;
    const y1 = margin + outerL;
    const ix0 = x0 + T;           // inner room left (interior face)
    const iy0 = y0 + T;
    const ix1 = x1 - T;
    const iy1 = y1 - T;

    // Compute concentric tray layers
    const trays = [];
    let cum = 0;
    layers.forEach(layer => {
      cum += layer.offset;
      trays.push({
        offset: layer.offset,
        cum,
        x0: ix0 + cum,
        y0: iy0 + cum,
        x1: ix1 - cum,
        y1: iy1 - cum,
        label: layer.label,
      });
    });
    const innerTray = trays[trays.length - 1] || {
      x0: ix0, y0: iy0, x1: ix1, y1: iy1,
    };
    const innerW = innerTray.x1 - innerTray.x0;
    const innerL = innerTray.y1 - innerTray.y0;
    const cx = (innerTray.x0 + innerTray.x1) / 2;
    const cy = (innerTray.y0 + innerTray.y1) / 2;

    // ── Build SVG ──
    const svgW = m2u(totalW);
    const svgL = m2u(totalL);
    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgL}" preserveAspectRatio="xMidYMid meet" style="background:${colors.paper}; width:100%; height:100%;">`);

    // ── Defs: hatch patterns ──
    out.push(`
      <defs>
        <pattern id="wallHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="${colors.wallFill}"/>
          <line x1="0" y1="0" x2="0" y2="6" stroke="${colors.wallHatch}" stroke-width="0.8"/>
        </pattern>
        <pattern id="pocketHatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
          <rect width="4" height="4" fill="${colors.pocketFill}"/>
          <line x1="0" y1="0" x2="0" y2="4" stroke="${colors.pocketHatch}" stroke-width="0.5" stroke-opacity="0.5"/>
        </pattern>
      </defs>
    `);

    // ── Outer wall band (hatched) ──
    out.push(`<path d="
      M ${m2u(x0)} ${m2u(y0)}
      L ${m2u(x1)} ${m2u(y0)}
      L ${m2u(x1)} ${m2u(y1)}
      L ${m2u(x0)} ${m2u(y1)}
      Z
      M ${m2u(ix0)} ${m2u(iy0)}
      L ${m2u(ix0)} ${m2u(iy1)}
      L ${m2u(ix1)} ${m2u(iy1)}
      L ${m2u(ix1)} ${m2u(iy0)}
      Z
    " fill="url(#wallHatch)" fill-rule="evenodd" stroke="${colors.wallHatch}" stroke-width="0.9"/>`);

    // Inner room boundary (over hatching for crisp edge)
    out.push(`<rect x="${m2u(ix0)}" y="${m2u(iy0)}" width="${m2u(W)}" height="${m2u(L)}"
      fill="${colors.paper}" stroke="${colors.wallHatch}" stroke-width="1.1"/>`);

    // ── Tray layer rectangles ──
    trays.forEach((t, i) => {
      const stroke = i === trays.length - 1 ? colors.layerStroke : colors.layerStrokeSoft;
      out.push(`<rect x="${m2u(t.x0)}" y="${m2u(t.y0)}" width="${m2u(t.x1 - t.x0)}" height="${m2u(t.y1 - t.y0)}"
        fill="none" stroke="${stroke}" stroke-width="${i === trays.length - 1 ? 1.2 : 0.7}"/>`);
    });

    // ── LED pockets (two vertical recessed strips, mirrored across center) ──
    if (led.enabled && innerW > 1.0 && innerL > 1.0) {
      const pw = led.width;
      const pl = innerL * led.runRatio;
      const pcyTop = cy - pl / 2;
      // Left pocket
      const lpx = innerTray.x0 + led.insetX;
      out.push(this._pocketRect(lpx, pcyTop, pw, pl, m2u, colors));
      // Right pocket (mirrored)
      const rpx = innerTray.x1 - led.insetX - pw;
      out.push(this._pocketRect(rpx, pcyTop, pw, pl, m2u, colors));

      // Annotate pocket width
      if (annot.enabled) {
        out.push(this._dimLabel(lpx + pw / 2, pcyTop - 0.12, led.width.toFixed(2), m2u, annot));
        out.push(this._dimLabel(rpx + pw / 2, pcyTop - 0.12, led.width.toFixed(2), m2u, annot));
      }
    }

    // ── Central medallion (chandelier) ──
    if (med.enabled) {
      const r = Math.min(med.radius, Math.min(innerW, innerL) * 0.3);
      out.push(`<circle cx="${m2u(cx)}" cy="${m2u(cy)}" r="${m2u(r)}" fill="none"
        stroke="${colors.medallionStroke}" stroke-width="0.6" stroke-dasharray="2 3"/>`);
      // Arms
      const arms = med.arms;
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2 - Math.PI / 2;
        const ex = cx + Math.cos(a) * r;
        const ey = cy + Math.sin(a) * r;
        out.push(`<line x1="${m2u(cx)}" y1="${m2u(cy)}" x2="${m2u(ex)}" y2="${m2u(ey)}"
          stroke="${colors.medallionStroke}" stroke-width="0.7"/>`);
        out.push(`<circle cx="${m2u(ex)}" cy="${m2u(ey)}" r="${m2u(med.endR)}"
          fill="${colors.paper}" stroke="${colors.medallionStroke}" stroke-width="0.7"/>`);
        // small dot inside
        out.push(`<circle cx="${m2u(ex)}" cy="${m2u(ey)}" r="${m2u(med.endR * 0.35)}"
          fill="${colors.medallionStroke}"/>`);
      }
      // Center hub
      out.push(`<circle cx="${m2u(cx)}" cy="${m2u(cy)}" r="${m2u(med.centerR)}"
        fill="${colors.paper}" stroke="${colors.medallionStroke}" stroke-width="0.9"/>`);
      out.push(`<circle cx="${m2u(cx)}" cy="${m2u(cy)}" r="${m2u(med.centerR * 0.35)}"
        fill="${colors.medallionStroke}"/>`);
    }

    // ── Perimeter recessed downlights (on the second-outermost tray ring) ──
    if (dl.enabled && trays.length >= 1) {
      const ring = trays[0];
      const sz = dl.size;
      const inset = dl.insetFromBand;
      const yTop = ring.y0 - inset;
      const yBot = ring.y1 + inset;
      const xLeft = ring.x0 - inset;
      const xRight = ring.x1 + inset;
      const longSpan = ring.x1 - ring.x0;
      const shortSpan = ring.y1 - ring.y0;

      // Top + bottom (along long side)
      for (let i = 0; i < dl.perSide; i++) {
        const t = (i + 1) / (dl.perSide + 1);
        const x = ring.x0 + longSpan * t;
        out.push(this._downlight(x, yTop, sz, m2u, colors));
        out.push(this._downlight(x, yBot, sz, m2u, colors));
      }
      // Left + right (along short side)
      for (let i = 0; i < dl.perEnd; i++) {
        const t = (i + 1) / (dl.perEnd + 1);
        const y = ring.y0 + shortSpan * t;
        out.push(this._downlight(xLeft, y, sz, m2u, colors));
        out.push(this._downlight(xRight, y, sz, m2u, colors));
      }
    }

    // ── Wall sconces on outer band ──
    if (sc.enabled) {
      const sz = sc.size;
      const inset = sc.insetFromBand;
      // Top/bottom long walls
      for (let i = 0; i < sc.perSide; i++) {
        const t = (i + 1) / (sc.perSide + 1);
        const x = x0 + outerW * t;
        out.push(this._sconce(x - sz / 2, y0 + inset, sz, m2u, colors));
        out.push(this._sconce(x - sz / 2, y1 - inset - sz * 0.6, sz, m2u, colors));
      }
      // Left/right short walls
      for (let i = 0; i < sc.perEnd; i++) {
        const t = (i + 1) / (sc.perEnd + 1);
        const y = y0 + outerL * t;
        out.push(this._sconce(x0 + inset, y - sz / 2, sz, m2u, colors, true));
        out.push(this._sconce(x1 - inset - sz * 0.6, y - sz / 2, sz, m2u, colors, true));
      }
    }

    // ── Dimensions (millimetre-style ticks + text) ──
    if (annot.enabled) {
      out.push(this._dimensions(
        { x0, y0, x1, y1, ix0, iy0, ix1, iy1, T, W, L, trays, innerTray, margin },
        m2u, annot, colors
      ));
    }

    out.push(`</svg>`);
    return out.join('\n');
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  _pocketRect(x, y, w, h, m2u, colors) {
    return `
      <rect x="${m2u(x)}" y="${m2u(y)}" width="${m2u(w)}" height="${m2u(h)}"
        fill="url(#pocketHatch)" stroke="${colors.layerStroke}" stroke-width="0.7"/>
    `;
  }

  _downlight(x, y, sz, m2u, colors) {
    const s = m2u(sz);
    const half = s / 2;
    const cx = m2u(x), cy = m2u(y);
    return `
      <g transform="translate(${cx} ${cy})">
        <rect x="${-half}" y="${-half}" width="${s}" height="${s}"
          fill="${colors.paper}" stroke="${colors.downlight}" stroke-width="0.7"/>
        <line x1="${-half}" y1="${-half}" x2="${half}" y2="${half}" stroke="${colors.downlight}" stroke-width="0.5"/>
        <line x1="${-half}" y1="${half}" x2="${half}" y2="${-half}" stroke="${colors.downlight}" stroke-width="0.5"/>
      </g>`;
  }

  _sconce(x, y, sz, m2u, colors, vertical = false) {
    const w = m2u(sz);
    const h = m2u(sz * 0.5);
    return `<rect x="${m2u(x)}" y="${m2u(y)}" width="${vertical ? h : w}" height="${vertical ? w : h}"
      fill="${colors.sconce}" stroke="${colors.sconce}" stroke-width="0.4"/>`;
  }

  _dimLabel(x, y, text, m2u, annot) {
    return `<text x="${m2u(x)}" y="${m2u(y)}" font-family="DM Mono, monospace"
      font-size="${annot.fontSize}" fill="${annot.color}" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
  }

  _dimensions(g, m2u, annot, colors) {
    // Draw light dimension ticks + labels along all four sides
    const { x0, y0, x1, y1, ix0, iy0, ix1, iy1, T, W, L, trays, innerTray, margin } = g;
    const out = [];
    const tick = annot.tick;
    const stroke = annot.dimColor;
    const tx = (x, y, txt, anchor = 'middle', rotate = 0) => {
      const xu = m2u(x), yu = m2u(y);
      const r = rotate ? ` transform="rotate(${rotate} ${xu} ${yu})"` : '';
      return `<text x="${xu}" y="${yu}" font-family="DM Mono, monospace" font-size="${annot.fontSize}" fill="${annot.color}" text-anchor="${anchor}" dominant-baseline="middle"${r}>${txt}</text>`;
    };
    const dimLine = (x1u, y1u, x2u, y2u) =>
      `<line x1="${m2u(x1u)}" y1="${m2u(y1u)}" x2="${m2u(x2u)}" y2="${m2u(y2u)}" stroke="${stroke}" stroke-width="0.4"/>`;

    // ── Top side dimensions ──
    // Wall thickness on top-left and top-right
    const topDimY = y0 - 0.10;
    out.push(dimLine(x0, topDimY, x1, topDimY));
    out.push(`<line x1="${m2u(x0)}" y1="${m2u(topDimY - 0.04)}" x2="${m2u(x0)}" y2="${m2u(topDimY + 0.04)}" stroke="${stroke}"/>`);
    out.push(`<line x1="${m2u(ix0)}" y1="${m2u(topDimY - 0.04)}" x2="${m2u(ix0)}" y2="${m2u(topDimY + 0.04)}" stroke="${stroke}"/>`);
    out.push(`<line x1="${m2u(ix1)}" y1="${m2u(topDimY - 0.04)}" x2="${m2u(ix1)}" y2="${m2u(topDimY + 0.04)}" stroke="${stroke}"/>`);
    out.push(`<line x1="${m2u(x1)}" y1="${m2u(topDimY - 0.04)}" x2="${m2u(x1)}" y2="${m2u(topDimY + 0.04)}" stroke="${stroke}"/>`);
    out.push(tx((x0 + ix0) / 2, topDimY - 0.10, T.toFixed(2)));
    out.push(tx((ix0 + ix1) / 2, topDimY - 0.10, W.toFixed(2)));
    out.push(tx((ix1 + x1) / 2, topDimY - 0.10, T.toFixed(2)));

    // ── Bottom side dimensions: tray offsets + internal split ──
    const botDimY = y1 + 0.10;
    out.push(dimLine(x0, botDimY, x1, botDimY));
    // tick at each tray cum offset
    [x0, ix0, ix1, x1].forEach(xx => {
      out.push(`<line x1="${m2u(xx)}" y1="${m2u(botDimY - 0.04)}" x2="${m2u(xx)}" y2="${m2u(botDimY + 0.04)}" stroke="${stroke}"/>`);
    });
    out.push(tx((x0 + ix0) / 2, botDimY + 0.12, T.toFixed(2)));
    out.push(tx((ix0 + ix1) / 2, botDimY + 0.12, W.toFixed(2)));
    out.push(tx((ix1 + x1) / 2, botDimY + 0.12, T.toFixed(2)));

    // ── Left side dimensions ──
    const leftDimX = x0 - 0.10;
    out.push(dimLine(leftDimX, y0, leftDimX, y1));
    [y0, iy0, iy1, y1].forEach(yy => {
      out.push(`<line x1="${m2u(leftDimX - 0.04)}" y1="${m2u(yy)}" x2="${m2u(leftDimX + 0.04)}" y2="${m2u(yy)}" stroke="${stroke}"/>`);
    });
    out.push(tx(leftDimX - 0.10, (y0 + iy0) / 2, T.toFixed(2), 'middle', -90));
    out.push(tx(leftDimX - 0.10, (iy0 + iy1) / 2, L.toFixed(2), 'middle', -90));
    out.push(tx(leftDimX - 0.10, (iy1 + y1) / 2, T.toFixed(2), 'middle', -90));

    // ── Right side dimensions ──
    const rightDimX = x1 + 0.10;
    out.push(dimLine(rightDimX, y0, rightDimX, y1));
    [y0, iy0, iy1, y1].forEach(yy => {
      out.push(`<line x1="${m2u(rightDimX - 0.04)}" y1="${m2u(yy)}" x2="${m2u(rightDimX + 0.04)}" y2="${m2u(yy)}" stroke="${stroke}"/>`);
    });
    out.push(tx(rightDimX + 0.10, (y0 + iy0) / 2, T.toFixed(2), 'middle', 90));
    out.push(tx(rightDimX + 0.10, (iy0 + iy1) / 2, L.toFixed(2), 'middle', 90));
    out.push(tx(rightDimX + 0.10, (iy1 + y1) / 2, T.toFixed(2), 'middle', 90));

    // ── Inner tray offset labels (small labels at each layer corner) ──
    let cumX = ix0, cumY = iy0;
    trays.forEach(t => {
      // top-left offset annotations
      out.push(tx(t.x0 - (t.x0 - cumX) / 2, t.y0 - 0.06, t.label));
      out.push(tx(t.x0 - 0.10, t.y0 - (t.y0 - cumY) / 2, t.label, 'middle', -90));
      cumX = t.x0;
      cumY = t.y0;
    });

    // ── Inner-tray inside dimension (centered) ──
    out.push(tx((innerTray.x0 + innerTray.x1) / 2, (innerTray.y0 + innerTray.y1) / 2 + 0.42,
      (innerTray.x1 - innerTray.x0).toFixed(2)));
    out.push(tx((innerTray.x0 + innerTray.x1) / 2, (innerTray.y0 + innerTray.y1) / 2 - 0.42,
      (innerTray.x1 - innerTray.x0).toFixed(2)));

    return out.join('\n');
  }
}
