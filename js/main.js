// ROMACRAFT — boot, scene, lights, sky, clouds, HUD, particles, game loop.
import * as THREE from 'three';
import { buildAtlas, drawBlockIcon, BLOCKS, BLOCK_COLORS } from './textures.js';
import { World } from './world.js';
import { buildCity, LOC } from './city.js';
import { makeNPCs, updateNPCs } from './npc.js';
import { Player, HOTBAR } from './player.js';
import { GameAudio } from './audio.js';

const W = 168, H = 44, D = 168;

// ---------- renderer / scene -------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xf3d9b0, 0.0048);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 900);

// gradient sky dome (follows the camera so it can never be clipped or exited)
let skyDome;
{
  const geo = new THREE.SphereGeometry(520, 16, 12);
  const top = new THREE.Color(0x5d9be8), bottom = new THREE.Color(0xf6cf9a);
  const colors = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) / 520) * 0.5 + 0.5, 0, 1);
    const c = bottom.clone().lerp(top, Math.pow(t, 0.62));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  skyDome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  skyDome.position.set(84, 0, 84);
  scene.add(skyDome);
}

// golden-hour light
const sun = new THREE.DirectionalLight(0xffeccc, 1.3);
sun.position.set(-90, 95, 60);
scene.add(sun, new THREE.HemisphereLight(0xd8e8ff, 0xb89a74, 1.05));
const sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(14, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xfff1c0, fog: false })
);
sunSphere.position.set(-330, 230, 190);
scene.add(sunSphere);

// clouds
const clouds = new THREE.Group();
{
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  let s = 1234;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) {
    const cl = new THREE.Group();
    const n = 2 + (rnd() * 3 | 0);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(8 + rnd() * 14, 1.6, 6 + rnd() * 8), mat);
      m.position.set(rnd() * 16 - 8, 0, rnd() * 10 - 5);
      cl.add(m);
    }
    cl.position.set(rnd() * 360 - 100, 56 + rnd() * 10, rnd() * 360 - 100);
    cl.userData.speed = 0.8 + rnd() * 0.9;
    clouds.add(cl);
  }
  scene.add(clouds);
}

// distant scenery: endless plains + a ring of stepped hills beyond the walls
{
  const plains = new THREE.Mesh(
    new THREE.CircleGeometry(490, 48).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x69a247 })
  );
  plains.position.set(84, 10.9, 84);
  scene.add(plains);

  const mGrass = new THREE.MeshLambertMaterial({ color: 0x6aa648 });
  const mForest = new THREE.MeshLambertMaterial({ color: 0x47753a });
  const mRock = new THREE.MeshLambertMaterial({ color: 0x8d8d92 });
  const mPine = new THREE.MeshLambertMaterial({ color: 0x2e4d26 });

  let hs = 4242;
  const rnd = () => (hs = (hs * 16807) % 2147483647) / 2147483647;
  const hills = new THREE.Group();
  const N = 16;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
    const dist = 170 + rnd() * 110;
    const hx = 84 + Math.cos(ang) * dist, hz = 84 + Math.sin(ang) * dist;
    const big = rnd() < 0.28;                    // a few tall fogged peaks
    const forest = rnd() < 0.45;
    const tiers = big ? 6 : 3 + ((rnd() * 3) | 0);
    let w = (big ? 85 : 38) + rnd() * 40;
    let d = w * (0.7 + rnd() * 0.6);
    let y = 11;
    let topTier = null;
    for (let t = 0; t < tiers; t++) {
      const th = (big ? 9 : 5.5) + rnd() * 4;
      const mat = big && t >= tiers - 2 ? mRock : (forest ? mForest : mGrass);
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, th, d), mat);
      tier.position.set(hx + (rnd() - 0.5) * 7, y + th / 2, hz + (rnd() - 0.5) * 7);
      hills.add(tier);
      topTier = tier;
      y += th;
      w *= 0.6 + rnd() * 0.14;
      d *= 0.6 + rnd() * 0.14;
    }
    // giant distant "trees" scattered on the lower slopes
    if (!big && rnd() < 0.75) {
      const base = hills.children[hills.children.length - tiers];
      const n = 2 + ((rnd() * 3) | 0);
      for (let k = 0; k < n; k++) {
        const tw = 4 + rnd() * 4;
        const tree = new THREE.Mesh(new THREE.BoxGeometry(tw, 7 + rnd() * 5, tw), mPine);
        const bw = Math.max(2, base.geometry.parameters.width / 2 - 4);
        const bd = Math.max(2, base.geometry.parameters.depth / 2 - 4);
        tree.position.set(
          base.position.x + (rnd() - 0.5) * 2 * bw,
          base.position.y + base.geometry.parameters.height / 2 + 3.5,
          base.position.z + (rnd() - 0.5) * 2 * bd
        );
        hills.add(tree);
      }
    }
    if (topTier && big) { // snow-ish marble cap on the tallest peaks
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(topTier.geometry.parameters.width * 0.7, 3, topTier.geometry.parameters.depth * 0.7),
        new THREE.MeshLambertMaterial({ color: 0xe8e4da })
      );
      cap.position.set(topTier.position.x, y + 1.5, topTier.position.z);
      hills.add(cap);
    }
  }
  scene.add(hills);
}

