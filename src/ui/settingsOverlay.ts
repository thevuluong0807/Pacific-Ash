import type { App } from './app';
import { mapPicker } from './mapPicker';
import type { AnimSpeed, Quality } from './settings';
import { icon } from './sprites';
import { strings as S } from './strings';

/** Cài đặt dạng lớp phủ (ui-art.md 2.7, art/ui_settings_mock.svg): dùng được từ menu lẫn giữa trận. `onQuit` chỉ có khi đang trong trận. */
export function openSettings(app: App, onQuit?: () => void) {
  const prevFocus = document.activeElement as HTMLElement | null;
  const ov = document.createElement('div');
  ov.className = 'overlay';
  const s = app.settings;
  const slider = (key: 'master' | 'sfx' | 'music', label: string) =>
    `<label class="set__row"><span>${label}</span><input type="range" min="0" max="100" value="${Math.round(s[key] * 100)}" data-slider="${key}" style="--v:${Math.round(s[key] * 100)}%"></label>`;
  const seg = (key: string, label: string, opts: [string, string][], cur: string) =>
    `<div class="set__row"><span>${label}</span><div class="seg" role="radiogroup" aria-label="${label}">${opts
      .map(([v, t]) => `<button class="seg__btn" role="radio" aria-checked="${v === cur}" data-seg="${key}" data-v="${v}">${t}</button>`)
      .join('')}</div></div>`;
  const toggle = (key: string, label: string, on: boolean) =>
    `<div class="set__row"><span>${label}</span><button class="switch" role="switch" aria-checked="${on}" aria-label="${label}" data-switch="${key}"><i></i></button></div>`;
  ov.innerHTML = `
    <div class="panel panel--c set" role="dialog" aria-modal="true" aria-label="${S.settings.title}">
      <h2 class="set__title">${S.settings.title}</h2>
      ${slider('master', S.settings.master)}${slider('sfx', S.settings.sfx)}${slider('music', S.settings.music)}
      ${seg('quality', S.settings.quality, [['low', S.settings.low], ['medium', S.settings.medium], ['high', S.settings.high]], s.quality)}
      ${seg('anim', S.settings.anim, [['off', S.settings.off], ['x1', S.settings.x1], ['x2', S.settings.x2]], s.anim)}
      ${toggle('shake', S.settings.shake, s.shake)}
      ${toggle('shortCinematic', S.settings.shortCine, s.shortCinematic)}
      <div class="set__row set__row--map"><span>${S.settings.map}</span><div class="dd" data-dd></div></div>
      <p class="set__note">${S.settings.mapNote}</p>
      <div class="actions">
        ${onQuit ? `<button class="btn btn--small btn--danger" data-quit>${S.battle.quit}</button>` : ''}
        <button class="btn btn--small" data-close>${icon('i-back')}${S.common.close}</button>
      </div>
    </div>`;
  app.root.appendChild(ov);
  const picker = mapPicker(app, ov.querySelector<HTMLElement>('[data-dd]')!);

  const close = () => { ov.remove(); removeEventListener('keydown', onKey, true); prevFocus?.focus(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (picker.isOpen()) picker.close(); else close();
  };
  addEventListener('keydown', onKey, true);

  ov.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.slider) { t.style.setProperty('--v', `${t.value}%`); app.updateSettings({ [t.dataset.slider]: +t.value / 100 }); }
  });
  ov.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button, .overlay') ?? (e.target as HTMLElement);
    if (t.dataset.seg) {
      app.updateSettings(t.dataset.seg === 'quality' ? { quality: t.dataset.v as Quality } : { anim: t.dataset.v as AnimSpeed });
      t.parentElement!.querySelectorAll('.seg__btn').forEach((b) => b.setAttribute('aria-checked', String(b === t)));
    } else if (t.dataset.switch) {
      const on = t.getAttribute('aria-checked') !== 'true';
      t.setAttribute('aria-checked', String(on));
      app.updateSettings({ [t.dataset.switch]: on });
    } else if (t.hasAttribute('data-close') || t === ov) close();
    else if (t.hasAttribute('data-quit')) {
      if (t.dataset.armed) { close(); onQuit?.(); }
      else { t.dataset.armed = '1'; t.textContent = S.battle.quitConfirm; }
    }
  });
  ov.querySelector<HTMLElement>('[data-close]')!.focus();
}
