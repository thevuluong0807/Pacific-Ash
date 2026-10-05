import type { ShipId } from '../../../design/core-api';
import { MAX_FLEET, ROSTER, loadSpecs } from '../../core';
import type { ScreenFactory } from '../app';
import { icon } from '../sprites';
import { shipSprite } from '../shipArt';
import { strings as S } from '../strings';

const SPECS = loadSpecs();
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Khí tài: quản lý profile (tạo, đổi tên, gắn tàu, yêu thích) và xem thông tin tàu. Xoay 3D làm ở P5-02. */
export const hangarScreen: ScreenFactory<'hangar'> = (app, root) => {
  const store = app.profiles;
  let selected: string | null = store.profiles()[0]?.id ?? null;
  let focusShip: ShipId = ROSTER[0];
  let armedDelete = false;

  root.innerHTML = `
    <div class="page">
      <header class="page__head"><h1>${S.hangar.title}</h1></header>
      <div class="hangar2">
        <section class="panel" data-plist></section>
        <section class="panel" data-pdetail></section>
        <section class="panel hangar2__ships" data-ships></section>
        <section class="panel hangar2__info" data-info></section>
      </div>
      <footer class="page__foot">
        <button class="btn btn--small" data-back>${S.common.back}</button>
        <button class="btn btn--small" disabled aria-disabled="true" title="${S.common.locked}">${S.hangar.preview}</button>
      </footer>
    </div>`;
  const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const star = (on: boolean, attr: string, label: string) =>
    `<button class="star" ${attr} aria-pressed="${on}" aria-label="${label}" title="${label}">${on ? '★' : '☆'}</button>`;

  function render(focus?: string) {
    const profs = store.profiles();
    if (selected && !store.get(selected)) selected = profs[0]?.id ?? null;
    const cur = selected ? store.get(selected) : undefined;

    q('[data-plist]').innerHTML = `
      <h2 class="panel__title">${S.hangar.profiles}</h2>
      <div class="plist">${profs.length ? profs.map((p) => `
        <div class="prow ${p.id === selected ? 'is-sel' : ''}">
          ${star(p.favorite, `data-pfav="${p.id}"`, p.favorite ? S.hangar.unfavorite : S.hangar.favorite)}
          <button class="prow__name" data-psel="${p.id}" aria-pressed="${p.id === selected}"><span>${esc(p.name)}</span><small>${S.hangar.count(p.ships.length)}</small></button>
        </div>`).join('') : `<p class="hint">${S.hangar.empty}</p>`}</div>
      <button class="btn btn--small" data-pnew>＋ ${S.hangar.newProfile}</button>`;

    q('[data-pdetail]').innerHTML = cur ? `
      <label class="field"><span>${S.hangar.name}</span><input data-pname value="${esc(cur.name)}" maxlength="30"></label>
      <h2 class="panel__title">${S.hangar.shipsIn(cur.ships.length, MAX_FLEET)}</h2>
      <div class="chips">${cur.ships.length ? store.sortShips(cur.ships).map((id) =>
        `<button class="chip" data-pdrop="${id}" title="${S.hangar.drop}">${SPECS[id].nameVi} ✕</button>`).join('') : `<p class="hint">${S.hangar.noShips}</p>`}</div>
      <div class="actions"><button class="btn btn--small btn--danger" data-pdel>${armedDelete ? S.hangar.removeConfirm : S.hangar.remove}</button></div>`
      : `<p class="hint">${S.hangar.selectProfile}</p>`;

    q('[data-ships]').innerHTML = `
      <h2 class="panel__title">${S.hangar.allShips}</h2>
      <div class="tiles">${store.sortShips(ROSTER).map((id) => {
        const inProf = !!cur && cur.ships.includes(id);
        const canAdd = !!cur && (inProf || cur.ships.length < MAX_FLEET);
        return `<div class="tile ${id === focusShip ? 'is-focus' : ''}">
          ${star(store.isFavShip(id), `data-sfav="${id}"`, store.isFavShip(id) ? S.hangar.unfavorite : S.hangar.favorite)}
          <button class="tile__body" data-sinfo="${id}" aria-pressed="${id === focusShip}"><span class="tile__art" data-art="${id}"></span><span>${SPECS[id].nameVi}</span></button>
          <button class="btn btn--tiny" data-sadd="${id}" ${canAdd ? '' : 'disabled'}>${inProf ? S.hangar.drop : cur && !canAdd ? S.hangar.full : S.hangar.add}</button>
        </div>`;
      }).join('')}</div>`;
    q('[data-ships]').querySelectorAll<HTMLElement>('[data-art]').forEach((e) => e.appendChild(shipSprite(e.dataset.art as ShipId, 'h')));

    const sp = SPECS[focusShip];
    q('[data-info]').innerHTML = `
      <div class="info__head">${icon(`ship-${focusShip}`, 'ico ico--ship ico--hot')}<div><h3>${sp.nameVi}</h3><span class="info__atk">${sp.attackNameVi}</span></div></div>
      <dl class="stats">
        <dt>${S.hangar.size}</dt><dd>${sp.shape === 'square' ? `${sp.size}×${sp.size}` : `${sp.size} ${S.hangar.cells}`}${sp.shape === 'square' ? ` · ${S.hangar.noRotate}` : ''}</dd>
        <dt>${S.hangar.cooldown}</dt><dd>${sp.attack === 'none' ? S.hangar.passiveTag : sp.cooldown === 0 ? S.hangar.ready : `${sp.cooldown} ${S.hangar.turns}`}</dd>
        <dt>${S.hangar.attack}</dt><dd>${sp.attackNameVi}</dd>
      </dl>
      <p>${sp.descVi}</p>
      <div class="pattern" aria-label="${S.hangar.pattern}">${icon(`atk-${sp.passive?.kind ?? sp.attack}`, 'ico ico--atk')}</div>
      <small>${S.hangar.patternNote[sp.passive?.kind ?? sp.attack]}</small>`;
    if (focus) root.querySelector<HTMLElement>(focus)?.focus();
  }

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    const d = t.dataset;
    if (t.hasAttribute('data-back')) return app.go('menu');
    armedDelete = d.pdel !== undefined ? armedDelete : false;
    if (d.psel) { selected = d.psel; render(`[data-psel="${d.psel}"]`); }
    else if (d.pnew !== undefined) { selected = store.create().id; render('[data-pname]'); root.querySelector<HTMLInputElement>('[data-pname]')?.select(); }
    else if (d.pfav) { store.toggleFavorite(d.pfav); render(`[data-pfav="${d.pfav}"]`); }
    else if (d.sfav) { store.toggleFavShip(d.sfav as ShipId); render(`[data-sfav="${d.sfav}"]`); }
    else if (d.sinfo) { focusShip = d.sinfo as ShipId; render(`[data-sinfo="${d.sinfo}"]`); }
    else if (d.sadd && selected) { store.toggleShip(selected, d.sadd as ShipId); focusShip = d.sadd as ShipId; render(`[data-sadd="${d.sadd}"]`); }
    else if (d.pdrop && selected) { store.toggleShip(selected, d.pdrop as ShipId); render('[data-pname]'); }
    else if (d.pdel !== undefined && selected) {
      if (armedDelete) { store.remove(selected); armedDelete = false; selected = store.profiles()[0]?.id ?? null; render('[data-pnew]'); }
      else { armedDelete = true; render('[data-pdel]'); }
    }
  });
  const commitName = (input: HTMLInputElement) => {
    if (!selected) return;
    store.rename(selected, input.value);
    render();
  };
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('[data-pname]')) commitName(t);
  });
  root.addEventListener('keydown', (e) => {
    const t = e.target as HTMLInputElement;
    if (e.key === 'Enter' && t.matches?.('[data-pname]')) { commitName(t); render('[data-pname]'); }
  });
  render();
  return {
    dispose() {},
    key: (e) => { if (e.key === 'Escape' && !(e.target as HTMLElement).matches('input')) app.go('menu'); },
  };
};
