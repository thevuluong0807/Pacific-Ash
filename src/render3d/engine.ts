import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { RenderScene } from './renderScene';
import { glare } from './glare';
import type { QualityConfig } from './world';

/** Vignette 0.25 + nhiễu hạt phim 3% (design/env-and-fx.md mục 10). */
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.25 }, uGrain: { value: 0.03 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(.5));
      c.rgb *= 1. - uVignette * smoothstep(.35, .85, d);
      c.rgb += (hash(vUv * 1000. + uTime) - .5) * uGrain;
      gl_FragColor = c;
    }`,
};

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloom: UnrealBloomPass;
  private film: ShaderPass;
  private clock = new THREE.Clock();
  private current?: RenderScene;
  private quality?: QualityConfig;
  private lowFx = false;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    container.appendChild(this.renderer.domElement);

    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.5, 1.1); // ngưỡng 1.1, cường độ 0.18 (nhân glare/0.55 mỗi khung hình)
    this.film = new ShaderPass(FilmShader);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.film);

    addEventListener('resize', () => this.resize());
    this.applyPixelRatio(1.5);
    this.resize();
  }

  private applyPixelRatio(max: number) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, max));
    this.composer?.setPixelRatio?.(Math.min(devicePixelRatio, max));
  }

  /** Chất lượng thấp: tắt bloom và nhiễu hạt, hạ pixel ratio; còn lại do từng cảnh xử lý. */
  setQuality(q: QualityConfig) {
    this.quality = q;
    this.lowFx = !q.rain && !q.fog;
    this.bloom.enabled = !this.lowFx;
    this.film.uniforms.uGrain.value = this.lowFx ? 0 : 0.03;
    this.applyPixelRatio(q.pixelRatioMax);
    this.resize();
    this.current?.setQuality?.(q);
  }

  setScene(next: RenderScene) {
    if (next === this.current) return;
    this.current?.exit();
    this.current = next;
    next.enter(this);
    if (this.quality) next.setQuality?.(this.quality);
    this.renderPass.scene = next.scene;
    this.renderPass.camera = next.camera;
    this.resize();
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.current?.update(dt, this.clock.elapsedTime);
      this.bloom.strength = 0.18 * (glare() / 0.55);
      this.film.uniforms.uTime.value = this.clock.elapsedTime;
      this.film.uniforms.uVignette.value = this.current?.vignette ?? 0.25;
      this.composer.render();
    });
  }

  private resize() {
    const w = this.container.clientWidth || innerWidth;
    const h = this.container.clientHeight || innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.current?.resize(w, h);
  }
}
