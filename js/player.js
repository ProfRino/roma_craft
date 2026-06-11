// First-person player: pointer-lock look, WASD physics, fly mode,
// block break/place with raycast + highlight, hotbar selection.
import * as THREE from 'three';

const EYE = 1.62, HALF_W = 0.3, HEIGHT = 1.8;
const GRAV = 26, JUMP_V = 8.6, WALK = 5.0, SPRINT = 7.6, FLY = 11;

export const HOTBAR = [4, 5, 6, 22, 7, 9, 10, 19, 13];

export class Player {
  constructor(world, camera, dom, callbacks) {
    this.world = world;
    this.camera = camera;
    this.dom = dom;
    this.cb = callbacks; // {onBreak(x,y,z,id), onPlace(x,y,z,id), onSelect(slot), canPlaceAt(box)}

    this.pos = new THREE.Vector3(84.5, 12, 155.5);
    this.vel = new THREE.Vector3();
    this.yaw = 0;                // yaw 0 faces -z (north, toward the forum)
    this.pitch = 0;
    this.onGround = false;
    this.fly = false;
    this.slot = 0;
    this.enabled = false;
    this.keys = new Set();
    this.breakHold = 0;
    this.placeHold = 0;
    this.mouseDown = new Set();

    this.highlight = this.makeHighlight();

    dom.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement === dom) {
        this.look(e.movementX, e.movementY);
      } else if (this.dragging) {
        const dx = e.clientX - this.dragX, dy = e.clientY - this.dragY;
        this.dragDist += Math.abs(dx) + Math.abs(dy);
        this.look(dx, dy);
        this.dragX = e.clientX; this.dragY = e.clientY;
      }
    });
    dom.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      const locked = document.pointerLockElement === dom;
      this.mouseDown.add(e.button);
      if (locked) {
        if (e.button === 0) { this.tryBreak(); this.breakHold = 0.28; }
        if (e.button === 2) { this.tryPlace(); this.placeHold = 0.28; }
      } else {
        // no pointer lock (e.g. embedded preview): drag = look, short click = act
        this.dragging = true; this.dragX = e.clientX; this.dragY = e.clientY;
        this.dragDist = 0;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (this.enabled && this.dragging && document.pointerLockElement !== dom && this.dragDist < 6) {
        if (e.button === 0) this.tryBreak();
        if (e.button === 2) this.tryPlace();
      }
      this.mouseDown.delete(e.button);
      this.dragging = false;
    });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const k = e.key.toLowerCase();
      if (k === ' ' && !e.repeat) { // double-tap space toggles flight (like creative mode)
        const now = performance.now();
        if (now - (this.lastSpace || 0) < 350) this.toggleFly();
        this.lastSpace = now;
      }
      this.keys.add(k === ' ' ? 'space' : k);
      if (k >= '1' && k <= '9') this.select(+k - 1);
      if (k === 'f' && !e.repeat) this.toggleFly();
      if (k === 'r') this.respawn();
      if (k === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k === ' ' ? 'space' : k);
    });
    dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.select((this.slot + (e.deltaY > 0 ? 1 : 8)) % 9);
    }, { passive: true });
  }

  makeHighlight() {
    const g = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(g);
    const m = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 }));
    m.visible = false;
    return m;
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0023;
    this.pitch -= dy * 0.0023;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.55, 1.55);
  }

  select(i) {
    this.slot = i;
    this.cb.onSelect?.(i);
  }

  toggleFly() {
    this.fly = !this.fly;
    if (this.fly) { this.vel.y = 5; this.onGround = false; } // visible lift-off hop
    else this.vel.y = 0;
    this.cb.onFlyToggle?.(this.fly);
  }

  respawn() {
    this.pos.set(84.5, this.world.heightAt(84, 155) + 0.2, 155.5);
    this.vel.set(0, 0, 0);
    this.yaw = 0; this.pitch = 0;
  }

  eyePos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z);
  }

  lookDir() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
  }

  targetBlock() {
    return this.world.raycast(this.eyePos(), this.lookDir(), 6);
  }

  tryBreak() {
    const hit = this.targetBlock();
    if (!hit) return;
    if (hit.y <= 8) return; // keep the foundation
    const id = hit.id;
    this.world.set(hit.x, hit.y, hit.z, 0);
    this.world.rebuildAt(hit.x, hit.z);
    this.cb.onBreak?.(hit.x, hit.y, hit.z, id);
  }

  tryPlace() {
    const hit = this.targetBlock();
    if (!hit) return;
    const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
    if (!this.world.inBounds(x, y, z)) return;
    const cur = this.world.get(x, y, z);
    if (cur !== 0 && cur !== 14) return;
    // don't place inside the player
    const px = this.pos.x, py = this.pos.y, pz = this.pos.z;
    if (x + 1 > px - HALF_W && x < px + HALF_W &&
        y + 1 > py && y < py + HEIGHT &&
        z + 1 > pz - HALF_W && z < pz + HALF_W) return;
    if (this.cb.canPlaceAt && !this.cb.canPlaceAt(x, y, z)) return;
    const id = HOTBAR[this.slot];
    this.world.set(x, y, z, id);
    this.world.rebuildAt(x, z);
    this.cb.onPlace?.(x, y, z, id);
  }

  update(dt) {
    if (!this.enabled) return;

    // held buttons repeat (only with pointer lock; unlocked drags are camera moves)
    if (document.pointerLockElement === this.dom) {
      if (this.mouseDown.has(0)) { this.breakHold -= dt; if (this.breakHold <= 0) { this.tryBreak(); this.breakHold = 0.26; } }
      if (this.mouseDown.has(2)) { this.placeHold -= dt; if (this.placeHold <= 0) { this.tryPlace(); this.placeHold = 0.26; } }
    }

    const k = this.keys;
    const sprint = k.has('shift') && !this.fly;
    const speed = this.fly ? FLY : (sprint ? SPRINT : WALK);
    let fwd = 0, str = 0;
    if (k.has('w') || k.has('arrowup')) fwd += 1;
    if (k.has('s') || k.has('arrowdown')) fwd -= 1;
    if (k.has('a') || k.has('arrowleft')) str -= 1;
    if (k.has('d') || k.has('arrowright')) str += 1;
    const len = Math.hypot(fwd, str) || 1;
    fwd /= len; str /= len;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const vx = (-sin * fwd + cos * str) * speed;
    const vz = (-cos * fwd - sin * str) * speed;
    const smooth = Math.min(1, dt * 14);
    this.vel.x += (vx - this.vel.x) * smooth;
    this.vel.z += (vz - this.vel.z) * smooth;

    const headIn = this.world.get(Math.floor(this.pos.x), Math.floor(this.pos.y + 1.2), Math.floor(this.pos.z));
    const inWater = headIn === 14;

    if (this.fly) {
      let vy = 0;
      if (k.has('space')) vy += FLY;
      if (k.has('shift')) vy -= FLY;
      this.vel.y += (vy - this.vel.y) * smooth;
    } else if (inWater) {
      this.vel.y += (k.has('space') ? 3.5 : -1.8 - this.vel.y) * Math.min(1, dt * 6);
    } else {
      this.vel.y -= GRAV * dt;
      if (this.vel.y < -38) this.vel.y = -38;
      if (k.has('space') && this.onGround) this.vel.y = JUMP_V;
    }

    const delta = this.vel.clone().multiplyScalar(dt);
    const res = this.world.moveAABB(this.pos, delta, HALF_W, HEIGHT);
    this.onGround = res.onGround;
    if (res.hitY && this.vel.y > 0) this.vel.y = 0;
    if (res.onGround) this.vel.y = Math.max(0, this.vel.y);

    if (this.pos.y < -10) this.respawn();

    // camera
    this.camera.position.copy(this.eyePos());
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    // highlight
    const hit = this.targetBlock();
    if (hit) {
      this.highlight.visible = true;
      this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    } else {
      this.highlight.visible = false;
    }
  }
}
