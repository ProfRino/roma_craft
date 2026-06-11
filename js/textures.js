// Procedural 16x16 texture atlas — no external assets needed.
import * as THREE from 'three';

export const ATLAS_TILES = 16;          // 16x16 tiles
export const TILE_PX = 16;

// Block registry. tiles: single index or {top, side, bottom}
export const BLOCKS = {
  1:  { name: 'Grass',          tiles: { top: 0, side: 1, bottom: 2 } },
  2:  { name: 'Dirt',           tiles: 2 },
  3:  { name: 'Stone',          tiles: 3 },
  4:  { name: 'Marble',         tiles: 4 },
  5:  { name: 'Marble Column',  tiles: { top: 6, side: 5, bottom: 6 } },
  6:  { name: 'Roman Brick',    tiles: 7 },
  7:  { name: 'Roof Tile',      tiles: 8 },
  8:  { name: 'Basalt Road',    tiles: 9 },
  9:  { name: 'Travertine',     tiles: { top: 10, side: 11, bottom: 11 } },
  10: { name: 'Wood Plank',     tiles: 12 },
  11: { name: 'Log',            tiles: { top: 14, side: 13, bottom: 14 } },
  12: { name: 'Pine Leaves',    tiles: 15 },
  13: { name: 'Gold',           tiles: 16 },
  14: { name: 'Water',          tiles: 17, solid: false, transparent: true },
  15: { name: 'Red Column',     tiles: { top: 19, side: 18, bottom: 19 } },
  16: { name: 'Chiseled Marble',tiles: 20 },
  17: { name: 'Awning',         tiles: 21 },
  18: { name: 'Flowers',        tiles: 22 },
  19: { name: 'Cypress Leaves', tiles: 23 },
  20: { name: 'Gravel',         tiles: 24 },
  21: { name: 'Mosaic',         tiles: 25 },
  22: { name: 'Red Plaster',    tiles: 26 },
  23: { name: 'Sand',           tiles: 27 },
  24: { name: 'Red Cloth',      tiles: 28 },
};

// Average color per block (particles, minimap-ish uses)
export const BLOCK_COLORS = {
  1: 0x6fae4a, 2: 0x8a5f3c, 3: 0x8d8d92, 4: 0xe8e4da, 5: 0xded9cc,
  6: 0xa8553a, 7: 0xc3622f, 8: 0x4a4a50, 9: 0xddd2b4, 10: 0x9a6b3f,
  11: 0x6b4a2c, 12: 0x3f6d2e, 13: 0xf5c842, 14: 0x3f76d9, 15: 0x7e2a24,
  16: 0xe3ddcf, 17: 0xc94f3f, 18: 0x4f8a3a, 19: 0x2e4d26, 20: 0xb9b0a0,
  21: 0x4f86c2, 22: 0x99342b, 23: 0xd9c089, 24: 0xb03030,
};

export function isSolid(id) { return id !== 0 && id !== 14; }
export function tileFor(id, face) {
  const b = BLOCKS[id]; if (!b) return 3;
  if (typeof b.tiles === 'number') return b.tiles;
  if (face === 'top') return b.tiles.top;
  if (face === 'bottom') return b.tiles.bottom;
  return b.tiles.side;
}

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- tile painters -------------------------------------------------------
function px(ctx, ox, oy, x, y, c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); }
function fillTile(ctx, ox, oy, c) { ctx.fillStyle = c; ctx.fillRect(ox, oy, 16, 16); }
function speckle(ctx, ox, oy, rng, n, colors) {
  for (let i = 0; i < n; i++) px(ctx, ox, oy, (rng() * 16) | 0, (rng() * 16) | 0, colors[(rng() * colors.length) | 0]);
}

