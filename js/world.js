// Chunked voxel world: storage, greedy-enough meshing (face culling), raycast, collision.
import * as THREE from 'three';
import { tileFor, isSolid, ATLAS_TILES } from './textures.js';

const CHUNK = 16;

const FACES = [
  { // +x  east
    dir: [1, 0, 0], shade: 0.70, face: 'side',
    corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  },
  { // -x  west
    dir: [-1, 0, 0], shade: 0.70, face: 'side',
    corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
  },
  { // +y  top
    dir: [0, 1, 0], shade: 1.0, face: 'top',
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
  },
  { // -y  bottom
    dir: [0, -1, 0], shade: 0.5, face: 'bottom',
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
  },
  { // +z  south
    dir: [0, 0, 1], shade: 0.82, face: 'side',
    corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
  },
  { // -z  north
    dir: [0, 0, -1], shade: 0.82, face: 'side',
    corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
  },
];

export class World {
  constructor(w, h, d) {
    this.W = w; this.H = h; this.D = d;
    this.data = new Uint8Array(w * h * d);
    this.chunkMeshes = new Map(); // "cx,cz" -> {solid, water}
    this.group = new THREE.Group();
    this.materials = null;
  }

  idx(x, y, z) { return (y * this.D + z) * this.W + x; }
  inBounds(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.W && y < this.H && z < this.D; }
  get(x, y, z) { return this.inBounds(x, y, z) ? this.data[this.idx(x, y, z)] : 0; }
  set(x, y, z, id) { if (this.inBounds(x, y, z)) this.data[this.idx(x, y, z)] = id; }
  solidAt(x, y, z) { return isSolid(this.get(x | 0, y | 0, z | 0)); }

  heightAt(x, z) { // y of feet standing on the top solid block
    x |= 0; z |= 0;
    for (let y = this.H - 1; y >= 0; y--) if (isSolid(this.get(x, y, z))) return y + 1;
    return 1;
  }

  setMaterials(atlasTexture) {
    this.matSolid = new THREE.MeshLambertMaterial({ map: atlasTexture, vertexColors: true });
    this.matWater = new THREE.MeshLambertMaterial({
      map: atlasTexture, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false,
    });
  }

  buildAllChunks() {
    const ncx = Math.ceil(this.W / CHUNK), ncz = Math.ceil(this.D / CHUNK);
    for (let cz = 0; cz < ncz; cz++) for (let cx = 0; cx < ncx; cx++) this.buildChunk(cx, cz);
  }

  rebuildAt(x, z) {
    const cx = (x / CHUNK) | 0, cz = (z / CHUNK) | 0;
    this.buildChunk(cx, cz);
    if (x % CHUNK === 0) this.buildChunk(cx - 1, cz);
    if (x % CHUNK === CHUNK - 1) this.buildChunk(cx + 1, cz);
    if (z % CHUNK === 0) this.buildChunk(cx, cz - 1);
    if (z % CHUNK === CHUNK - 1) this.buildChunk(cx, cz + 1);
  }

  buildChunk(cx, cz) {
    if (cx < 0 || cz < 0 || cx * CHUNK >= this.W || cz * CHUNK >= this.D) return;
    const key = cx + ',' + cz;
    const old = this.chunkMeshes.get(key);
    if (old) {
      for (const m of [old.solid, old.water]) if (m) { this.group.remove(m); m.geometry.dispose(); }
    }

    const sol = { pos: [], norm: [], uv: [], col: [], idx: [] };
    const wat = { pos: [], norm: [], uv: [], col: [], idx: [] };
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const x1 = Math.min(x0 + CHUNK, this.W), z1 = Math.min(z0 + CHUNK, this.D);

    for (let y = 0; y < this.H; y++) {
      for (let z = z0; z < z1; z++) {
        for (let x = x0; x < x1; x++) {
          const id = this.get(x, y, z);
          if (id === 0) continue;
          const water = id === 14;
          const buf = water ? wat : sol;
          for (const f of FACES) {
            const nx = x + f.dir[0], ny = y + f.dir[1], nz = z + f.dir[2];
            const nid = this.get(nx, ny, nz);
            if (water) {
              if (nid !== 0) continue;            // water face only against air
            } else {
              if (nid !== 0 && nid !== 14) continue; // hidden between solids
            }
            this.pushFace(buf, x, y, z, f, id, water);
          }
        }
      }
    }

    const mk = (b, mat, renderOrder) => {
      if (b.idx.length === 0) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.norm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setIndex(b.idx);
      const m = new THREE.Mesh(g, mat);
      m.renderOrder = renderOrder;
      this.group.add(m);
      return m;
    };
    this.chunkMeshes.set(key, {
      solid: mk(sol, this.matSolid, 0),
      water: mk(wat, this.matWater, 2),
    });
  }

