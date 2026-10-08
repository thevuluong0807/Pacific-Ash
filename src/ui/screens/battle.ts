import type { Board, Cell, CellMark, CellView, FireAction, GameEvent, MatchState, Orientation, PlayerId, ShipId } from '../../../design/core-api';
import { applyUpdate, mirrorResume } from '../../core/mirror';
import { createAi } from '../../core';
import { resumeStore } from '../../net/client';
import type { S2C, Update } from '../../net/protocol';
import { applyAction, effectiveAttack, isDamaged, isValidAction, previewCells, readyShips, runPassivesAtMatchStart, runPassivesAtTurnStart, skipTurn, sunkShips, viewOfEnemy } from '../../core';
import { cloneBoard, shipCells } from '../../core/board';
import { ROSTER, loadSpecs } from '../../core/specs';
import type { ScreenFactory } from '../app';
import { play } from '../audio';
import { EventPlayer, sleep } from '../eventPlayer';
import { cellName, GridView, type ShipDraw } from '../grid';
import { openSettings } from '../settingsOverlay';
import { icon } from '../sprites';
import { strings as S } from '../strings';
import { showToast } from '../toast';
import { tokens } from '../tokens';

const SPECS = loadSpecs();
const COLS = 'ABCDEFGHIJ';

type Torpedo = { axis: 'row' | 'col'; index: number; from: 'start' | 'end' };
/** Trạng thái nhắm của tàu đang chọn. */
interface Aim { rapid: Cell[]; precision: Cell | null; torpedo: Torpedo | null; center: Cell | null; orientation: Orientation }
const freshAim = (): Aim => ({ rapid: [], precision: null, torpedo: null, center: null, orientation: 'h' });

interface LogLine { turn: number; side: 'you' | 'foe'; text: string; kind: 'normal' | 'hit' | 'sunk' }

