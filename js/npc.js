// Roman citizens with agency: state machines (wander/route/anchor/talk/attack),
// auto-step climbing, collisions, name tags, speech bubbles, idle chatter.
import * as THREE from 'three';
import { LOC } from './city.js';

const HUMAN_W = 0.5, HUMAN_H = 1.8;

// ---------- canvas helpers --------------------------------------------------
function faceTexture({ skin, hair, helmet }) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = skin; x.fillRect(0, 0, 16, 16);
  if (helmet) {
    x.fillStyle = '#d8a832'; x.fillRect(0, 0, 16, 5);
    x.fillStyle = '#b8891f'; x.fillRect(0, 5, 16, 1);
    x.fillRect(0, 5, 2, 8); x.fillRect(14, 5, 2, 8);
  } else {
    x.fillStyle = hair; x.fillRect(0, 0, 16, 4);
  }
  // eyes
  x.fillStyle = '#ffffff'; x.fillRect(3, 8, 2, 2); x.fillRect(11, 8, 2, 2);
  x.fillStyle = '#2e1f14'; x.fillRect(4, 8, 1, 2); x.fillRect(11, 8, 1, 2);
  // mouth
  x.fillStyle = 'rgba(80,40,30,0.55)'; x.fillRect(7, 12, 2, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function goatFaceTexture() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = '#e3ded2'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#1c1c1c'; x.fillRect(2, 5, 3, 2); x.fillRect(11, 5, 3, 2);
  x.fillStyle = '#d8a8a8'; x.fillRect(5, 11, 6, 5);
  x.fillStyle = '#9c6868'; x.fillRect(6, 13, 1, 2); x.fillRect(9, 13, 1, 2);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textSprite(text, opts = {}) {
  const pad = 14, font = `${opts.bold ? 'bold ' : ''}${opts.px || 26}px monospace`;
  const c = document.createElement('canvas');
  const m = c.getContext('2d'); m.font = font;
  const lines = Array.isArray(text) ? text : [text];
  const w = Math.max(...lines.map(l => m.measureText(l).width)) + pad * 2;
  const lh = (opts.px || 26) + 8;
  c.width = Math.ceil(w); c.height = lh * lines.length + pad;
  const x = c.getContext('2d');
  x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = opts.bg || 'rgba(20,20,28,0.55)';
  roundRect(x, 0, 0, c.width, c.height, 8); x.fill();
  x.fillStyle = opts.fg || '#ffffff';
  lines.forEach((l, i) => x.fillText(l, c.width / 2, pad / 2 + lh * (i + 0.5)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(c.width / 110, c.height / 110, 1);
  sp.renderOrder = 10;
  return sp;
}

function roundRect(x, a, b, w, h, r) {
  x.beginPath();
  x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
}

// ---------- model building ---------------------------------------------------
function lambert(color) { return new THREE.MeshLambertMaterial({ color }); }

function limb(w, h, d, color, pivotY, px = 0, pz = 0) {
  const g = new THREE.Group();
  g.position.set(px, pivotY, pz);
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, -h / 2, 0);
  const mesh = new THREE.Mesh(geo, lambert(color));
  g.add(mesh);
  return g;
}

function buildHuman(def) {
  const g = new THREE.Group();
  const skinMat = lambert(def.skin);
  const hairColor = def.helmet ? '#d8a832' : def.hair;

  // head: [+x,-x,+y,-y,+z,-z]
  const headMats = [
    lambert(hairColor), lambert(hairColor), lambert(hairColor), skinMat,
    new THREE.MeshLambertMaterial({ map: faceTexture(def) }), lambert(hairColor),
  ];
  const headG = new THREE.Group(); headG.position.y = 1.5;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMats);
  head.position.y = 0.25;
  headG.add(head);
  g.add(headG);

  if (def.crest) {
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.56), lambert('#b03030'));
    crest.position.set(0, 0.6, 0); headG.add(crest);
  }
  if (def.headband) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.54), lambert('#f5c842'));
    band.position.set(0, 0.38, 0); headG.add(band);
  }
  if (def.female) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.45, 0.12), lambert(def.hair));
    back.position.set(0, 0.1, -0.26); headG.add(back);
  }

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.26), lambert(def.tunic));
  torso.position.y = 1.125; g.add(torso);
  if (def.sash) {
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.76, 0.03), lambert(def.sash));
    sash.position.set(-0.09, 1.125, 0.14); g.add(sash);
  }
  if (def.apron) {
    const ap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.03), lambert(def.apron));
    ap.position.set(0, 1.0, 0.145); g.add(ap);
  }

  const armL = limb(0.22, 0.7, 0.22, def.sleeve || def.skin, 1.45, -0.36, 0);
  const armR = limb(0.22, 0.7, 0.22, def.sleeve || def.skin, 1.45, 0.36, 0);
  const legL = limb(0.23, 0.75, 0.23, def.legs, 0.75, -0.13, 0);
  const legR = limb(0.23, 0.75, 0.23, def.legs, 0.75, 0.13, 0);
  g.add(armL, armR, legL, legR);

  if (def.pauldron) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.3), lambert('#f5c842'));
    p.position.set(0.36, 1.5, 0); g.add(p);
  }
  if (def.spear) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.06), lambert('#8a6238'));
    sh.position.set(0.02, -0.45, 0.16);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), lambert('#d8d8e0'));
    tip.position.set(0.02, 0.48, 0.16);
    armR.add(sh, tip);
  }
  if (def.shield) {
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.07), lambert('#b03030'));
    sc.position.set(-0.1, -0.35, 0.2);
    const boss = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.05), lambert('#f5c842'));
    boss.position.set(-0.1, -0.35, 0.26);
    armL.add(sc, boss);
  }
  if (def.sword) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.06), lambert('#cfcfd8'));
    bl.position.set(0, -0.85, 0.12);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.08), lambert('#8a6238'));
    hilt.position.set(0, -0.62, 0.12);
    armR.add(bl, hilt);
  }
  if (def.scroll) {
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), lambert('#efe9d8'));
    sc.position.set(0, -0.6, 0.14);
    armR.add(sc);
  }

  return { group: g, parts: { headG, armL, armR, legL, legR } };
}

