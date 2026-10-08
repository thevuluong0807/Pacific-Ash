import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/jetbrains-mono/400.css';
import './style.css';
import { applyTokens } from './ui/tokens';
import { GLARE, setGlare } from './render3d/glare';
import { manifest } from './assets/manifest';
import { installSprites } from './ui/sprites';
import { App } from './ui/app';
import { Engine } from './render3d/engine';
import { MenuScene } from './render3d/menuScene';
import { showToast } from './ui/toast';
import { strings } from './ui/strings';
import type { ScreenId } from './ui/app';
import type { RenderScene } from './render3d/renderScene';
import { BattleScene } from './render3d/battleScene';
import { ArenaScene } from './render3d/arenaScene';
import { loadArenaModels } from './render3d/arenaGlb';
import { loadDebrisModels, loadShipModels, loadWreckModels } from './render3d/shipGlb';
import { resumeStore } from './net/client';
import { BlankScene } from './render3d/blankScene';
import { tokens } from './ui/tokens';
import { menuScreen } from './ui/screens/menu';
import { modeSelectScreen } from './ui/screens/modeSelect';
import { onlineScreen } from './ui/screens/online';
import { hangarScreen } from './ui/screens/hangar';
import { placementScreen } from './ui/screens/placement';
import { passDeviceScreen } from './ui/screens/passDevice';
import { battleScreen } from './ui/screens/battle';
import { resultScreen } from './ui/screens/result';
import { arenaLobbyScreen } from './ui/screens/arenaLobby';
import { arenaScreen } from './ui/screens/arena';

applyTokens();
// Favicon: emblem khiên thép (logo.md mục 5)
document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', manifest.ui_logo_emblem);
installSprites();

// `?no3d` bỏ qua cảnh 3D (dùng khi kiểm thử giao diện tự động).
const use3d = !new URLSearchParams(location.search).has('no3d');
const engine = use3d ? new Engine(document.getElementById('app')!) : null;
const menuScenes = { hai_phong: new MenuScene('hai_phong'), truong_sa: new MenuScene('truong_sa') };
const battleScene = new BattleScene();
const blankScene = new BlankScene();
const arenaScene = new ArenaScene();

const app = new App(document.getElementById('ui')!);
app.register('menu', menuScreen);
app.register('modeSelect', modeSelectScreen);
app.register('online', onlineScreen);
app.register('hangar', hangarScreen);
app.register('placement', placementScreen);
app.register('passDevice', passDeviceScreen);
app.register('battle', battleScreen);
app.register('result', resultScreen);
app.register('arenaLobby', arenaLobbyScreen);
app.register('arena', arenaScreen);
if (engine) {
  app.battleScene = battleScene;
  app.arenaScene = arenaScene;
  const apply = () => { setGlare(GLARE[app.settings.glare]); engine.setQuality(tokens.quality[app.settings.quality]); };
  let screen: ScreenId = 'menu';
  let shown: RenderScene | null = null;
  // Đổi cảnh có mờ chuyển 600 ms (ngay lập tức nếu prefers-reduced-motion); lỗi nạp thì giữ cảnh cũ và báo toast.
  const fade = document.createElement('div');
  fade.id = 'fade';
  document.getElementById('app')!.after(fade); // giữa canvas và UI: UI không bị che khi mờ chuyển
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = (next: RenderScene, after?: () => void) => {
    if (next === shown) return;
    const swap = () => {
      try { engine.setScene(next); shown = next; after?.(); }
      catch (err) { console.error(err); showToast(app.root, strings.settings.mapLoadFail, 'alert'); }
    };
    if (reduce || !shown) { swap(); return; }
    fade.style.opacity = '1';
    setTimeout(() => { swap(); fade.style.opacity = '0'; }, 300);
  };
  const waiting = (id: ScreenId) => id === 'menu' || id === 'modeSelect' || id === 'online' || id === 'arenaLobby';
  const gameplay = (id: ScreenId) => id === 'placement' || id === 'battle' || id === 'result';
  const menuFor = () => menuScenes[app.settings.map];
  // Đổi map giữa lúc chơi: nếu đang phát cinematic thì chờ xong; mờ chuyển 600 ms; trạng thái trận giữ nguyên (maps.md mục 1).
  const syncBattleMap = () => {
    const map = app.settings.map;
    if (battleScene.currentMap === map) return;
    const go = () => {
      if (battleScene.playing) return void setTimeout(go, 200);
      if (reduce) return battleScene.setMap(map);
      fade.style.opacity = '1';
      setTimeout(() => { battleScene.setMap(map); fade.style.opacity = '0'; }, 300);
    };
    go();
  };
  app.onSettings = () => {
    apply();
    if (waiting(screen)) show(menuFor());
    else if (gameplay(screen)) syncBattleMap();
  };
  apply();
  app.onScreen = (id) => {
    screen = id;
    if (gameplay(id) && shown !== battleScene) battleScene.setMap(app.settings.map); // vào gameplay từ màn khác: nạp đúng map ngay
    switch (id) {
      case 'menu': case 'modeSelect': case 'online': case 'arenaLobby': show(menuFor()); break;
      case 'arena': show(arenaScene); break;
      case 'hangar': case 'passDevice': show(blankScene); break; // Hangar: phòng xưởng tối trung tính, không đổi theo map
      case 'placement': show(battleScene, () => battleScene.setMode('placement')); battleScene.setMode('placement'); break;
      case 'battle': show(battleScene, () => battleScene.setMode('battle')); battleScene.setMode('battle'); break;
      case 'result': show(battleScene, () => battleScene.setMode('result')); battleScene.setMode('result'); break;
    }
  };
  engine.start();
  // Model glb nạp nền; xong thì thay hộp placeholder trong cảnh trận (đặt tàu / trận đấu).
  void loadShipModels({ destroyer: manifest.ship_destroyer, cruiser: manifest.ship_cruiser, submarine: manifest.ship_submarine, missile: manifest.ship_missile, carrier: manifest.ship_carrier, raider: manifest.ship_raider, escort: manifest.ship_escort, dreadnought: manifest.ship_dreadnought })
    .then(() => battleScene.reloadShips());
  void loadDebrisModels(manifest as unknown as Record<string, string>);
  void loadWreckModels(manifest as unknown as Record<string, string>);
  void loadArenaModels(manifest as unknown as Record<string, string>).then(() => arenaScene.reloadShips());
}
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __pa: unknown }).__pa = { app, battleScene, arenaScene }; // móc kiểm thử hình ảnh
// Link mời: ?room=MÃ (và tùy chọn ?server=ws://...) mở thẳng sảnh online và tự vào phòng.
const qs = new URLSearchParams(location.search);
if (qs.get('server')) app.updateSettings({ onlineServer: qs.get('server')! });
const saved = resumeStore.load();
if (qs.get('room')) { app.pendingRoom = qs.get('room')!; app.go('online'); }
else if (saved) { app.pendingResume = saved; app.go('online'); } // trận online đang dở: tự nối lại
else app.go('menu');
