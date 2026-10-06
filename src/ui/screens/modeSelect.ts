import type { AiLevel } from '../../../design/core-api';
import { newSession, type ScreenFactory } from '../app';
import { strings as S } from '../strings';

export const modeSelectScreen: ScreenFactory<'modeSelect'> = (app, root) => {
  let level: AiLevel = app.session.difficulty;
  const levels: AiLevel[] = ['easy', 'medium', 'hard'];
  let equip = app.settings.equipDamage;
  let limit = app.settings.turnLimit;
  const LIMITS = [0, 15, 30, 60, 90, 120];
  root.innerHTML = `
    <div class="page">
      <header class="page__head"><h1>${S.mode.title}</h1></header>
      <div class="cards">
        <article class="card panel">
          <h2>${S.mode.pve.name}</h2><p>${S.mode.pve.desc}</p>
          <div class="seg" role="radiogroup" aria-label="Độ khó">
            ${levels.map((l) => `<button class="seg__btn" role="radio" data-level="${l}" aria-checked="${l === level}">${S.mode.difficulty[l]}</button>`).join('')}
          </div>
          <button class="btn btn--small btn--primary" data-start="pve">${S.mode.start}</button>
        </article>
        <article class="card panel">
          <h2>${S.mode.hotseat.name}</h2><p>${S.mode.hotseat.desc}</p>
          <button class="btn btn--small btn--primary" data-start="hotseat">${S.mode.start}</button>
        </article>
        <article class="card panel">
          <h2>${S.mode.online.name}</h2><p>${S.mode.online.desc}</p>
          <button class="btn btn--small btn--primary" data-online>${S.mode.start}</button>
        </article>
      </div>
      <section class="opt panel opt--col"><b>${S.mode.turnLimit}</b><small>${S.mode.turnLimitDesc}</small>
        <div class="seg" role="radiogroup" aria-label="${S.mode.turnLimit}">${LIMITS.map((s) => `<button class="seg__btn" role="radio" data-limit="${s}" aria-checked="${s === limit}">${s ? `${s}s` : S.mode.noLimit}</button>`).join('')}</div></section>
      <label class="opt panel"><input type="checkbox" data-equip ${equip ? 'checked' : ''}><span><b>${S.mode.equip}</b><small>${S.mode.equipDesc}</small></span></label>
      <footer class="page__foot"><button class="btn btn--small" data-back>${S.common.back}</button></footer>
    </div>`;
  const start = (mode: 'pve' | 'hotseat') => {
    app.updateSettings({ equipDamage: equip, turnLimit: limit });
    app.session = newSession(mode, level, equip, limit);
    app.go('placement', { player: 0 });
  };
  root.addEventListener('change', (e) => { const t = e.target as HTMLInputElement; if (t.matches('[data-equip]')) equip = t.checked; });
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.dataset.limit !== undefined) {
      limit = +t.dataset.limit;
      root.querySelectorAll('[data-limit]').forEach((b) => b.setAttribute('aria-checked', String(b === t)));
    } else if (t.dataset.level) {
      level = t.dataset.level as AiLevel;
      root.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-checked', String(b === t)));
    } else if (t.dataset.start) start(t.dataset.start as 'pve' | 'hotseat');
    else if (t.hasAttribute('data-online')) { app.updateSettings({ equipDamage: equip, turnLimit: limit }); app.go('online'); }
    else if (t.hasAttribute('data-back')) app.go('menu');
  });
  root.querySelector<HTMLElement>('[data-start="pve"]')!.focus();
  return { dispose() {}, key: (e) => { if (e.key === 'Escape') app.go('menu'); } };
};