function buildGoat() {
  const g = new THREE.Group();
  const fur = '#d9d4c8';
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.95), lambert(fur));
  body.position.y = 0.62; g.add(body);
  const headG = new THREE.Group(); headG.position.set(0, 0.85, 0.45);
  const faceMats = [
    lambert(fur), lambert(fur), lambert(fur), lambert(fur),
    new THREE.MeshLambertMaterial({ map: goatFaceTexture() }), lambert(fur),
  ];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), faceMats);
  head.position.set(0, 0.05, 0.12); headG.add(head);
  for (const sx of [-0.1, 0.1]) {
    const horn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), lambert('#9a8f80'));
    horn.position.set(sx, 0.28, 0.05); headG.add(horn);
  }
  g.add(headG);
  const legs = [];
  for (const [sx, sz] of [[-0.15, 0.32], [0.15, 0.32], [-0.15, -0.32], [0.15, -0.32]]) {
    const l = limb(0.13, 0.42, 0.13, '#c9c4b8', 0.42, sx, sz);
    legs.push(l); g.add(l);
  }
  return { group: g, parts: { headG, legs } };
}

// ---------- chat content ------------------------------------------------------
const CHAT_PAIRS = [
  ['Quid novi, friend?', 'All roads lead to Rome!'],
  ['Have you seen the new temple?', 'Magnificent, by Jove!'],
  ['The legions return today.', 'Gloria Romae!'],
  ['Figs are cheap at the market.', 'But Felix waters his wine!'],
  ['Caesar builds again, I hear.', 'Always building, never resting.'],
  ['The baths were crowded today.', 'Every day, citizen. Every day.'],
];

