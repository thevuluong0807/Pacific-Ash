import { OnlineClient, defaultServer } from '../../net/client';
import { normalizeCode, type S2C } from '../../net/protocol';
import { newSession, type ScreenFactory } from '../app';
import { strings as S } from '../strings';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Sảnh online: tạo phòng (mã + link mời), vào bằng mã, ghép ngẫu nhiên. Sau khi đủ hai người sang màn Đặt tàu. */
export const onlineScreen: ScreenFactory<'online'> = (app, root) => {
  let net: OnlineClient | null = null;
  let state: 'idle' | 'busy' | 'room' | 'queue' = 'idle';
  let code = '';
  let msg = '';
  let handedOver = false; // đã giao kết nối cho màn Đặt tàu: không đóng khi rời sảnh
  let equip = app.settings.equipDamage;
  const server = () => app.settings.onlineServer || defaultServer();
  const link = () => {
    const u = new URL(location.href);
    u.search = ''; u.hash = '';
    u.searchParams.set('room', code);
    if (app.settings.onlineServer) u.searchParams.set('server', app.settings.onlineServer);
    return u.toString();
  };

  function render() {
    const busy = state === 'busy';
    root.innerHTML = `
      <div class="page">
        <header class="page__head"><h1>${S.online.title}</h1></header>
        <div class="cards">
          ${state === 'room' ? `
          <article class="card panel">
            <h2>${S.online.roomCode}</h2>
            <p class="roomcode" aria-live="polite">${esc(code)}</p>
            <label class="field"><span>${S.online.inviteLink}</span><input data-link readonly value="${esc(link())}"></label>
            <div class="actions"><button class="btn btn--small btn--primary" data-copy>${S.online.copy}</button><button class="btn btn--small" data-cancel>${S.common.cancel}</button></div>
            <p class="hint">${S.online.waitingFriend}</p>
          </article>` : state === 'queue' ? `
          <article class="card panel">
            <h2>${S.online.quick}</h2><p class="hint" aria-live="polite">${S.online.searching}</p>
            <div class="actions"><button class="btn btn--small" data-cancel>${S.common.cancel}</button></div>
          </article>` : `
          <article class="card panel">
            <h2>${S.online.create}</h2><p>${S.online.createDesc}</p>
            <label class="opt"><input type="checkbox" data-equip ${equip ? 'checked' : ''}><span><b>${S.mode.equip}</b></span></label>
            <button class="btn btn--small btn--primary" data-create ${busy ? 'disabled' : ''}>${S.online.create}</button>
          </article>
          <article class="card panel">
            <h2>${S.online.join}</h2><p>${S.online.joinDesc}</p>
            <label class="field"><span>${S.online.roomCode}</span><input data-code maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="ABCDE" value="${esc(code)}"></label>
            <button class="btn btn--small btn--primary" data-join ${busy ? 'disabled' : ''}>${S.online.join}</button>
          </article>
          <article class="card panel">
            <h2>${S.online.quick}</h2><p>${S.online.quickDesc}</p>
            <button class="btn btn--small btn--primary" data-quick ${busy ? 'disabled' : ''}>${S.online.quick}</button>
          </article>`}
        </div>
        ${msg ? `<p class="hint online__msg" role="alert">${esc(msg)}</p>` : ''}
        <details class="online__adv"><summary>${S.online.server}</summary>
          <label class="field"><input data-server value="${esc(server())}" placeholder="ws://localhost:8787"></label>
          <small>${S.online.serverHint}</small>
        </details>
        <footer class="page__foot"><button class="btn btn--small" data-back>${S.common.back}</button></footer>
      </div>`;
  }

  function onMsg(m: S2C) {
    switch (m.t) {
      case 'room': code = m.code; state = 'room'; msg = ''; render(); break;
      case 'queued': state = 'queue'; msg = ''; render(); break;
      case 'matched': {
        handedOver = true;
        app.session = newSession('online', 'medium', m.equipDamage);
        app.session.online = { net: net!, me: m.you, code: m.code, equipDamage: m.equipDamage };
        app.go('placement', { player: 0 });
        break;
      }
      case 'error': state = 'idle'; msg = m.msg; render(); break;
      default: break;
    }
  }

  async function connect(): Promise<boolean> {
    if (net && !net.closed) return true;
    state = 'busy'; msg = S.online.connecting; render();
    try {
      net = await OnlineClient.connect(server());
      net.onClose = () => { if (!handedOver) { state = 'idle'; msg = S.online.lost; render(); } };
      net.subscribe(onMsg);
      return true;
    } catch {
      state = 'idle'; msg = S.online.cannotConnect(server()); render();
      return false;
    }
  }

  async function act(fn: () => void) { if (await connect()) { msg = ''; state = 'busy'; render(); fn(); } }

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('[data-equip]')) { equip = t.checked; app.updateSettings({ equipDamage: equip }); }
    else if (t.matches('[data-server]')) { app.updateSettings({ onlineServer: t.value.trim() === defaultServer() ? '' : t.value.trim() }); net?.close(); net = null; }
  });
  root.addEventListener('input', (e) => { const t = e.target as HTMLInputElement; if (t.matches('[data-code]')) { t.value = normalizeCode(t.value); code = t.value; } });
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    if (t.hasAttribute('data-back')) return app.go('modeSelect');
    if (t.hasAttribute('data-create')) void act(() => net!.send({ t: 'create', equipDamage: equip }));
    else if (t.hasAttribute('data-join')) { if (code.length === 5) void act(() => net!.send({ t: 'join', code })); else { msg = S.online.needCode; render(); } }
    else if (t.hasAttribute('data-quick')) void act(() => net!.send({ t: 'quick' }));
    else if (t.hasAttribute('data-cancel')) { net?.send({ t: 'cancel' }); state = 'idle'; msg = ''; render(); }
    else if (t.hasAttribute('data-copy')) {
      void navigator.clipboard?.writeText(link()).then(() => { msg = S.online.copied; render(); }, () => { root.querySelector<HTMLInputElement>('[data-link]')?.select(); });
    }
  });

  render();
  if (app.pendingRoom) { // mở bằng link mời: tự vào phòng
    code = normalizeCode(app.pendingRoom);
    app.pendingRoom = undefined;
    if (code.length === 5) void act(() => net!.send({ t: 'join', code }));
  }
  return {
    dispose() { net?.subscribe(null); if (!handedOver) { net?.send({ t: 'leave' }); net?.close(); } },
    key: (e) => { if (e.key === 'Escape' && !(e.target as HTMLElement).matches('input')) app.go('modeSelect'); },
  };
};
