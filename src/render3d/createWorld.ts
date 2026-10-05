import type * as THREE from 'three';
import type { MapId } from '../ui/settings';
import { DuskWorld } from './duskWorld';
import type { Layout, MapWorld } from './mapWorld';
import { NightWorld } from './world';

/** Mỗi map là một lớp cảnh riêng, nạp theo nhu cầu, giải phóng khi đổi map (maps.md mục 5). */
export function createWorld(map: MapId, scene: THREE.Scene, renderer: THREE.WebGLRenderer, layout: Layout): MapWorld {
  return map === 'truong_sa' ? new DuskWorld(scene, layout) : new NightWorld(scene, renderer, layout);
}
