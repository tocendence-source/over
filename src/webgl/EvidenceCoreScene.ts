import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { clamp, damp, easeInOutQuart, easeOutCubic, seeded } from "@/lib/motion";
import { profileFor, shouldDowngrade, type Quality, type TierProfile } from "@/lib/performance";
import { sceneBus, type SceneStateName } from "@/lib/sceneBus";

/**
 * The evidence core — an original abstract intelligence artifact.
 *
 *   ┌ segmented anodised-metal shell (80 plates) that opens to reveal the mechanism
 *   ├ gold hairline seams between the plates
 *   ├ an emissive kernel, an inner gyroscope and a wire lattice
 *   ├ three armillary rings — square-profile gold, graduated tick marks, gimbal pivots
 *   ├ four smoked-glass data capsules (one per system) riding an inclined track
 *   ├ orbiting entities, floating evidence fragments, geographic contour field
 *   └ an evidence graph that forms as the visitor moves through the methodology
 *
 * Everything is procedural: no model files, no texture downloads. Materials are
 * PBR, lit by a procedurally generated studio environment. Bloom runs only on
 * the HIGH tier through a HalfFloat composer; every other tier renders directly.
 */

type Composition = {
  camX: number;
  camY: number;
  camZ: number;
  coreX: number;
  coreY: number;
  coreZ: number;
  scale: number;
  spin: number;
  ringTilt: number;
  graph: number;
  graphScale: number;
  particles: number;
  scan: number;
  energy: number;
  /** Shell plate separation 0..1. */
  open: number;
  /** Geographic contour field prominence. */
  contour: number;
  /** Data capsule prominence. */
  capsules: number;
  /** Evidence fragment prominence. */
  fragments: number;
};

const COMPOSITIONS: Record<SceneStateName, Composition> = {
  entry: { camX: 0, camY: 0.1, camZ: 10.3, coreX: 2.23, coreY: 0.02, coreZ: 0, scale: 0.93, spin: 0.72, ringTilt: 0.12, graph: 0.06, graphScale: 1, particles: 0.35, scan: 0, energy: 0.8, open: 0.075, contour: 0.1, capsules: 0.65, fragments: 0.25 },
  network: { camX: 0, camY: 0, camZ: 8, coreX: -1.6, coreY: 0.3, coreZ: -0.4, scale: 0.72, spin: 0.8, ringTilt: 0.4, graph: 0.6, graphScale: 1.15, particles: 1, scan: 0, energy: 0.7, open: 0.12, contour: 0.6, capsules: 0.5, fragments: 1 },
  systems: { camX: 0, camY: 0.1, camZ: 8.6, coreX: 1.8, coreY: 0, coreZ: -1.3, scale: 0.6, spin: 1.25, ringTilt: 0.9, graph: 0.5, graphScale: 1.25, particles: 0.8, scan: 0, energy: 1.25, open: 0.28, contour: 0.2, capsules: 1, fragments: 0.6 },
  methodology: { camX: 0, camY: 0, camZ: 8.1, coreX: 0, coreY: 0.45, coreZ: -1.8, scale: 0.52, spin: 0.55, ringTilt: 1.5, graph: 0.35, graphScale: 1.45, particles: 0.5, scan: 0.55, energy: 0.6, open: 0.5, contour: 0.5, capsules: 0.3, fragments: 0.5 },
  confidence: { camX: 0, camY: 0.05, camZ: 7.2, coreX: 0, coreY: 0.1, coreZ: -1.1, scale: 0.66, spin: 0.7, ringTilt: 0.2, graph: 1, graphScale: 1.1, particles: 0.7, scan: 0.2, energy: 0.9, open: 0.55, contour: 0.3, capsules: 0.4, fragments: 0.7 },
  operator: { camX: 0, camY: 0, camZ: 6.9, coreX: -1.3, coreY: 0.05, coreZ: -0.6, scale: 0.62, spin: 0.9, ringTilt: -0.5, graph: 0.42, graphScale: 1, particles: 0.85, scan: 0, energy: 0.8, open: 0.08, contour: 0.45, capsules: 0.5, fragments: 0.8 },
  contact: { camX: 0, camY: 0, camZ: 7.1, coreX: 1.35, coreY: 0.25, coreZ: -1.5, scale: 0.56, spin: 0.75, ringTilt: 0.6, graph: 0.5, graphScale: 1.05, particles: 0.75, scan: 0, energy: 0.75, open: 0.1, contour: 0.4, capsules: 0.5, fragments: 0.7 },
  detail: { camX: 0, camY: 0, camZ: 7.6, coreX: -1.4, coreY: 0.1, coreZ: -0.9, scale: 0.68, spin: 1.05, ringTilt: 0.3, graph: 0.8, graphScale: 1.2, particles: 0.8, scan: 0, energy: 1.1, open: 0.4, contour: 0.25, capsules: 1, fragments: 0.6 },
};

const GOLD = new THREE.Color("#c5ad7b");
const GOLD_BRIGHT = new THREE.Color("#e3d1a7");
const BG = 0x090a08;
const COMPOSITION_KEYS = Object.keys(COMPOSITIONS.entry) as (keyof Composition)[];