// ---------- world ---------------------------------------------------------------
const atlas = buildAtlas();
const world = new World(W, H, D);
world.setMaterials(atlas.texture);
buildCity(world);
world.buildAllChunks();
scene.add(world.group);

// ---------- audio / npcs / player ------------------------------------------------
const audio = new GameAudio();
const npcs = makeNPCs(world, scene);

const hud = {
  hotbar: document.getElementById('hotbar'),
  tip: document.getElementById('blocktip'),
  overlay: document.getElementById('overlay'),
  startBtn: document.getElementById('startbtn'),
  startTitle: document.getElementById('start-title'),
  hint: document.getElementById('hints'),
  cross: document.getElementById('crosshair'),
};

const player = new Player(world, camera, canvas, {
  onBreak(x, y, z, id) { audio.breakBlock(); spawnParticles(x, y, z, id); },
  onPlace() { audio.placeBlock(); },
  onSelect(i) { selectSlot(i); },
  onFlyToggle(on) { toast(on ? 'Flight ON — Space = rise · Shift = descend · F = land' : 'Flight OFF'); },
  canPlaceAt(x, y, z) {
    for (const n of npcs) {
      if (x + 1 > n.pos.x - n.halfW && x < n.pos.x + n.halfW &&
          y + 1 > n.pos.y && y < n.pos.y + n.height &&
          z + 1 > n.pos.z - n.halfW && z < n.pos.z + n.halfW) return false;
    }
    return true;
  },
});
scene.add(player.highlight);

// ---------- particles -------------------------------------------------------------
const particles = [];
const partGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
function spawnParticles(x, y, z, id) {
  const mat = new THREE.MeshBasicMaterial({ color: BLOCK_COLORS[id] || 0x888888 });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(partGeo, mat);
    m.position.set(x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6);
    m.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4);
    m.userData.life = 0.5 + Math.random() * 0.3;
    scene.add(m);
    particles.push(m);
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= dt;
    p.userData.vel.y -= 14 * dt;
    p.position.addScaledVector(p.userData.vel, dt);
    p.scale.setScalar(Math.max(0.1, p.userData.life * 2));
    if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
  }
}

// ---------- HUD --------------------------------------------------------------------
function buildHotbar() {
  HOTBAR.forEach((id, i) => {
    const div = document.createElement('div');
    div.className = 'slot' + (i === 0 ? ' sel' : '');
    const c = document.createElement('canvas');
    c.width = 48; c.height = 48;
    drawBlockIcon(c.getContext('2d'), atlas.canvas, id);
    div.appendChild(c);
    const num = document.createElement('span');
    num.textContent = i + 1;
    div.appendChild(num);
    div.addEventListener('click', () => player.select(i));
    hud.hotbar.appendChild(div);
  });
}
let tipTimer = null;
function selectSlot(i) {
  [...hud.hotbar.children].forEach((el, j) => el.classList.toggle('sel', j === i));
  hud.tip.textContent = BLOCKS[HOTBAR[i]].name;
  hud.tip.style.opacity = 1;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => (hud.tip.style.opacity = 0), 1200);
}
buildHotbar();

