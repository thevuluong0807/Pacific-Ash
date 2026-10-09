import { HULLS, MAX_PLAYERS, designStats, type ShipDesign } from '../../arena/data';
import { loadLobby, saveLobby, type BotLevel, type LobbyCfg, type LobbyKind, type TeamMode } from '../../arena/designs';
import type { SimPlayer } from '../../arena/sim';
import { OnlineClient, defaultServer } from '../../net/client';
import { normalizeCode, type ArenaRoomInfo, type ArenaSeatInfo } from '../../net/protocol';
import { TEAM_COLORS } from '../../render3d/arenaShips';
import type { ScreenFactory } from '../app';
import { strings as S } from '../strings';
import { showToast } from '../toast';

const T = S.arena;
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const teamCount = (m: TeamMode) => (m === 'ffa' ? MAX_PLAYERS : m === 't2' ? 2 : 3);
const teamCss = (n: number) => `#${TEAM_COLORS[n % TEAM_COLORS.length].toString(16).padStart(6, '0')}`;

/**
 * Phòng Hải chiến — một giao diện duy nhất cho cả hai kiểu chơi, đổi bằng công tắc:
 * **Custom nội bộ** = phòng riêng (chủ phòng thêm máy, chia đội, chỉnh độ khó), **Ghép trận online** = phòng công khai (không thêm máy, mỗi người một đội, tự bắt đầu sau đếm ngược).
 * Vào màn hình là có phòng + mã + link ngay (tự tạo/ghép), không cần bấm tạo. Không nối được máy chủ thì rơi về phòng nội bộ trên máy này (chỉ chơi với máy).
 */
