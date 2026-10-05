import type * as THREE from 'three';
import type { MapId } from '../ui/settings';

export interface QualityConfig { rain: boolean; fog: boolean; oceanReflection: boolean; particleScale: number; pixelRatioMax: number }

/** `menu` = cảnh chờ (vật thể dồn hai bên, giữa thoáng); `play` = gameplay (không lấn vùng chơi). design/maps.md mục 4 và 8. */
export type Layout = 'menu' | 'play';

/** Diện mạo hiệu ứng chiến đấu theo map (maps.md mục 4.2). */
export interface FxStyle { glow: number; smoke: number; dropTint: number; vignette: number }

/** Một map = bộ trời, biển, ánh sáng, phông nền và sự kiện nền. Cảnh (menu/trận) chỉ giữ camera và tàu. */
export interface MapWorld {
  readonly id: MapId;
  readonly style: FxStyle;
  heightAt(x: number, z: number, t: number): number;
  update(dt: number, t: number, camera: THREE.Camera): void;
  setQuality(q: QualityConfig): void;
  /** Dưới nước (cinematic tàu ngầm). */
  setUnderwater(on: boolean): void;
  /** Hoãn sự kiện nền (pháo kích, chớp nổ, sấm chớp) trong lúc cinematic chạy. */
  setPaused(paused: boolean): void;
  /** Màn kết quả: thắng sáng hơn 10%, thua tối hơn 10% (map truong_sa). */
  setMood(mood: 'win' | 'lose' | null): void;
  dispose(): void;
}
