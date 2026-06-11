// Builds the Ancient Rome scene: forum, temple, triumphal arch, basilica,
// villa, market, amphitheater, walls, gardens. Exports waypoint LOCations.
import { mulberry32 } from './textures.js';

const B = {
  GRASS: 1, DIRT: 2, STONE: 3, MARBLE: 4, COLUMN: 5, BRICK: 6, ROOF: 7,
  BASALT: 8, TRAV: 9, PLANK: 10, LOG: 11, PINE: 12, GOLD: 13, WATER: 14,
  REDCOL: 15, CHISEL: 16, AWNING: 17, FLOWER: 18, CYPRESS: 19, GRAVEL: 20,
  MOSAIC: 21, PLASTER: 22, SAND: 23, CLOTH: 24,
};

export const LOC = {
  spawn: { x: 84.5, z: 155.5 },
  plaza: { x1: 47, z1: 59, x2: 121, z2: 113 },
  fountainAvoid: { x1: 78, z1: 80, x2: 90, z2: 92 },
  fountainCenter: { x: 84.5, z: 86.5 },
  patrolRoute: [
    { x: 84.5, z: 157 }, { x: 84.5, z: 124 }, { x: 84.5, z: 96 },
    { x: 77, z: 91 }, { x: 77, z: 81 }, { x: 84.5, z: 77 }, { x: 84.5, z: 58 },
  ],
  templeLoop: [
    { x: 84.5, z: 38 }, { x: 84.5, z: 44.5 }, { x: 76, z: 45.5 },
    { x: 93, z: 45.5 }, { x: 84.5, z: 44.5 },
  ],
  templePlatformY: 14,
  merchantSpots: [{ x: 62.5, z: 113 }, { x: 106.5, z: 113 }],
  senatorRoute: [
    { x: 66, z: 72 }, { x: 46, z: 81 }, { x: 28.5, z: 81 },
    { x: 46, z: 81 }, { x: 70, z: 95 }, { x: 84.5, z: 62 },
  ],
  architectRoute: [
    { x: 84.5, z: 126 }, { x: 60, z: 108 }, { x: 52, z: 64 },
    { x: 84.5, z: 56 }, { x: 116, z: 64 }, { x: 128.5, z: 78.5 }, { x: 110, z: 100 },
  ],
  arena: { x: 137.5, z: 137.5 },
  gladiatorAnchor: { x: 134, z: 137.5 },
  garden: { x1: 112, z1: 12, x2: 152, z2: 40 },
};

