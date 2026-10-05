import * as THREE from 'three';
import type { MapId } from '../ui/settings';
import type { Engine } from './engine';
import { floatOnWaves } from './buoyancy';
import { createWorld } from './createWorld';
import type { MapWorld, QualityConfig } from './mapWorld';
import type { RenderScene } from './renderScene';
import { buildWarship, spinRadar, type Warship } from './warship';

/**
 * Menu và ModeSelect: camera `menu` chuyển động chậm 40 s (env-and-fx.md mục 2), phông theo map đã chọn.
 * Vật thể dồn hai bên, vùng giữa thoáng cho logo và nút (maps.md mục 8).
 */
export class MenuScene implements RenderScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1500);
  private world?: MapWorld;
  private ship?: Warship;
  private aspect = 1.6;
  private quality?: QualityConfig;
  get vignette() { return this.world?.style.vignette ?? 0.25; }

  constructor(readonly map: MapId) {}

  enter(engine: Engine) {
    if (this.world) return;
    this.world = createWorld(this.map, this.scene, engine.renderer, 'menu');
    if (this.quality) this.world.setQuality(this.quality);
    if (this.map === 'hai_phong') { // tàu lớn trôi chậm, chỉ ở bên phải (không đi qua vùng giữa)
      const ship = buildWarship('17');
      ship.scale.setScalar(0.3);
      this.ship = ship;
      this.scene.add(ship);
    }
  }

  setQuality(q: QualityConfig) { this.quality = q; this.world?.setQuality(q); }

  update(dt: number, t: number) {
    if (!this.world) return;
    // camera (-6,1.2,14) -> (6,1.6,14) trong 40 s, lặp qua lại; màn dọc: FOV 60° và nhìn thấp hơn một chút (maps.md 8.4)
    const k = 0.5 - 0.5 * Math.cos((t / 40) * Math.PI * 2);
    this.camera.position.set(-6 + 12 * k, 1.2 + 0.4 * k, 14);
    const portrait = this.aspect < 0.9;
    this.camera.fov = portrait ? 60 : 50;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.map === 'truong_sa' ? new THREE.Vector3(0, portrait ? 2 : 3, -45) : new THREE.Vector3(4, portrait ? 2 : 3, -30));
    if (this.ship) {
      this.ship.position.set(20 + 3 * Math.sin(t * 0.05), 0, -26);
      this.ship.userData.heading = -Math.PI / 2 + 0.12;
      floatOnWaves(this.ship, this.ship.userData.heading, 7, 1.2, t, this.world.heightAt, false);
      spinRadar(this.ship, t);
    }
    this.world.update(dt, t, this.camera);
  }

  resize(w: number, h: number) { this.aspect = w / h; this.camera.aspect = this.aspect; this.camera.updateProjectionMatrix(); }
  exit() {}
}
