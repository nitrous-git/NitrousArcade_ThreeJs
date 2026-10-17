import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ResourceScope } from '../../core/ResourceScope.js';
import { CONFIG as C, BRICK_TYPES } from './config.js';
import { POWERUPS } from './powerups.js';
import { Effects } from './effects.js';
import { arenaVertex, arenaFragment } from './shaders/arena.js';

export class BrickBreakerView {
    constructor(ctx) {
        this.ctx = ctx;
        const scope = ctx.scope;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#070d15');

        this.camera = new THREE.OrthographicCamera(-15, 15, 11.8, -11.8, 0.1, 100);
        this.camera.position.set(0, 0, 30);
        this.camera.updateMatrixWorld();

        this.stageScope = new ResourceScope();
        scope.track(() => this.stageScope.dispose());

        this.brickGroup = new THREE.Group();
        this.scene.add(this.brickGroup);

        this.revision = -1;
        this.brickViews = new Map();
        this.shake = 0;
        this.energy = 0;
        this.lastTrailTime = -1;

        this.scene.add(new THREE.HemisphereLight('#c4ecff', '#182a34', 2.2));

        const key = new THREE.DirectionalLight('#ddfff4', 3.1);
        key.position.set(-5, 8, 12);
        this.scene.add(key);

        const rim = new THREE.DirectionalLight('#657de7', 2);
        rim.position.set(9, -5, 3);
        this.scene.add(rim);

        this.ballLight = new THREE.PointLight('#6dffc9', 3.0, 5, 2);
        this.ballLight.position.z = 2;
        this.scene.add(this.ballLight);

        this.floorMaterial = scope.track(new THREE.ShaderMaterial({
            vertexShader: arenaVertex,
            fragmentShader: arenaFragment,
            uniforms: {
                uTime: { value: 0 },
                uEnergy: { value: 0 }
            }
        }));

        const floor = new THREE.Mesh(scope.track(new THREE.PlaneGeometry(22, 20)), this.floorMaterial);
        floor.position.z = -0.35;
        this.scene.add(floor);

        const railMaterial = scope.track(new THREE.MeshStandardMaterial({
            color: '#223e4b',
            metalness: 0.7,
            roughness: 0.34
        }));
        const railGlow = scope.track(new THREE.MeshBasicMaterial({ color: '#448c87' }));
        const railGeometry = scope.track(new RoundedBoxGeometry(0.22, 20.35, 0.4, 2, 0.06));

        for (const x of [-11.18, 11.18]) {
            const rail = new THREE.Mesh(railGeometry, railMaterial);
            rail.position.set(x, 0, 0);
            this.scene.add(rail);

            const glow = new THREE.Mesh(scope.track(new THREE.BoxGeometry(0.025, 19.95, 0.03)), railGlow);
            glow.position.set(x - Math.sign(x) * 0.1, 0, 0.23);
            this.scene.add(glow);
        }

        const top = new THREE.Mesh(scope.track(new RoundedBoxGeometry(22.5, 0.22, 0.4, 2, 0.06)), railMaterial);
        top.position.set(0, 10.18, 0);
        this.scene.add(top);

        const ticks = [];
        for (let y = -9; y <= 9; y++) {
            for (const x of [-11.45, 11.45]) {
                ticks.push(x, y, 0, x + Math.sign(x) * (y % 5 === 0 ? 0.28 : 0.12), y, 0);
            }
        }

        const tickGeo = scope.track(new THREE.BufferGeometry());
        tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
        this.scene.add(new THREE.LineSegments(tickGeo, scope.track(new THREE.LineBasicMaterial({ color: '#314a58' }))));

        this.paddle = new THREE.Group();
        this.scene.add(this.paddle);

        this.paddleMaterial = scope.track(new THREE.MeshStandardMaterial({
            color: '#a4ddda',
            emissive: '#2ea584',
            emissiveIntensity: 0.25,
            metalness: 0.6,
            roughness: 0.22
        }));

        this.paddleBody = new THREE.Mesh(
            scope.track(new RoundedBoxGeometry(1, C.paddleHeight, 0.48, 3, 0.10)),
            this.paddleMaterial
        );
        this.paddle.add(this.paddleBody);

        const strip = new THREE.Mesh(
            scope.track(new THREE.BoxGeometry(0.78, 0.055, 0.015)),
            scope.track(new THREE.MeshBasicMaterial({ color: new THREE.Color('#91f5d4').multiplyScalar(2.2) }))
        );
        strip.position.z = 0.253;
        this.paddle.add(strip);

        const accentGeo = scope.track(new THREE.BoxGeometry(0.035, 0.2, 0.03));
        const accentMat = scope.track(new THREE.MeshBasicMaterial({ color: '#e4fff6' }));
        for (const x of [-0.43, 0.43]) {
            const m = new THREE.Mesh(accentGeo, accentMat);
            m.position.set(x, 0, 0.255);
            this.paddle.add(m);
        }

        this.paddle.position.set(0, C.paddleY, 0.38);

        const ballGeo = scope.track(new THREE.SphereGeometry(C.ballRadius, 16, 12));
        this.ballMaterial = scope.track(new THREE.MeshStandardMaterial({
            color: '#eafff9',
            emissive: '#7fffd0',
            emissiveIntensity: 1.7,
            roughness: 0.12,
            metalness: 0.15
        }));
        this.ballMeshes = Array.from({ length: C.maxBalls }, () => {
            const mesh = new THREE.Mesh(ballGeo, this.ballMaterial);
            mesh.visible = false;
            this.scene.add(mesh);
            return mesh;
        });

        this.dropGeometry = scope.track(new RoundedBoxGeometry(0.86, 0.52, 0.28, 3, 0.1));
        this.dropResources = {};

        for (const [kind, power] of Object.entries(POWERUPS)) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 80;

            const context = canvas.getContext('2d');
            context.fillStyle = '#101c25';
            context.fillRect(0, 0, 128, 80);
            context.strokeStyle = power.color;
            context.lineWidth = 6;
            context.strokeRect(4, 4, 120, 72);
            context.fillStyle = power.color;
            context.font = 'bold 42px monospace';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(power.code, 64, 42);

            const texture = scope.track(new THREE.CanvasTexture(canvas));
            texture.colorSpace = THREE.SRGBColorSpace;

            this.dropResources[kind] = {
                material: scope.track(new THREE.MeshStandardMaterial({
                    color: power.color,
                    emissive: power.color,
                    emissiveIntensity: 0.35,
                    metalness: 0.5,
                    roughness: 0.25
                })),
                face: scope.track(new THREE.MeshBasicMaterial({ map: texture })),
            };
        }

