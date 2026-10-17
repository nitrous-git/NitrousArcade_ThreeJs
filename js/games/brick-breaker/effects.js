import * as THREE from 'three';
import { particleVertex, particleFragment } from './shaders/arena.js';

/** Fixed-size effect pools. Effects never participate in simulation. */
export class Effects {
  constructor(scene, scope) {
    this.scene = scene; this.cursor = 0; this.capacity = 1000;
    this.data = Array.from({ length: this.capacity }, () => ({ life: 0 }));
    this.positions = new Float32Array(this.capacity * 3);
    this.colors = new Float32Array(this.capacity * 3);
    this.sizes = new Float32Array(this.capacity); this.alphas = new Float32Array(this.capacity);
    const geometry = scope.track(new THREE.BufferGeometry());
    for (const [name, values, size] of [['position', this.positions, 3], ['tint', this.colors, 3], ['size', this.sizes, 1], ['opacity', this.alphas, 1]]) {
      geometry.setAttribute(name, new THREE.BufferAttribute(values, size).setUsage(THREE.DynamicDrawUsage));
    }
    this.material = scope.track(new THREE.ShaderMaterial({ vertexShader: particleVertex, fragmentShader: particleFragment,
      uniforms: { uScale: { value: 30 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points = new THREE.Points(geometry, this.material); this.points.frustumCulled = false; scene.add(this.points);
    const ring = scope.track(new THREE.RingGeometry(0.94, 1, 64));
    this.rings = Array.from({ length: 18 }, () => {
      const mat = scope.track(new THREE.MeshBasicMaterial({ color: '#ffa852', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      const mesh = new THREE.Mesh(ring, mat); mesh.visible = false; scene.add(mesh);
      return { mesh, age: 10, duration: 0.6, radius: 1 };
    });
    this.ringCursor = 0;
  }
  reset() {
    this.data.forEach(p => { p.life = 0; }); this.alphas.fill(0);
    this.rings.forEach(r => { r.age = 10; r.mesh.visible = false; });
    this.points.geometry.attributes.opacity.needsUpdate = true;
  }
  particle(x, y, color, { vx = 0, vy = 0, life = 0.4, size = 0.3, z = 0.8, gravity = 0 } = {}) {
    const i = this.cursor++ % this.capacity;
    const p = this.data[i]; Object.assign(p, { x, y, z, vx, vy, life, max: life, size, gravity });
    const c = new THREE.Color(color);
    this.colors.set([c.r, c.g, c.b], i * 3);
  }
  burst(x, y, color, count = 18, force = 4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, speed = (0.2 + Math.random()) * force;
      this.particle(x, y, color, { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0.25 + Math.random() * 0.55, size: 0.14 + Math.random() * 0.3, gravity: 3 });
    }
  }
  ring(x, y, color, radius = 2) {
    const r = this.rings[this.ringCursor++ % this.rings.length];
    r.age = 0; r.radius = radius; r.mesh.position.set(x, y, 0.85); r.mesh.material.color.set(color); r.mesh.visible = true;
  }
  update(dt, scale, reduced) {
    this.material.uniforms.uScale.value = scale;
    for (let i = 0; i < this.capacity; i++) {
      const p = this.data[i];
      if (p.life <= 0) { this.alphas[i] = 0; continue; }
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= p.gravity * dt;
      this.positions.set([p.x, p.y, p.z], i * 3);
      const f = Math.max(0, p.life / p.max);
      this.sizes[i] = p.size * (0.4 + 0.6 * f); this.alphas[i] = f * (reduced ? 0.45 : 0.9);
    }
    for (const attribute of Object.values(this.points.geometry.attributes)) attribute.needsUpdate = true;
    for (const r of this.rings) {
      r.age += dt;
      const t = r.age / r.duration;
      r.mesh.visible = t < 1 && !reduced;
      if (t < 1) { r.mesh.scale.setScalar(Math.max(0.01, r.radius * (0.15 + 0.85 * t))); r.mesh.material.opacity = (1 - t) * 0.65; }
    }
  }
}
