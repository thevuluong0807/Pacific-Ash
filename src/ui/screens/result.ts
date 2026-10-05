import type { ScreenFactory } from '../app';
import { newSession } from '../app';
import { strings as S } from '../strings';

export const resultScreen: ScreenFactory<'result'> = (app, root) => {
  const { match, mode, stats, difficulty, online } = app.session;
  const me = online?.me ?? 0;
  if (!match || match.winner === null) { app.go('menu'); return { dispose() {} }; }
  const w = match.winner;
  const win = mode === 'pve' ? w === 0 : mode === 'online' ? w === me : true;
  app.battleScene?.setOutcome(win);
  const title = mode === 'hotseat' ? S.result.winner(w + 1) : win ? S.result.win : S.result.lose;
  const pct = (i: 0 | 1) => { const t = stats[i].hit + stats[i].miss; return t ? `${Math.round((100 * stats[i].hit) / t)}%` : '–'; };
  const alive = (i: 0 | 1) => match.boards[i].ships.filter((s) => !s.sunk).length;
  const name = (i: 0 | 1) => (mode === 'hotseat' ? S.battle.player(i + 1) : i === me ? S.common.you : S.common.enemy);
  root.innerHTML = `
    <div class="result">
      <h1 class="result__title ${win ? 'is-win' : 'is-lose'}">${title}</h1>
      <section class="panel">
        <h2 class="panel__title">${S.result.stats}</h2>
        <table class="stat-table">
          <thead><tr><th></th><th>${name(0)}</th><th>${name(1)}</th></tr></thead>
          <tbody>
            <tr><td>${S.result.turns}</td><td colspan="2">${match.turnNumber}</td></tr>
            <tr><td>${S.result.hits}</td><td>${stats[0].hit}</td><td>${stats[1].hit}</td></tr>
            <tr><td>${S.result.misses}</td><td>${stats[0].miss}</td><td>${stats[1].miss}</td></tr>
            <tr><td>${S.result.accuracy}</td><td>${pct(0)}</td><td>${pct(1)}</td></tr>
            <tr><td>${S.result.alive}</td><td>${alive(0)}/${match.boards[0].ships.length}</td><td>${alive(1)}/${match.boards[1].ships.length}</td></tr>
          </tbody>
        </table>
      </section>
      <div class="actions">
        <button class="btn btn--small btn--primary" data-again>${mode === 'online' ? S.result.againOnline : S.result.again}</button>
        <button class="btn btn--small" data-menu>${S.result.menu}</button>
      </div>
    </div>`;
  root.querySelector('[data-again]')!.addEventListener('click', () => {
    if (mode === 'online') return app.go('online');
    app.session = newSession(mode, difficulty, app.session.equipDamage);
    app.go('placement', { player: 0 });
  });
  root.querySelector('[data-menu]')!.addEventListener('click', () => app.go('menu'));
  root.querySelector<HTMLElement>('[data-again]')!.focus();
  return { dispose() { app.battleScene?.setOutcome(null); } };
};
