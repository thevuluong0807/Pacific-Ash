import type { Cell, Orientation, PlacedShip, ShipId } from '../../../design/core-api';
import { createAi } from '../../core';
import { fits, freshShip, inGrid, isValidPlacement, randomPlacement, shipCells } from '../../core/board';
import { newMatch } from '../../core/match';
import { mulberry32, pick } from '../../core/rng';
import { MAX_FLEET, ROSTER, loadSpecs } from '../../core/specs';
import { mirrorStart } from '../../core/mirror';
import type { S2C } from '../../net/protocol';
import type { ScreenFactory } from '../app';
import { showToast } from '../toast';
import { GridView } from '../grid';
import type { RosterView } from '../profiles';
import { shipSprite } from '../shipArt';
import { strings as S } from '../strings';

const SPECS = loadSpecs();
const DRAG_THRESHOLD = 6;
/** Chỉ số ô nằm dưới con trỏ: giữa tàu; số ô chẵn thì lấy ô gần nhất bên trái (hoặc phía trên) so với tâm. */
const centerIndex = (size: number) => Math.ceil(size / 2) - 1;
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const placementScreen: ScreenFactory<'placement'> = (app, root, { player }) => {
  const ses = app.session;
  const store = app.profiles;
  const placed = new Map<ShipId, PlacedShip>();
  const trayOrient = Object.fromEntries(ROSTER.map((id) => [id, 'h'])) as Record<ShipId, Orientation>;
  let bring: ShipId[] = store.defaultBring(); // tàu mang vào trận
  let view: RosterView = store.view;
  let selected: ShipId | null = null;

  root.innerHTML = `
    <div class="page place">
      <header class="page__head">
        <h1>${S.placement.title}${ses.mode === 'hotseat' ? ` · ${S.placement.player(player + 1)}` : ses.mode === 'online' ? ` · ${S.online.room(ses.online!.code)}` : ''}</h1>
        <button class="btn btn--small" data-random>${S.placement.random}</button>
      </header>
      <p class="hint">${S.placement.hint}</p>
      <div class="place__body">
        <div class="place__grid" data-grid></div>
        <aside class="panel place__tray">
          <div class="seg" role="tablist">
            <button class="seg__btn" role="tab" data-view="all">${S.placement.viewAll}</button>
            <button class="seg__btn" role="tab" data-view="profile">${S.placement.viewProfile}</button>
          </div>
          <p class="hint" data-count></p>
          <div class="roster" data-roster></div>
          <h2 class="panel__title" data-trayTitle></h2>
          <div class="tray" data-tray></div>
          <p class="hint" data-status></p>
          <div class="actions">
            <button class="btn btn--small" data-rotate>${S.placement.rotate}</button>
            <button class="btn btn--small" data-reset>${S.placement.reset}</button>
            <button class="btn btn--small btn--primary" data-confirm disabled>${S.placement.confirm}</button>
          </div>
        </aside>
      </div>
      <footer class="page__foot"><button class="btn btn--small" data-back>${S.common.back}</button></footer>
    </div>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const grid = new GridView({ interactive: true, onCell: (c) => tapCell(c) });
  q('[data-grid]').appendChild(grid.el);

  const others = (id: ShipId) => [...placed.values()].filter((s) => s.id !== id);
  const shipAtCell = (c: Cell) => [...placed.values()].find((s) => shipCells(s).some((k) => k.x === c.x && k.y === c.y));
  const candidate = (id: ShipId, origin: Cell, o: Orientation) => freshShip(id, origin, o);
  const orientOf = (id: ShipId) => placed.get(id)?.orientation ?? trayOrient[id];
  /** Ô gốc của tàu khi con trỏ nằm ở ô `c` (con trỏ ở giữa tàu). */
  const originFor = (id: ShipId, c: Cell, o: Orientation): Cell => {
    if (isSq(id)) return { x: c.x, y: c.y }; // tàu vuông: góc trên-trái dưới con trỏ
    const k = centerIndex(SPECS[id].size);
    return { x: c.x - (o === 'h' ? k : 0), y: c.y - (o === 'v' ? k : 0) };
  };
  const isSq = (id: ShipId) => SPECS[id].shape === 'square';
  const sizeText = (id: ShipId) => (isSq(id) ? `${SPECS[id].size}×${SPECS[id].size}` : `${SPECS[id].size} ô`);
  const star = (on: boolean, attr: string) => `<button class="star" ${attr} aria-pressed="${on}" aria-label="${S.hangar.favorite}">${on ? '★' : '☆'}</button>`;

  // ---------- chọn tàu mang theo ----------
  function setBring(ids: ShipId[]) {
    bring = ROSTER.filter((id) => ids.includes(id)).slice(0, MAX_FLEET);
    for (const id of [...placed.keys()]) if (!bring.includes(id)) placed.delete(id);
    if (selected && !bring.includes(selected)) selected = null;
    selected ??= bring.find((id) => !placed.has(id)) ?? null;
    render();
  }

  function renderRoster() {
    q('[data-count]').textContent = S.placement.bring(bring.length, MAX_FLEET);
    root.querySelectorAll<HTMLElement>('[data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
    const roster = q('[data-roster]');
    if (view === 'all') {
      roster.innerHTML = store.sortShips(ROSTER).map((id) => {
        const on = bring.includes(id);
        return `<div class="rrow ${on ? 'is-on' : ''}">${star(store.isFavShip(id), `data-sfav="${id}"`)}
          <span class="rrow__name">${SPECS[id].nameVi} <small>${sizeText(id)}</small></span>
          <button class="btn btn--tiny" data-bring="${id}" ${!on && bring.length >= MAX_FLEET ? 'disabled' : ''}>${on ? S.placement.leave : S.placement.take}</button></div>`;
      }).join('');
    } else {
      const profs = store.profiles();
      roster.innerHTML = profs.length ? profs.map((p) => {
        const active = p.ships.length > 0 && p.ships.length === bring.length && p.ships.every((s) => bring.includes(s));
        return `<div class="rprof ${active ? 'is-on' : ''}">
          <div class="rrow">${star(p.favorite, `data-pfav="${p.id}"`)}<span class="rrow__name">${esc(p.name)} <small>${S.hangar.count(p.ships.length)}</small></span>
            <button class="btn btn--tiny" data-use="${p.id}" ${p.ships.length ? '' : 'disabled'}>${active ? S.placement.using : S.placement.use}</button></div>
          <div class="rprof__ships">${p.ships.length ? store.sortShips(p.ships).map((id) =>
            `<span class="mini">${star(store.isFavShip(id), `data-sfav="${id}"`)}${SPECS[id].nameVi}</span>`).join('') : `<small>${S.placement.emptyProfile}</small>`}</div></div>`;
      }).join('') : `<p class="hint">${S.placement.noProfiles}</p>`;
    }
  }

  function render() {
    renderRoster();
    const els = grid.setShips([...placed.values()].map((s) => ({ id: s.id, origin: s.origin, orientation: s.orientation })));
    for (const [id, el] of els) {
      el.classList.add('ship--grab');
      el.classList.toggle('ship--selected', id === selected);
      el.addEventListener('pointerdown', (e) => startDrag(id, e, true));
    }
    app.battleScene?.setFleets([...placed.values()], []);
    const tray = q('[data-tray]');
    tray.replaceChildren();
    const unplaced = bring.filter((i) => !placed.has(i));
    q('[data-trayTitle]').textContent = S.placement.tray(unplaced.length, bring.length);
    for (const id of unplaced) {
      const b = document.createElement('button');
      b.className = 'chip chip--ship';
      b.setAttribute('aria-pressed', String(id === selected));
      b.dataset.id = id;
      b.innerHTML = `<span>${SPECS[id].nameVi} · ${sizeText(id)}</span><span class="chip__o">${isSq(id) ? '' : trayOrient[id] === 'h' ? '↔' : '↕'}</span>`;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); startDrag(id, e, false); });
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); } });
      tray.appendChild(b);
    }
    const ok = bring.length > 0 && placed.size === bring.length && isValidPlacement([...placed.values()]);
    q<HTMLButtonElement>('[data-confirm]').disabled = !ok;
    q('[data-status]').textContent = bring.length === 0 ? S.placement.needOne : ok ? S.placement.allPlaced : '';
  }

  function select(id: ShipId | null) { selected = id; render(); }

  function place(id: ShipId, origin: Cell, o: Orientation): boolean {
    const cand = candidate(id, origin, o);
    if (!fits(others(id), cand)) return false;
    placed.set(id, cand);
    return true;
  }

  function tapCell(c: Cell) {
    const hit = shipAtCell(c);
    if (hit && hit.id !== selected) return select(hit.id);
    if (!selected || (hit && hit.id === selected)) return;
    if (!place(selected, originFor(selected, c, orientOf(selected)), orientOf(selected))) return shake();
    selected = bring.find((i) => !placed.has(i)) ?? selected;
    render();
  }

  function rotate() {
    if (!selected || isSq(selected)) return;
    const s = placed.get(selected);
    if (!s) { trayOrient[selected] = trayOrient[selected] === 'h' ? 'v' : 'h'; return render(); }
    const o: Orientation = s.orientation === 'h' ? 'v' : 'h';
    if (!place(selected, s.origin, o)) return shake();
    render();
  }

  function shake() {
    grid.el.classList.remove('shake');
    void grid.el.offsetWidth;
    grid.el.classList.add('shake');
  }

  function startDrag(id: ShipId, e: PointerEvent, fromGrid: boolean) {
    const sx = e.clientX, sy = e.clientY;
    let ghost: HTMLElement | null = null;
    let ghostOffset = { cellPx: 0, k: 0, o: 'h' as Orientation };
    const anchor = (c: Cell): Cell => originFor(id, c, orientOf(id));
    const move = (ev: PointerEvent) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return;
        const cellPx = grid.cell({ x: 0, y: 0 }).getBoundingClientRect().width;
        ghost = shipSprite(id, orientOf(id));
        ghost.classList.add('ship--ghost');
        const o = orientOf(id), n = SPECS[id].size, sq = isSq(id);
        ghostOffset = { cellPx, k: sq ? 0 : centerIndex(n), o };
        ghost.style.width = `${cellPx * (sq || o === 'h' ? n : 1)}px`;
        ghost.style.height = `${cellPx * (sq || o === 'v' ? n : 1)}px`;
        document.body.appendChild(ghost);
        if (fromGrid) grid.ship(id)?.classList.add('ship--lifted');
      }
      // con trỏ nằm giữa ô chỉ số k của tàu
      const { cellPx, k, o } = ghostOffset;
      ghost.style.left = `${ev.clientX - (o === 'h' ? (k + 0.5) * cellPx : cellPx / 2)}px`;
      ghost.style.top = `${ev.clientY - (o === 'v' ? (k + 0.5) * cellPx : cellPx / 2)}px`;
      const c = grid.cellAt(ev.clientX, ev.clientY);
      if (!c) return grid.clearPreview();
      const cand = candidate(id, anchor(c), orientOf(id));
      grid.setPreview(shipCells(cand).filter(inGrid), fits(others(id), cand) ? 'ok' : 'bad');
    };
    const up = (ev: PointerEvent) => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      grid.clearPreview();
      if (!ghost) return select(id); // chỉ chạm
      ghost.remove();
      const c = grid.cellAt(ev.clientX, ev.clientY);
      if (c) { if (!place(id, anchor(c), orientOf(id))) shake(); else selected = id; }
      else if (fromGrid) placed.delete(id);
      render();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }

  const confirm = () => {
    const list = bring.map((id) => placed.get(id)!).filter(Boolean);
    if (!list.length || list.length !== bring.length || !isValidPlacement(list)) return;
    store.setLastBring(bring);
    ses.placements[player] = list;
    if (ses.mode === 'online') return confirmOnline(list);
    if (ses.mode === 'pve') {
      // Đội hình AI là bản sao đội hình người chơi (rules.md mục 1).
      const rng = mulberry32(ses.seed);
      ses.placements[1] = randomPlacement(ses.seed + 1, bring);
      ses.ai = createAi(ses.difficulty, ses.seed + 2);
      ses.match = newMatch(list, ses.placements[1], ses.seed, pick(rng, [0, 1] as const), { equipDamage: ses.equipDamage });
      return app.go('battle');
    }
    if (player === 0) return app.go('passDevice', { to: 1, next: 'placement' });
    ses.match = newMatch(ses.placements[0]!, list, ses.seed, 0, { equipDamage: ses.equipDamage });
    app.go('passDevice', { to: 0, next: 'battle' });
  };

  /** Online: gửi đội hình lên server, chờ đối thủ xếp xong thì server gửi `start`. */
  let waiting = false;
  function confirmOnline(list: PlacedShip[]) {
    const on = ses.online!;
    if (waiting) return;
    if (!list.some((s) => SPECS[s.id].attack !== 'none')) return showToast(root, S.placement.needActive, 'alert');
    waiting = true;
    root.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { if (!b.hasAttribute('data-back')) b.disabled = true; });
    q('[data-status]').textContent = S.online.waitingOpponent;
    on.net.subscribe((m: S2C) => {
      if (m.t === 'start') {
        on.start = { first: m.first, seed: m.seed, foeCount: m.foeCount, update: m.update };
        ses.match = mirrorStart(list, on.me, m.foeCount, m.first, m.seed, on.equipDamage);
        on.net.subscribe(null);
        app.go('battle');
      } else if (m.t === 'opponentLeft') { on.net.close(); showToast(root, S.online.opponentLeftPlacing, 'alert'); setTimeout(() => app.go('online'), 1200); }
      else if (m.t === 'error') { waiting = false; root.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.disabled = false)); showToast(root, m.msg, 'alert'); render(); }
    });
    on.net.send({ t: 'place', ships: list });
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLElement>('button');
    if (!b) return;
    const d = b.dataset;
    if (d.view) { view = d.view as RosterView; store.setView(view); renderRoster(); }
    else if (d.bring) { const id = d.bring as ShipId; setBring(bring.includes(id) ? bring.filter((x) => x !== id) : [...bring, id]); }
    else if (d.use) setBring([...(store.get(d.use)?.ships ?? [])]);
    else if (d.sfav) { store.toggleFavShip(d.sfav as ShipId); renderRoster(); }
    else if (d.pfav) { store.toggleFavorite(d.pfav); renderRoster(); }
    else if ('random' in d) {
      placed.clear();
      randomPlacement((Math.random() * 0x7fffffff) >>> 0, bring).forEach((s) => placed.set(s.id, s));
      selected = null;
      render();
    } else if ('rotate' in d) rotate();
    else if ('reset' in d) { placed.clear(); selected = bring[0] ?? null; render(); }
    else if ('confirm' in d) confirm();
    else if ('back' in d) back();
  });
  const back = () => (ses.mode === 'online' ? (ses.online?.net.send({ t: 'leave' }), ses.online?.net.close(), app.go('online')) : ses.mode === 'pve' || player === 0 ? app.go('modeSelect') : app.go('passDevice', { to: 1, next: 'placement' }));
  selected = bring[0] ?? null;
  render();
  return {
    dispose() { /* listener kéo thả đã tự gỡ khi nhả chuột */ },
    key(e) {
      if (e.key === 'r' || e.key === 'R') rotate();
      else if (e.key === 'Escape') back();
      else if (e.key === 'Enter' && !(e.target as HTMLElement).closest('button, .grid')) confirm();
    },
  };
};