export const arenaRoomScreen: ScreenFactory<'arenaRoom'> = (app, root, params) => {
  const cfg: LobbyCfg = loadLobby();
  const designs = () => app.designs.list();
  if (!app.designs.get(cfg.mine)) cfg.mine = designs()[0].id;
  const myDesign = (): ShipDesign => app.designs.get(cfg.mine) ?? designs()[0];
  const resolve = (id: string, k: number): ShipDesign => app.designs.get(id) ?? designs()[Math.abs(k) % designs().length];
  const server = () => app.settings.onlineServer || defaultServer();

  let net: OnlineClient | null = params.net ?? null;
  let room: ArenaRoomInfo | null = params.first ?? null; // phòng từ máy chủ (null: đang chờ hoặc phòng nội bộ)
  let local = false;                                     // không có máy chủ: phòng nội bộ
  let joinCode = '';
  let handed = false, left = false, configured = false, pending = false;

  // ---- phòng nội bộ (dự phòng khi không có máy chủ) ----
  const localInfo = (): ArenaRoomInfo => ({
    code: '', you: 0, host: 0, mode: cfg.mode, level: cfg.level, public: false, countdown: null, playing: false,
    seats: [{ name: cfg.name, bot: false, design: myDesign(), team: cfg.mode === 'ffa' ? 0 : cfg.mineTeam % teamCount(cfg.mode), connected: true },
      ...cfg.slots.map((s, i): ArenaSeatInfo | null => (s.on ? { name: `${T.bot} ${i + 1}`, bot: true, design: resolve(s.design, i), team: cfg.mode === 'ffa' ? i + 1 : s.team % teamCount(cfg.mode), connected: true } : null))],
  });
  const info = (): ArenaRoomInfo | null => (local ? localInfo() : room);

  const link = (code: string) => {
    const u = new URL(location.href);
    u.search = ''; u.hash = '';
    u.searchParams.set('arena', code);
    if (app.settings.onlineServer) u.searchParams.set('server', app.settings.onlineServer);
    return u.toString();
  };

  // ---- kết nối ----
  async function ensureNet(): Promise<boolean> {
    if (net && !net.closed) return true;
    try { net = await OnlineClient.connect(server(), 12000); } catch { net = null; return false; }
    net.subscribe(onMsg);
    net.onClose = () => { if (!left && !handed) { net = null; room = null; local = true; showToast(app.root, T.closed, 'alert'); render(); } };
    return true;
  }

  /** Vào phòng theo kiểu hiện tại (tự tạo phòng riêng hoặc ghép trận công khai) — hoặc vào bằng mã. */
  async function enter(code?: string) {
    room = null; configured = false; pending = true; render();
    if (!(await ensureNet())) { pending = false; local = true; showToast(app.root, T.connectFail, 'alert'); render(); return; }
    local = false;
    const base = { name: cfg.name, design: myDesign() };
    if (code) net!.send({ t: 'aJoin', code, ...base });
    else if (cfg.kind === 'queue') net!.send({ t: 'aQuick', ...base });
    else net!.send({ t: 'aCreate', ...base });
  }

  function onMsg(m: import('../../net/protocol').S2C) {
    if (m.t === 'aRoom') {
      pending = false; room = m.room;
      // phòng riêng vừa tạo: đẩy cấu hình đã lưu (máy, đội, độ khó) lên máy chủ một lần
      if (!configured && !m.room.public && m.room.you === m.room.host) {
        configured = true;
        net!.send({ t: 'aCfg', mode: cfg.mode, level: cfg.level });
        cfg.slots.forEach((sl, i) => { if (sl.on) net!.send({ t: 'aCfg', bot: { seat: i + 1, on: true, design: resolve(sl.design, i + (Date.now() >>> 4)), team: sl.team } }); });
      }
      cfg.kind = m.room.public ? 'queue' : 'custom';
      if (!(document.activeElement as HTMLElement | null)?.matches?.('select, input')) render();
    } else if (m.t === 'aStart') {
      handed = true;
      app.go('arena', { players: m.players, seed: m.seed, map: app.settings.map, online: { net: net!, you: m.you } });
    } else if (m.t === 'aClosed') { room = null; showToast(app.root, T.closed, 'alert'); void enter(); }
    else if (m.t === 'error') { pending = false; showToast(app.root, m.msg, 'alert'); if (!room) { local = !net; render(); } }
  }

  // ---- hiển thị ----
  const teamSel = (i: number, s: ArenaSeatInfo, r: ArenaRoomInfo, canEdit: boolean) => r.mode === 'ffa'
    ? `<span class="arow__team"><i class="swatch" style="background:${teamCss(i)}"></i></span>`
    : canEdit ? `<select data-seatteam="${i}" aria-label="${T.team}">${Array.from({ length: teamCount(r.mode) }, (_, k) => `<option value="${k}" ${s.team === k ? 'selected' : ''}>${T.team} ${T.teamNames[k]}</option>`).join('')}</select>`
    : `<span class="arow__team"><i class="swatch" style="background:${teamCss(s.team)}"></i> ${T.team} ${T.teamNames[s.team % T.teamNames.length]}</span>`;

  function render(focus?: string) {
    const r = info(), mine = myDesign(), st = designStats(mine);
    const pub = !!r?.public, isHost = !!r && r.host === r.you, canCfg = !!r && !pub && isHost;
    const kindBtn = (k: LobbyKind) => `<button class="seg__btn" role="radio" data-kind="${k}" aria-checked="${k === cfg.kind}" ${pending ? 'disabled' : ''}>${k === 'queue' ? T.kindQueue : T.kindCustom}</button>`;
    const humans = r ? r.seats.filter((s) => s && !s.bot).length : 0;
    const status = pending || (!r && !local) ? T.connecting : local ? T.localNote : pub ? (r!.countdown !== null ? T.countdown(r!.countdown) : T.needTwo) : isHost ? '' : T.waitHost;
    root.innerHTML = `
      <div class="page room">
        <header class="page__head"><h1>${T.lobbyTitle}</h1>
          <div class="seg" role="radiogroup" aria-label="${T.kindLabel}">${kindBtn('queue')}${kindBtn('custom')}</div></header>
        <div class="rtop">
          <section class="panel rcard"><h2 class="panel__title">${pub ? T.publicRoom : local ? T.localRoom : T.privateRoom}</h2>
            <div class="rcode"><span class="rcode__lbl">${T.roomCode}</span><b class="roomcode" aria-live="polite">${r?.code ? esc(r.code) : '—'}</b></div>
            <label class="field"><span>${T.link}</span><input data-link readonly value="${r?.code ? esc(link(r.code)) : ''}" placeholder="${local ? T.localNoLink : '…'}"></label>
            <div class="rcard__row"><button class="btn btn--tiny btn--primary" data-copy ${r?.code ? '' : 'disabled'}>${T.copy}</button>
              <label class="field field--inline"><span class="sr">${T.joinCode}</span><input data-code maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="${T.joinCode}" value="${esc(joinCode)}"></label>
              <button class="btn btn--tiny" data-join ${pending ? 'disabled' : ''}>${T.joinBtn}</button></div></section>
          <section class="panel rcard"><h2 class="panel__title">${T.mySetup}</h2>
            <label class="field"><span>${T.myName}</span><input data-name maxlength="16" value="${esc(cfg.name)}"></label>
            <label class="field"><span>${T.design}</span><select data-mine aria-label="${T.design}">${designs().map((d) => `<option value="${d.id}" ${d.id === cfg.mine ? 'selected' : ''}>${esc(d.name)} · ${HULLS[d.hull].nameVi}</option>`).join('')}</select></label>
            <small class="hint">${HULLS[mine.hull].nameVi} · ${st.vmax.toFixed(0)} đv/s · ${st.hp} HP · ${st.count}/${st.slotCount} khí tài</small></section>
        </div>
        <section class="panel rseats"><h2 class="panel__title">${T.seats} <span class="hint">${T.players(r ? r.seats.filter(Boolean).length : 0)}${pub ? '' : ''}</span></h2>
          ${Array.from({ length: MAX_PLAYERS }, (_, i) => {
            const s = r?.seats[i] ?? null;
            if (!s) return `<div class="arow is-off"><span class="arow__n">${i + 1}</span><span class="hint">${T.empty}</span><span></span><span></span>${canCfg || (local && !pub) ? `<button class="btn btn--tiny" data-addbot="${i}">${T.addBot}</button>` : '<span></span>'}</div>`;
            const me = !!r && i === r.you, tags = `${me ? `<span class="tag">${S.common.you}</span>` : ''}${r && i === r.host && !s.bot && !local && !pub ? `<span class="tag">${T.host}</span>` : ''}${s.bot ? `<span class="tag">${T.bot}</span>` : ''}`;
            const editTeam = me || ((canCfg || local) && s.bot);
            return `<div class="arow ${me ? 'is-me' : ''}"><span class="arow__n">${i + 1}</span><span class="arow__name"><b>${esc(s.name)}</b>${tags}${s.connected ? '' : ' …'}</span>
              <span class="arow__design">${esc(s.design.name)} <small>${HULLS[s.design.hull].nameVi}</small></span>${teamSel(i, s, r!, editTeam)}
              ${(canCfg || local) && s.bot ? `<button class="btn btn--tiny" data-rmbot="${i}">${T.removeBot}</button>` : '<span></span>'}</div>`;
          }).join('')}</section>
        <section class="panel rset">${pub ? `<small class="rset__note">${T.queueNote}</small>` : `<b class="rset__l">${T.mode}</b>
          <div class="seg" role="radiogroup">${(['ffa', 't2', 't3'] as TeamMode[]).map((m) => `<button class="seg__btn" role="radio" data-mode="${m}" aria-checked="${m === (r?.mode ?? cfg.mode)}" ${canCfg || local ? '' : 'disabled'}>${T.modes[m]}</button>`).join('')}</div>
          <b class="rset__l">${T.level}</b>
          <div class="seg" role="radiogroup">${(['easy', 'medium', 'hard'] as BotLevel[]).map((l) => `<button class="seg__btn" role="radio" data-level="${l}" aria-checked="${l === (r?.level ?? cfg.level)}" ${canCfg || local ? '' : 'disabled'}>${S.mode.difficulty[l]}</button>`).join('')}</div>`}</section>
        <footer class="page__foot"><span class="hint" aria-live="polite">${status}${humans < 0 ? '' : ''}</span>
          <button class="btn btn--small" data-leave>${T.leaveRoom}</button>
          ${(canCfg || local) ? `<button class="btn btn--small btn--primary" data-start>${local ? T.localStart : T.startMatch}</button>` : ''}</footer>
      </div>`;
    if (focus) root.querySelector<HTMLElement>(focus)?.focus();
  }

  // ---- thao tác ----
  const teamsOk = (r: ArenaRoomInfo) => new Set(r.seats.map((s, i) => (s ? (r.mode === 'ffa' ? i : s.team) : -1)).filter((t) => t >= 0)).size >= 2;
  function startLocal() {
    const r = localInfo();
    if (!teamsOk(r)) return void showToast(app.root, T.needFoe, 'alert');
    saveLobby(cfg);
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    const players: SimPlayer[] = r.seats.map((s, i) => (s ? { name: s.name, team: r.mode === 'ffa' ? i : s.team, design: s.design, bot: s.bot ? cfg.level : undefined } : null)).filter(Boolean) as SimPlayer[];
    handed = true;
    app.go('arena', { players, seed, map: app.settings.map });
  }
  const leave = () => { left = true; net?.send({ t: 'aLeave' }); net?.close(); app.go('modeSelect'); };
  const setBot = (i: number, on: boolean, team?: number) => {
    if (local) { if (i >= 1) { const s = cfg.slots[i - 1]; s.on = on; if (team !== undefined) s.team = team; saveLobby(cfg); render(); } return; }
    net?.send({ t: 'aCfg', bot: { seat: i, on, team } });
  };

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t || t.hasAttribute('disabled')) return;
    const d = t.dataset;
    if (t.hasAttribute('data-leave')) return leave();
    if (t.hasAttribute('data-start')) return local ? startLocal() : net?.send({ t: 'aStart' });
    if (d.kind) { if (cfg.kind !== d.kind) { if (local && d.kind === 'queue') { cfg.kind = 'queue'; local = false; void enter(); } else { cfg.kind = d.kind as LobbyKind; saveLobby(cfg); void enter(); } } return; }
    if (t.hasAttribute('data-copy')) { const c = room?.code; if (c) void navigator.clipboard?.writeText(link(c)).then(() => showToast(app.root, T.copied, 'info'), () => undefined); root.querySelector<HTMLInputElement>('[data-link]')?.select(); return; }
    if (t.hasAttribute('data-join')) { const c = normalizeCode(joinCode); if (c.length === 5) void enter(c); return; }
    if (d.addbot !== undefined) return setBot(+d.addbot, true);
    if (d.rmbot !== undefined) return setBot(+d.rmbot, false);
    if (d.mode) { cfg.mode = d.mode as TeamMode; cfg.mineTeam %= teamCount(cfg.mode); cfg.slots.forEach((s) => { s.team %= teamCount(cfg.mode); }); saveLobby(cfg); if (!local) net?.send({ t: 'aCfg', mode: cfg.mode }); render(`[data-mode="${d.mode}"]`); return; }
    if (d.level) { cfg.level = d.level as BotLevel; saveLobby(cfg); if (!local) net?.send({ t: 'aCfg', level: cfg.level }); render(`[data-level="${d.level}"]`); }
  });
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('[data-code]')) { t.value = normalizeCode(t.value); joinCode = t.value; }
    else if (t.matches('[data-name]')) { cfg.name = t.value; saveLobby(cfg); }
  });
  root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.target as HTMLElement).matches('[data-code]')) { const c = normalizeCode(joinCode); if (c.length === 5) void enter(c); } });
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement | HTMLInputElement;
    if (t.matches('[data-name]')) { const n = t.value.trim() || 'Thủy thủ'; cfg.name = n; saveLobby(cfg); if (!local) net?.send({ t: 'aSet', name: n }); render(); }
    else if (t.matches('[data-mine]')) { cfg.mine = t.value; saveLobby(cfg); if (!local) net?.send({ t: 'aSet', design: myDesign() }); render(); }
    else if (t.matches('[data-seatteam]')) {
      const i = +(t as HTMLSelectElement).dataset.seatteam!, v = +t.value, r = info();
      if (local) { if (i === 0) cfg.mineTeam = v; else cfg.slots[i - 1].team = v; saveLobby(cfg); render(); }
      else if (r && i === r.you) net?.send({ t: 'aSet', team: v });
      else setBot(i, true, v);
    }
  });

  // khởi động: đã có kết nối từ trận trước thì giữ phòng; còn lại tự vào phòng theo kiểu đã lưu (hoặc theo link/mã)
  if (net) { net.subscribe(onMsg); net.onClose = () => { if (!left && !handed) { net = null; room = null; local = true; showToast(app.root, T.closed, 'alert'); render(); } }; render(); }
  else if (app.pendingArena) { joinCode = normalizeCode(app.pendingArena); app.pendingArena = undefined; render(); void enter(joinCode); }
  else void enter();

  return { dispose() { if (!handed && !left && net) { net.send({ t: 'aLeave' }); net.close(); } }, key: (e) => { if (e.key === 'Escape') leave(); } };
};
