import type { Orientation, ShipId } from '../../design/core-api';
import { loadSpecs } from '../core/specs';
import { manifest } from '../assets/manifest';

/** Sprite 2D của người thiết kế (design/art). Mũi hình hướng +x; đặt dọc thì xoay 90° theo chiều kim đồng hồ. */
const ART: Record<ShipId, string> = {
  destroyer: manifest.ui_ship_destroyer, cruiser: manifest.ui_ship_cruiser, submarine: manifest.ui_ship_submarine,
  missile: manifest.ui_ship_missile, carrier: manifest.ui_ship_carrier,
  raider: manifest.ui_ship_raider, escort: manifest.ui_ship_escort,
};

export function shipSprite(id: ShipId, orientation: Orientation): HTMLElement {
  const el = document.createElement('div');
  const square = loadSpecs()[id].shape === 'square';
  el.className = `ship ship--${square ? 'h ship--sq' : orientation}`;
  el.style.setProperty('--size', String(loadSpecs()[id].size));
  el.dataset.ship = id;
  const img = document.createElement('img');
  img.src = ART[id]; img.alt = ''; img.draggable = false;
  el.appendChild(img);
  return el;
}
