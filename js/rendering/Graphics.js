import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { QUALITY } from '../config.js';

export class Graphics {
    constructor(mount, settings, onContextLost) {
        this.mount = mount;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.canvas = this.renderer.domElement;
        this.canvas.tabIndex = 0;
        this.canvas.setAttribute(
            'aria-label',
            'Game canvas. Use arrow keys or WASD to move, Space to pulse, Escape to pause.'
        );
        this.canvas.setAttribute('aria-describedby', 'stage-controls');

        this.abort = new AbortController();
        this.canvas.addEventListener(
            'webglcontextlost',
            event => {
                event.preventDefault();
                onContextLost();
            },
            { signal: this.abort.signal }
        );

        mount.append(this.canvas);

        try {
            this.configure(settings);
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    configure(settings) {
        this.settings = settings;
        const preset = QUALITY[settings.quality];

        this.renderer.setPixelRatio(
            Math.min(globalThis.devicePixelRatio || 1, preset.pixelRatio)
        );

        const enableBloom = preset.bloom && settings.bloom;

        if (enableBloom && !this.composer) {
            this.composer = new EffectComposer(this.renderer);

            this.scenePass = new RenderPass(new THREE.Scene(), new THREE.Camera());

            this.bloomPass = new UnrealBloomPass(
                new THREE.Vector2(1, 1),
                0.7,
                0.45,
                0.8
            );
            this.outputPass = new OutputPass();

            this.composer.addPass(this.scenePass);
            this.composer.addPass(this.bloomPass);
            this.composer.addPass(this.outputPass);
        } else if (!enableBloom) {
            this.disposeComposer();
        }

        this.resize();
    }

    resize() {
        const width = Math.max(1, Math.round(this.mount.clientWidth));
        const height = Math.max(1, Math.round(this.mount.clientHeight));
        const pixelRatio = this.renderer.getPixelRatio();

        const dimensionsChanged =
            this.lastWidth !== width ||
            this.lastHeight !== height ||
            this.lastPixelRatio !== pixelRatio;

        const composerChanged = this.lastSizedComposer !== this.composer;

        if (dimensionsChanged) {
            this.renderer.setSize(width, height, false);
        }

        if (this.composer && (dimensionsChanged || composerChanged)) {
            this.composer.setPixelRatio(pixelRatio);
            this.composer.setSize(width, height);
        }

        this.lastWidth = width;
        this.lastHeight = height;
        this.lastPixelRatio = pixelRatio;
        this.lastSizedComposer = this.composer;

        this.viewport = {
            width,
            height,
            aspect: width / height,
            pixelRatio
        };

        return this.viewport;
    }

    render(scene, camera, dt = 0) {
        if (this.composer) {
            this.scenePass.scene = scene;
            this.scenePass.camera = camera;
            this.composer.render(dt);
        } else {
            this.renderer.render(scene, camera);
        }
    }

    disposeComposer() {
        if (!this.composer) return;

        for (const pass of this.composer.passes) {
            pass.dispose?.();
        }

        this.composer.dispose();
        this.composer = null;
        this.scenePass = this.bloomPass = this.outputPass = null;
    }

    dispose() {
        this.abort.abort();
        this.disposeComposer();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.canvas.remove();
    }
}