export const battleScreen: ScreenFactory<'battle'> = (app, root) => {
  const ses = app.session;
  if (!ses.match) { app.go('menu'); return { dispose() {} }; }
  let state: MatchState = ses.match;
  let view3d = app.settings.battleView === '3d' && !!app.battleScene;
  const FOCUS = ['center', 'enemy', 'own'] as const;
  let focusIdx = 0;
  const hotseat = ses.mode === 'hotseat';
  const online = ses.mode === 'online' ? ses.online! : null;
  const viewer: PlayerId = online ? online.me : hotseat ? state.turn : 0;
  const foe: PlayerId = viewer === 0 ? 1 : 0;

  let selected: ShipId | null = null;
  let aim = freshAim();
  let playing = false;
  let disposed = false;
  let thinking = false;
  let player: EventPlayer | null = null;
  let skipFn: (() => void) | null = null;
  let cineRunning = false;
  let enemyView: CellView[][] = viewOfEnemy(state, viewer).cells;
  let enemyMarks: CellMark[][] = viewOfEnemy(state, viewer).marks;
  let enemyRevealed = new Set<ShipId>(viewOfEnemy(state, viewer).revealed);
  let enemySunk = new Set<ShipId>(sunkShips(state, viewer));
  let ownBoard: Board = cloneBoard(state.boards[viewer]);
  // Lưới địch chỉ vẽ sprite tàu khi tàu đã chìm (design/ship-destroyer.md mục 1.4).
  const sunkDraws = new Map<ShipId, ShipDraw>(state.boards[foe].ships.filter((s) => s.sunk).map((s) => [s.id, { id: s.id, origin: s.origin, orientation: s.orientation, sunk: true }]));
  let turnNo = state.turnNumber;
  const log: LogLine[] = [];

  root.innerHTML = `
    <div class="battle" data-tab="enemy">
      <header class="battle__bar panel panel--c">
        <strong class="turn" data-turn></strong>
        <div class="tabs" role="tablist">
          <button class="chip" role="tab" data-tab-btn="enemy">${S.battle.theirs}</button>
          <button class="chip" role="tab" data-tab-btn="own">${S.battle.yours}</button>
        </div>
        <span class="bar__right">
          <button class="btn btn--tiny" data-view-toggle aria-pressed="false" title="${S.battle.viewTitle}"></button>
          <button class="btn btn--tiny" data-focus title="${S.battle.focusTitle}" hidden></button>
          <span class="turnclock" data-clock hidden></span>
          <button class="btn btn--tiny" data-skip hidden>${S.battle.skip}</button>
          <span class="speed"><span>${S.battle.speed.toUpperCase()}</span><button class="btn btn--tiny" data-speed></button></span>
          <button class="iconbtn" data-settings aria-label="${S.menu.settings}">${icon('i-gear')}</button>
        </span>
      </header>
      <section class="panel panel--c b-fleet"><h2 class="panel__title">${S.battle.fleet}</h2><div class="fleet" data-fleet></div>
        <h2 class="panel__title">${S.battle.enemyFleet}</h2><div class="efleet" data-efleet></div></section>
      <section class="b-boards">
        <div class="b-enemy"><h2 class="gridtitle gridtitle--foe">${S.battle.enemyGrid}</h2><div class="gridframe" data-egrid></div></div>
        <div class="b-own"><h2 class="gridtitle gridtitle--you">${S.battle.ownGrid}</h2><div class="gridframe" data-ogrid></div></div>
      </section>
      <aside class="panel panel--c b-side">
        <h2 class="panel__title">${S.battle.logTitle}</h2>
        <ol class="log" data-log></ol>
        <div class="infocard" data-info aria-live="polite"></div>
        <div class="actions">
          <button class="btn btn--small" data-cancel hidden>${icon('i-back')}${S.battle.cancel}</button>
          <button class="btn btn--small" data-rotate hidden>${icon('i-rotate')}${S.battle.rotate}</button>
        </div>
        <button class="btn btn--fire" data-fire disabled>${S.battle.fire}</button>
      </aside>
    </div>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const battleEl = q('.battle');
  const eGrid = new GridView({ interactive: true, onCell: (c) => onCell(c), onHandle: (a, i) => onHandle(a, i) });
  const oGrid = new GridView();
  q('[data-egrid]').appendChild(eGrid.el);
  q('[data-ogrid]').appendChild(oGrid.el);

  // ---------- chế độ xem 2D / 3D ----------
  /** Chế độ 3D: chạm ô lưới địch trong cảnh 3D (cùng logic với chạm ô ở lưới 2D). */
  function onCell3d(c: Cell) {
    if (!myTurn() || !selected) return;
    if (effKind(selected) === 'torpedo') { // chạm ô: chọn hàng/cột chứa ô; chạm lại cùng đường để đổi phía vào
      const axis = aim.torpedo?.axis ?? 'row', index = axis === 'row' ? c.y : c.x;
      const same = aim.torpedo && aim.torpedo.axis === axis && aim.torpedo.index === index;
      aim.torpedo = { axis, index, from: same && aim.torpedo!.from === 'start' ? 'end' : 'start' };
      update();
    } else onCell(c);
  }
  function applyView() {
    battleEl.dataset.view = view3d ? '3d' : '2d';
    const b = q<HTMLButtonElement>('[data-view-toggle]');
    b.textContent = view3d ? '3D' : '2D';
    b.setAttribute('aria-pressed', String(view3d));
    b.hidden = !app.battleScene;
    focusIdx = 0;
    const fb = q<HTMLButtonElement>('[data-focus]');
    fb.hidden = !view3d; fb.textContent = S.battle.focus.center;
    app.battleScene?.setView(view3d ? '3d' : '2d', view3d ? { onCell: onCell3d, onHover: () => {} } : undefined);
    if (view3d) app.battleScene?.resetOrbit();
    update();
  }
  function cycleFocus() {
    if (!view3d) return;
    focusIdx = (focusIdx + 1) % FOCUS.length;
    app.battleScene?.setFocus(FOCUS[focusIdx]);
    q('[data-focus]').textContent = S.battle.focus[FOCUS[focusIdx]];
  }
  function toggleView() {
    if (!app.battleScene) return;
    view3d = !view3d;
    app.updateSettings({ battleView: view3d ? '3d' : '2d' });
    applyView();
  }

  // ---------- nhắm ----------
  const buildAction = (): FireAction | null => {
    if (!selected) return null;
    switch (effKind(selected)) {
      case 'none': return null;
      case 'rapid': return aim.rapid.length ? { shipId: selected, target: { kind: 'rapid', cells: aim.rapid.length === 2 ? [aim.rapid[0], aim.rapid[1]] : [aim.rapid[0]] } } : null;
      case 'precision': return aim.precision ? { shipId: selected, target: { kind: 'precision', cell: aim.precision } } : null;
      case 'torpedo': return aim.torpedo ? { shipId: selected, target: { kind: 'torpedo', ...aim.torpedo } } : null;
      case 'cross': return aim.center ? { shipId: selected, target: { kind: 'cross', center: aim.center } } : null;
      case 'line3': return aim.center ? { shipId: selected, target: { kind: 'line3', center: aim.center, orientation: aim.orientation } } : null;
      case 'barrage': return { shipId: selected, target: { kind: 'barrage' } };
    }
  };
  /** Đòn thực tế của tàu mình (tàu hỏng khí tài chỉ bắn 1 ô). */
  const effKind = (id: ShipId) => effectiveAttack(state, viewer, id);
  const hurt = (id: ShipId) => !!ses.equipDamage && ownBoard.ships.some((s) => s.id === id && isDamaged(s));
  let awaiting = false; // online: đã gửi hành động, chờ server trả cập nhật
  const myTurn = () => !playing && !thinking && !awaiting && state.winner === null && state.turn === viewer;
  const fresh = (c: Cell) => enemyView[c.y][c.x] === 'unknown';

  function onCell(c: Cell) {
    if (!myTurn() || !selected) return;
    const kind = effKind(selected);
    if ((kind === 'rapid' || kind === 'precision') && !fresh(c)) return;
    if (kind === 'torpedo' || kind === 'barrage') return;
    if (kind === 'rapid') {
      const i = aim.rapid.findIndex((k) => k.x === c.x && k.y === c.y);
      if (i >= 0) aim.rapid.splice(i, 1);
      else aim.rapid = aim.rapid.length >= 2 ? [c] : [...aim.rapid, c];
    } else if (kind === 'precision') aim.precision = c;
    else aim.center = c;
    update();
  }

  function onHandle(axis: 'row' | 'col', index: number) {
    if (!myTurn() || !selected || effKind(selected) !== 'torpedo') return;
    const t = aim.torpedo;
    const same = t && t.axis === axis && t.index === index;
    aim.torpedo = { axis, index, from: same && t.from === 'start' ? 'end' : 'start' };
    update();
  }

  function selectShip(id: ShipId | null) {
    selected = id;
    aim = freshAim();
    update();
  }

  const clearAim = () => (aim.rapid.length || aim.precision || aim.torpedo || aim.center ? ((aim = freshAim()), update()) : selectShip(null));

  // ---------- nhật ký ----------
  function renderLog() {
    q('[data-log]').innerHTML = log.length ? log.map((l) =>
      `<li><span class="n">${String(l.turn).padStart(2, '0')}</span><b class="side side--${l.side}">${l.side === 'you' ? S.battle.side.you : hotseat ? S.battle.side.opponent : S.battle.side.foe}</b><span class="msg msg--${l.kind} msg--${l.side}">${l.text}</span></li>`).join('')
      : `<li class="log__empty">${S.battle.emptyLog}</li>`;
  }
  const side = (p: PlayerId): 'you' | 'foe' => (p === viewer ? 'you' : 'foe');

  /** Gộp các event của một hành động thành một dòng nhật ký. */
  function summarize(events: GameEvent[], turn: number): LogLine | null {
    const skipped = events.find((e): e is Extract<GameEvent, { type: 'TurnSkipped' }> => e.type === 'TurnSkipped');
    if (skipped) return { turn, side: side(skipped.player), text: S.battle.log.skipped, kind: 'normal' };
    const shot = events.find((e): e is Extract<GameEvent, { type: 'ShotFired' }> => e.type === 'ShotFired');
    if (!shot) return null;
    const sp = SPECS[shot.shipId];
    const cells = shot.cells;
    const where = shot.attack === 'sneak' ? cellName(cells[0]) : shot.attack === 'torpedo'
      ? (cells.length > 1 && cells[0].y === cells[1].y ? S.battle.log.row(cells[0].y + 1) : S.battle.log.col(COLS[cells[0].x]))
      : shot.attack === 'rapid' ? cells.map(cellName).join(', ')
      : shot.attack === 'line3' ? `${cellName(cells[0])}–${cellName(cells[cells.length - 1])}`
      : shot.attack === 'barrage' ? cells.map(cellName).join(', ')
      : cellName(cells[0]);
    const hits = events.filter((e) => e.type === 'CellResolved' && e.result === 'hit').length;
    const nul = events.find((e): e is Extract<GameEvent, { type: 'ShotNullified' }> => e.type === 'ShotNullified');
    const name = shot.source === 'passive' ? `${S.battle.log.sneak} ${where}` : `${sp.attackNameVi} ${where}`;
    const parts = [name, hits ? S.battle.log.hits(hits) : nul && nul.cells.length === cells.length ? S.battle.log.blocked(nul.cells.length) : S.battle.log.miss];
    if (nul && (hits || nul.cells.length < cells.length)) parts.push(S.battle.log.blocked(nul.cells.length));
    for (const e of events) {
      if (e.type === 'ShipSunk') parts.push(e.owner === viewer ? S.battle.log.sunkOwn(SPECS[e.shipId].nameVi) : S.battle.log.sunkEnemy(SPECS[e.shipId].nameVi));
      if (e.type === 'ShipRevealed') parts.push(S.battle.log.revealed(SPECS[e.shipId].nameVi));
    }
    const sunkEnemy = events.some((e) => e.type === 'ShipSunk' && e.owner !== viewer);
    const kind = sunkEnemy ? 'sunk' : shot.player !== viewer && hits ? 'hit' : 'normal';
    return { turn, side: side(shot.player), text: parts.join(' — '), kind };
  }

  // ---------- vẽ ----------
  function renderFleet() {
    const ready = new Set(readyShips(state, viewer));
    q('[data-fleet]').innerHTML = ownBoard.ships.map((s) => {
      const sp = SPECS[s.id];
      const sel = s.id === selected && !s.sunk;
      const isReady = ready.has(s.id) && myTurn();
      const passive = !!sp.passive, broken = hurt(s.id);
      const st = s.sunk ? 'sunk' : broken && passive ? 'broken' : passive ? 'passive' : sel ? 'sel' : s.cooldown > 0 ? 'cd' : 'ready';
      const pText = sp.passive?.kind === 'sneak' ? (s.rest > 0 ? S.battle.sneakRest : S.battle.sneakNext) : s.rest > 0 ? S.battle.guardRest : S.battle.guardReady;
      const label = s.sunk ? S.battle.sunk : broken && passive ? S.battle.brokenPassive : passive ? `${S.battle.passive} · ${pText}` : sel ? S.battle.selecting : s.cooldown > 0 ? S.battle.cooldown(s.cooldown) : S.battle.ready;
      const glyph = st === 'cd' ? icon('i-cooldown') : st === 'sunk' ? icon('i-sunk') : icon(passive ? `atk-${sp.passive!.kind}` : 'i-check');
      const cells = s.hits.map((h) => `<i class="cellsq ${s.sunk || h ? 'cellsq--hit' : ''}"></i>`).join('');
      return `<button class="frow frow--${st}" data-ship="${s.id}" aria-pressed="${sel}" ${isReady || sel ? '' : 'disabled'}>
        ${icon(`ship-${s.id}`, 'ico ico--ship')}
        <span class="frow__name">${sp.nameVi}</span><span class="frow__atk">${broken ? (passive ? S.battle.brokenTag : S.battle.brokenAtk) : sp.attackNameVi}</span>
        <span class="frow__cells">${cells}</span>
        <span class="frow__state">${glyph}${label.toUpperCase()}</span></button>`;
    }).join('');
    // Số tàu địch là công khai, loại tàu chỉ lộ khi bị tuần dương trúng hoặc đã chìm.
    const known = ROSTER.filter((id) => enemySunk.has(id) || enemyRevealed.has(id));
    const unknown = Math.max(0, state.boards[foe].ships.length - known.length);
    q('[data-efleet]').innerHTML = known.map((id) => {
      const st = enemySunk.has(id) ? 'sunk' : 'revealed';
      return `<span class="ef ef--${st}" title="${S.battle[st]}">${SPECS[id].nameVi}</span>`;
    }).join('') + Array.from({ length: unknown }, () => `<span class="ef ef--unknown" title="${S.battle.unknown}">?</span>`).join('');
  }

  function renderInfo(valid: boolean, kind: string | null) {
    const hint = state.winner !== null ? '' : thinking ? S.battle.thinking
      : playing ? '' : state.turn !== viewer || awaiting ? (online ? S.online.foeThinking : S.battle.waiting)
      : !selected ? S.battle.pickShip
      : kind === 'rapid' ? S.battle.hint.rapid(aim.rapid.length)
      : (S.battle.hint[kind as 'precision'] as string);
    const extra = view3d ? `<p class="info__hint">${S.battle.hint3d}</p>` : '';
    if (!selected || state.winner !== null) { q('[data-info]').innerHTML = `<p class="info__hint">${hint}</p>${extra}`; return; }
    const sp = SPECS[selected], broken = hurt(selected);
    q('[data-info]').innerHTML = `
      <small class="info__label">${S.battle.selectedShip.toUpperCase()}</small>
      <div class="info__head">${icon(`ship-${selected}`, 'ico ico--ship ico--hot')}<div><h3>${sp.nameVi}</h3><span class="info__atk">${broken ? S.battle.brokenAtk : sp.attackNameVi}</span></div></div>
      <div class="info__body">${icon(`atk-${broken ? 'precision' : sp.attack}`, 'ico ico--atk')}
        <div><p>${broken ? S.battle.brokenDesc : sp.descVi}</p><p>${S.battle.cdAfter(sp.cooldown)}</p><p class="info__hint ${valid ? 'is-ok' : ''}">${hint}</p>${extra}</div></div>`;
  }

  function update() {
    eGrid.setView(enemyView, enemyMarks);
    eGrid.setShips([...sunkDraws.values()]);
    if (view3d) app.battleScene?.setOverlay(ownBoard.shots.map((r) => r.map((s): CellView => (s === 'none' ? 'unknown' : s))), enemyView, enemyMarks);
    oGrid.setOwn(ownBoard);
    app.battleScene?.setFleets(ownBoard.ships, [...sunkDraws.values()]);
    app.battleScene?.syncHits(
      ownBoard.ships.filter((sh) => !sh.sunk).flatMap((sh) => shipCells(sh).filter((_, i) => sh.hits[i]).map((c) => ({ ...c, ship: sh.id }))),
      enemyView.flatMap((row, y) => row.flatMap((v, x) => (v === 'hit' ? [{ x, y }] : []))),
    );
    const kind = selected ? effKind(selected) : null;
    const active = myTurn() && !!selected;
    eGrid.el.classList.toggle('grid--barrage', active && kind === 'barrage'); // dội pháo: cả lưới địch nháy mờ + chữ "5 Ô NGẪU NHIÊN"
    eGrid.setHandles(active && kind === 'torpedo', aim.torpedo ?? undefined);
    eGrid.setDisabled(active && (kind === 'rapid' || kind === 'precision') ? (c) => !fresh(c) : null);
    const action = active ? buildAction() : null;
    const valid = !!action && isValidAction(state, viewer, action);
    if (action) eGrid.setPreview(previewCells(state, viewer, action), valid ? 'hostile' : 'bad', kind === 'torpedo');
    else eGrid.clearPreview();
    if (view3d) app.battleScene?.setAim({ shipId: action && selected ? selected : null, attack: kind, cells: action ? previewCells(state, viewer, action) : [], valid });
    eGrid.setSelected(kind === 'rapid' ? aim.rapid : kind === 'precision' && aim.precision ? [aim.precision] : [], kind === 'rapid');
    q<HTMLButtonElement>('[data-fire]').disabled = !valid;
    q('[data-rotate]').hidden = !(active && (kind === 'line3' || (view3d && kind === 'torpedo')));
    q('[data-cancel]').hidden = !active;
    const who = hotseat ? S.battle.player(state.turn + 1) : state.turn === viewer ? S.battle.yours : S.battle.theirs;
    q('[data-turn]').textContent = `${S.battle.turn(turnNo)} · ${who}`.toUpperCase();
    q('[data-skip]').hidden = !playing;
    q('[data-speed]').textContent = ({ off: S.settings.off, x1: S.settings.x1, x2: S.settings.x2 })[app.settings.anim];
    renderFleet();
    renderInfo(valid, kind);
    renderLog();
  }

  // ---------- phát event ----------
  const show = (e: GameEvent) => {
    switch (e.type) {
      case 'ShotFired': {
        const sp = SPECS[e.shipId];
        play(sp.attack === 'precision' ? 'sfx_cannon_heavy' : 'sfx_cannon_light');
        break;
      }
      case 'CellResolved': {
        if (e.player === viewer) { enemyView[e.cell.y][e.cell.x] = e.result; enemyMarks[e.cell.y][e.cell.x] = null; eGrid.setView(enemyView, enemyMarks); eGrid.flash(e.cell); }
        else { ownBoard.shots[e.cell.y][e.cell.x] = e.result; oGrid.setOwn(ownBoard); oGrid.flash(e.cell); }
        play(e.result === 'hit' ? 'sfx_explosion_small' : 'sfx_water_splash');
        break;
      }
      case 'PassiveTriggered':
        if (e.kind === 'sneak') showToast(battleEl, e.owner === viewer ? S.battle.toastSneakOwn : S.battle.toastSneakFoe, e.owner === viewer ? 'ok' : 'alert');
        break;
      case 'ShotNullified':
        if (e.owner === viewer) showToast(battleEl, S.battle.toastGuardOwn(e.cells.length), 'ok');
        else {
          for (const c of e.cells) if (enemyView[c.y][c.x] === 'unknown') enemyMarks[c.y][c.x] = 'blocked';
          eGrid.setView(enemyView, enemyMarks);
          for (const c of e.cells) eGrid.flash(c);
          showToast(battleEl, S.battle.toastGuardFoe(e.cells.length));
        }
        break;
      case 'ShipRevealed':
        if (e.owner !== viewer) { enemyRevealed.add(e.shipId); showToast(battleEl, S.battle.toastRevealed(SPECS[e.shipId].nameVi), 'ok'); }
        break;
      case 'ShipSunk': {
        const name = SPECS[e.shipId].nameVi;
        // Không có cinematic (tắt hoặc đang phát qua EventPlayer): cảnh 3D phía sau vẫn phát hoạt cảnh chìm rút gọn ở nền (wreckage.md 2.1)
        if (!cineRunning) app.battleScene?.sinkOnly(e, { viewer, speed: app.settings.anim === 'x2' ? 2 : 1, short: true, shake: app.settings.shake, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, onEvent: () => {} });
        if (e.owner === viewer) {
          ownBoard.ships.find((x) => x.id === e.shipId)!.sunk = true;
          showToast(battleEl, S.battle.toastSunkOwn(name), 'alert');
          battleEl.classList.remove('flash-alert');
          void battleEl.offsetWidth;
          battleEl.classList.add('flash-alert'); // viền đỏ lưới 400 ms (fx_flash_screen)
          play('sfx_alert');
        } else {
          enemySunk.add(e.shipId); enemyRevealed.add(e.shipId);
          for (const c of e.cells) enemyView[c.y][c.x] = 'sunk';
          sunkDraws.set(e.shipId, { id: e.shipId, origin: e.cells[0], orientation: e.cells[1] && e.cells[1].y !== e.cells[0].y ? 'v' : 'h', sunk: true });
          showToast(battleEl, S.battle.toastSunkEnemy(name), 'ok');
        }
        play('sfx_ship_sink');
        break;
      }
      case 'TurnSkipped':
        if (e.player === viewer) showToast(battleEl, S.battle.toastSkip);
        break;
      case 'MatchEnded': case 'TurnChanged': break;
    }
    update();
  };

  /** `next` = null: chưa chốt trạng thái (còn đoạn event tiếp theo của cùng loạt). */
  async function run(events: GameEvent[], next: MatchState | null, action: boolean) {
    for (const e of events) {
      if (e.type === 'CellResolved') ses.stats[e.player][e.result === 'hit' ? 'hit' : 'miss']++;
    }
    playing = true;
    if (action) battleEl.dataset.tab = events.some((e) => e.type === 'ShotFired' && e.player === viewer) ? 'enemy' : 'own';
    update();
    const view = app.battleScene;
    if (view && app.settings.anim !== 'off' && events.some((e) => e.type === 'ShotFired')) {
      // Cinematic 3D: event được phát đúng mốc (chạm ô -> marker 2D), lưới 2D mờ về 0.25 trong lúc chiếu
      battleEl.classList.add('cine');
      skipFn = () => view.skip();
      cineRunning = true;
      await view.play(events, {
        viewer, speed: app.settings.anim === 'x2' ? 2 : 1, short: app.settings.shortCinematic, shake: app.settings.shake, bars: app.settings.cineBars, sinkBg: app.settings.sinkBg,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, onEvent: show,
      });
      cineRunning = false;
      battleEl.classList.remove('cine');
    } else {
      player = new EventPlayer(app.settings.anim);
      skipFn = () => player?.skip();
      await player.play(events, show);
    }
    skipFn = null;
    if (disposed) return;
    const line = summarize(events, turnNo);
    if (line) log.unshift(line);
    if (log.length > 100) log.pop();
    if (!next) { playing = false; player = null; return; }
    if (ses.equipDamage) { // thông báo tàu mình vừa hỏng khí tài
      const was = new Set(ownBoard.ships.filter(isDamaged).map((x) => x.id));
      for (const sh of next.boards[viewer].ships) if (isDamaged(sh) && !was.has(sh.id)) showToast(battleEl, S.battle.toastBroken(SPECS[sh.id].nameVi), 'alert');
    }
    state = next;
    ses.match = next;
    turnNo = state.turnNumber;
    enemyView = viewOfEnemy(state, viewer).cells;
    enemyMarks = viewOfEnemy(state, viewer).marks;
    enemyRevealed = new Set(viewOfEnemy(state, viewer).revealed);
    enemySunk = new Set(sunkShips(state, viewer));
    ownBoard = cloneBoard(state.boards[viewer]);
    playing = false;
    player = null;
  }

  async function fire() {
    const action = buildAction();
    if (!action || !myTurn() || !isValidAction(state, viewer, action)) return;
    await perform(action);
  }

  async function perform(action: FireAction) {
    deadlineAt = null; tick();
    if (online) { // server giữ luật: gửi hành động, kết quả về qua `update`
      selected = null; aim = freshAim(); awaiting = true;
      online.net.send({ t: 'fire', action });
      update();
      return;
    }
    const r = applyAction(state, viewer, action);
    selected = null; aim = freshAim();
    await run(r.events, r.state, true);
    if (!disposed) await advance();
  }

  // ---------- đồng hồ lượt ----------
  let deadlineAt: number | null = null;
  const clockEl = q('[data-clock]');
  /** Cập nhật đồng hồ; chế độ cục bộ hết giờ thì tự bắn ngẫu nhiên hợp lệ (online: server tự bắn). */
  function tick() {
    const left = deadlineAt === null ? null : Math.max(0, Math.ceil((deadlineAt - performance.now()) / 1000));
    clockEl.hidden = left === null || state.winner !== null;
    if (left !== null) { clockEl.textContent = `⏱ ${left}s`; clockEl.classList.toggle('is-low', left <= 5); }
    if (left === 0 && !online && myTurn()) {
      deadlineAt = null;
      showToast(battleEl, S.battle.timeUp, 'alert');
      void createAi('easy', (Math.random() * 1e9) >>> 0).chooseAction({ state, me: viewer }).then((a) => { if (!disposed && myTurn()) void perform(a); });
    }
  }
  const clockTimer = setInterval(tick, 250);
  /** Lượt của người chơi cục bộ bắt đầu: đặt hạn. */
  const startLocalClock = () => { deadlineAt = ses.turnLimit > 0 ? performance.now() + ses.turnLimit * 1000 : null; tick(); };

  /** Dựng lại mọi bộ nhớ đệm hiển thị từ `state` (sau khi nối lại, không phát hoạt cảnh). */
  function syncFromState() {
    const v = viewOfEnemy(state, viewer);
    enemyView = v.cells; enemyMarks = v.marks; enemyRevealed = new Set(v.revealed); enemySunk = new Set(sunkShips(state, viewer));
    ownBoard = cloneBoard(state.boards[viewer]);
    sunkDraws.clear();
    for (const s of state.boards[foe].ships) if (s.sunk) sunkDraws.set(s.id, { id: s.id, origin: s.origin, orientation: s.orientation, sunk: true });
    turnNo = state.turnNumber; selected = null; aim = freshAim(); awaiting = false; playing = false;
    update();
  }

  /** Chạy tới khi tới lượt người điều khiển cần thao tác, hoặc rời màn hình. */
  async function advance() {
    for (;;) {
      if (disposed) return;
      if (state.winner !== null) {
        // kết thúc ván: slow-motion 0.4× khoảng 1 s, camera kéo ra rộng, rồi sang màn Kết quả
        if (app.settings.anim === 'off') await sleep(0);
        else if (app.battleScene) await app.battleScene.endShot();
        else await sleep(900);
        if (!disposed) app.go('result');
        return;
      }
      if (online) { update(); return; } // online: server lo kỹ năng nội tại, bỏ lượt; chờ cập nhật
      const p = state.turn;
      if (hotseat && p !== viewer) return void app.go('passDevice', { to: p, next: 'battle' });
      const pre = runPassivesAtTurnStart(state, p); // cắn lén đầu lượt của chủ tàu (rules.md 10.1); gọi lại trong cùng lượt thì không làm gì
      if (pre.state !== state) {
        if (pre.events.length) await run(pre.events, pre.state, true);
        else { state = pre.state; ses.match = state; }
        continue;
      }
      if (readyShips(state, p).length === 0) {
        const r = skipTurn(state, p);
        await run(r.events, r.state, false);
        continue;
      }
      if (!hotseat && p !== viewer) {
        thinking = true; update();
        const { aiThinkMinMs, aiThinkMaxMs } = tokens.motion;
        await sleep(aiThinkMinMs + Math.random() * (aiThinkMaxMs - aiThinkMinMs));
        if (disposed) return;
        const act = await ses.ai!.chooseAction({ state, me: p });
        thinking = false;
        const r = applyAction(state, p, act);
        await run(r.events, r.state, true);
        continue;
      }
      battleEl.dataset.tab = 'enemy';
      startLocalClock();
      update();
      return;
    }
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('[data-ship]');
    if (card && !(card as HTMLButtonElement).disabled) return selectShip(card.dataset.ship === selected ? null : (card.dataset.ship as ShipId));
    const tab = t.closest<HTMLElement>('[data-tab-btn]');
    if (tab) { battleEl.dataset.tab = tab.dataset.tabBtn!; return; }
    if (t.closest('[data-fire]')) void fire();
    else if (t.closest('[data-rotate]')) rotate();
    else if (t.closest('[data-cancel]')) clearAim();
    else if (t.closest('[data-skip]')) skipFn?.();
    else if (t.closest('[data-view-toggle]')) toggleView();
    else if (t.closest('[data-focus]')) cycleFocus();
    else if (t.closest('[data-speed]')) { app.updateSettings({ anim: ({ off: 'x1', x1: 'x2', x2: 'off' } as const)[app.settings.anim] }); update(); }
    else if (t.closest('[data-settings]')) openSettings(app, () => app.go('menu'));
  });
  function rotate() {
    if (selected && view3d && effKind(selected) === 'torpedo') { // 3D: đổi trục hàng ↔ cột (giữ ô đã chạm)
      const t = aim.torpedo;
      if (t) { aim.torpedo = { axis: t.axis === 'row' ? 'col' : 'row', index: t.index, from: t.from }; update(); }
      return;
    }
    if (!selected || effKind(selected) !== 'line3') return;
    aim.orientation = aim.orientation === 'h' ? 'v' : 'h';
    update();
  }

  /** Đầu trận: cắn lén của hai bên, mỗi phát một cảnh riêng. */
  // ---------- online: nhận cập nhật từ server, phát lần lượt ----------
  const netQueue: Update[] = [];
  let draining = false;
  /** Tách event thành từng cảnh: mỗi phát bắn (kể cả cắn lén chen giữa) một cảnh cinematic riêng. */
  function splitShots(events: GameEvent[]): GameEvent[][] {
    const chunks: GameEvent[][] = [];
    for (const e of events) {
      const cur = chunks.at(-1);
      const startsNew = !cur || (e.type === 'PassiveTriggered' && e.kind === 'sneak') || (e.type === 'ShotFired' && cur.some((x) => x.type === 'ShotFired'));
      if (startsNew) chunks.push([e]); else cur!.push(e);
    }
    return chunks;
  }
  async function drain() {
    if (draining) return;
    draining = true;
    while (netQueue.length && !disposed) {
      const u = netQueue.shift()!;
      const next = applyUpdate(state, u, viewer);
      awaiting = false;
      const chunks = splitShots(u.events);
      if (!chunks.length) { state = next; ses.match = next; }
      for (const [i, ch] of chunks.entries()) {
        await run(ch, i === chunks.length - 1 ? next : null, true);
        if (disposed) return;
      }
    }
    draining = false;
    if (!disposed) await advance();
  }
  let bar: HTMLElement | null = null;
  const setBar = (text: string | null) => {
    if (!text) { bar?.remove(); bar = null; return; }
    if (!bar) { bar = document.createElement('div'); bar.className = 'netbar'; battleEl.appendChild(bar); }
    bar.textContent = text;
  };
  let dropTimer: ReturnType<typeof setInterval> | null = null;
  function onNet(m: S2C) {
    if (m.t === 'update') { deadlineAt = m.update.remainMs === null ? null : performance.now() + m.update.remainMs; netQueue.push(m.update); void drain(); }
    else if (m.t === 'resumed' && m.snapshot.phase === 'playing') { // nối lại: bỏ hàng đợi cũ, dựng lại từ ảnh chụp của server
      netQueue.length = 0;
      state = mirrorResume(m.snapshot); ses.match = state;
      deadlineAt = m.snapshot.update!.remainMs === null ? null : performance.now() + m.snapshot.update!.remainMs;
      syncFromState();
      showToast(battleEl, S.online.backOnline, 'ok');
      if (state.winner !== null) void advance();
    }
    else if (m.t === 'opponentDropped') {
      let left = Math.round(m.graceMs / 1000);
      if (dropTimer) clearInterval(dropTimer);
      setBar(S.online.foeDropped(left));
      dropTimer = setInterval(() => { left = Math.max(0, left - 1); setBar(S.online.foeDropped(left)); }, 1000);
    }
    else if (m.t === 'opponentBack') { if (dropTimer) clearInterval(dropTimer); dropTimer = null; setBar(null); showToast(battleEl, S.online.foeBack, 'ok'); }
    else if (m.t === 'resumeFailed') { online!.net.close(); state = { ...state, winner: foe }; ses.match = state; showToast(battleEl, S.online.lost, 'alert'); void advance(); }
    else if (m.t === 'error') { awaiting = false; showToast(battleEl, m.msg, 'alert'); update(); }
    else if (m.t === 'opponentLeft' && state.winner === null) {
      state = { ...state, winner: viewer }; ses.match = state; showToast(battleEl, S.online.opponentLeft, 'ok');
      void advance();
    }
  }
  if (online) {
    online.net.subscribe(onNet);
    online.net.onStatus = (re) => setBar(re ? S.online.reconnecting : null);
    if (online.net.reconnecting) setBar(S.online.reconnecting);
    // hết thời gian nối lại mà chưa được: coi như thua
    online.net.onClose = () => { if (!disposed && state.winner === null) { state = { ...state, winner: foe }; ses.match = state; showToast(battleEl, S.online.lost, 'alert'); void advance(); } };
  }

  async function begin() {
    if (online) {
      if (online.resumed) { // mở lại trang: trạng thái đã có từ ảnh chụp, không phát lại hoạt cảnh
        const r = online.resumed; online.resumed = undefined;
        deadlineAt = r.update?.remainMs == null ? null : performance.now() + r.update.remainMs;
        syncFromState();
        await advance();
        return;
      }
      if (!ses.started && online.start) { ses.started = true; const r = online.start.update.remainMs; deadlineAt = r === null ? null : performance.now() + r; netQueue.push(online.start.update); }
      await drain();
      return;
    }
    if (!ses.started) {
      ses.started = true;
      const r = runPassivesAtMatchStart(state);
      const chunks: GameEvent[][] = [];
      for (const e of r.events) { if (e.type === 'PassiveTriggered' && e.kind === 'sneak') chunks.push([]); chunks.at(-1)?.push(e); }
      for (const [i, ch] of chunks.entries()) {
        await run(ch, i === chunks.length - 1 ? r.state : null, true);
        if (disposed) return;
      }
      if (!chunks.length) { state = r.state; ses.match = state; }
    }
    await advance();
  }
  applyView();
  void begin();
  return {
    dispose() {
      disposed = true; skipFn?.(); app.battleScene?.setView('2d');
      clearInterval(clockTimer); if (dropTimer) clearInterval(dropTimer);
      if (online) { online.net.subscribe(null); online.net.onClose = undefined; online.net.onStatus = undefined; online.net.send({ t: 'leave' }); online.net.close(); resumeStore.clear(); } // rời trận / sang màn kết quả: đóng kết nối
    },
    key(e) {
      if (e.key === 'Escape') clearAim();
      else if (e.key === 'r' || e.key === 'R') rotate();
      else if (e.key === 'v' || e.key === 'V') toggleView();
      else if (e.key === 'f' || e.key === 'F') cycleFocus();
    },
  };
};
