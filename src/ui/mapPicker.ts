import { manifest } from '../assets/manifest';
import type { App } from './app';
import { MAP_IDS, type MapId } from './settings';
import { icon } from './sprites';
import { strings as S } from './strings';

const THUMB: Record<MapId, string> = { truong_sa: manifest.ui_map_truong_sa, hai_phong: manifest.ui_map_hai_phong };
const ICON: Record<MapId, string> = { truong_sa: 'map-truong-sa', hai_phong: 'map-hai-phong' };

/** "Chọn map": danh sách thả xuống tùy biến có icon + ảnh xem trước (design/maps.md mục 5). Trả hàm đóng danh sách. */
export function mapPicker(app: App, host: HTMLElement) {
  host.innerHTML = `
    <button class="dd__btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${S.settings.map}"></button>
    <ul class="dd__list" role="listbox" tabindex="-1" hidden>${MAP_IDS.map((id) => `
      <li role="option" data-map="${id}" id="map-opt-${id}">
        ${icon(ICON[id], 'ico ico--map')}<img class="dd__thumb" src="${THUMB[id]}" alt="">
        <span class="dd__txt"><b>${S.map[id].name}</b><small>${S.map[id].desc}</small></span>${icon('i-check', 'ico dd__tick')}
      </li>`).join('')}</ul>`;
  const btn = host.querySelector<HTMLButtonElement>('.dd__btn')!;
  const list = host.querySelector<HTMLElement>('.dd__list')!;
  const opts = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'));
  let active = MAP_IDS.indexOf(app.settings.map);

  const paint = () => {
    const cur = app.settings.map;
    btn.innerHTML = `${icon(ICON[cur], 'ico ico--map is-sel')}<span class="dd__txt"><b>${S.map[cur].name}</b><small>${S.map[cur].desc}</small></span>${icon('i-back', 'ico dd__chev')}`;
    opts.forEach((o, i) => {
      o.setAttribute('aria-selected', String(o.dataset.map === cur));
      o.classList.toggle('is-active', i === active);
    });
    list.setAttribute('aria-activedescendant', opts[active].id);
  };
  const open = () => { list.hidden = false; btn.setAttribute('aria-expanded', 'true'); active = MAP_IDS.indexOf(app.settings.map); paint(); list.focus(); };
  const close = () => { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); };
  const choose = (i: number) => { app.updateSettings({ map: MAP_IDS[i] }); paint(); close(); };

  btn.addEventListener('click', () => (list.hidden ? open() : close()));
  list.addEventListener('click', (e) => {
    const o = (e.target as HTMLElement).closest<HTMLElement>('[data-map]');
    if (o) choose(MAP_IDS.indexOf(o.dataset.map as MapId));
  });
  list.addEventListener('keydown', (e) => {
    const move = (i: number) => { active = (i + opts.length) % opts.length; paint(); };
    if (e.key === 'ArrowDown') { e.preventDefault(); move(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(opts.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
  });
  document.addEventListener('pointerdown', (e) => { if (!list.hidden && !host.contains(e.target as Node)) close(); });
  paint();
  return { isOpen: () => !list.hidden, close };
}