        this.dropFaceGeometry = scope.track(new THREE.PlaneGeometry(0.82, 0.49));
        this.dropMeshes = new Map();

        this.netMaterial = scope.track(new THREE.MeshBasicMaterial({
            color: '#72f6c8',
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        this.net = new THREE.Mesh(scope.track(new THREE.PlaneGeometry(21.8, 0.06)), this.netMaterial);
        this.net.position.set(0, -9.72, 0.5);
        this.net.visible = false;
        this.scene.add(this.net);

        this.aimGeometry = scope.track(new THREE.BufferGeometry());
        this.aimGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
        this.aim = new THREE.Line(
            this.aimGeometry,
            scope.track(new THREE.LineDashedMaterial({
                color: '#73b8a5',
                dashSize: 0.16,
                gapSize: 0.22,
                transparent: true,
                opacity: 0.45
            }))
        );
        this.scene.add(this.aim);

        this.effects = new Effects(this.scene, scope);
    }

    buildBricks(model) {
        this.stageScope.dispose();
        this.stageScope = new ResourceScope();
        this.brickGroup.clear();
        this.brickViews.clear();

        const scope = this.stageScope;

        for (const brick of model.bricks) {
            const shape = new THREE.Shape();
            brick.vertices.forEach((v, i) =>
                i
                    ? shape.lineTo(v.x - brick.x, v.y - brick.y)
                    : shape.moveTo(v.x - brick.x, v.y - brick.y)
            );
            shape.closePath();

            const geometry = scope.track(new THREE.ExtrudeGeometry(shape, {
                depth: 0.30,
                bevelEnabled: true,
                bevelSegments: 2,
                steps: 1,
                bevelSize: 0.045,
                bevelThickness: 0.055,
                curveSegments: 1
            }));

            const color = BRICK_TYPES[brick.type].color;
            const material = scope.track(new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.16,
                metalness: 0.52,
                roughness: 0.29
            }));

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(brick.x, brick.y, 0.12);
            this.brickGroup.add(mesh);

            const linePoints = brick.vertices.map(v =>
                new THREE.Vector3((v.x - brick.x) * 0.83, (v.y - brick.y) * 0.75, 0.36)
            );
            linePoints.push(linePoints[0]);

            const insetGeo = scope.track(new THREE.BufferGeometry().setFromPoints(linePoints));
            const inset = new THREE.Line(
                insetGeo,
                scope.track(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 }))
            );
            mesh.add(inset);