// ---------- NPC ----------------------------------------------------------------
let NEXT_ID = 1;

export class NPC {
  constructor(def, world, scene) {
    this.id = NEXT_ID++;
    this.def = def;
    this.world = world;
    this.name = def.name;
    this.isGoat = !!def.goat;
    this.noChat = !!def.noChat;

    const built = this.isGoat ? buildGoat() : buildHuman(def);
    this.group = built.group;
    this.parts = built.parts;
    if (def.scale) this.group.scale.setScalar(def.scale);

    this.halfW = (this.isGoat ? 0.35 : HUMAN_W / 2) * (def.scale || 1);
    this.height = (this.isGoat ? 1.0 : HUMAN_H) * (def.scale || 1);
    this.speed = def.speed || 1.6;

    const sy = def.spawnY ?? world.heightAt(def.spawn.x | 0, def.spawn.z | 0);
    this.pos = new THREE.Vector3(def.spawn.x, sy, def.spawn.z);
    this.vel = new THREE.Vector3();
    this.yaw = def.yaw || 0;
    this.targetYaw = this.yaw;

    this.state = 'idle';
    this.stateT = 1 + Math.random() * 2;
    this.target = null;
    this.routeIdx = def.routeStart || 0;
    this.routeDir = 1;
    this.phase = Math.random() * 10;
    this.moving = false;

    this.greetCD = Math.random() * 6;
    this.convCD = 8 + Math.random() * 16;
    this.hawkT = 4 + Math.random() * 8;
    this.attackT = 1 + Math.random() * 3;
    this.attackAnim = 0;
    this.grazeT = 0;
    this.pendingSay = null;
    this.pendingSayT = 0;
    this.stuckT = 0;
    this.lastPos = this.pos.clone();
    this.faceOverride = null;
    this.faceOverrideT = 0;

    // name tag + speech bubble
    const tagY = this.isGoat ? 1.45 : 2.3;
    this.tag = textSprite(`${def.name}`, { px: 22 });
    this.tag.position.y = tagY;
    this.group.add(this.tag);
    this.bubble = null;
    this.bubbleT = 0;

    scene.add(this.group);
    this.syncMesh();
  }

  say(text, audio, playerPos) {
    if (this.bubble) { this.group.remove(this.bubble); this.bubble.material.map.dispose(); this.bubble.material.dispose(); }
    const lines = wrap(text, 24);
    this.bubble = textSprite(lines, { bg: 'rgba(248,245,235,0.95)', fg: '#2a2118', px: 24, bold: true });
    this.bubble.position.y = (this.isGoat ? 1.85 : 2.85);
    this.group.add(this.bubble);
    this.bubbleT = 2.8 + text.length * 0.05;
    if (audio && playerPos && this.pos.distanceTo(playerPos) < 14) audio.mumble(this.isGoat);
  }

  pickWander() {
    const r = this.def.region;
    for (let i = 0; i < 12; i++) {
      const x = r.x1 + Math.random() * (r.x2 - r.x1);
      const z = r.z1 + Math.random() * (r.z2 - r.z1);
      const fa = LOC.fountainAvoid;
      if (x > fa.x1 && x < fa.x2 && z > fa.z1 && z < fa.z2) continue;
      const y = this.world.heightAt(x | 0, z | 0);
      if (Math.abs(y - this.pos.y) > 3) continue;
      if (!this.world.walkable(x | 0, y, z | 0)) continue;
      return { x, z };
    }
    return null;
  }

  nextTarget() {
    const d = this.def;
    if (d.route) {
      const r = d.route;
      if (d.pingpong) {
        this.routeIdx += this.routeDir;
        if (this.routeIdx >= r.length) { this.routeIdx = r.length - 2; this.routeDir = -1; }
        if (this.routeIdx < 0) { this.routeIdx = 1; this.routeDir = 1; }
      } else {
        this.routeIdx = (this.routeIdx + 1) % r.length;
      }
      return r[this.routeIdx];
    }
    if (d.anchor) {
      const a = d.anchor, rr = d.anchorRadius || 2;
      return { x: a.x + (Math.random() - 0.5) * rr * 2, z: a.z + (Math.random() - 0.5) * rr * 2 };
    }
    return this.pickWander();
  }

