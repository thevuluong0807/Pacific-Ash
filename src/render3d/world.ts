import * as THREE from 'three';
import { Harbor } from './harbor';
import { Lightning } from './lightning';
import { NightSky } from './nightSky';
import { Ocean } from './ocean';
import { CALM_ZONE, CELL, WAVE_UNIT, WORLD_SCALE } from './scale';
import { Rain } from './rain';

export type { QualityConfig } from './mapWorld';
import type { FxStyle, Layout, MapWorld, QualityConfig } from './mapWorld';

const FOG_ON = new THREE.Color('#0B1117');
const FOG_OFF = new THREE.Color('#18222B'); // chất lượng thấp: không sương, hòa vào gradient chân trời

/** Biển đêm + trời + mưa + skyline + sấm chớp dùng chung cho mọi cảnh 3D. Nghiệm thu: design/env-and-fx.md. */
export class NightWorld implements MapWorld {
  readonly id = 'hai_phong' as const;
  readonly style: FxStyle = { glow: 1, smoke: 0x2a2f35, dropTint: 0xffffff, vignette: 0.25 };
  private root = new THREE.Group();
  private paused = false;
  /** Phóng phông nền (S) và sóng/sương theo kích thước tàu (U): chỉ ở chế độ trận, menu giữ nguyên. */
  private readonly S: number;
  private readonly U: number;
  /** Chia mật độ sương theo kích thước ô (0.011 / CELL = 0.0011 ở CELL 10). */
  private readonly FD: number;
  private readonly proxy = new THREE.PerspectiveCamera();
  readonly ocean: Ocean;
  readonly sky = new NightSky();
  readonly rain = new Rain();
  readonly harbor: Harbor;
  readonly lightning = new Lightning();
  private hemi = new THREE.HemisphereLight(0x1b2630, 0x04090d, 0.35);
  private key = new THREE.DirectionalLight(0x9fb8cc, 1.2);

  constructor(private scene: THREE.Scene, renderer: THREE.WebGLRenderer, layout: Layout = 'play') {
    this.S = layout === 'play' ? WORLD_SCALE : 1; this.U = layout === 'play' ? WAVE_UNIT : 1; this.FD = layout === 'play' ? CELL : 1;
    const S = this.S, U = this.U;
    this.ocean = new Ocean({ fogColor: FOG_ON, fogDensity: 0.011 / this.FD, unit: U, radius: S > 1 ? 200 * CELL / S : 220, calm: S > 1 ? CALM_ZONE : undefined });
    this.harbor = new Harbor((x, z, t) => this.ocean.heightAt(x * S, z * S, t) / S, layout, S);
    this.key.position.set(-6, 14, -18); // chếch từ sau-trên, tạo vệt sáng viền
    scene.fog = new THREE.FogExp2(FOG_ON.getHex(), 0.011 / this.FD);
    this.root.scale.setScalar(S);
    this.root.add(this.sky.mesh, this.ocean.mesh, this.harbor.group, this.rain.lines, this.hemi, this.key);
    scene.add(this.root);
    this.lightning.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // môi trường phản chiếu cho thân tàu: bầu trời đêm + vệt cam skyline + vệt sáng lạnh (thay HDRI `tex_env_night_harbor`)
    const env = new THREE.Scene();
    const sky = new NightSky(50);
    sky.update(0, new THREE.PerspectiveCamera());
    env.add(sky.mesh);
    const blob = (hex: string, power: number, x: number, y: number, z: number, r: number) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power) }));
      m.position.set(x, y, z);
      env.add(m);
    };
    blob('#FF7A1A', 6, 0, 3, -40, 7); blob('#9FB8CC', 5, -20, 30, 10, 4); blob('#4FC3E8', 3, 30, 12, 20, 3);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env).texture;
    scene.environmentIntensity = 1.3;
    pm.dispose();
  }

  heightAt = (x: number, z: number, t: number) => this.ocean.heightAt(x, z, t);

  setPaused(p: boolean) { this.paused = p; this.lightning.paused = p; }
  setMood() {}
  dispose() {
    this.scene.remove(this.root);
    this.scene.environment = null;
    this.root.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); });
  }

  private quality?: QualityConfig;

  /** Dưới nước (cinematic tàu ngầm): tầm nhìn 6 đơn vị, xanh đen #06141C. */
  setUnderwater(on: boolean) {
    const fog = this.scene.fog as THREE.FogExp2;
    this.ocean.setUnderwater(on);
    this.sky.mesh.visible = !on; // dưới nước không thấy bầu trời
    this.scene.background = on ? new THREE.Color('#06141C') : null;
    if (on) {
      const c = new THREE.Color('#06141C');
      fog.density = 0.08 / this.FD; fog.color.copy(c);
      this.ocean.setFog(0.08 / this.FD, c); this.harbor.setFog(0.08 / this.FD, c);
    } else if (this.quality) this.setQuality(this.quality);
  }

  setQuality(q: QualityConfig) {
    this.quality = q;
    const density = (q.fog ? 0.011 : 0.003) / this.FD;
    const color = q.fog ? FOG_ON : FOG_OFF;
    (this.scene.fog as THREE.FogExp2).density = density;
    (this.scene.fog as THREE.FogExp2).color.copy(color);
    this.ocean.setFog(density, color);
    this.harbor.setFog(density, color);
    this.ocean.setReflection(q.oceanReflection);
    this.rain.setCount(q.rain ? Math.round(3000 * (q.particleScale >= 1 ? 1.5 : 1)) : 0);
    this.harbor.setQuality(!q.rain && !q.fog);
    this.scene.environmentIntensity = q.oceanReflection ? 1.3 : 0.9;
  }

  update(dt: number, t: number, camera: THREE.Camera) {
    void dt; void this.paused;
    const f = this.lightning.update(t);
    this.proxy.position.copy(camera.position).divideScalar(this.S); // vật bám camera nằm trong nhóm đã phóng: dùng toạ độ cục bộ
    this.proxy.quaternion.copy(camera.quaternion);
    this.sky.setFlash(f);
    this.sky.update(t, this.proxy);
    this.ocean.update(t, this.proxy);
    this.ocean.setFlash(f);
    this.rain.update(t, this.proxy);
    this.harbor.update(t, f);
    this.hemi.intensity = 0.35 * (1 + f * 1.6);
    this.key.intensity = 1.2 + f * 1.5;
  }
}