const NOISE_GLSL = /* glsl */ `
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
float noise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1.0,0.0,0.0)), f.x), mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x), mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y),
    f.z);
}`;

/**
 * Methodology choreography for the shell:
 * INPUT sealed → EXTRACTION opens → CORRELATION fully open (graph forms)
 * → VALIDATION begins to close → EVIDENCE sealed again.
 */
const openForStage = (p: number) => {
  if (p < 0.2) return 0.05;
  if (p < 0.4) return 0.05 + easeInOutQuart((p - 0.2) / 0.2) * 0.95;
  if (p < 0.62) return 1;
  if (p < 0.84) return 1 - easeInOutQuart((p - 0.62) / 0.22) * 0.4;
  return 0.6 - easeInOutQuart((p - 0.84) / 0.16) * 0.52;
};

type RingSpec = {
  r: number;
  tube: number;
  tilt: [number, number, number];
  spin: number;
  precess: number;
  ticks: 1 | -1 | 0;
  band: boolean;
  pivots: boolean;
  bright: boolean;
};

const RING_SPECS: RingSpec[] = [
  { r: 2.95, tube: 0.02, tilt: [1.22, 0.18, 0], spin: 0.05, precess: 0.03, ticks: 1, band: false, pivots: false, bright: false },
  { r: 2.42, tube: 0.014, tilt: [0.6, 0.85, 0.4], spin: -0.08, precess: -0.045, ticks: -1, band: true, pivots: false, bright: true },
  { r: 1.95, tube: 0.016, tilt: [1.7, -0.35, 0.8], spin: 0.12, precess: 0.06, ticks: 0, band: false, pivots: true, bright: false },
];

type RingData = { tilt: [number, number, number]; spin: number; precess: number };
type OrbitParam = { ring: number; phase: number; speed: number; radius: number; scale: number };
type FragmentParam = { radius: number; y: number; phase: number; speed: number; tx: number; ty: number; tz: number; scale: number };
type Capsule = {
  pivot: THREE.Object3D;
  glass: THREE.Mesh<THREE.CapsuleGeometry, THREE.MeshPhysicalMaterial>;
  rodMat: THREE.MeshBasicMaterial;
  theta: number;
  amt: number;
};