export function buildCity(world) {
  const rng = mulberry32(20260611);
  const { W, D } = world;
  const G = 10; // ground surface block y; feet walk at G+1

  const set = (x, y, z, id) => world.set(x, y, z, id);
  const fill = (x1, y1, z1, x2, y2, z2, id) => {
    for (let y = y1; y <= y2; y++) for (let z = z1; z <= z2; z++) for (let x = x1; x <= x2; x++) world.set(x, y, z, id);
  };

  // ---- ground -------------------------------------------------------------
  fill(0, 0, 0, W - 1, 7, D - 1, B.STONE);
  fill(0, 8, 0, W - 1, 9, D - 1, B.DIRT);
  fill(0, G, 0, W - 1, G, D - 1, B.GRASS);

  // ---- city wall + towers + south gate ------------------------------------
  const wallY1 = G + 1, wallY2 = G + 4;
  for (let z = 4; z <= 163; z++) for (let x = 4; x <= 163; x++) {
    const onRing = (x <= 5 || x >= 162 || z <= 5 || z >= 162);
    if (!onRing) continue;
    fill(x, wallY1, z, x, wallY2, z, B.BRICK);
    const outer = (x === 4 || x === 163 || z === 4 || z === 163);
    if (outer && (x + z) % 2 === 0) set(x, wallY2 + 1, z, B.BRICK);
  }
  for (const [tx, tz] of [[2, 2], [158, 2], [2, 158], [158, 158]]) {
    fill(tx, wallY1, tz, tx + 7, G + 8, tz + 7, B.BRICK);
    for (let z = tz; z <= tz + 7; z++) for (let x = tx; x <= tx + 7; x++) {
      if ((x === tx || x === tx + 7 || z === tz || z === tz + 7) && (x + z) % 2 === 0) set(x, G + 9, z, B.BRICK);
    }
  }
  // south gate: clear opening, flanking towers, marble lintel + golden eagle
  fill(78, wallY1, 162, 89, G + 6, 163, 0);
  fill(74, wallY1, 160, 77, G + 7, 164, B.BRICK);
  fill(90, wallY1, 160, 93, G + 7, 164, B.BRICK);
  fill(78, G + 7, 162, 89, G + 8, 163, B.MARBLE);
  fill(83, G + 9, 162, 84, G + 9, 163, B.GOLD);

  // ---- plaza + temple forecourt -------------------------------------------
  fill(44, G, 56, 124, G, 116, B.TRAV);
  for (let z = 56; z <= 116; z++) for (let x = 44; x <= 124; x++) {
    if (x === 44 || x === 124 || z === 56 || z === 116) set(x, G, z, B.BASALT);
    if (Math.max(Math.abs(x - 84), Math.abs(z - 86)) === 6) set(x, G, z, B.BASALT);
  }
  fill(62, G, 51, 106, G, 55, B.TRAV); // forecourt below temple steps

  // ---- main road (south gate -> plaza) ------------------------------------
  fill(80, G, 51, 87, G, 167, B.BASALT);
  fill(79, G, 56, 79, G, 162, B.TRAV);
  fill(88, G, 56, 88, G, 162, B.TRAV);

  // ---- temple --------------------------------------------------------------
  fill(62, G + 1, 26, 106, G + 3, 50, B.MARBLE);              // podium
  fill(70, G + 1, 51, 98, G + 2, 51, B.MARBLE);               // steps
  fill(70, G + 1, 52, 98, G + 1, 52, B.MARBLE);
  const colTop = G + 10;
  for (let x = 66; x <= 102; x += 4) colSeg(x, 47);            // front colonnade
  for (let x = 66; x <= 102; x += 4) colSeg(x, 29);            // rear
  for (let z = 32; z <= 44; z += 3) { colSeg(64, z); colSeg(104, z); } // sides
  function colSeg(x, z) { fill(x, G + 4, z, x, colTop, z, B.COLUMN); }
  fill(70, G + 4, 30, 98, colTop, 42, 0);                      // clear cella volume
  // cella walls
  fill(70, G + 4, 30, 98, colTop, 30, B.MARBLE);
  fill(70, G + 4, 42, 98, colTop, 42, B.MARBLE);
  fill(70, G + 4, 30, 70, colTop, 42, B.MARBLE);
  fill(98, G + 4, 30, 98, colTop, 42, B.MARBLE);
  fill(81, G + 4, 42, 86, G + 8, 42, 0);                       // door
  fill(71, G + 3, 31, 97, G + 3, 41, B.MOSAIC);                // cella floor
  // altar + cult statue (gold)
  fill(83, G + 4, 35, 85, G + 4, 36, B.GOLD);
  fill(84, G + 4, 32, 84, G + 6, 32, B.GOLD);
  set(83, G + 6, 32, B.GOLD); set(85, G + 6, 32, B.GOLD);
  set(84, G + 7, 32, B.GOLD);
  // entablature + frieze
  fill(62, G + 11, 26, 106, G + 11, 50, B.MARBLE);
  fill(62, G + 12, 26, 106, G + 12, 50, B.MARBLE);
  for (let x = 62; x <= 106; x++) { set(x, G + 12, 26, B.CHISEL); set(x, G + 12, 50, B.CHISEL); }
  for (let z = 26; z <= 50; z++) { set(62, G + 12, z, B.CHISEL); set(106, G + 12, z, B.CHISEL); }
  // stepped roof + marble pediments
  for (let r = 0; r <= 6; r++) {
    const x1 = 64 + 3 * r, x2 = 104 - 3 * r, y = G + 13 + r;
    if (x1 > x2) break;
    fill(x1, y, 26, x2, y, 50, B.ROOF);
    fill(x1, y, 26, x2, y, 26, B.MARBLE);
    fill(x1, y, 50, x2, y, 50, B.MARBLE);
  }
  set(84, G + 20, 50, B.GOLD); set(84, G + 20, 26, B.GOLD);    // peak acroteria
  for (const [ax, az] of [[63, 27], [105, 27], [63, 49], [105, 49]]) set(ax, G + 13, az, B.GOLD);

  // ---- triumphal arch (over road, south of plaza) ---------------------------
  fill(76, G + 1, 119, 79, G + 8, 122, B.MARBLE);
  fill(88, G + 1, 119, 91, G + 8, 122, B.MARBLE);
  fill(76, G + 9, 119, 81, G + 9, 122, B.MARBLE);
  fill(86, G + 9, 119, 91, G + 9, 122, B.MARBLE);
  fill(76, G + 10, 119, 91, G + 10, 122, B.MARBLE);
  fill(76, G + 11, 119, 91, G + 13, 122, B.MARBLE);
  for (let x = 76; x <= 91; x++) { set(x, G + 12, 119, B.CHISEL); set(x, G + 12, 122, B.CHISEL); }
  fill(83, G + 14, 120, 84, G + 14, 121, B.GOLD);
  set(84, G + 15, 120, B.GOLD);
  for (const [ax, az] of [[77, 119], [90, 119], [77, 122], [90, 122]]) set(ax, G + 14, az, B.GOLD);

  // ---- fountain (plaza center) ---------------------------------------------
  for (let z = 82; z <= 90; z++) for (let x = 80; x <= 88; x++) {
    const corner = (x === 80 || x === 88) && (z === 82 || z === 90);
    const rim = (x === 80 || x === 88 || z === 82 || z === 90);
    if (corner) continue;
    if (rim) { set(x, G + 1, z, B.MOSAIC); }
    else { set(x, G, z, B.MOSAIC); set(x, G + 1, z, B.WATER); }
  }
  fill(84, G + 1, 86, 84, G + 3, 86, B.COLUMN);
  set(84, G + 4, 86, B.GOLD);

  // ---- statues on red columns ----------------------------------------------
  const statues = [[48, 60], [120, 60], [48, 112], [120, 112], [66, 58], [102, 58]];
  for (const [sx, sz] of statues) {
    fill(sx - 1, G + 1, sz - 1, sx + 1, G + 1, sz + 1, B.MARBLE);
    fill(sx, G + 2, sz, sx, G + 5, sz, B.REDCOL);
    // saluting figure: body, one arm down, one raised — not a symmetric cross
    fill(sx, G + 6, sz, sx, G + 7, sz, B.GOLD);
    set(sx - 1, G + 7, sz, B.GOLD);
    set(sx + 1, G + 8, sz, B.GOLD);
    set(sx, G + 8, sz, B.GOLD);
  }

  // ---- basilica (west of plaza) --------------------------------------------
  fill(14, G, 58, 46, G, 104, B.TRAV);
  fill(15, G + 1, 58, 15, G + 6, 104, B.BRICK);
  fill(15, G + 2, 58, 15, G + 6, 104, B.PLASTER);
  for (const wz of [58, 104]) {
    fill(15, G + 1, wz, 40, G + 1, wz, B.BRICK);
    fill(15, G + 2, wz, 40, G + 6, wz, B.PLASTER);
  }
  for (let z = 60; z <= 102; z += 3) fill(41, G + 1, z, 41, G + 6, z, B.COLUMN);
  fill(14, G + 7, 58, 42, G + 7, 104, B.MARBLE);
  for (let r = 0; r <= 4; r++) {
    const x1 = 16 + 3 * r, x2 = 40 - 3 * r, y = G + 8 + r;
    if (x1 > x2) break;
    fill(x1, y, 58, x2, y, 104, B.ROOF);
    fill(x1, y, 58, x2, y, 58, B.MARBLE);
    fill(x1, y, 104, x2, y, 104, B.MARBLE);
  }
  for (const pz of [70, 92]) { // interior statues
    set(20, G + 1, pz, B.MARBLE); fill(20, G + 2, pz, 20, G + 3, pz, B.GOLD);
  }

  // ---- villa (east of plaza, Pompeii style) ---------------------------------
  fill(125, G, 58, 133, G, 98, B.TRAV);                          // porch floor
  for (let z = 62; z <= 94; z += 4) fill(127, G + 1, z, 127, G + 5, z, B.COLUMN);
  fill(126, G + 6, 59, 134, G + 6, 97, B.MARBLE);                // porch beam
  fill(125, G + 7, 58, 134, G + 7, 98, B.ROOF);                  // porch roof
  // main block walls
  const vw = [[134, 58, 134, 98], [158, 58, 158, 98], [134, 58, 158, 58], [134, 98, 158, 98]];
  for (const [x1, z1, x2, z2] of vw) {
    fill(x1, G + 1, z1, x2, G + 1, z2, B.BRICK);
    fill(x1, G + 2, z1, x2, G + 9, z2, B.PLASTER);
  }
  fill(135, G, 59, 157, G, 97, B.PLANK);                         // interior floor
  fill(135, G + 5, 59, 157, G + 5, 97, B.PLANK);                 // upper floor
  fill(134, G + 1, 76, 134, G + 4, 79, 0);                       // west door
  for (const wz of [[64, 65], [88, 89]]) {                       // west+east windows
    for (const wx of [134, 158]) {
      fill(wx, G + 3, wz[0], wx, G + 4, wz[1], 0);
      fill(wx, G + 7, wz[0], wx, G + 8, wz[1], 0);
    }
  }
  for (const wx of [[140, 141], [150, 151]]) {                   // north+south windows
    for (const wz of [58, 98]) {
      fill(wx[0], G + 3, wz, wx[1], G + 4, wz, 0);
      fill(wx[0], G + 7, wz, wx[1], G + 8, wz, 0);
    }
  }
  for (let k = 0; k <= 6; k++) {                                  // hipped roof
    const x1 = 134 + 2 * k, x2 = 158 - 2 * k, z1 = 58 + 2 * k, z2 = 98 - 2 * k, y = G + 10 + k;
    if (x1 > x2 || z1 > z2) break;
    fill(x1, y, z1, x2, y, z2, B.ROOF);
  }
  fill(125, G, 74, 125, G, 80, B.TRAV);                           // join to plaza
  for (const pz of [62, 68, 86, 92]) {                            // porch planters
    set(124, G + 1, pz, B.MOSAIC); set(124, G + 2, pz, B.FLOWER);
  }

  // ---- market stalls (south plaza edge) -------------------------------------
  const stallX = [52, 62, 72, 96, 106, 116];
  const goods = [B.GOLD, B.FLOWER, B.CLOTH, B.MOSAIC, B.PLANK, B.GOLD];
  stallX.forEach((cx, i) => {
    for (const [px, pz] of [[cx - 2, 108], [cx + 2, 108], [cx - 2, 111], [cx + 2, 111]]) {
      fill(px, G + 1, pz, px, G + 3, pz, B.LOG);
    }
    fill(cx - 2, G + 4, 107, cx + 2, G + 4, 112, B.AWNING);
    fill(cx - 1, G + 1, 108, cx + 1, G + 1, 108, B.PLANK);
    set(cx, G + 2, 108, goods[i]);
    set(cx - 1, G + 2, 108, goods[(i + 3) % 6]);
  });

  // ---- insulae (houses flanking the south road) ------------------------------
  buildInsula(60, 130, 74, 146, 74, true);
  buildInsula(94, 130, 108, 146, 94, false);
  function buildInsula(x1, z1, x2, z2, doorWallX, doorEast) {
    fill(x1, G + 1, z1, x2, G + 1, z2, B.BRICK);
    fill(x1, G + 2, z1, x2, G + 6, z2, B.PLASTER);
    fill(x1 + 1, G + 1, z1 + 1, x2 - 1, G + 6, z2 - 1, 0);       // hollow
    fill(x1 + 1, G, z1 + 1, x2 - 1, G, z2 - 1, B.PLANK);
    fill(x1, G + 2, z1, x2, G + 2, z2, B.BRICK);                  // brick band
    fill(x1 + 1, G + 2, z1 + 1, x2 - 1, G + 2, z2 - 1, 0);
    fill(doorWallX, G + 1, 136, doorWallX, G + 4, 139, 0);        // door
    for (const wz of [z1, z2]) for (let wx = x1 + 3; wx < x2 - 2; wx += 5) {
      fill(wx, G + 3, wz, wx + 1, G + 4, wz, 0);
    }
    fill(x1, G + 7, z1, x2, G + 7, z2, B.ROOF);
    fill(x1 + 2, G + 8, z1 + 2, x2 - 2, G + 8, z2 - 2, B.ROOF);
    const ax = doorEast ? doorWallX + 1 : doorWallX - 1;
    fill(ax, G + 5, 135, ax, G + 5, 140, B.AWNING);               // door awning
    set(ax, G + 1, 133, B.MOSAIC); set(ax, G + 2, 133, B.FLOWER); // planters
    set(ax, G + 1, 142, B.MOSAIC); set(ax, G + 2, 142, B.FLOWER);
  }

  // ---- COLOSSEUM (SE district) --------------------------------------------------
  // Elliptical Flavian amphitheater: 3 arched arcade levels + attic, tiered cavea,
  // sand arena, raised gallery ring, 4 axial vomitoria (west gate is the main one).
  const CC = { x: 137.5, z: 137.5 }, CA = 21.5, CB = 19.5, BAYS = 24;
  const eOf = (x, z) => Math.hypot((x + 0.5 - CC.x) / CA, (z + 0.5 - CC.z) / CB);
  const bayPos = (x, z) => {
    const th = Math.atan2(z + 0.5 - CC.z, x + 0.5 - CC.x);
    return ((th + Math.PI) / (2 * Math.PI)) * BAYS + 0.5; // axial gates land mid-bay
  };
  for (let z = 117; z <= 158; z++) for (let x = 115; x <= 160; x++) {
    const e = eOf(x, z);
    if (e > 1.0) continue;
    const bp = bayPos(x, z), f = bp % 1, bayIdx = Math.floor(bp) % BAYS;
    const dxc = x + 0.5 - CC.x, dzc = z + 0.5 - CC.z;
    const corridor = e > 0.40 && (Math.abs(dzc) <= 1 || Math.abs(dxc) <= 1);

    if (e < 0.47) { set(x, G, z, B.SAND); continue; }              // arena floor
    if (corridor) {                                                 // vomitoria
      set(x, G, z, B.GRAVEL);
      if (e >= 0.82 && e < 0.89) {                                  // tunnel under gallery
        set(x, G + 5, z, B.BRICK); set(x, G + 6, z, B.TRAV);
      } else if (e >= 0.89) {                                       // gate arch through facade
        fill(x, G + 5, z, x, G + 20, z, B.TRAV);
        set(x, G + 12, z, B.CHISEL);
        set(x, G + 21, z, B.MARBLE);
        for (const yb of [G + 7, G + 13]) {                         // arcades above the gate
          if (f > 0.32 && f < 0.68) fill(x, yb, z, x, yb + 2, z, 0);
          if (f > 0.40 && f < 0.60) set(x, yb + 3, z, 0);
        }
      }
      continue;
    }
    if (e < 0.53) { fill(x, G + 1, z, x, G + 2, z, B.MARBLE); continue; } // podium wall
    if (e < 0.82) {                                                 // tiered cavea
      const h = Math.min(12, 1 + Math.floor(((e - 0.53) / 0.29) * 11));
      fill(x, G + 1, z, x, G + h, z, B.TRAV);
      continue;
    }
    if (e < 0.89) {                                                 // raised gallery ring
      fill(x, G + 1, z, x, G + 5, z, B.BRICK);
      set(x, G + 6, z, B.TRAV);
      continue;
    }
    // facade: travertine, bands between levels, marble cornice
    fill(x, G + 1, z, x, G + 20, z, B.TRAV);
    set(x, G + 6, z, B.CHISEL); set(x, G + 12, z, B.CHISEL);
    set(x, G + 21, z, B.MARBLE);
    const wide = f > 0.32 && f < 0.68, narrow = f > 0.40 && f < 0.60;
    for (const yb of [G + 1, G + 7, G + 13]) {                      // 3 arcade levels
      if (wide) fill(x, yb, z, x, yb + 2, z, 0);
      if (narrow) set(x, yb + 3, z, 0);
    }
    if (narrow && bayIdx % 2 === 0) set(x, G + 19, z, 0);           // attic windows
  }
  fill(116, G + 6, 136, 117, G + 6, 139, B.GOLD);                   // gold band over west gate
  fill(137, G + 1, 137, 137, G + 3, 137, B.LOG);                    // training post
  set(137, G + 4, 137, B.CLOTH);
  // gravel path: plaza -> west gate
  for (let t = 0; t <= 24; t++) {
    const px = Math.round(120 + (126 - 120) * (t / 24)), pz = Math.round(114 + (128 - 114) * (t / 24));
    fill(px, G, pz, px + 1, G, pz + 1, B.GRAVEL);
  }
  for (let t = 0; t <= 16; t++) {
    const px = Math.round(126 - (126 - 114) * (t / 16)), pz = Math.round(128 + (137 - 128) * (t / 16));
    fill(px, G, pz, px + 1, G, pz + 1, B.GRAVEL);
  }
  fill(113, G, 135, 115, G, 140, B.GRAVEL);                         // apron at the gate

  // ---- NE garden + shrine ------------------------------------------------------
  fill(130, G, 16, 134, G, 20, B.TRAV);
  for (const [cx2, cz2] of [[130, 16], [134, 16], [130, 20], [134, 20]]) {
    fill(cx2, G + 1, cz2, cx2, G + 4, cz2, B.COLUMN);
  }
  fill(130, G + 5, 16, 134, G + 5, 20, B.MARBLE);
  set(132, G + 6, 18, B.GOLD);
  for (let i = 0; i < 60; i++) {
    const fx = 110 + ((rng() * 46) | 0), fz = 8 + ((rng() * 36) | 0);
    if (world.get(fx, G, fz) === B.GRASS && world.get(fx, G + 1, fz) === 0) set(fx, G + 1, fz, B.FLOWER);
  }
  for (const [px2, pz2] of [[116, 16], [146, 12], [150, 34], [122, 36]]) pine(px2, pz2);

  // ---- trees ---------------------------------------------------------------------
  function cypress(x, z) {
    fill(x, G + 1, z, x, G + 2, z, B.LOG);
    for (let y = G + 3; y <= G + 6; y++) {
      set(x, y, z, B.CYPRESS);
      set(x + 1, y, z, B.CYPRESS); set(x - 1, y, z, B.CYPRESS);
      set(x, y, z + 1, B.CYPRESS); set(x, y, z - 1, B.CYPRESS);
    }
    set(x, G + 7, z, B.CYPRESS); set(x, G + 8, z, B.CYPRESS);
  }
  function pine(x, z) {
    fill(x, G + 1, z, x, G + 6, z, B.LOG);
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      if (Math.hypot(dx, dz) <= 3.4) set(x + dx, G + 7, z + dz, B.PINE);
      if (Math.hypot(dx, dz) <= 2.2) set(x + dx, G + 8, z + dz, B.PINE);
    }
    set(x, G + 9, z, B.PINE);
  }
  for (const tz of [128, 136, 144, 152]) { cypress(77, tz); cypress(90, tz); }
  for (let tx = 110; tx <= 150; tx += 8) cypress(tx, 24);
  pine(52, 124); pine(116, 122); pine(24, 120); pine(30, 40); pine(140, 60);
  for (const [bx, bz] of [[50, 62], [118, 62], [50, 110], [118, 110]]) { // plaza topiary
    set(bx, G + 1, bz, B.CYPRESS); set(bx, G + 2, bz, B.CYPRESS);
  }
  for (let x = 64; x <= 104; x += 8) { // forecourt planters
    set(x, G + 1, 57, B.MOSAIC); set(x, G + 2, 57, B.FLOWER);
  }

  // scattered flowers on remaining grass
  for (let i = 0; i < 120; i++) {
    const fx = 8 + ((rng() * 152) | 0), fz = 8 + ((rng() * 152) | 0);
    if (world.get(fx, G, fz) === B.GRASS && world.get(fx, G + 1, fz) === 0 && rng() < 0.8) {
      set(fx, G + 1, fz, B.FLOWER);
    }
  }
}
