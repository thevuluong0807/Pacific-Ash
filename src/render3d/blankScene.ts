import * as THREE from 'three';
import type { RenderScene } from './renderScene';

/** Nền tối trơn (Hangar, PassDevice, hoặc khi không tải được 3D). */
export class BlankScene implements RenderScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
  constructor() { this.scene.background = new THREE.Color('#05080B'); }
  enter() {}
  update() {}
  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  exit() {}
}