  update(dt, ctx) {
    const { world, playerPos, audio } = ctx;

    // timers
    if (this.bubbleT > 0) { this.bubbleT -= dt; if (this.bubbleT <= 0 && this.bubble) this.bubble.visible = false; }
    if (this.greetCD > 0) this.greetCD -= dt;
    if (this.convCD > 0) this.convCD -= dt;
    if (this.faceOverrideT > 0) { this.faceOverrideT -= dt; if (this.faceOverrideT <= 0) this.faceOverride = null; }
    if (this.pendingSay) {
      this.pendingSayT -= dt;
      if (this.pendingSayT <= 0) { this.say(this.pendingSay, audio, playerPos); this.pendingSay = null; }
    }

    // merchant hawking
    if (this.def.hawkLines && this.state !== 'talk') {
      this.hawkT -= dt;
      if (this.hawkT <= 0) {
        this.hawkT = 9 + Math.random() * 9;
        this.say(pick(this.def.hawkLines), audio, playerPos);
      }
    }

    // gladiator attacks training post
    if (this.def.attacksPost && this.state === 'idle') {
      this.attackT -= dt;
      if (this.attackT <= 0) {
        this.attackT = 2 + Math.random() * 3;
        this.attackAnim = 0.55;
        this.faceOverride = LOC.arena; this.faceOverrideT = 1.2;
        if (Math.random() < 0.25) this.say(pick(['Hyah!', 'Ha!', 'For glory!']), audio, playerPos);
      }
    }
    if (this.attackAnim > 0) this.attackAnim -= dt;

    // state machine
    if (this.state === 'idle') {
      this.stateT -= dt;
      if (this.isGoat && this.grazeT <= 0 && Math.random() < 0.01) this.grazeT = 1.5 + Math.random() * 2;
      if (this.grazeT > 0) this.grazeT -= dt;
      if (this.stateT <= 0) {
        const t = this.nextTarget();
        if (t) { this.target = t; this.state = 'walk'; }
        else this.stateT = 1.5;
      }
    } else if (this.state === 'walk') {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.6) {
        this.state = 'idle';
        this.stateT = this.def.route && !this.def.pingpong === false ? 0.4 : 0.8 + Math.random() * 2.5;
        if (this.def.pingpong) this.stateT = 0.15; // soldiers keep marching
      } else {
        this.targetYaw = Math.atan2(dx, dz);
      }
    } else if (this.state === 'talk') {
      this.stateT -= dt;
      if (this.stateT <= 0) { this.state = 'idle'; this.stateT = 0.6; }
    }

    // greet the player
    if (!this.isGoat || true) {
      const pd = playerPos ? this.pos.distanceTo(playerPos) : 999;
      if (pd < 3.4 && this.greetCD <= 0 && this.def.greetLines) {
        this.greetCD = 15 + Math.random() * 8;
        this.say(pick(this.def.greetLines), audio, playerPos);
        this.faceOverride = { x: playerPos.x, z: playerPos.z };
        this.faceOverrideT = 1.6;
      }
    }

    // facing
    let face = this.faceOverride;
    if (this.state === 'talk' && this.talkPartner) face = { x: this.talkPartner.pos.x, z: this.talkPartner.pos.z };
    if (face) this.targetYaw = Math.atan2(face.x - this.pos.x, face.z - this.pos.z);
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    this.yaw += dy * Math.min(1, dt * 8);