  pushFace(buf, x, y, z, f, id, water) {
    const t = tileFor(id, f.face);
    const tu = t % ATLAS_TILES, tv = (t / ATLAS_TILES) | 0;
    const e = 0.001;
    const u0 = tu / ATLAS_TILES + e, u1 = (tu + 1) / ATLAS_TILES - e;
    const v1 = 1 - tv / ATLAS_TILES - e, v0 = 1 - (tv + 1) / ATLAS_TILES + e;
    const base = buf.pos.length / 3;
    const s = f.shade;
    const yTop = water && f.face === 'top' ? 0.88 : 1; // water surface slightly low
    for (let i = 0; i < 4; i++) {
      const c = f.corners[i];
      buf.pos.push(x + c[0], y + c[1] * yTop, z + c[2]);
      buf.norm.push(f.dir[0], f.dir[1], f.dir[2]);
      buf.col.push(s, s, s);
    }
    buf.uv.push(u0, v0, u0, v1, u1, v1, u1, v0);
    buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // DDA voxel raycast. Returns {x,y,z, nx,ny,nz, id} or null.
  raycast(origin, dir, maxDist = 6) {
    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
    const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;
    let tMaxX = stepX > 0 ? (x + 1 - origin.x) * tDeltaX : stepX < 0 ? (origin.x - x) * tDeltaX : Infinity;
    let tMaxY = stepY > 0 ? (y + 1 - origin.y) * tDeltaY : stepY < 0 ? (origin.y - y) * tDeltaY : Infinity;
    let tMaxZ = stepZ > 0 ? (z + 1 - origin.z) * tDeltaZ : stepZ < 0 ? (origin.z - z) * tDeltaZ : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    while (t <= maxDist) {
      const id = this.get(x, y, z);
      if (id !== 0 && id !== 14) return { x, y, z, nx, ny, nz, id };
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0;
      } else if (tMaxY < tMaxZ) {
        y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0;
      } else {
        z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ;
      }
    }
    return null;
  }

  // Axis-separated AABB sweep. pos = feet center. Returns flags.
  moveAABB(pos, delta, halfW, height) {
    const out = { onGround: false, hitX: false, hitY: false, hitZ: false };
    const eps = 0.001;

    const collides = (px, py, pz) => {
      const x0 = Math.floor(px - halfW), x1 = Math.floor(px + halfW);
      const y0 = Math.floor(py), y1 = Math.floor(py + height - eps);
      const z0 = Math.floor(pz - halfW), z1 = Math.floor(pz + halfW);
      for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        if (isSolid(this.get(x, y, z))) return true;
      }
      return false;
    };

    // Y
    pos.y += delta.y;
    if (collides(pos.x, pos.y, pos.z)) {
      if (delta.y < 0) {
        pos.y = Math.floor(pos.y) + 1; out.onGround = true;
      } else {
        pos.y = Math.floor(pos.y + height - eps) - height;
      }
      out.hitY = true;
    }
    // X
    pos.x += delta.x;
    if (collides(pos.x, pos.y, pos.z)) {
      if (delta.x > 0) pos.x = Math.floor(pos.x + halfW) - halfW - eps;
      else pos.x = Math.floor(pos.x - halfW) + 1 + halfW + eps;
      out.hitX = true;
    }
    // Z
    pos.z += delta.z;
    if (collides(pos.x, pos.y, pos.z)) {
      if (delta.z > 0) pos.z = Math.floor(pos.z + halfW) - halfW - eps;
      else pos.z = Math.floor(pos.z - halfW) + 1 + halfW + eps;
      out.hitZ = true;
    }
    return out;
  }

  // Is a 1x2 column of cells passable (air) at integer cell?
  walkable(x, y, z) {
    return this.get(x, y, z) === 0 && this.get(x, y + 1, z) === 0;
  }
}
