import type { ScreenFactory } from '../app';
import { MainMenu } from '../MainMenu';
import { openSettings } from '../settingsOverlay';
import { strings as S } from '../strings';

export const menuScreen: ScreenFactory<'menu'> = (app, root) => {
  let prev = app.settings.master || 0.8;
  const menu = new MainMenu(S.title, [
    { id: 'play', label: S.menu.play, primary: true, onSelect: () => app.go('modeSelect') },
    { id: 'armory', label: S.menu.armory, onSelect: () => app.go('hangar') },
    { id: 'settings', label: S.menu.settings, onSelect: () => openSettings(app) },
  ], {
    intro: app.settings.quality !== 'low', // chất lượng thấp: hiện tức thời (logo.md mục 6)
    // nút loa ở góc trái trên (mock Menu): tắt/mở âm lượng tổng
    onMute: () => { const m = app.settings.master > 0; if (m) prev = app.settings.master; app.updateSettings({ master: m ? 0 : prev }); return m; },
  });
  menu.mount(root);
  return { dispose: () => menu.unmount() };
};