    // movement
    this.moving = false;
    let mx = 0, mz = 0;
    if (this.state === 'walk' && !face) {
      const aligned = Math.abs(dy) < 1.2;
      if (aligned) {
        mx = Math.sin(this.yaw) * this.speed;
        mz = Math.cos(this.yaw) * this.speed;
        this.moving = true;
      }
    }
    this.vel.y -= 26 * dt;
    if (this.vel.y < -30) this.vel.y = -30;
    const delta = new THREE.Vector3(mx * dt, this.vel.y * dt, mz * dt);
    const res = world.moveAABB(this.pos, delta, this.halfW, this.height);
    if (res.onGround || res.hitY) this.vel.y = 0;

    // auto-step up 1 block (stairs, steps)
    if (this.moving && (res.hitX || res.hitZ) && res.onGround !== false) {
      const ax = Math.floor(this.pos.x + Math.sin(this.yaw) * 0.6);
      const az = Math.floor(this.pos.z + Math.cos(this.yaw) * 0.6);
      const fy = Math.floor(this.pos.y);
      const blockAhead = world.get(ax, fy, az);
      if (blockAhead !== 0 && blockAhead !== 14 &&
          world.get(ax, fy + 1, az) === 0 && world.get(ax, fy + 2, az) === 0) {
        this.pos.y = fy + 1.001;
      }
      if (blockAhead === 14) { // refuse to enter water
        this.state = 'idle'; this.stateT = 0.5;
      }
    }

    // stuck detection
    this.stuckT += dt;
    if (this.stuckT > 1.4) {
      if (this.state === 'walk' && this.pos.distanceTo(this.lastPos) < 0.18) {
        this.state = 'idle'; this.stateT = 0.4 + Math.random();
        if (this.def.route) this.routeIdx = (this.routeIdx + (this.def.pingpong ? this.routeDir : 0)) % this.def.route.length;
      }
      this.stuckT = 0; this.lastPos.copy(this.pos);
    }

    // animation
    this.phase += dt * (this.moving ? this.speed * 3.2 : 1.4);
    const p = this.parts;
    if (this.isGoat) {
      const amp = this.moving ? 0.55 : 0;
      p.legs[0].rotation.x = Math.sin(this.phase) * amp;
      p.legs[1].rotation.x = -Math.sin(this.phase) * amp;
      p.legs[2].rotation.x = -Math.sin(this.phase) * amp;
      p.legs[3].rotation.x = Math.sin(this.phase) * amp;
      p.headG.rotation.x = this.grazeT > 0 ? 0.85 : Math.sin(this.phase * 0.4) * 0.06;
    } else {
      const amp = this.moving ? 0.65 : 0.04;
      const armAmp = this.def.spear || this.def.shield ? 0.15 : (this.moving ? 0.5 : 0.05);
      p.legL.rotation.x = Math.sin(this.phase) * amp;
      p.legR.rotation.x = -Math.sin(this.phase) * amp;
      p.armL.rotation.x = -Math.sin(this.phase) * armAmp;
      p.armR.rotation.x = Math.sin(this.phase) * armAmp;
      if (this.attackAnim > 0) p.armR.rotation.x = -2.4 * (this.attackAnim / 0.55);
      p.headG.rotation.y = this.state === 'idle' ? Math.sin(this.phase * 0.5) * 0.25 : 0;
    }

    // name tag fade
    if (playerPos) {
      const d2 = this.pos.distanceTo(playerPos);
      this.tag.material.opacity = THREE.MathUtils.clamp(1.4 - d2 / 16, 0, 1);
      this.tag.visible = d2 < 24;
    }
    if (this.bubble) this.bubble.visible = this.bubbleT > 0;

    this.syncMesh();
  }

  syncMesh() {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
  }
}

function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function wrap(text, n) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