// ---------- start / pause ------------------------------------------------------------
let playing = false;   // actively controlling (menu hidden)
let started = false;   // has entered the game at least once (camera stays with player)
let lockedAt = 0;      // when pointer lock was last acquired

let toastTimer = null;
function toast(msg, ms = 4000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.style.display = 'none'), ms);
}

function requestLock() {
  let p = null;
  try { p = canvas.requestPointerLock({ unadjustedMovement: true }); } catch { p = null; }
  if (p && typeof p.catch === 'function') {
    // unadjustedMovement unsupported -> retry plain
    p.catch(() => { try { canvas.requestPointerLock(); } catch {} });
  } else if (p === null) {
    try { canvas.requestPointerLock(); } catch {}
  }
  // if the environment never grants the lock, fall back to drag-look
  setTimeout(() => {
    if (playing && document.pointerLockElement !== canvas) {
      toast('Mouse capture unavailable here — click & drag to look around');
    }
  }, 700);
}

function startGame() {
  playing = true;
  started = true;
  player.enabled = true;
  hud.overlay.classList.add('hidden');
  hud.cross.style.display = 'block';
  hud.hotbar.style.display = 'flex';
  hud.hint.style.display = 'block';
  audio.ensure(); audio.resume();
  requestLock();
}

function showPause() {
  hud.overlay.classList.remove('hidden');
  hud.startTitle.textContent = 'PAUSED';
  hud.startBtn.textContent = 'Resume';
  player.enabled = false;
  playing = false;
}

hud.startBtn.addEventListener('click', startGame);

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    lockedAt = performance.now();
    player.enabled = true;
  } else if (playing) {
    const held = lockedAt ? performance.now() - lockedAt : 0;
    if (held > 1000) {
      showPause(); // genuine Esc after real play
    } else {
      // lock denied or instantly revoked (embedded previews) -> keep playing
      toast('Mouse capture unavailable here — click & drag to look around');
    }
  }
});
document.addEventListener('pointerlockerror', () => {
  if (playing) toast('Mouse capture unavailable here — click & drag to look around');
});
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'm') {
    const muted = audio.toggleMute();
    document.getElementById('mutelabel').textContent = muted ? 'M unmute' : 'M mute';
  }
});

// ---------- loop -----------------------------------------------------------------------
const clock = new THREE.Clock();
let frames = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (started) {
    player.update(dt); // no-ops when paused; camera holds last pose
  } else {
    // title orbit
    const a = t * 0.045;
    camera.position.set(84.5 + Math.sin(a) * 66, 36 + Math.sin(t * 0.1) * 4, 92 + Math.cos(a) * 66);
    camera.lookAt(84.5, 16, 64);
  }

  updateNPCs(npcs, dt, { world, playerPos: started ? player.pos : camera.position, audio });
  updateParticles(dt);
  audio.update(dt);

  for (const cl of clouds.children) {
    cl.position.x += cl.userData.speed * dt;
    if (cl.position.x > 280) cl.position.x = -120;
  }

  skyDome.position.copy(camera.position); // sky can never be far-clipped or exited

  renderer.render(scene, camera);
  frames++;
  if (frames === 2) window.__READY = true;
}
tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- debug API (used for automated testing) ---------------------------------------
window.game = {
  world, npcs, player, camera, scene, LOC, renderer,
  start: startGame,
  view(x, y, z, yawDeg = 0, pitchDeg = 0) {
    player.enabled = true; playing = true; started = true;
    hud.overlay.classList.add('hidden');
    player.pos.set(x, y, z);
    player.vel.set(0, 0, 0);
    player.yaw = (yawDeg * Math.PI) / 180;
    player.pitch = (pitchDeg * Math.PI) / 180;
    player.update(0);
  },
  npcSnapshot() {
    return npcs.map(n => ({ name: n.name, x: +n.pos.x.toFixed(2), y: +n.pos.y.toFixed(2), z: +n.pos.z.toFixed(2), state: n.state }));
  },
  break() { player.tryBreak(); },
  place() { player.tryPlace(); },
};