            const pips = [];
            if (brick.type === 'armored' || brick.type === 'prism') {
                const pipGeo = scope.track(new THREE.CircleGeometry(0.045, 8));
                const pipMat = scope.track(new THREE.MeshBasicMaterial({ color: '#f5f5ff' }));
                for (let i = 0; i < brick.maxHp; i++) {
                    const pip = new THREE.Mesh(pipGeo, pipMat);
                    pip.position.set((i - (brick.maxHp - 1) / 2) * 0.16, 0, 0.37);
                    mesh.add(pip);
                    pips.push(pip);
                }
            }

            if (brick.type === 'explosive') {
                const warning = new THREE.Mesh(
                    scope.track(new THREE.RingGeometry(0.07, 0.11, 4)),
                    scope.track(new THREE.MeshBasicMaterial({ color: '#fff0bb' }))
                );
                warning.position.z = 0.38;
                mesh.add(warning);
            }

            this.brickViews.set(brick.id, { mesh, material, pips, flash: 0 });
        }

        this.revision = model.revision;
    }

    handle(events, model) {
        if (model.revision !== this.revision) this.buildBricks(model);

        const reduced = this.ctx.motionReduced();
        const low = this.ctx.settings.snapshot.quality === 'low';

        for (const event of events) {
            if (event.type === 'damage') {
                const v = this.brickViews.get(event.id);
                if (v) v.flash = 1;
            }

            if (event.type === 'destroy') {
                this.effects.burst(event.x, event.y, event.color, reduced ? 3 : low ? 8 : 17);
            }

            if (event.type === 'explosion') {
                this.effects.burst(event.x, event.y, '#ffac60', reduced ? 4 : low ? 15 : 38, 6);
                this.effects.ring(event.x, event.y, '#ffad65', event.radius);
                this.shake = reduced ? 0 : 0.12;
                this.energy = 1;
            }

            if (event.type === 'charge') {
                this.effects.ring(event.x, event.y, '#acb8ff', event.radius);
                this.effects.burst(event.x, event.y, '#afb9ff', reduced ? 2 : 9, 5);
            }

            if (event.type === 'paddle') {
                this.effects.burst(event.x, event.y, '#9dffe0', reduced ? 2 : 8, 2);
                this.energy = 0.35;
            }

            if (event.type === 'wall' && !reduced) {
                this.effects.burst(event.x, event.y, '#81dacc', 3, 1.5);
            }

            if (event.type === 'powerup') {
                this.effects.ring(model.paddle.x, C.paddleY, POWERUPS[event.kind].color, 2.6);
                this.effects.burst(model.paddle.x, C.paddleY, POWERUPS[event.kind].color, reduced ? 3 : 22);
            }

            if (event.type === 'rescue') {
                this.effects.burst(0, -9.6, '#9dffe0', reduced ? 5 : 45, 6);
                this.effects.ring(0, -9.6, '#9dffe0', 8);
            }

            if (event.type === 'stage') this.effects.reset();
        }
    }

    reset(model) {
        this.effects.reset();
        this.shake = 0;
        this.energy = 0;
        this.lastTrailTime = -1;
        this.buildBricks(model);

        for (const mesh of this.dropMeshes.values()) this.scene.remove(mesh);
        this.dropMeshes.clear();
    }

    resize({ aspect, height, pixelRatio }) {
        const halfHeight = Math.max(11.8, 12.2 / aspect);

        this.camera.left = -halfHeight * aspect;
        this.camera.right = halfHeight * aspect;
        this.camera.top = halfHeight;
        this.camera.bottom = -halfHeight;
        this.camera.updateProjectionMatrix();

        this.scale = height * pixelRatio / (halfHeight * 2);
    }

    pointerX(normalizedX) {
        return normalizedX * this.camera.right;
    }

    render(model, alpha, dt) {
        if (this.revision !== model.revision) this.buildBricks(model);

        const reduced = this.ctx.motionReduced();

        this.energy = Math.max(0, this.energy - dt * 2);
        this.shake = Math.max(0, this.shake - dt);

        this.camera.position.x = !reduced && this.shake ? Math.sin(model.time * 170) * this.shake * 0.35 : 0;
        this.camera.position.y = !reduced && this.shake ? Math.cos(model.time * 150) * this.shake * 0.35 : 0;

        this.floorMaterial.uniforms.uTime.value = reduced ? 0 : model.time;
        this.floorMaterial.uniforms.uEnergy.value = reduced ? 0 : this.energy;

        this.paddle.position.x = THREE.MathUtils.lerp(model.paddle.previousX, model.paddle.x, alpha);
        this.paddle.scale.x = model.paddle.width;
        this.paddleMaterial.emissive.set(model.effects.magnet > 0 ? '#b866c9' : '#2ea584');

        const ballColor = model.effects.fire > 0 ? '#ffaf68' : model.effects.charge > 0 ? '#b1baff' : '#96ffe0';
        this.ballMaterial.emissive.set(ballColor);

        const emitTrail = model.time !== this.lastTrailTime && model.status === 'playing';

        for (let i = 0; i < this.ballMeshes.length; i++) {
            const mesh = this.ballMeshes[i];
            const ball = model.balls[i];

            mesh.visible = !!ball && model.status !== 'clearing';
            if (!ball) continue;

            mesh.position.set(
                THREE.MathUtils.lerp(ball.px, ball.x, alpha),
                THREE.MathUtils.lerp(ball.py, ball.y, alpha),
                0.7
            );

            if (emitTrail && !ball.attached) {
                const fire = model.effects.fire > 0;
                this.effects.particle(mesh.position.x, mesh.position.y, ballColor, {
                    life: reduced ? 0.1 : fire ? 0.43 : 0.25,
                    size: fire ? 0.67 : 0.43,
                    z: 0.68
                });

                if (fire && !reduced) {
                    this.effects.particle(mesh.position.x, mesh.position.y, '#ffce7d', {
                        life: 0.3,
                        size: 0.16,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3
                    });
                }
            }
        }

        this.lastTrailTime = model.time;

        const lead = model.balls[0];
        this.ballLight.visible = !!lead;
        if (lead) {
            this.ballLight.position.set(lead.x, lead.y, 1.7);
            this.ballLight.color.set(ballColor);
        }

        for (const brick of model.bricks) {
            const v = this.brickViews.get(brick.id);
            v.mesh.visible = brick.alive;
            if (!brick.alive) continue;

            v.flash = Math.max(0, v.flash - dt * 5);
            v.material.emissiveIntensity =
                0.14 +
                v.flash * 1.8 +
                (!reduced && brick.type === 'explosive'
                    ? (0.5 + Math.sin(model.time * 2.8 + brick.id) * 0.5) * 0.20
                    : 0);
            v.material.color.set(BRICK_TYPES[brick.type].color).multiplyScalar(0.65 + 0.35 * brick.hp / brick.maxHp);
            v.pips.forEach((pip, i) => {
                pip.visible = i < brick.hp;
            });
        }

        const aliveDrops = new Set(model.drops.map(d => d.id));
        for (const [id, mesh] of this.dropMeshes) {
            if (!aliveDrops.has(id)) {
                this.scene.remove(mesh);
                this.dropMeshes.delete(id);
            }
        }

        for (const drop of model.drops) {
            let mesh = this.dropMeshes.get(drop.id);

            if (!mesh) {
                mesh = new THREE.Mesh(this.dropGeometry, this.dropResources[drop.kind].material);

                const face = new THREE.Mesh(this.dropFaceGeometry, this.dropResources[drop.kind].face);
                face.position.z = 0.151;
                mesh.add(face);

                this.scene.add(mesh);
                this.dropMeshes.set(drop.id, mesh);
            }

            mesh.position.set(drop.x, drop.y, 0.75);
            mesh.rotation.z = reduced ? 0 : Math.sin(model.time * 2.4 + drop.id) * 0.12;
        }

        this.net.visible = model.safety;
        this.netMaterial.opacity = reduced ? 0.6 : 0.48 + Math.sin(model.time * 4) * 0.14;

        const attached = model.balls.find(b => b.attached);
        this.aim.visible = !!attached && model.status !== 'clearing';

        if (attached) {
            const a = attached.attachOffset / (model.paddle.width / 2) * 0.7 || 0.20;
            this.aimGeometry.attributes.position.array.set([
                attached.x,
                attached.y + 0.4,
                0.5,
                attached.x + Math.sin(a) * 2.8,
                attached.y + Math.cos(a) * 2.8,
                0.5
            ]);
            this.aimGeometry.attributes.position.needsUpdate = true;
            this.aim.computeLineDistances();
        }

        this.effects.update(dt, this.scale || 30, reduced);
        this.ctx.graphics.render(this.scene, this.camera, dt);
    }

    dispose() {
        this.stageScope.dispose();
        this.scene.clear();
    }
}