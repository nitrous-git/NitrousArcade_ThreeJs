import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../../rendering/shaders/grid.js';

/** Integration sandbox, deliberately not the first arcade game. */
export function createGame() {
  let ctx, scene, camera, prism, halo, grid, particles;
  let elapsed = 0, count = 0, pulseAge = 10, cooldown = 0;
  let aspect = 1;
  const position = new THREE.Vector2();
  const previous = new THREE.Vector2();
  const target = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  function pulse() {
    if (cooldown > 0) return;
    cooldown = 0.18; pulseAge = 0; count++;
    grid.material.uniforms.uPulseOrigin.value.copy(position);
    ctx.setHud({ score: count });
    ctx.audio.tone(240 + (count % 8) * 40, 0.18);
  }
  return {
    init(context) {
      ctx = context;
      const own = resource => ctx.scope.track(resource);
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#070d17');
      camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
      camera.position.set(0, 0, 20);
      const material = own(new THREE.ShaderMaterial({
        vertexShader, fragmentShader,
        uniforms: { uTime: { value: 0 }, uPulseAge: { value: 10 }, uPulseOrigin: { value: new THREE.Vector2() } },
      }));
      grid = new THREE.Mesh(own(new THREE.PlaneGeometry(28, 28)), material);
      grid.position.z = -1;
      scene.add(grid);
      prism = new THREE.Mesh(own(new THREE.OctahedronGeometry(0.75)), own(new THREE.MeshStandardMaterial({
        color: '#61ffe0', emissive: '#22a68a', emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.55, flatShading: true,
      })));
      scene.add(prism);
      const edges = new THREE.LineSegments(own(new THREE.EdgesGeometry(prism.geometry)), own(new THREE.LineBasicMaterial({ color: new THREE.Color(0.6, 2, 1.5) })));
      prism.add(edges);
      halo = new THREE.Mesh(own(new THREE.TorusGeometry(1.35, 0.014, 8, 100)), own(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.3, 1.1) })));
      scene.add(halo);
      scene.add(new THREE.AmbientLight('#8aa9ff', 2));
      const key = new THREE.DirectionalLight('#ffffff', 3);
      key.position.set(-3, 5, 8); scene.add(key);
      const positions = new Float32Array(180 * 3);
      for (let i = 0; i < positions.length; i += 3) {
        // Stable distribution makes every launch look consistent.
        positions[i] = Math.sin(i * 127.1) * 11;
        positions[i + 1] = Math.cos(i * 311.7) * 7;
        positions[i + 2] = -0.5;
      }
      const geometry = own(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particles = new THREE.Points(geometry, own(new THREE.PointsMaterial({ color: '#668994', size: 0.025, transparent: true, opacity: 0.65 })));
      scene.add(particles);
    },
    start() {
      elapsed = 0; count = 0; pulseAge = 10; cooldown = 0;
      position.set(0, 0); previous.copy(position);
      ctx.setHud({ score: count });
    },
    fixedUpdate(dt) {
      previous.copy(position);
      elapsed += dt; pulseAge += dt; cooldown = Math.max(0, cooldown - dt);
      const input = ctx.input;
      target.set(input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']), input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']));
      if (target.lengthSq() > 1) target.normalize();
      position.addScaledVector(target, dt * 6);
      if (input.pointer.active) {
        raycaster.setFromCamera(input.pointer, camera);
        if (raycaster.ray.intersectPlane(plane, hit)) {
          position.lerp(target.set(hit.x, hit.y), 1 - Math.exp(-12 * dt));
        }
      }
      const halfY = Math.max(7, 10 / aspect);
      position.x = THREE.MathUtils.clamp(position.x, -halfY * aspect + 1.5, halfY * aspect - 1.5);
      position.y = THREE.MathUtils.clamp(position.y, -halfY + 1.5, halfY - 1.5);
      // Evaluate both inputs so a simultaneous press cannot leak into the next tick.
      const keyboardPulse = input.consume('Space');
      const pointerPulse = input.consume('Pointer');
      if (keyboardPulse || pointerPulse) pulse();
    },
    render(alpha, dt) {
      const reduced = ctx.motionReduced();
      const x = THREE.MathUtils.lerp(previous.x, position.x, alpha);
      const y = THREE.MathUtils.lerp(previous.y, position.y, alpha);
      prism.position.set(x, y, 0);
      prism.rotation.set(reduced ? 0.3 : elapsed * 0.35, reduced ? 0.4 : elapsed * 0.6, 0);
      halo.position.set(x, y, -0.1);
      halo.rotation.set(reduced ? 0 : Math.sin(elapsed * 0.7) * 0.35, 0, 0);
      const scale = reduced ? 1 : 1 + Math.max(0, 1 - pulseAge * 3) * 0.28;
      halo.scale.setScalar(scale);
      grid.material.uniforms.uTime.value = reduced ? 0 : elapsed;
      grid.material.uniforms.uPulseAge.value = reduced ? 10 : pulseAge;
      ctx.graphics.render(scene, camera, dt);
    },
    resize(viewport) {
      aspect = viewport.aspect;
      const halfY = Math.max(7, 10 / aspect);
      camera.left = -halfY * aspect; camera.right = halfY * aspect;
      camera.top = halfY; camera.bottom = -halfY;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    },
    pause() {},
    resume() { previous.copy(position); },
    dispose() { scene?.clear(); },
  };
}