export class EvidenceCoreScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private canvas: HTMLCanvasElement;

  /** The artifact — everything that moves with the core. */
  private root = new THREE.Group();
  private coreGroup = new THREE.Group();

  private goldMat!: THREE.MeshStandardMaterial;
  private goldBrightMat!: THREE.MeshStandardMaterial;
  private darkMat!: THREE.MeshPhysicalMaterial;
  private glassMat!: THREE.MeshPhysicalMaterial;
  private lineGold!: THREE.LineBasicMaterial;

  private shell!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private shellUniforms = { uOpen: { value: 0 }, uTime: { value: 0 }, uShrink: { value: 0.9 } };
  private seams!: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  private kernel!: THREE.Mesh<THREE.IcosahedronGeometry, THREE.ShaderMaterial>;
  private kernelLight!: THREE.PointLight;
  private lattice!: THREE.LineSegments<THREE.WireframeGeometry, THREE.LineBasicMaterial>;
  private gyro: THREE.Mesh[] = [];
  private glow!: THREE.Sprite;

  private ringWrappers: THREE.Group[] = [];
  private ringGroups: THREE.Group[] = [];
  private ringData: RingData[] = [];

  private capsuleGroup = new THREE.Group();
  private capsules: Capsule[] = [];
  private capsuleSpin = 0;

  private orbit!: THREE.InstancedMesh;
  private orbitParams: OrbitParam[] = [];
  private fragments?: THREE.InstancedMesh;
  private fragmentParams: FragmentParam[] = [];
  private contours?: THREE.Group;
  private contourMat?: THREE.LineBasicMaterial;
  private particles?: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private graph = new THREE.Group();
  private graphNodes: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];
  private graphEdges!: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private graphFinal: THREE.Vector3[] = [];
  private scan?: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private composer?: EffectComposer;
  private useBloom = false;
  private envTarget?: THREE.WebGLRenderTarget;

  private quality: Quality;
  private profile: TierProfile;
  private current: Composition;
  private frameHandle = 0;
  private disposed = false;
  private hidden = false;
  private frameSamples: number[] = [];
  private degraded = false;
  private onDegrade?: () => void;
  private onError?: () => void;
  private simulationTime = 0;
  private renderFailed = false;

  /** Reused per-frame scratch objects — the loop must not allocate. */
  private tmpMatrix = new THREE.Matrix4();
  private tmpQuat = new THREE.Quaternion();
  private tmpEuler = new THREE.Euler();
  private tmpVec = new THREE.Vector3();
  private tmpScale = new THREE.Vector3();
  private fallbackTilt = new THREE.Euler();

  constructor(canvas: HTMLCanvasElement, quality: Quality, onDegrade?: () => void, onError?: () => void) {
    this.canvas = canvas;
    this.quality = quality;
    this.profile = profileFor(quality);
    this.onDegrade = onDegrade;
    this.onError = onError;

    // The object assembles out of darkness: start open, small and unlit.
    this.current = { ...COMPOSITIONS.entry, scale: 0.5, open: 1, energy: 0, capsules: 0, fragments: 0 };

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.profile.bloom && quality !== "low",
      alpha: false,
      powerPreference: quality === "low" ? "low-power" : "high-performance",
    });
    this.renderer.setClearColor(BG, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(this.dpr());
    this.renderer.debug.onShaderError = () => {
      this.renderFailed = true;
      this.onError?.();
    };

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    this.scene.fog = new THREE.FogExp2(BG, 0.045);
    this.scene.add(this.root);
    this.root.add(this.coreGroup);

    try {
      this.buildMaterials();
      if (this.profile.reflections) this.buildEnvironment();
      this.buildLights();
      this.buildShell();
      this.buildKernel();
      this.buildRings();
      this.buildCapsules();
      this.buildOrbit();
      if (this.profile.fragments > 0) this.buildFragments();
      if (quality !== "low") this.buildContours();
      if (this.profile.particles > 0) this.buildParticles();
      this.buildGraph();
      if (this.profile.glow) this.buildScan();
      if (this.profile.bloom && this.renderer.extensions.has("EXT_color_buffer_float")) this.buildPost();
    } catch (error) {
      this.dispose();
      throw error;
    }

    this.resize();
    window.addEventListener("resize", this.resize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  private dpr() {
    return Math.min(window.devicePixelRatio || 1, this.profile.dpr);
  }

  /* ------------------------------------------------------------ materials */

  private buildMaterials() {
    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xc9a75c,
      metalness: 1,
      roughness: 0.28,
      emissive: 0x3d2f16,
      emissiveIntensity: 0.7,
      envMapIntensity: 1.25,
    });
    this.goldBrightMat = new THREE.MeshStandardMaterial({
      color: 0xe2c77a,
      metalness: 1,
      roughness: 0.18,
      emissive: 0x8a6b2c,
      emissiveIntensity: 1,
      envMapIntensity: 1.4,
    });
    this.darkMat = new THREE.MeshPhysicalMaterial({
      color: 0x20231f,
      metalness: 0.94,
      roughness: 0.3,
      clearcoat: 0.5,
      clearcoatRoughness: 0.22,
      envMapIntensity: 1.1,
      side: THREE.DoubleSide,
    });
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a2419,
      metalness: 0,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.4,
      envMapIntensity: 1.7,
      depthWrite: false,
    });
    this.lineGold = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.42 });
  }

  /** Procedural studio: dark room, one warm key panel, ivory fill, low gold strip. */
  private buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = createStudioEnvironment();
    this.envTarget = pmrem.fromScene(env, 0.04);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.9;
    pmrem.dispose();
    env.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose();
    });
  }

  private buildLights() {
    const key = new THREE.DirectionalLight(0xffe6bd, 2.4);
    key.position.set(-4, 5, 3.5);
    const rim = new THREE.DirectionalLight(0x9fb0c0, 0.55);
    rim.position.set(5, -2, -4);
    const ambient = new THREE.AmbientLight(0x3a3128, 0.35);
    this.scene.add(key, rim, ambient);
  }

  /* ------------------------------------------------------------ artifact */

  /** 80 faceted plates, shrunk toward their centroids, pushed outward by `uOpen`. */
  private buildShell() {
    const source = new THREE.IcosahedronGeometry(1.25, 1);
    const geo = source.index ? source.toNonIndexed() : source;
    if (geo !== source) source.dispose();
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const count = pos.count;
    const centers = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const rand = seeded(771);
    for (let f = 0; f < count; f += 3) {
      const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3;
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
      const cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
      const seed = rand();
      for (let k = 0; k < 3; k++) {
        centers[(f + k) * 3] = cx;
        centers[(f + k) * 3 + 1] = cy;
        centers[(f + k) * 3 + 2] = cz;
        seeds[f + k] = seed;
      }
    }
    geo.setAttribute("aCenter", new THREE.BufferAttribute(centers, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.computeVertexNormals();

    const mat = this.darkMat.clone();
    const uniforms = this.shellUniforms;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute vec3 aCenter;\nattribute float aSeed;\nuniform float uOpen;\nuniform float uTime;\nuniform float uShrink;",
        )
        .replace(
          "#include <begin_vertex>",
          [
            "vec3 dirC = normalize(aCenter);",
            "float breathe = sin(uTime * 0.7 + aSeed * 6.28318) * 0.5 + 0.5;",
            "float openAmt = uOpen * (0.45 + 0.55 * aSeed) * 0.72 + breathe * 0.01 * (0.3 + uOpen);",
            "vec3 transformed = aCenter + (position - aCenter) * uShrink + dirC * openAmt;",
          ].join("\n"),
        );
    };
    mat.customProgramCacheKey = () => "over-segmented-shell";

    this.shell = new THREE.Mesh(geo, mat);
    this.coreGroup.add(this.shell);

    this.seams = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.255, 1)),
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.32 }),
    );
    this.coreGroup.add(this.seams);
  }

  /** Emissive kernel + inner gyroscope + wire lattice, revealed when the shell opens. */
  private buildKernel() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uEnergy: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){
          vP = position;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = cameraPosition - w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uEnergy;
        varying vec3 vN; varying vec3 vV; varying vec3 vP;
        ${NOISE_GLSL}
        void main(){
          vec3 N = normalize(vN); vec3 V = normalize(vV);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);
          float n = noise(vP * 5.0 + uTime * 0.35);
          vec3 deep = vec3(0.42, 0.30, 0.11);
          vec3 hot = vec3(1.0, 0.86, 0.52);
          vec3 col = mix(deep, hot, clamp(n * 0.6 + fres * 0.7, 0.0, 1.0));
          col *= (0.9 + uEnergy * 1.1) * (0.8 + fres * 1.4);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.kernel = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 3), mat);
    this.coreGroup.add(this.kernel);

    this.kernelLight = new THREE.PointLight(0xe2c77a, 12, 5, 2);
    this.coreGroup.add(this.kernelLight);

    this.lattice = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.OctahedronGeometry(0.62, 1)),
      new THREE.LineBasicMaterial({ color: GOLD_BRIGHT, transparent: true, opacity: 0.35 }),
    );
    this.coreGroup.add(this.lattice);

    const gyroA = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.012, 4, 96), this.goldMat);
    const gyroB = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.01, 4, 96), this.goldBrightMat);
    gyroB.rotation.x = Math.PI / 2;
    this.gyro = [gyroA, gyroB];
    this.coreGroup.add(gyroA, gyroB);

    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: 0xe2c77a,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.glow.scale.setScalar(3.6);
    this.root.add(this.glow);
  }

  private makeTicks(r: number, dir: 1 | -1, z = 0, count = 72) {
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const major = i % 6 === 0;
      const len = major ? 0.13 : 0.055;
      const r0 = r + dir * 0.03;
      const r1 = r0 + dir * len;
      positions.push(Math.cos(a) * r0, Math.sin(a) * r0, z, Math.cos(a) * r1, Math.sin(a) * r1, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return new THREE.LineSegments(geo, this.lineGold);
  }

  /** Armillary rings: square-profile gold, graduated ticks, gimbal pivots, nested precession. */
  private buildRings() {
    const total = Math.min(this.profile.rings, RING_SPECS.length);
    for (let i = 0; i < total; i++) {
      const s = RING_SPECS[i];
      const wrapper = new THREE.Group();
      const g = new THREE.Group();
      g.rotation.set(s.tilt[0], s.tilt[1], s.tilt[2]);

      // radialSegments = 4 gives a machined square cross-section with crisp facets
      g.add(new THREE.Mesh(new THREE.TorusGeometry(s.r, s.tube, 4, 220), s.bright ? this.goldBrightMat : this.goldMat));

      if (s.band) {
        const band = new THREE.Mesh(new THREE.RingGeometry(s.r - 0.13, s.r - 0.025, 200), this.darkMat);
        g.add(band);
      }
      if (s.ticks !== 0 && this.quality !== "low") g.add(this.makeTicks(s.r, s.ticks, s.band ? 0.004 : 0));
      if (s.pivots) {
        const pg = new THREE.SphereGeometry(0.05, 16, 12);
        const p1 = new THREE.Mesh(pg, this.goldBrightMat);
        p1.position.x = s.r;
        const p2 = p1.clone();
        p2.position.x = -s.r;
        g.add(p1, p2);
      }

      wrapper.add(g);
      this.root.add(wrapper);
      this.ringWrappers.push(wrapper);
      this.ringGroups.push(g);
      this.ringData.push({ tilt: s.tilt, spin: s.spin, precess: s.precess });
    }
  }

  /** Four smoked-glass capsules — one per system — on an inclined track. */
  private buildCapsules() {
    this.capsuleGroup.rotation.x = 0.42;
    const capGeo = new THREE.CapsuleGeometry(0.085, 0.3, 6, 18);
    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.27, 10);
    const capRing = new THREE.TorusGeometry(0.088, 0.007, 6, 36);
    const R = 2.2;

    for (let i = 0; i < 4; i++) {
      const theta = (i * Math.PI) / 2;
      const pivot = new THREE.Object3D();
      pivot.position.set(Math.cos(theta) * R, 0, Math.sin(theta) * R);
      pivot.lookAt(0, 0, 0);

      const glass = new THREE.Mesh(capGeo, this.glassMat);
      glass.rotation.z = Math.PI / 2;

      const rodMat = new THREE.MeshBasicMaterial({ color: GOLD_BRIGHT.clone() });
      const rod = new THREE.Mesh(rodGeo, rodMat);
      glass.add(rod);

      const r1 = new THREE.Mesh(capRing, this.goldBrightMat);
      r1.rotation.x = Math.PI / 2;
      r1.position.y = 0.15;
      const r2 = r1.clone();
      r2.position.y = -0.15;
      glass.add(r1, r2);

      pivot.add(glass);
      this.capsuleGroup.add(pivot);
      this.capsules.push({ pivot, glass, rodMat, theta, amt: 0.4 });
    }
    this.root.add(this.capsuleGroup);
  }

  private buildOrbit() {
    const count = this.profile.orbitNodes;
    this.orbit = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.032, 0), this.goldBrightMat, Math.max(count, 1));
    this.orbit.count = count;
    const rand = seeded(771);
    for (let i = 0; i < count; i++) {
      this.orbitParams.push({
        ring: i % Math.max(this.ringGroups.length, 1),
        phase: rand() * Math.PI * 2,
        speed: 0.16 + rand() * 0.22,
        radius: 1.85 + rand() * 1.15,
        scale: 0.6 + rand() * 1.5,
      });
    }
    this.root.add(this.orbit);
  }

  /** Thin anodised plates drifting in a wide orbit — an archive of evidence slips. */
  private buildFragments() {
    const n = this.profile.fragments;
    this.fragments = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.17, 0.01), this.darkMat, n);
    const rand = seeded(4040);
    for (let i = 0; i < n; i++) {
      this.fragmentParams.push({
        radius: 3.3 + rand() * 2.2,
        y: (rand() - 0.5) * 2.6,
        phase: rand() * Math.PI * 2,
        speed: 0.03 + rand() * 0.05,
        tx: (rand() - 0.5) * 0.4,
        ty: (rand() - 0.5) * 0.4,
        tz: (rand() - 0.5) * 0.3,
        scale: 0.7 + rand() * 0.9,
      });
    }
    this.root.add(this.fragments);
  }

  /** Abstract geographic contours on a tilted plane beneath the core (GEOINT motif). */
  private buildContours() {
    const group = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.1 });
    const rand = seeded(99);
    for (let i = 0; i < 7; i++) {
      const base = 1.6 + i * 0.62;
      const s1 = rand() * Math.PI * 2;
      const s2 = rand() * Math.PI * 2;
      const s3 = rand() * Math.PI * 2;
      const pts: number[] = [];
      const N = 160;
      for (let k = 0; k < N; k++) {
        const t = (k / N) * Math.PI * 2;
        const r = base + 0.2 * Math.sin(3 * t + s1) + 0.11 * Math.sin(7 * t + s2) + 0.05 * Math.sin(13 * t + s3);
        pts.push(Math.cos(t) * r, Math.sin(t) * r, 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      group.add(new THREE.LineLoop(geo, mat));
    }
    group.rotation.x = -Math.PI / 2.15;
    group.position.y = -1.9;
    this.contours = group;
    this.contourMat = mat;
    this.scene.add(group);
  }

  private buildParticles() {
    const count = this.profile.particles;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const tints = new Float32Array(count);
    const rand = seeded(2026);
    for (let i = 0; i < count; i++) {
      const r = 4.5 + rand() * 11;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.62;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 1.1 + rand() * 2.6;
      phases[i] = rand() * Math.PI * 2;
      tints[i] = rand() < 0.42 ? 1 : 0.12;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
    geo.setAttribute("aTint", new THREE.Float32BufferAttribute(tints, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.9 }, uDpr: { value: this.dpr() } },
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aPhase; attribute float aTint;
        uniform float uTime; uniform float uDpr;
        varying float vAlpha; varying float vTint;
        void main(){
          vec3 p = position;
          p.y += sin(uTime * 0.11 + aPhase) * 0.3;
          p.x += cos(uTime * 0.08 + aPhase * 1.7) * 0.26;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float dist = -mv.z;
          gl_PointSize = aSize * uDpr * (24.0 / max(dist, 0.001));
          vAlpha = smoothstep(26.0, 7.0, dist) * smoothstep(0.6, 4.0, dist);
          vTint = aTint;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vAlpha; varying float vTint;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * vAlpha * uOpacity * 0.75;
          if (a < 0.008) discard;
          vec3 col = mix(vec3(0.93, 0.905, 0.85), vec3(0.82, 0.68, 0.38), vTint);
          gl_FragColor = vec4(col, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  /** Evidence graph: deterministic node cloud with near-neighbour edges. */
  private buildGraph() {
    const count = this.profile.orbitNodes > 14 ? 18 : 12;
    const rand = seeded(7710);
    const edges: number[] = [];
    for (let i = 0; i < count; i++) {
      const r = 1.15 + rand() * 1.5;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      this.graphFinal.push(
        new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.7, r * Math.sin(phi) * Math.sin(theta)),
      );
    }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (this.graphFinal[i].distanceTo(this.graphFinal[j]) < 1.55) edges.push(i, j);
      }
    }
    const nodeMat = new THREE.MeshBasicMaterial({
      color: GOLD_BRIGHT.clone().multiplyScalar(1.6),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodeGeo = new THREE.SphereGeometry(0.034, 10, 8);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(nodeGeo, nodeMat);
      mesh.scale.setScalar(0.001);
      this.graphNodes.push(mesh);
      this.graph.add(mesh);
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(edges.length * 3), 3));
    this.graphEdges = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.graph.add(this.graphEdges);
    this.graph.userData.edges = edges;
    this.graph.userData.count = count;
    this.scene.add(this.graph);
  }

  private buildScan() {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uOpacity;
        varying vec2 vUv;
        void main(){
          float band = smoothstep(0.05, 0.0, abs(vUv.x - fract(uTime * 0.07)));
          float grid = smoothstep(0.985, 1.0, max(sin(vUv.y * 90.0), sin(vUv.x * 90.0)));
          float a = (band * 0.9 + grid * 0.12) * uOpacity;
          gl_FragColor = vec4(vec3(0.79, 0.66, 0.36) * a, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.scan = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), mat);
    this.scan.rotation.x = -Math.PI / 2.06;
    this.scan.position.y = -1.1;
    this.scene.add(this.scan);
  }

  /** HIGH tier only: HalfFloat MSAA target → selective bloom → tone-mapped output. */
  private buildPost() {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Math.min(4, this.renderer.capabilities.maxSamples) });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.5, 1.1));
    this.composer.addPass(new OutputPass());
    this.useBloom = true;
  }

  /* ------------------------------------------------------------ loop */

  private target(): Composition {
    const base = COMPOSITIONS[sceneBus.state] ?? COMPOSITIONS.entry;
    const mobile = sceneBus.viewport.w <= 600;
    const tablet = !mobile && sceneBus.viewport.w < 1000;
    const viewWidth = 2 * base.camZ * Math.tan(THREE.MathUtils.degToRad(17)) * sceneBus.viewport.w / Math.max(sceneBus.viewport.h, 1);
    const horizontal = sceneBus.state === "entry" ? viewWidth * .235 : base.coreX;
    const stage = sceneBus.state === "methodology" ? sceneBus.stageProgress : -1;
    const focusPull = (sceneBus.state === "systems" || sceneBus.state === "detail") && sceneBus.focus >= 0 ? 1 : 0;

    let graph = base.graph;
    let open = base.open;
    if (stage >= 0) {
      graph = 0.08 + easeOutCubic(clamp(stage * 1.12)) * 0.92;
      open = openForStage(stage);
    }

    const c: Composition = {
      ...base,
      graph,
      open,
      coreX: mobile ? 0 : horizontal * (1 - focusPull * 0.12),
      coreY: mobile ? -1.65 : base.coreY,
      camZ: mobile ? base.camZ + 2.4 : base.camZ,
      scale: mobile ? base.scale * 0.72 : tablet ? base.scale * 0.75 : base.scale,
    };

    if (focusPull) {
      c.spin = base.spin * 1.4;
      c.energy = base.energy * 1.15;
    }
    if (sceneBus.reduced) {
      // Reduced motion: a near-static instrument, no camera choreography.
      c.spin *= 0.12;
      c.particles *= 0.6;
      c.energy *= 0.7;
    }
    return c;
  }

  private tick = () => {
    if (this.disposed || this.renderFailed) return;
    this.frameHandle = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.hidden || document.hidden || !sceneBus.visible || !sceneBus.enabled) return;
    this.simulationTime += dt;
    const time = this.simulationTime;
    const target = this.target();
    const cur = this.current;

    const L = 2.1;
    for (const key of COMPOSITION_KEYS) {
      cur[key] = damp(cur[key], target[key], L, dt);
    }

    sceneBus.pointer.x = damp(sceneBus.pointer.x, sceneBus.pointer.tx, 3.2, dt);
    sceneBus.pointer.y = damp(sceneBus.pointer.y, sceneBus.pointer.ty, 3.2, dt);
    const parallax = sceneBus.reduced ? 0 : this.profile.cameraParallax;
    const px = sceneBus.pointer.x;
    const py = sceneBus.pointer.y;

    this.camera.position.set(cur.camX + px * 0.85 * parallax, cur.camY - py * 0.55 * parallax, cur.camZ);
    this.camera.lookAt(0, sceneBus.viewport.w <= 600 ? 0 : cur.coreY * 0.35, 0);

    // ---- artifact
    this.root.position.set(cur.coreX, cur.coreY, cur.coreZ);
    this.root.scale.setScalar(cur.scale);
    this.root.rotation.y = px * 0.14 * parallax;
    this.root.rotation.x = py * 0.09 * parallax;

    this.coreGroup.rotation.y += dt * 0.1 * cur.spin;
    this.coreGroup.rotation.x = Math.sin(time * 0.06) * 0.1;
    this.shellUniforms.uOpen.value = cur.open;
    this.shellUniforms.uTime.value = time;
    this.seams.material.opacity = 0.32 * (1 - clamp(cur.open * 1.5));

    this.kernel.material.uniforms.uTime.value = time;
    this.kernel.material.uniforms.uEnergy.value = cur.energy;
    this.kernel.scale.setScalar((1 + Math.sin(time * 1.3) * 0.04) * (0.9 + cur.energy * 0.15));
    this.kernelLight.intensity = 6 + cur.energy * 8 + cur.open * 12;
    this.lattice.rotation.y -= dt * 0.35 * cur.spin;
    this.lattice.rotation.z += dt * 0.12;
    this.lattice.material.opacity = 0.18 + cur.energy * 0.2;
    this.gyro[0].rotation.x += dt * 0.8 * cur.spin;
    this.gyro[0].rotation.y += dt * 0.25;
    this.gyro[1].rotation.z += dt * 0.6 * cur.spin;
    this.glow.material.opacity = (0.12 + cur.energy * 0.16) * (this.useBloom ? 0.5 : 1);
    this.glow.scale.setScalar(3.4 + Math.sin(time * 0.5) * 0.14 + cur.energy * 0.5 + cur.open * 0.6);
    this.goldBrightMat.emissiveIntensity = 0.7 + cur.energy * 0.6;

    // ---- armillary rings: dial spin (visible via ticks/pivots) + slow precession
    for (let i = 0; i < this.ringGroups.length; i++) {
      const g = this.ringGroups[i];
      const w = this.ringWrappers[i];
      const d = this.ringData[i];
      g.rotation.z += dt * d.spin * cur.spin;
      g.rotation.x = d.tilt[0] + cur.ringTilt * (i % 2 === 0 ? 0.35 : -0.28);
      w.rotation.y += dt * d.precess * cur.spin;
    }

    // ---- data capsules: selection rotates the track so the focused module faces the camera
    const focus = sceneBus.state === "systems" || sceneBus.state === "detail" ? sceneBus.focus : -1;
    if (focus >= 0) {
      const twoPi = Math.PI * 2;
      const goal = (focus - 1) * (Math.PI / 2);
      let delta = (goal - this.capsuleSpin) % twoPi;
      if (delta > Math.PI) delta -= twoPi;
      if (delta < -Math.PI) delta += twoPi;
      this.capsuleSpin += delta * (1 - Math.exp(-2.4 * dt));
    } else {
      this.capsuleSpin += dt * 0.07 * cur.spin;
    }
    this.capsuleGroup.rotation.y = this.capsuleSpin;
    this.glassMat.opacity = 0.16 + cur.capsules * 0.28;
    for (let i = 0; i < this.capsules.length; i++) {
      const c = this.capsules[i];
      const goal = focus === i ? 1 : focus >= 0 ? 0.12 : 0.4;
      c.amt = damp(c.amt, goal, 3, dt);
      const r = 2.2 + c.amt * 0.22;
      c.pivot.position.set(Math.cos(c.theta) * r, 0, Math.sin(c.theta) * r);
      c.glass.scale.setScalar((0.82 + c.amt * 0.5) * (0.8 + cur.capsules * 0.2));
      c.rodMat.color.copy(GOLD_BRIGHT).multiplyScalar((0.4 + c.amt * 2.6) * (0.4 + cur.capsules * 0.6));
    }

    // ---- orbiting entities ride the ring planes
    if (this.orbit.count > 0) {
      const { tmpMatrix: m, tmpQuat: q, tmpEuler: e, tmpVec: v, tmpScale: s } = this;
      for (let i = 0; i < this.orbit.count; i++) {
        const p = this.orbitParams[i];
        const angle = p.phase + time * p.speed * cur.spin;
        const ri = p.ring % Math.max(this.ringGroups.length, 1);
        const g = this.ringGroups[ri];
        const w = this.ringWrappers[ri];
        v.set(Math.cos(angle) * p.radius, Math.sin(angle) * p.radius, 0);
        if (g && w) v.applyEuler(g.rotation).applyEuler(w.rotation);
        else v.applyEuler(this.fallbackTilt);
        e.set(angle, angle * 1.7, 0);
        m.compose(v, q.setFromEuler(e), s.setScalar(p.scale));
        this.orbit.setMatrixAt(i, m);
      }
      this.orbit.instanceMatrix.needsUpdate = true;
    }

    // ---- evidence fragments
    if (this.fragments) {
      const { tmpMatrix: m, tmpQuat: q, tmpEuler: e, tmpVec: v, tmpScale: s } = this;
      const vis = clamp(cur.fragments);
      for (let i = 0; i < this.fragmentParams.length; i++) {
        const p = this.fragmentParams[i];
        const a = p.phase + time * p.speed;
        v.set(Math.cos(a) * p.radius, p.y + Math.sin(time * 0.22 + p.phase) * 0.18, Math.sin(a) * p.radius);
        e.set(time * p.tx + p.phase, time * p.ty, time * p.tz + p.phase);
        m.compose(v, q.setFromEuler(e), s.setScalar(p.scale * (0.2 + vis * 0.8)));
        this.fragments.setMatrixAt(i, m);
      }
      this.fragments.instanceMatrix.needsUpdate = true;
    }

    // ---- contour field
    if (this.contours && this.contourMat) {
      this.contours.rotation.z += dt * 0.012;
      this.contours.position.set(cur.coreX * 0.5, -1.9 + cur.coreY * 0.3, cur.coreZ * 0.5 - 0.4);
      this.contourMat.opacity = 0.04 + cur.contour * 0.11;
    }

    // ---- evidence graph formation
    const count = (this.graph.userData.count as number) ?? 0;
    const edges = (this.graph.userData.edges as number[]) ?? [];
    const positions = this.graphEdges.geometry.getAttribute("position") as THREE.BufferAttribute;
    const formed = clamp(cur.graph);
    this.graph.position.set(cur.coreX * 0.2, cur.coreY * 0.2, cur.coreZ + 0.4);
    this.graph.rotation.y += dt * 0.05;
    this.graph.scale.setScalar(cur.graphScale);
    for (let i = 0; i < count; i++) {
      const node = this.graphNodes[i];
      const stagger = (i / count) * 0.5;
      const local = easeOutCubic(clamp((formed - stagger) / 0.5));
      const final = this.graphFinal[i];
      node.position.set(final.x * local, final.y * local, final.z * local);
      const pulse = 0.7 + Math.sin(time * 1.4 + i) * 0.18;
      node.scale.setScalar(Math.max(local * pulse, 0.001));
    }
    const visibleEdges = Math.floor((edges.length / 2) * clamp((formed - 0.3) / 0.7)) * 2;
    for (let e = 0; e < edges.length; e += 2) {
      const a = this.graphNodes[edges[e]].position;
      const b = this.graphNodes[edges[e + 1]].position;
      positions.setXYZ(e, a.x, a.y, a.z);
      positions.setXYZ(e + 1, b.x, b.y, b.z);
    }
    positions.needsUpdate = true;
    this.graphEdges.geometry.setDrawRange(0, visibleEdges);
    this.graphEdges.material.opacity = 0.1 + clamp((formed - 0.3) / 0.7) * 0.26;

    if (this.particles) {
      this.particles.rotation.y += dt * 0.012;
      this.particles.material.uniforms.uTime.value = time;
      this.particles.material.uniforms.uOpacity.value = cur.particles;
      this.particles.position.x = -px * 0.4 * parallax;
    }

    if (this.scan) {
      this.scan.material.uniforms.uTime.value = time;
      this.scan.material.uniforms.uOpacity.value = cur.scan * 0.5;
      this.scan.position.y = -1.15 + Math.sin(time * 0.25) * 0.35;
    }

    try {
      if (this.useBloom && this.composer) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    } catch {
      this.renderFailed = true;
      this.onError?.();
    }

    this.measure(dt);
  };

  private measure(dt: number) {
    if (this.degraded || this.quality === "low") return;
    // Ignore the first seconds: shader compilation stalls would skew the average.
    if (this.simulationTime < 3) return;
    this.frameSamples.push(dt * 1000);
    if (this.frameSamples.length < 120) return;
    const avg = this.frameSamples.reduce((a, b) => a + b, 0) / this.frameSamples.length;
    this.frameSamples = [];
    if (shouldDowngrade(avg)) {
      this.degraded = true;
      this.profile = profileFor(this.quality === "high" ? "medium" : "low");
      this.useBloom = false;
      if (this.particles) this.particles.visible = this.profile.particles > 0;
      if (this.scan) this.scan.visible = this.profile.glow;
      if (this.fragments) this.fragments.visible = this.profile.fragments > 0;
      this.resize();
      this.onDegrade?.();
    }
  }

  /* ------------------------------------------------------------ misc */

  private onVisibility = () => {
    this.hidden = document.hidden;
    if (!this.hidden) this.clock.getDelta();
  };

  private resize = () => {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || window.innerWidth;
    const h = parent?.clientHeight || window.innerHeight;
    const dpr = this.dpr();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < 700 ? 44 : 34;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(w, h);
    }
    if (this.particles) this.particles.material.uniforms.uDpr.value = dpr;
    sceneBus.viewport.w = w;
    sceneBus.viewport.h = h;
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameHandle);
    window.removeEventListener("resize", this.resize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.glow?.material.map?.dispose();
    this.composer?.passes.forEach((pass) => pass.dispose());
    this.composer?.dispose();
    this.envTarget?.dispose();
    this.renderer.dispose();
  }
}

/** Dark studio with a warm key panel, ivory fill, low gold strip and a faint cool kick. */
function createStudioEnvironment(): THREE.Scene {
  const env = new THREE.Scene();
  env.add(
    new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), new THREE.MeshBasicMaterial({ color: 0x0b0a08, side: THREE.BackSide })),
  );
  const panel = (w: number, h: number, hex: number, intensity: number, x: number, y: number, z: number) => {
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    material.color.set(hex).multiplyScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  panel(5, 3, 0xffe3b6, 9, -5, 5, 3);
  panel(2.2, 5, 0xf1ebdd, 3.2, 6, 1.5, -2);
  panel(6, 0.5, 0xc8a65a, 7, 0, -5, 2);
  panel(1.2, 1.2, 0xa9b6c4, 2.2, 3, -3, 5);
  panel(0.6, 6, 0xe2c77a, 4, -2, 0, -6);
  return env;
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,240,205,0.9)");
    g.addColorStop(0.28, "rgba(226,199,122,0.32)");
    g.addColorStop(0.65, "rgba(114,93,50,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