const PAINTERS = {
  0(ctx, ox, oy, rng) { // grass top
    fillTile(ctx, ox, oy, '#6fae4a');
    speckle(ctx, ox, oy, rng, 70, ['#7dbd55', '#619a40', '#86c75e', '#578c39']);
  },
  1(ctx, ox, oy, rng) { // grass side
    fillTile(ctx, ox, oy, '#8a5f3c');
    speckle(ctx, ox, oy, rng, 40, ['#94683f', '#7c5433', '#a06f45']);
    ctx.fillStyle = '#6fae4a'; ctx.fillRect(ox, oy, 16, 3);
    for (let x = 0; x < 16; x++) if (rng() < 0.6) px(ctx, ox, oy, x, 3, '#619a40');
  },
  2(ctx, ox, oy, rng) { // dirt
    fillTile(ctx, ox, oy, '#8a5f3c');
    speckle(ctx, ox, oy, rng, 60, ['#94683f', '#7c5433', '#a06f45', '#6e4a2d']);
  },
  3(ctx, ox, oy, rng) { // stone
    fillTile(ctx, ox, oy, '#8d8d92');
    speckle(ctx, ox, oy, rng, 55, ['#97979c', '#828287', '#9fa0a5', '#77777c']);
  },
  4(ctx, ox, oy, rng) { // marble
    fillTile(ctx, ox, oy, '#e8e4da');
    speckle(ctx, ox, oy, rng, 25, ['#efece4', '#ded9cc']);
    ctx.strokeStyle = 'rgba(180,175,165,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox + 1, oy + 4 + rng() * 3); ctx.lineTo(ox + 9, oy + 7 + rng() * 3); ctx.lineTo(ox + 15, oy + 5 + rng() * 4);
    ctx.stroke();
  },
  5(ctx, ox, oy, rng) { // marble column flutes (vertical)
    fillTile(ctx, ox, oy, '#e6e1d4');
    for (let x = 0; x < 16; x += 4) {
      ctx.fillStyle = '#cfc9ba'; ctx.fillRect(ox + x, oy, 1, 16);
      ctx.fillStyle = '#f4f1e8'; ctx.fillRect(ox + x + 2, oy, 1, 16);
    }
  },
  6(ctx, ox, oy, rng) { // marble cap
    fillTile(ctx, ox, oy, '#e8e4da');
    ctx.strokeStyle = '#c6c0b0'; ctx.strokeRect(ox + 0.5, oy + 0.5, 15, 15);
    ctx.strokeStyle = '#d8d2c2'; ctx.strokeRect(ox + 3.5, oy + 3.5, 9, 9);
  },
  7(ctx, ox, oy, rng) { // roman brick
    fillTile(ctx, ox, oy, '#d9c8a8'); // mortar
    const brick = ['#a8553a', '#9c4d34', '#b25d40'];
    for (let row = 0; row < 4; row++) {
      const y = row * 4, off = (row % 2) * 4;
      for (let col = -1; col < 3; col++) {
        const x = col * 8 + off;
        ctx.fillStyle = brick[(rng() * 3) | 0];
        ctx.fillRect(ox + Math.max(x, 0), oy + y, Math.min(7, 16 - Math.max(x, 0), x + 7 < 0 ? 0 : (x < 0 ? x + 7 : 7)), 3);
      }
    }
  },
  8(ctx, ox, oy, rng) { // roof tiles
    fillTile(ctx, ox, oy, '#c3622f');
    for (let y = 0; y < 16; y += 4) {
      ctx.fillStyle = '#8f4521'; ctx.fillRect(ox, oy + y, 16, 1);
      ctx.fillStyle = '#d97a42'; ctx.fillRect(ox, oy + y + 1, 16, 1);
    }
    for (let x = 0; x < 16; x += 8) for (let y = 0; y < 16; y += 4) px(ctx, ox, oy, x + ((y / 4) % 2) * 4, y + 2, '#a8542a');
  },
  9(ctx, ox, oy, rng) { // basalt cobbles
    fillTile(ctx, ox, oy, '#46464e');
    const c = ['#56565e', '#616169', '#50505a'];
    for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) {
      ctx.fillStyle = c[(rng() * 3) | 0];
      ctx.fillRect(ox + xx * 8 + 1, oy + yy * 8 + 1, 6, 6);
    }
    speckle(ctx, ox, oy, rng, 18, ['#5a5a60', '#404046']);
  },
  10(ctx, ox, oy, rng) { // travertine top (paving grid)
    fillTile(ctx, ox, oy, '#ddd2b4');
    speckle(ctx, ox, oy, rng, 30, ['#e6dcc2', '#d2c6a6', '#cfc3a2']);
    ctx.fillStyle = '#b7ab8c'; ctx.fillRect(ox, oy, 16, 1); ctx.fillRect(ox, oy, 1, 16);
  },
  11(ctx, ox, oy, rng) { // travertine side
    fillTile(ctx, ox, oy, '#d6cbac');
    speckle(ctx, ox, oy, rng, 30, ['#dfd5b9', '#cbbf9e']);
    ctx.fillStyle = '#b7ab8c'; ctx.fillRect(ox, oy + 7, 16, 1);
  },
  12(ctx, ox, oy, rng) { // plank
    fillTile(ctx, ox, oy, '#9a6b3f');
    for (let y = 0; y < 16; y += 4) { ctx.fillStyle = '#7c5430'; ctx.fillRect(ox, oy + y, 16, 1); }
    speckle(ctx, ox, oy, rng, 20, ['#8a5f38', '#a87746']);
  },
  13(ctx, ox, oy, rng) { // bark
    fillTile(ctx, ox, oy, '#6b4a2c');
    for (let x = 0; x < 16; x += 3) { ctx.fillStyle = rng() < 0.5 ? '#7d5835' : '#5a3d23'; ctx.fillRect(ox + x, oy, 1, 16); }
    speckle(ctx, ox, oy, rng, 16, ['#80603c', '#523722']);
  },
  14(ctx, ox, oy, rng) { // log rings
    fillTile(ctx, ox, oy, '#a87b48');
    ctx.strokeStyle = '#7c5430';
    ctx.strokeRect(ox + 2.5, oy + 2.5, 11, 11); ctx.strokeRect(ox + 5.5, oy + 5.5, 5, 5);
    px(ctx, ox, oy, 8, 8, '#6b4a2c');
  },
  15(ctx, ox, oy, rng) { // pine leaves
    fillTile(ctx, ox, oy, '#3f6d2e');
    speckle(ctx, ox, oy, rng, 80, ['#4a7d37', '#356126', '#56893f', '#2e5421']);
  },
  16(ctx, ox, oy, rng) { // gold
    fillTile(ctx, ox, oy, '#f5c842');
    speckle(ctx, ox, oy, rng, 26, ['#ffe27a', '#e0ad2e', '#fff3b0']);
    ctx.strokeStyle = '#c9941f'; ctx.strokeRect(ox + 0.5, oy + 0.5, 15, 15);
    px(ctx, ox, oy, 3, 3, '#ffffff'); px(ctx, ox, oy, 11, 9, '#fff8d0');
  },
  17(ctx, ox, oy, rng) { // water
    fillTile(ctx, ox, oy, '#3f76d9');
    for (let y = 2; y < 16; y += 5) {
      ctx.fillStyle = '#5b90e8'; ctx.fillRect(ox + ((y * 3) % 8), oy + y, 7, 1);
    }
    speckle(ctx, ox, oy, rng, 14, ['#4f84e0', '#3568c4']);
  },
  18(ctx, ox, oy, rng) { // red column flutes
    fillTile(ctx, ox, oy, '#7e2a24');
    for (let x = 0; x < 16; x += 4) {
      ctx.fillStyle = '#601e1a'; ctx.fillRect(ox + x, oy, 1, 16);
      ctx.fillStyle = '#96352c'; ctx.fillRect(ox + x + 2, oy, 1, 16);
    }
  },
  19(ctx, ox, oy, rng) { // red column cap w/ gold trim
    fillTile(ctx, ox, oy, '#7e2a24');
    ctx.strokeStyle = '#c9a23f'; ctx.strokeRect(ox + 0.5, oy + 0.5, 15, 15);
    ctx.strokeStyle = '#96352c'; ctx.strokeRect(ox + 4.5, oy + 4.5, 7, 7);
  },
  20(ctx, ox, oy, rng) { // chiseled marble frieze (meander)
    fillTile(ctx, ox, oy, '#e3ddcf');
    ctx.fillStyle = '#b3ac99';
    ctx.fillRect(ox, oy + 2, 16, 1); ctx.fillRect(ox, oy + 13, 16, 1);
    for (let x = 0; x < 16; x += 4) {
      ctx.fillRect(ox + x, oy + 5, 3, 1); ctx.fillRect(ox + x, oy + 5, 1, 6);
      ctx.fillRect(ox + x, oy + 10, 3, 1); ctx.fillRect(ox + x + 2, oy + 7, 1, 4);
    }
  },
  21(ctx, ox, oy, rng) { // awning stripes
    for (let x = 0; x < 16; x += 4) {
      ctx.fillStyle = (x / 4) % 2 ? '#ece4d4' : '#c94f3f';
      ctx.fillRect(ox + x, oy, 4, 16);
    }
    speckle(ctx, ox, oy, rng, 10, ['rgba(0,0,0,0.08)']);
  },
  22(ctx, ox, oy, rng) { // flower bush
    fillTile(ctx, ox, oy, '#4f8a3a');
    speckle(ctx, ox, oy, rng, 40, ['#5c9c45', '#447832', '#67aa4e']);
    const fl = ['#d94f4f', '#e88bb1', '#f2f2f2', '#e8c84f'];
    for (let i = 0; i < 9; i++) {
      const x = 1 + ((rng() * 14) | 0), y = 1 + ((rng() * 14) | 0);
      ctx.fillStyle = fl[(rng() * fl.length) | 0]; ctx.fillRect(ox + x, oy + y, 2, 2);
    }
  },
  23(ctx, ox, oy, rng) { // cypress leaves (dark)
    fillTile(ctx, ox, oy, '#2e4d26');
    speckle(ctx, ox, oy, rng, 70, ['#38592d', '#24401e', '#41663a', '#1d3618']);
  },
  24(ctx, ox, oy, rng) { // gravel
    fillTile(ctx, ox, oy, '#b9b0a0');
    speckle(ctx, ox, oy, rng, 60, ['#c6beae', '#a89f8f', '#cfc8ba', '#999081']);
  },
  25(ctx, ox, oy, rng) { // mosaic
    const cs = ['#4f86c2', '#7fb0dd', '#e8e4da', '#3a6da6'];
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) {
      ctx.fillStyle = cs[(xx + yy + ((rng() * 2) | 0)) % 4];
      ctx.fillRect(ox + xx * 4, oy + yy * 4, 4, 4);
    }
    ctx.strokeStyle = 'rgba(40,50,70,0.35)';
    for (let i = 0; i <= 4; i++) {
      ctx.strokeRect(ox + 0.5, oy + 0.5, 15, 15);
    }
  },
  26(ctx, ox, oy, rng) { // pompeii red plaster
    fillTile(ctx, ox, oy, '#99342b');
    speckle(ctx, ox, oy, rng, 35, ['#a23a30', '#8c2e26', '#aa443a']);
    ctx.fillStyle = 'rgba(60,20,15,0.25)'; ctx.fillRect(ox, oy + 14, 16, 2);
  },
  27(ctx, ox, oy, rng) { // sand
    fillTile(ctx, ox, oy, '#d9c089');
    speckle(ctx, ox, oy, rng, 55, ['#e2cc98', '#cdb37c', '#e8d6a8']);
  },
  28(ctx, ox, oy, rng) { // red cloth
    fillTile(ctx, ox, oy, '#b03030');
    speckle(ctx, ox, oy, rng, 45, ['#bd3b3b', '#9e2828', '#c84848']);
    for (let y = 0; y < 16; y += 4) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(ox, oy + y, 16, 1); }
  },
};