// ---------- roster -------------------------------------------------------------
export function makeNPCs(world, scene) {
  const plaza = LOC.plaza;
  const defs = [
    {
      name: 'Senator Marcus', skin: '#d8a87c', hair: '#9a9a9a', tunic: '#ece8dc', legs: '#e0dccf',
      sleeve: '#ece8dc', sash: '#5a2a78', route: LOC.senatorRoute, speed: 1.5,
      spawn: { x: 66, z: 72 },
      greetLines: ['Salve, civis!', 'The Senate convenes at dawn.', 'Rome was not built in a day.'],
    },
    {
      name: 'Priestess Livia', skin: '#e8c098', hair: '#3a2a1a', tunic: '#f2eee2', legs: '#e8e4d8',
      sleeve: '#f2eee2', headband: true, female: true, route: LOC.templeLoop, speed: 1.3, noChat: true,
      spawn: { x: 84.5, z: 44.5 }, spawnY: 14,
      greetLines: ['Vesta keep your hearth warm.', 'The sacred flame must never die.', 'Welcome to the temple of Jupiter.'],
    },
    {
      name: 'Legionary Gaius', skin: '#c89468', hair: '#2a1a0e', tunic: '#a82a2a', legs: '#8a6238',
      sleeve: '#a82a2a', helmet: true, crest: true, spear: true, shield: true,
      route: LOC.patrolRoute, pingpong: true, routeStart: 0, speed: 2.1, noChat: true,
      spawn: { x: 84.5, z: 150 },
      greetLines: ['Ave! Keep the via clear.', 'SPQR! Move along, citizen.', 'Hail, traveler.'],
    },
    {
      name: 'Legionary Quintus', skin: '#b8845c', hair: '#1a1a1a', tunic: '#a82a2a', legs: '#8a6238',
      sleeve: '#a82a2a', helmet: true, crest: true, spear: true, shield: true,
      route: LOC.patrolRoute, pingpong: true, routeStart: 2, speed: 2.1, noChat: true,
      spawn: { x: 84.5, z: 100 },
      greetLines: ['Halt! ...Ah, carry on.', 'No trouble on my watch.', 'The Emperor watches over Rome.'],
    },
    {
      name: 'Merchant Felix', skin: '#c89468', hair: '#4a2a14', tunic: '#7a6234', legs: '#5a4828',
      sleeve: '#7a6234', apron: '#d8d2c0', anchor: LOC.merchantSpots[0], anchorRadius: 2, speed: 1.4,
      spawn: { x: 62.5, z: 113 },
      hawkLines: ['Olivae! Fresh olives!', 'Vinum optimum! Best wine in Roma!', 'Special price, just for you!'],
      greetLines: ['Ah, a customer! Come, look!', 'Finest goods this side of the Tiber.'],
    },
    {
      name: 'Merchant Aurelia', skin: '#e0b088', hair: '#1c1410', tunic: '#8a4a6a', legs: '#6a3a52',
      sleeve: '#8a4a6a', apron: '#e8e0cc', female: true, anchor: LOC.merchantSpots[1], anchorRadius: 2, speed: 1.4,
      spawn: { x: 106.5, z: 113 },
      hawkLines: ['Figs from Carthage!', 'Silk from the East — touch it!', 'Honey cakes, fresh today!'],
      greetLines: ['Salve! See my wares.', 'A gift for someone back home?'],
    },
    {
      name: 'Julia', skin: '#e8c098', hair: '#6a3a1a', tunic: '#4a6a9a', legs: '#dcd6c6', sleeve: '#4a6a9a',
      female: true, region: plaza, speed: 1.6, spawn: { x: 70, z: 95 },
      greetLines: ['Salve!', 'Lovely day on the forum.', 'The fountain water is sweet today.'],
    },
    {
      name: 'Titus', skin: '#c89468', hair: '#2a1a0e', tunic: '#4a8a5a', legs: '#9a8a6a', sleeve: '#4a8a5a',
      region: plaza, speed: 1.7, spawn: { x: 100, z: 75 },
      greetLines: ['Salve, friend!', 'Have you seen Brutus train? Strong as an ox!', 'I hear the games begin tomorrow.'],
    },
    {
      name: 'Octavia', skin: '#d8a87c', hair: '#0e0e0e', tunic: '#b8862a', legs: '#dcd6c6', sleeve: '#b8862a',
      female: true, region: plaza, speed: 1.5, spawn: { x: 95, z: 100 },
      greetLines: ['Greetings, traveler.', 'Mind the legionaries — they are grumpy today.', 'Aurelia sells the sweetest figs.'],
    },
    {
      name: 'Gladiator Brutus', skin: '#b8845c', hair: '#0e0e0e', tunic: '#c8a060', legs: '#7a5a34',
      sleeve: '#b8845c', pauldron: true, sword: true, attacksPost: true,
      anchor: LOC.gladiatorAnchor, anchorRadius: 3, speed: 1.9,
      spawn: { x: 135.5, z: 138.5 },
      greetLines: ['Hyah! ...Oh. Salve.', 'I fight at the games tomorrow.', 'Strength and honor!'],
    },
    {
      name: 'Vitruvius', skin: '#d8a87c', hair: '#b8b8b8', tunic: '#8a8a92', legs: '#6a6a72', sleeve: '#8a8a92',
      scroll: true, route: LOC.architectRoute, speed: 1.6, spawn: { x: 84.5, z: 126 },
      greetLines: ['Firmitas, utilitas, venustas!', 'These columns? My design, naturally.', 'Measure twice, build once.'],
    },
    {
      name: 'Young Lucius', skin: '#e8c098', hair: '#5a3a1a', tunic: '#c85a3a', legs: '#b8a888', sleeve: '#c85a3a',
      scale: 0.62, region: { x1: 76, z1: 78, x2: 93, z2: 95 }, speed: 2.6, spawn: { x: 90, z: 92 },
      greetLines: ['Catch me if you can!', 'Race you to the fountain!', 'Are you a gladiator?'],
    },
    { name: 'Capra', goat: true, region: LOC.garden, speed: 1.1, spawn: { x: 120, z: 20 }, greetLines: ['Mehhh.'] },
    { name: 'Capra', goat: true, region: LOC.garden, speed: 1.0, spawn: { x: 134, z: 30 }, greetLines: ['Mehhh.'] },
    { name: 'Capra', goat: true, region: LOC.garden, speed: 1.2, spawn: { x: 144, z: 18 }, greetLines: ['Meh-eh-eh.'] },
  ];
  return defs.map(d => new NPC(d, world, scene));
}

