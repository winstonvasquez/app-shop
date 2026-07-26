import { Component, ChangeDetectionStrategy, ElementRef, OnDestroy, ViewChild, afterNextRender, signal } from '@angular/core';

interface Meteor {
    mesh: import('three').Mesh;
    dirX: number;
    dirY: number;
    speed: number;
    baseOpacity: number;
}

interface FlamePulse {
    mesh: import('three').Mesh;
    material: import('three').MeshBasicMaterial;
    phase: number;
    speed: number;
}

@Component({
    selector: 'app-hero-3d-scene',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <canvas #canvas class="scene-canvas" [class.scene-canvas--ready]="ready()"></canvas>
    @if (!ready() && !failed()) {
      <div class="scene-fallback animate-float" aria-hidden="true">
        <svg viewBox="0 0 200 200" class="rocket-svg">
          <defs>
            <linearGradient id="fallbackBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="100%" stop-color="#4f46e5" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="70" fill="#a855f7" opacity="0.12" />
          <g transform="rotate(45, 100, 100)">
            <path d="M 85,80 C 85,50 100,28 100,28 C 100,28 115,50 115,80 L 115,130 L 85,130 Z" fill="url(#fallbackBody)" />
            <circle cx="100" cy="72" r="8" fill="#0f172a" stroke="#818cf8" stroke-width="1.5" />
          </g>
        </svg>
      </div>
    }
    `,
    styles: [`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 280px;
        position: relative;
      }

      .scene-canvas {
        display: block;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.6s ease;
        cursor: grab;
      }

      .scene-canvas--ready {
        opacity: 1;
      }

      .scene-fallback {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .rocket-svg {
        width: 70%;
        height: auto;
      }
    `]
})
export class Hero3dSceneComponent implements OnDestroy {
    @ViewChild('canvas', { static: true }) private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

    readonly ready = signal(false);
    readonly failed = signal(false);

    private renderer: import('three').WebGLRenderer | null = null;
    private scene: import('three').Scene | null = null;
    private camera: import('three').PerspectiveCamera | null = null;
    private rocket: import('three').Group | null = null;
    private flameCore: import('three').Mesh | null = null;
    private flameOuter: import('three').Mesh | null = null;
    private flamePulses: FlamePulse[] = [];
    private windowGlass: import('three').Mesh | null = null;
    private embers: import('three').Points | null = null;
    private emberVelocities: Float32Array | null = null;
    private stars: import('three').Points | null = null;
    private meteorGroup: import('three').Group | null = null;
    private meteors: Meteor[] = [];
    private meteorTexture: import('three').CanvasTexture | null = null;
    private clock: import('three').Clock | null = null;
    private elapsed = 0;

    private rafId: number | null = null;
    private intersectionObserver: IntersectionObserver | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private isVisible = false;
    private isInViewport = false;
    private pointerX = 0;
    private pointerY = 0;
    private readonly reducedMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    private readonly onPointerMove = (event: PointerEvent) => {
        const canvas = this.canvasRef.nativeElement;
        const rect = canvas.getBoundingClientRect();
        this.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };

    private readonly onVisibilityChange = () => {
        this.isVisible = document.visibilityState === 'visible';
        this.syncLoop();
    };

    constructor() {
        afterNextRender(() => this.init());
    }

    ngOnDestroy(): void {
        this.rafId !== null && cancelAnimationFrame(this.rafId);
        this.intersectionObserver?.disconnect();
        this.resizeObserver?.disconnect();
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.canvasRef?.nativeElement.removeEventListener('pointermove', this.onPointerMove);

        this.rocket?.traverse((obj) => {
            const mesh = obj as import('three').Mesh;
            mesh.geometry?.dispose?.();
            const material = mesh.material as import('three').Material | import('three').Material[] | undefined;
            if (Array.isArray(material)) material.forEach((m) => m.dispose());
            else material?.dispose();
        });
        this.embers?.geometry.dispose();
        (this.embers?.material as import('three').Material | undefined)?.dispose();
        this.stars?.geometry.dispose();
        (this.stars?.material as import('three').Material | undefined)?.dispose();
        this.meteorGroup?.traverse((obj) => {
            const mesh = obj as import('three').Mesh;
            mesh.geometry?.dispose?.();
            (mesh.material as import('three').Material | undefined)?.dispose?.();
        });
        this.meteorTexture?.dispose();
        this.renderer?.dispose();
    }

    private async init(): Promise<void> {
        try {
            const THREE = await import('three');
            const canvas = this.canvasRef.nativeElement;
            const container = canvas.parentElement!;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
            camera.position.z = 6.5;

            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const stars = this.buildStars(THREE);
            scene.add(stars);

            const meteorGroup = this.buildMeteorShower(THREE);
            scene.add(meteorGroup);

            const rocket = this.buildRocket(THREE);
            scene.add(rocket);

            scene.add(new THREE.AmbientLight(0x818cf8, 0.5));
            const keyLight = new THREE.PointLight(0xa5b4fc, 9, 20);
            keyLight.position.set(3, 3, 4);
            scene.add(keyLight);
            const rimLight = new THREE.PointLight(0x06b6d4, 6, 20);
            rimLight.position.set(-3, -2, -3);
            scene.add(rimLight);
            const engineGlow = new THREE.PointLight(0x38bdf8, 7, 6);
            engineGlow.position.set(0, -1.6, 0.3);
            rocket.add(engineGlow);

            this.scene = scene;
            this.camera = camera;
            this.renderer = renderer;
            this.rocket = rocket;
            this.stars = stars;
            this.meteorGroup = meteorGroup;
            this.clock = new THREE.Clock();

            this.resize(container);
            this.resizeObserver = new ResizeObserver(() => this.resize(container));
            this.resizeObserver.observe(container);

            canvas.addEventListener('pointermove', this.onPointerMove, { passive: true });
            document.addEventListener('visibilitychange', this.onVisibilityChange);
            this.isVisible = document.visibilityState === 'visible';

            this.intersectionObserver = new IntersectionObserver((entries) => {
                this.isInViewport = entries[0]?.isIntersecting ?? false;
                this.syncLoop();
            }, { threshold: 0.05 });
            this.intersectionObserver.observe(container);

            this.ready.set(true);

            if (this.reducedMotion) {
                this.renderer.render(this.scene, this.camera);
                return;
            }

            this.isInViewport = true;
            this.syncLoop();
        } catch {
            this.failed.set(true);
        }
    }

    /** Cohete futurista: casco iridiscente + franjas neón + aletas tipo hoja + motor de iones pulsante. */
    private buildRocket(THREE: typeof import('three')): import('three').Group {
        const rocket = new THREE.Group();

        const hullMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x111827,
            metalness: 0.9,
            roughness: 0.18,
            clearcoat: 1,
            clearcoatRoughness: 0.12,
            iridescence: 0.85,
            iridescenceIOR: 1.3,
            iridescenceThicknessRange: [120, 420],
        });
        const neonMaterial = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
        const finMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1120, metalness: 0.85, roughness: 0.3, emissive: 0x0ea5e9, emissiveIntensity: 0.18 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 2.1, 32), hullMaterial);
        body.position.y = 0.1;
        rocket.add(body);

        // Franjas neón (líneas de energía en vez de bandas de pintura clásicas)
        for (const y of [0.6, 0.1, -0.4]) {
            const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.035, 32), neonMaterial);
            stripe.position.y = y;
            rocket.add(stripe);
        }

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.0, 32), hullMaterial);
        nose.position.y = 1.65;
        rocket.add(nose);

        const noseTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 16), neonMaterial);
        noseTip.position.y = 2.26;
        rocket.add(noseTip);

        // Ventana: visor tipo HUD con anillo de sensor pulsante
        const windowFrame = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 12, 24), neonMaterial);
        windowFrame.position.set(0, 0.65, 0.42);
        windowFrame.rotation.x = Math.PI / 2.3;
        rocket.add(windowFrame);
        const windowGlass = new THREE.Mesh(
            new THREE.CircleGeometry(0.18, 24),
            new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x67e8f9, emissiveIntensity: 1.1 }),
        );
        windowGlass.position.set(0, 0.65, 0.47);
        rocket.add(windowGlass);
        this.windowGlass = windowGlass;

        // Aletas: perfil de hoja delgada, con filo de energía
        const finGeometry = new THREE.ConeGeometry(0.4, 0.78, 3);
        for (const side of [-1, 1]) {
            const fin = new THREE.Mesh(finGeometry, finMaterial);
            fin.scale.set(0.5, 1, 0.12);
            fin.position.set(side * 0.6, -0.85, 0);
            fin.rotation.z = side * 0.5;
            fin.rotation.y = Math.PI / 2;
            rocket.add(fin);

            const finEdge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), neonMaterial);
            finEdge.position.set(side * 0.92, -0.85, 0);
            finEdge.rotation.z = side * 0.5;
            rocket.add(finEdge);
        }

        // Tobera del motor de iones
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.35, 24), finMaterial);
        nozzle.position.y = -1.35;
        rocket.add(nozzle);
        const nozzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 24), neonMaterial);
        nozzleRing.position.y = -1.52;
        rocket.add(nozzleRing);

        // Llama de iones: núcleo blanco-cian + envoltura violeta eléctrica, ambas con apex hacia -Y
        const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xe0faff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
        const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.9, 16, 1, true), flameCoreMat);
        flameCore.rotation.x = Math.PI;
        flameCore.position.y = -1.95;
        rocket.add(flameCore);

        const flameOuterMat = new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
        const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.6, 16, 1, true), flameOuterMat);
        flameOuter.rotation.x = Math.PI;
        flameOuter.position.y = -1.95;
        rocket.add(flameOuter);

        this.flameCore = flameCore;
        this.flameOuter = flameOuter;

        // Anillos de energía que viajan por la llama, como pulsos de un motor de iones
        this.flamePulses = [0, 1, 2].map((i) => {
            const material = new THREE.MeshBasicMaterial({ color: 0xbaf3ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
            const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 20), material);
            mesh.rotation.x = Math.PI / 2;
            rocket.add(mesh);
            return { mesh, material, phase: i / 3, speed: 0.55 };
        });

        const emberGeometry = new THREE.BufferGeometry();
        const emberCount = 40;
        const emberPositions = new Float32Array(emberCount * 3);
        const emberVelocities = new Float32Array(emberCount * 3);
        for (let i = 0; i < emberCount; i++) {
            emberPositions[i * 3] = (Math.random() - 0.5) * 0.25;
            emberPositions[i * 3 + 1] = -1.6 - Math.random() * 1.6;
            emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
            emberVelocities[i * 3] = (Math.random() - 0.5) * 0.01;
            emberVelocities[i * 3 + 1] = -0.02 - Math.random() * 0.03;
            emberVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
        }
        emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
        const emberMaterial = new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.05, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
        const embers = new THREE.Points(emberGeometry, emberMaterial);
        rocket.add(embers);
        this.embers = embers;
        this.emberVelocities = emberVelocities;

        // Cohete "volando" en diagonal, igual que la ilustración original
        rocket.rotation.z = -Math.PI / 4;
        rocket.scale.setScalar(0.85);

        return rocket;
    }

    private buildStars(THREE: typeof import('three')): import('three').Points {
        const particleCount = 180;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 12;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.55 });
        return new THREE.Points(geometry, material);
    }

    /** Textura de estela (cabeza brillante → cola transparente) reutilizada por todos los meteoritos. */
    private createStreakTexture(THREE: typeof import('three')): import('three').CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 16;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createLinearGradient(0, 0, 128, 0);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.55, 'rgba(190,225,255,0.35)');
        gradient.addColorStop(0.88, 'rgba(220,240,255,0.85)');
        gradient.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 16);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /** Lluvia de meteoritos: estelas diagonales con cabeza brillante que caen y se reciclan sin patrón repetitivo. */
    private buildMeteorShower(THREE: typeof import('three')): import('three').Group {
        const group = new THREE.Group();
        const texture = this.createStreakTexture(THREE);
        this.meteorTexture = texture;

        const dirAngle = -1.05; // radianes: caída diagonal descendente hacia la izquierda
        const dirX = Math.cos(dirAngle);
        const dirY = Math.sin(dirAngle);

        const meteorCount = 22;
        for (let i = 0; i < meteorCount; i++) {
            const length = 0.7 + Math.random() * 1.6;
            const thickness = 0.018 + Math.random() * 0.03;
            const baseOpacity = 0.45 + Math.random() * 0.5;

            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: baseOpacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(length, thickness), material);
            mesh.rotation.z = dirAngle;
            this.resetMeteor(mesh, dirX, dirY, true);
            group.add(mesh);

            this.meteors.push({ mesh, dirX, dirY, speed: 4 + Math.random() * 6, baseOpacity });
        }

        return group;
    }

    private resetMeteor(mesh: import('three').Mesh, dirX: number, dirY: number, initial: boolean): void {
        // Reaparece más allá del borde superior-derecho, en una franja perpendicular a la caída para no alinearse en fila
        const spread = (Math.random() - 0.5) * 14;
        const lead = initial ? Math.random() * 10 : 7 + Math.random() * 2;
        mesh.position.set(
            -dirY * spread + dirX * lead,
            dirX * spread + dirY * lead,
            (Math.random() - 0.5) * 5,
        );
    }

    private resize(container: HTMLElement): void {
        if (!this.renderer || !this.camera) return;
        const width = container.clientWidth || 320;
        const height = container.clientHeight || 320;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    private syncLoop(): void {
        const shouldRun = this.isVisible && this.isInViewport && !this.reducedMotion;
        if (shouldRun && this.rafId === null) {
            this.tick();
        } else if (!shouldRun && this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private readonly tick = () => {
        if (!this.scene || !this.camera || !this.renderer || !this.rocket || !this.clock) return;
        const dt = Math.min(this.clock.getDelta(), 0.05);
        this.elapsed += dt;
        const t = this.elapsed;

        // Vuelo: bamboleo suave + flotación, como un cohete surcando el espacio
        this.rocket.rotation.z = -Math.PI / 4 + Math.sin(t * 0.9) * 0.045;
        this.rocket.position.x = Math.sin(t * 0.6) * 0.18;
        this.rocket.position.y = Math.sin(t * 1.3) * 0.12;

        // Visor HUD pulsante
        if (this.windowGlass) {
            const mat = this.windowGlass.material as import('three').MeshStandardMaterial;
            mat.emissiveIntensity = 0.9 + Math.sin(t * 3.2) * 0.3;
        }

        // Llama delgada en movimiento: parpadeo + estiramiento independientes en núcleo y capa exterior
        if (this.flameCore && this.flameOuter) {
            const flicker = 0.85 + Math.sin(t * 24) * 0.08 + Math.sin(t * 53 + 1.3) * 0.05;
            this.flameCore.scale.set(1 + Math.sin(t * 31) * 0.06, flicker, 1 + Math.cos(t * 27) * 0.06);
            this.flameOuter.scale.set(1 + Math.cos(t * 19) * 0.08, 0.9 + Math.sin(t * 17 + 0.6) * 0.12, 1 + Math.sin(t * 23) * 0.08);
        }

        // Pulsos de energía viajando por la llama, como un motor de iones
        for (const pulse of this.flamePulses) {
            pulse.phase += dt * pulse.speed;
            if (pulse.phase > 1) pulse.phase -= 1;
            const localY = -1.5 - pulse.phase * 2.1;
            pulse.mesh.position.set(0, localY, 0);
            const scale = 1.1 - pulse.phase * 0.7;
            pulse.mesh.scale.setScalar(scale);
            pulse.material.opacity = (1 - pulse.phase) * 0.9;
        }

        // Chispas de la tobera fluyendo hacia atrás, reciclándose al llegar al final de la estela
        if (this.embers && this.emberVelocities) {
            const positions = this.embers.geometry.attributes['position'] as import('three').BufferAttribute;
            for (let i = 0; i < positions.count; i++) {
                const idx = i * 3;
                let y = positions.array[idx + 1] as number;
                y += this.emberVelocities[idx + 1];
                if (y < -3.1) {
                    positions.array[idx] = (Math.random() - 0.5) * 0.25;
                    y = -1.6;
                    positions.array[idx + 2] = (Math.random() - 0.5) * 0.25;
                } else {
                    positions.array[idx] = (positions.array[idx] as number) + this.emberVelocities[idx];
                    positions.array[idx + 2] = (positions.array[idx + 2] as number) + this.emberVelocities[idx + 2];
                }
                positions.array[idx + 1] = y;
            }
            positions.needsUpdate = true;
        }

        // Lluvia de meteoritos: cada estela avanza a su propia velocidad y se recicla al salir del encuadre
        for (const meteor of this.meteors) {
            meteor.mesh.position.x += meteor.dirX * meteor.speed * dt;
            meteor.mesh.position.y += meteor.dirY * meteor.speed * dt;
            const traveled = meteor.mesh.position.x * meteor.dirX + meteor.mesh.position.y * meteor.dirY;
            if (traveled < -8) {
                this.resetMeteor(meteor.mesh, meteor.dirX, meteor.dirY, false);
            }
        }

        this.stars && (this.stars.rotation.y -= 0.0004);

        this.camera.position.x += (this.pointerX * 1.4 - this.camera.position.x) * 0.04;
        this.camera.position.y += (-this.pointerY * 1.4 - this.camera.position.y) * 0.04;
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
        this.rafId = requestAnimationFrame(this.tick);
    };
}
