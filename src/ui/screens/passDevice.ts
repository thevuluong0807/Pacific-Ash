import type { ScreenFactory } from '../app';
import { strings as S } from '../strings';

/** Hot-seat: che toàn bộ lưới giữa hai người chơi. */
export const passDeviceScreen: ScreenFactory<'passDevice'> = (app, root, { to, next }) => {
  const n = to + 1;
  root.innerHTML = `
    <div class="cover" role="dialog" aria-modal="true">
      <h1>${S.pass.title(n)}</h1><p>${S.pass.sub}</p>
      <button class="btn btn--primary" data-ok>${S.pass.button(n)}</button>
    </div>`;
  const go = () => (next === 'placement' ? app.go('placement', { player: to }) : app.go('battle'));
  root.querySelector<HTMLElement>('[data-ok]')!.addEventListener('click', go);
  root.querySelector<HTMLElement>('[data-ok]')!.focus();
  return { dispose() {}, key: (e) => { if (e.key === 'Enter') go(); } };
};
