import * as THREE from 'three';

/** Copy this folder, rename it, and add a lazy loader in games/registry.js. */
export function createGame() {
  let ctx, scene, camera;
  // Keep rules and collision code in a sibling model.js as the game grows.
  return {
    async init(context) {
      ctx = context;
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#090d14');
      camera = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 100);
      camera.position.z = 20;
      // Example ownership:
      // const geometry = ctx.scope.track(new THREE.BoxGeometry(1, 1, 1));
      // const material = ctx.scope.track(new THREE.MeshBasicMaterial({ color: '#91f5d4' }));
      // scene.add(new THREE.Mesh(geometry, material));
      // Pass ctx.signal to fetch(). Check it after other asynchronous loads.
    },
    start() {
      // Reset the existing scene and model. Called once on launch and on restart.
      ctx.setHud({ score: 0 });
    },
    fixedUpdate(dt) {
      // dt is seconds, always 1/60. Never create a separate animation loop here.
      // const move = ctx.input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      // model.update(dt, move);
      // if (model.over) ctx.finish(model.score);
    },
    render(alpha, dt) {
      // alpha is simulation interpolation [0,1); dt is the render frame delta.
      ctx.graphics.render(scene, camera, dt);
    },
    resize({ aspect }) {
      // Fit a 20 x 15 logical playfield without cutting off its edges.
      const halfHeight = Math.max(7.5, 10 / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    },
    pause() {},
    resume() {},
    dispose() {
      scene?.clear();
      // The host disposes ctx.scope after this hook. Do not dispose shared services.
    },
  };
}
