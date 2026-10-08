import { HULLS, HULL_IDS, WEAPONS, WEAPON_IDS, canMount, designStats, type HullId, type ShipDesign, type WeaponId } from '../../arena/data';
import { maxRange } from '../../arena/bot';
import type { App } from '../app';
import { strings as S } from '../strings';
import { ShipViewer } from './shipViewer';

const T = S.arena, V = T.view;
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const bar = (label: string, v: number, text: string) => `<div class="bar"><span>${label}</span><i style="--v:${Math.max(0.03, Math.min(1, v))}"></i><b>${text}</b></div>`;
const deg = (r: number) => `${Math.round((r * 180) / Math.PI)}°`;

/**
 * Tab "Chế tạo tàu" của màn Khí tài. Giữa là model 3D xoay 360° / zoom / bay tới chỗ gắn đang chọn, kèm thẻ thông tin khí tài nối bằng đường chỉ
 * (kiểu màn lắp súng); hai bên là danh sách thiết kế và danh sách chỗ gắn + khí tài.
 */
export function mountShipyard(app: App, root: HTMLElement): { dispose(): void; setActive(on: boolean): void } {
  const store = app.designs;
  let cur: string = store.list()[0].id;
  let sel = 0;
  let armedDelete = false;
  let viewer: ShipViewer | null = null;
  let builtKey = '';
  let pinsKey = '';
  let active = false;

  root.innerHTML = `<div class="yard">
    <section class="panel yard__list" data-list></section>
    <section class="yard__center">
      <div class="panel" data-top></div>
      <div class="yard__view" data-view>
        <div class="vpins" data-pins></div>
        <svg class="vline" data-line aria-hidden="true"><polyline points="" /></svg>
        <div class="vinfo panel" data-info></div>
        <div class="vtools"><button class="chip" data-vall>${V.all}</button><button class="chip" data-vspin aria-pressed="true">${V.spin}</button></div>
        <div class="vhint">${V.hint}</div>
      </div>
      <div class="panel" data-bars></div>
    </section>
    <section class="panel yard__side" data-side></section>
  </div>`;
  const q = <E extends HTMLElement>(s: string) => root.querySelector<E>(s)!;

  function ensureViewer() {
    if (viewer) return viewer;
    viewer = new ShipViewer(q('[data-view]'));
    viewer.canvas.className = 'vcanvas';
    q('[data-view]').prepend(viewer.canvas);
    viewer.onFrame = layout;
    return viewer;
  }

  /** Vị trí chốt số và đường chỉ nối chốt đang chọn tới thẻ thông tin. */
  function layout() {
    if (!viewer) return;
    const dz = store.get(cur);
    if (!dz) return;
    const pins = q('[data-pins]').children;
    const box = q('[data-view]'), card = q('[data-info]');
    let sx = 0, sy = 0, ok = false;
    for (let i = 0; i < pins.length; i++) {
      const p = viewer.project(i), el = pins[i] as HTMLElement;
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
      el.hidden = p.behind;
      if (i === sel && !p.behind) { sx = p.x; sy = p.y; ok = true; }
    }
    const poly = q('[data-line]').firstElementChild as SVGPolylineElement;
    if (!ok) { poly.setAttribute('points', ''); return; }
    const cr = card.getBoundingClientRect(), br = box.getBoundingClientRect();
    const cx = Math.max(0, cr.left - br.left), cy = cr.top - br.top + 22;
    poly.setAttribute('points', `${sx},${sy} ${cx - 18},${cy} ${cx},${cy}`);
  }

  function info(dz: ShipDesign) {
    const h = HULLS[dz.hull], sp = h.slots[sel], id = dz.slots[sel];
    const arc = sp.half >= Math.PI ? V.full : `${deg(sp.half * 2)} (${deg(sp.center - sp.half)} → ${deg(sp.center + sp.half)})`;
    const meta = `<small class="vinfo__meta">${V.slot} ${sel + 1} · ${sp.label} · ${V.maxSize}: ${T.sizeNames[sp.size]} · ${V.arc}: ${arc}</small>`;
    if (!id) return `<h3>${V.slot} ${sel + 1}</h3>${meta}<p class="hint">${V.emptyInfo}</p>`;
    const w = WEAPONS[id];
    return `<h3><i style="background:${hex(w.color)}"></i>${w.nameVi}<span class="tag">${T.sizeNames[w.size]}</span></h3>${meta}<p>${w.descVi}</p>
      ${bar(T.wstat.dmg, w.dmg * (w.kind === 'rocket' ? 3 : 1) / 130, `${w.dmg}${w.kind === 'rocket' ? '×6' : ''}`)}
      ${bar(T.wstat.range, maxRange(id) / 2700, `${Math.round(maxRange(id))}`)}
      ${bar(T.wstat.reload, 1 - w.reload / 11, `${w.reload}s`)}
      ${bar(T.wstat.speed, w.v / 1250, `${w.v}`)}
      ${bar(T.wstat.splash, w.splash / 85, w.splash ? `${w.splash}` : '—')}
      ${bar(V.aim, w.yawMax / (Math.PI * 0.85), `${deg(w.yawMax)}/s`)}
      <small class="vinfo__meta">${V.elev}: ${w.elMax ? `${deg(w.elMin)} … ${deg(w.elHi)}` : V.noElev}${w.mag > 1 ? ` · ${V.ammo}: ${w.mag} ${V.perSalvo}` : ''}</small>`;
  }

  function render(focus?: string, fly = false) {
    const list = store.list();
    if (!store.get(cur)) cur = list[0].id;
    const dz = store.get(cur)!, h = HULLS[dz.hull];
    if (sel >= h.slots.length) sel = 0;
    const st = designStats(dz);

    q('[data-list]').innerHTML = `<h2 class="panel__title">${T.designs}</h2>
      <div class="plist">${list.map((d) => `<div class="prow ${d.id === cur ? 'is-sel' : ''}"><button class="prow__name" data-dsel="${d.id}" aria-pressed="${d.id === cur}"><span>${esc(d.name)}</span><small>${HULLS[d.hull].nameVi} · ${d.slots.filter(Boolean).length}/${d.slots.length}</small></button></div>`).join('')}</div>
      <div class="actions"><button class="btn btn--small" data-dnew>＋ ${T.newDesign}</button></div>
      <div class="actions"><button class="btn btn--tiny" data-ddup>${T.dup}</button>
        <button class="btn btn--tiny btn--danger" data-ddel ${list.length <= 1 ? 'disabled' : ''}>${armedDelete ? T.delConfirm : T.del}</button></div>`;

    q('[data-top]').innerHTML = `
      <label class="field"><span>${T.nameLabel}</span><input data-dname value="${esc(dz.name)}" maxlength="24"></label>
      <div class="hullpick">${HULL_IDS.map((id) => `<button class="hullcard ${id === dz.hull ? 'is-sel' : ''}" data-hull="${id}" aria-pressed="${id === dz.hull}"><b>${HULLS[id].nameVi}</b><small>${HULLS[id].slots.length} chỗ · ${HULLS[id].hp} HP</small></button>`).join('')}</div>
      <p class="hint">${h.descVi} ${T.hullHint}</p>`;

    q('[data-bars]').innerHTML = `<div class="statbars">
        ${bar(T.stat.hp, st.hp / 1000, String(st.hp))}
        ${bar(T.stat.speed, st.vmax / 58, `${st.vmax.toFixed(0)} đv/s`)}
        ${bar(T.stat.turn, st.turn / 0.6, `${((st.turn * 180) / Math.PI).toFixed(0)}°/s`)}
        ${bar(T.stat.weight, Math.min(1, st.weight / 28), `${st.weight} (−${((1 - st.speedMul) * 100).toFixed(0)}% tốc)`)}
        ${bar(T.stat.armed, st.count / st.slotCount, `${st.count}/${st.slotCount}`)}</div>`;

    const slotSize = h.slots[sel].size;
    q('[data-side]').innerHTML = `<h2 class="panel__title">${T.slots}</h2>
      <div class="slots">${h.slots.map((sp, i) => `<div class="slot ${i === sel ? 'is-sel' : ''}" data-slotrow="${i}">
        <button class="slot__n" data-slot="${i}">${i + 1}</button><span class="slot__l">${sp.label}<small>${T.size}: ${T.sizeNames[sp.size]}</small></span>
        <select data-pick="${i}" aria-label="${sp.label}"><option value="">${T.emptySlot}</option>${WEAPON_IDS.filter((w) => canMount(dz.hull, i, w)).map((w) => `<option value="${w}" ${dz.slots[i] === w ? 'selected' : ''}>${WEAPONS[w].nameVi}</option>`).join('')}</select>
      </div>`).join('')}</div>
      <h2 class="panel__title">${T.weapons}</h2>
      <p class="hint">${h.slots[sel].label} · ${T.size}: ${T.sizeNames[slotSize]}</p>
      <div class="codex">${WEAPON_IDS.map((id) => {
        const w = WEAPONS[id], ok = w.size <= slotSize, on = dz.slots[sel] === id;
        return `<button class="wcard ${on ? 'is-sel' : ''}" data-w="${id}" ${ok ? '' : 'disabled'} aria-pressed="${on}" title="${ok ? T.fits : T.tooBig}">
          <span class="wcard__sw" style="background:${hex(w.color)}"></span><b>${w.nameVi}</b><span class="tag">${T.sizeNames[w.size]}</span>
          <em>${T.wstat.dmg} ${w.dmg}${w.kind === 'rocket' ? '×6' : ''} · ${T.wstat.range} ${Math.round(maxRange(id))} · ${T.wstat.reload} ${w.reload}s</em></button>`;
      }).join('')}</div>`;

    q('[data-info]').innerHTML = info(dz);
    const pk = `${dz.hull}`;
    if (pk !== pinsKey) { pinsKey = pk; q('[data-pins]').innerHTML = h.slots.map((_, i) => `<button class="vpin" data-pin="${i}" aria-label="${T.slots} ${i + 1}">${i + 1}</button>`).join(''); }
    q('[data-pins]').querySelectorAll<HTMLElement>('.vpin').forEach((p, i) => p.classList.toggle('is-sel', i === sel));

    const key = JSON.stringify([dz.hull, dz.slots]);
    if (active && viewer && key !== builtKey) { viewer.setDesign(dz); builtKey = key; if (fly) viewer.focus(sel); }
    else if (fly && viewer) viewer.focus(sel);
    if (focus) root.querySelector<HTMLElement>(focus)?.focus();
  }

  const mutate = (fn: (dz: ShipDesign) => void) => { const dz = store.get(cur); if (!dz) return; const c: ShipDesign = { ...dz, slots: [...dz.slots] }; fn(c); store.update(c); };
  const pick = (i: number, focus?: string) => { sel = i; render(focus, true); };

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    const d = t.dataset;
    if (d.ddel === undefined) armedDelete = false;
    if (d.dsel) { cur = d.dsel; sel = 0; builtKey = ''; render(`[data-dsel="${d.dsel}"]`); viewer?.showAll(true); }
    else if (d.dnew !== undefined) { cur = store.create().id; sel = 0; builtKey = ''; render('[data-dname]'); q<HTMLInputElement>('[data-dname]').select(); viewer?.showAll(true); }
    else if (d.ddup !== undefined) { const c = store.duplicate(cur); if (c) cur = c.id; builtKey = ''; render('[data-dname]'); }
    else if (d.ddel !== undefined) { if (armedDelete) { store.remove(cur); armedDelete = false; builtKey = ''; render('[data-dnew]'); } else { armedDelete = true; render('[data-ddel]'); } }
    else if (d.hull) { mutate((c) => { c.hull = d.hull as HullId; c.slots = HULLS[c.hull].slots.map((_, i) => c.slots[i] ?? null); }); sel = 0; render(`[data-hull="${d.hull}"]`); }
    else if (d.slot !== undefined) pick(+d.slot, `[data-slot="${d.slot}"]`);
    else if (d.pin !== undefined) pick(+d.pin);
    else if (d.w) { const id = d.w as WeaponId; mutate((c) => { c.slots[sel] = c.slots[sel] === id ? null : id; }); render(`[data-w="${id}"]`, true); }
    else if (d.vall !== undefined) { viewer?.showAll(); }
    else if (d.vspin !== undefined && viewer) { viewer.autoRotate = !viewer.autoRotate; t.setAttribute('aria-pressed', String(viewer.autoRotate)); if (viewer.autoRotate) viewer.showAll(); }
  });
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.matches('[data-dname]')) { mutate((c) => { c.name = t.value.trim() || c.name; }); render(); }
    else if (t.matches('[data-pick]')) { const i = +(t as HTMLSelectElement).dataset.pick!; sel = i; mutate((c) => { c.slots[i] = (t.value || null) as WeaponId | null; }); render(`[data-pick="${i}"]`, true); }
  });
  render();
  return {
    dispose() { viewer?.dispose(); viewer = null; },
    setActive(on) {
      active = on;
      if (!on) { viewer?.stop(); return; }
      ensureViewer();
      const dz = store.get(cur)!;
      if (builtKey === '') { viewer!.setDesign(dz); builtKey = JSON.stringify([dz.hull, dz.slots]); }
      viewer!.start();
    },
  };
}
