import { HULLS, MAX_PLAYERS, designStats, type ShipDesign } from '../../arena/data';
import { loadLobby, saveLobby, type BotLevel, type LobbyCfg, type TeamMode } from '../../arena/designs';
import type { SimPlayer } from '../../arena/sim';
import { TEAM_COLORS } from '../../render3d/arenaShips';
import type { ScreenFactory } from '../app';
import { strings as S } from '../strings';

const T = S.arena;
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const teamCount = (m: TeamMode) => (m === 'ffa' ? MAX_PLAYERS : m === 't2' ? 2 : 3);
const css = (n: number) => `#${TEAM_COLORS[n % TEAM_COLORS.length].toString(16).padStart(6, '0')}`;

/** Sảnh Hải chiến: bạn + tối đa 5 tàu máy (chơi mạng nhiều người chưa mở), chọn thiết kế và đội cho từng chỗ. */
export const arenaLobbyScreen: ScreenFactory<'arenaLobby'> = (app, root) => {
  const cfg: LobbyCfg = loadLobby();
  const designs = () => app.designs.list();
  if (!app.designs.get(cfg.mine)) cfg.mine = designs()[0].id;

  const teamOf = (i: number): number => (cfg.mode === 'ffa' ? i : (i === 0 ? cfg.mineTeam : cfg.slots[i - 1].team) % teamCount(cfg.mode));
  const active = () => [0, ...cfg.slots.map((s, i) => (s.on ? i + 1 : -1)).filter((i) => i > 0)];
  const teamsOk = () => new Set(active().map(teamOf)).size >= 2;

  const designOpts = (cur: string, random: boolean) =>
    `${random ? `<option value="random" ${cur === 'random' ? 'selected' : ''}>${T.random}</option>` : ''}${designs().map((d) => `<option value="${d.id}" ${d.id === cur ? 'selected' : ''}>${esc(d.name)} · ${HULLS[d.hull].nameVi}</option>`).join('')}`;
  const teamOpts = (i: number) => cfg.mode === 'ffa' ? `<span class="swatch" style="background:${css(i)}"></span>` :
    `<select data-team="${i}" aria-label="${T.team}">${Array.from({ length: teamCount(cfg.mode) }, (_, k) => `<option value="${k}" ${teamOf(i) === k ? 'selected' : ''}>${T.team} ${T.teamNames[k]}</option>`).join('')}</select>`;

  function render() {
    const mine = app.designs.get(cfg.mine)!;
    const st = designStats(mine);
    root.innerHTML = `
      <div class="page">
        <header class="page__head"><h1>${T.lobbyTitle}</h1><span class="hint">${T.players(active().length)}</span></header>
        <section class="panel lobby">
          <div class="lrow lrow--me"><span class="lrow__n">1</span><b>${S.common.you}</b>
            <select data-mine aria-label="${T.design}">${designOpts(cfg.mine, false)}</select>${teamOpts(0)}
            <small>${HULLS[mine.hull].nameVi} · ${st.vmax.toFixed(0)} đv/s · ${st.hp} HP · ${st.count}/${st.slotCount} khí tài</small></div>
          ${cfg.slots.map((sl, i) => `<div class="lrow ${sl.on ? '' : 'is-off'}"><span class="lrow__n">${i + 2}</span>
            <button class="chip" data-toggle="${i}" aria-pressed="${sl.on}">${sl.on ? `${T.bot} ${i + 1}` : T.empty}</button>
            <select data-design="${i}" ${sl.on ? '' : 'disabled'} aria-label="${T.design}">${designOpts(sl.design, true)}</select>${sl.on ? teamOpts(i + 1) : '<span></span>'}
            <small></small></div>`).join('')}
        </section>
        <section class="panel opt--col"><b>${T.mode}</b>
          <div class="seg" role="radiogroup">${(['ffa', 't2', 't3'] as TeamMode[]).map((m) => `<button class="seg__btn" role="radio" data-mode="${m}" aria-checked="${m === cfg.mode}">${T.modes[m]}</button>`).join('')}</div>
          <b>${T.level}</b>
          <div class="seg" role="radiogroup">${(['easy', 'medium', 'hard'] as BotLevel[]).map((l) => `<button class="seg__btn" role="radio" data-level="${l}" aria-checked="${l === cfg.level}">${S.mode.difficulty[l]}</button>`).join('')}</div>
          <small class="hint">${T.online}</small>
        </section>
        <footer class="page__foot"><span class="hint" data-warn>${teamsOk() ? '' : T.needFoe}</span>
          <button class="btn btn--small" data-back>${S.common.back}</button>
          <button class="btn btn--small btn--primary" data-go ${teamsOk() ? '' : 'disabled'}>${T.start}</button></footer>
      </div>`;
  }

  const start = () => {
    saveLobby(cfg);
    const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
    const pool = designs();
    const pick = (id: string, k: number): ShipDesign => app.designs.get(id) ?? pool[(seed + k * 7) % pool.length];
    const players: SimPlayer[] = [{ name: S.common.you, team: teamOf(0), design: pick(cfg.mine, 0) }];
    cfg.slots.forEach((sl, i) => { if (sl.on) players.push({ name: `${T.bot} ${i + 1}`, team: teamOf(i + 1), design: pick(sl.design, i + 1), bot: cfg.level }); });
    app.go('arena', { players, seed, map: app.settings.map });
  };

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    const d = t.dataset;
    if (t.hasAttribute('data-back')) return app.go('modeSelect');
    if (t.hasAttribute('data-go')) return start();
    if (d.toggle !== undefined) { const s = cfg.slots[+d.toggle]; s.on = !s.on; saveLobby(cfg); render(); root.querySelector<HTMLElement>(`[data-toggle="${d.toggle}"]`)?.focus(); }
    else if (d.mode) { cfg.mode = d.mode as TeamMode; cfg.mineTeam %= teamCount(cfg.mode); cfg.slots.forEach((s) => { s.team %= teamCount(cfg.mode); }); saveLobby(cfg); render(); root.querySelector<HTMLElement>(`[data-mode="${d.mode}"]`)?.focus(); }
    else if (d.level) { cfg.level = d.level as BotLevel; saveLobby(cfg); render(); root.querySelector<HTMLElement>(`[data-level="${d.level}"]`)?.focus(); }
  });
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.matches('[data-mine]')) cfg.mine = t.value;
    else if (t.matches('[data-design]')) cfg.slots[+t.dataset.design!].design = t.value;
    else if (t.matches('[data-team]')) { const i = +t.dataset.team!; if (i === 0) cfg.mineTeam = +t.value; else cfg.slots[i - 1].team = +t.value; }
    else return;
    saveLobby(cfg);
    render();
  });
  render();
  root.querySelector<HTMLElement>('[data-go]')?.focus();
  return { dispose() {}, key: (e) => { if (e.key === 'Escape') app.go('modeSelect'); } };
};