// conversations + separation
export function updateNPCs(npcs, dt, ctx) {
  for (const n of npcs) n.update(dt, ctx);

  for (let i = 0; i < npcs.length; i++) {
    for (let j = i + 1; j < npcs.length; j++) {
      const a = npcs[i], b = npcs[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      // gentle separation
      if (d > 0.001 && d < 0.6) {
        const push = (0.6 - d) * 0.5;
        const ux = dx / d, uz = dz / d;
        a.pos.x -= ux * push * dt * 4; a.pos.z -= uz * push * dt * 4;
        b.pos.x += ux * push * dt * 4; b.pos.z += uz * push * dt * 4;
      }
      // conversations
      if (a.isGoat || b.isGoat || a.noChat || b.noChat) continue;
      if (d < 1.9 && a.convCD <= 0 && b.convCD <= 0 &&
          a.state !== 'talk' && b.state !== 'talk' && Math.abs(a.pos.y - b.pos.y) < 1) {
        const pair = CHAT_PAIRS[(Math.random() * CHAT_PAIRS.length) | 0];
        a.state = 'talk'; b.state = 'talk';
        a.stateT = 4.4; b.stateT = 4.4;
        a.talkPartner = b; b.talkPartner = a;
        a.convCD = 28 + Math.random() * 20; b.convCD = 28 + Math.random() * 20;
        a.say(pair[0], ctx.audio, ctx.playerPos);
        b.pendingSay = pair[1]; b.pendingSayT = 1.9;
      }
    }
  }
}
