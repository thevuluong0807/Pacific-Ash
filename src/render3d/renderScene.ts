import type * as THREE from 'three';
import type { Engine } from './engine';
import type { QualityConfig } from './world';

/** Cảnh 3D phía sau DOM (menu, trận đấu...). */
export interface RenderScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  enter(engine: Engine): void;
  update(dt: number, time: number): void;
  resize(width: number, height: number): void;
  setQuality?(q: QualityConfig): void;
  /** Độ tối viền theo map (0.25 hai_phong, 0.30 truong_sa). */
  readonly vignette?: number;
  exit(): void;
}