export function buildAtlas() {
  const size = ATLAS_TILES * TILE_PX;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, size, size);
  for (const [idx, painter] of Object.entries(PAINTERS)) {
    const i = +idx, ox = (i % ATLAS_TILES) * TILE_PX, oy = ((i / ATLAS_TILES) | 0) * TILE_PX;
    painter(ctx, ox, oy, mulberry32(1000 + i * 77));
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  return { texture: tex, canvas };
}

// Draws an isometric block icon (for the hotbar) from the atlas canvas.
export function drawBlockIcon(iconCtx, atlasCanvas, blockId, size = 48) {
  iconCtx.clearRect(0, 0, size, size);
  iconCtx.imageSmoothingEnabled = false;
  const s = size / 48;
  const topT = tileFor(blockId, 'top'), sideT = tileFor(blockId, 'side');
  const src = (t) => ({ x: (t % ATLAS_TILES) * TILE_PX, y: ((t / ATLAS_TILES) | 0) * TILE_PX });

  function face(t, p0, p1, p3, shade) {
    const a = src(t);
    const ax = (p1[0] - p0[0]) / 16, ay = (p1[1] - p0[1]) / 16;
    const cx = (p3[0] - p0[0]) / 16, cy = (p3[1] - p0[1]) / 16;
    iconCtx.save();
    iconCtx.setTransform(ax * s, ay * s, cx * s, cy * s, p0[0] * s, p0[1] * s);
    iconCtx.drawImage(atlasCanvas, a.x, a.y, 16, 16, 0, 0, 16, 16);
    if (shade > 0) { iconCtx.fillStyle = `rgba(0,0,30,${shade})`; iconCtx.fillRect(0, 0, 16, 16); }
    iconCtx.restore();
  }
  // top, left, right faces of an isometric cube
  face(topT, [6, 15], [24, 6], [24, 24], 0);          // top
  face(sideT, [6, 15], [24, 24], [6, 33], 0.22);      // left
  face(sideT, [24, 24], [42, 15], [24, 42], 0.42);    // right
}
