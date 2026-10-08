import { ARENA_RADIUS, WEAPONS } from '../../arena/data';
import type { ShipState } from '../../arena/sim';
import { TEAM_COLORS } from '../../render3d/arenaShips';
import type { ArenaSetup } from '../../render3d/arenaScene';
import type { ScreenFactory } from '../app';
import { strings as S } from '../strings';
import { showToast } from '../toast';

const H = S.arena.hud;
const col = (team: number) => `#${TEAM_COLORS[team % TEAM_COLORS.length].toString(16).padStart(6, '0')}`;
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const deg = (r: number) => ((r * 180) / Math.PI).toFixed(1);

/** Màn trận Hải chiến: HUD phủ lên cảnh 3D (radar, nhãn tàu, thanh khí tài, tâm ngắm), tạm dừng và kết quả. */
export const arenaScreen: ScreenFactory<'arena'> = (app, root, setup: ArenaSetup) => {
  const scene = app.arenaScene;
  if (!scene) {
    showToast(app.root, 'Hải chiến cần đồ họa 3D (bỏ ?no3d).', 'alert');
    queueMicrotask(() => app.go('arenaLobby'));
    return { dispose() {} };
  }
  scene.start(setup);
  const sim = scene.sim!, me = sim.ships[scene.me];

  root.innerHTML = `
    <div class="arena">
      <div class="ah-tl panel">
        <div class="ah-name"><b>${esc(me.design.name)}</b><small>${me.hull.nameVi}</small></div>
        <div class="ah-hp"><span>${H.hull}</span><i data-hp></i><b data-hpt></b></div>
        <div class="ah-row"><div class="ah-thr"><i data-thr></i><b></b></div>
          <div class="ah-gauge"><span>${H.speed}</span><b data-spd>0</b><small>nút</small></div></div>
        <div class="ah-rud"><span>${H.rudder}</span><div><i data-rud></i></div></div>
      </div>
      <canvas class="ah-radar" width="200" height="200" aria-label="Radar"></canvas>
      <div class="ah-feed" data-feed></div>
      <div class="ah-tags" data-tags></div>
      <div class="ah-cross" data-cross hidden><div class="ah-reticle"></div><div class="ah-read" data-read></div></div>
      <div class="ah-hitm" data-hitm>✕</div>
      <div class="ah-hurt" data-hurt></div>
      <div class="ah-warn" data-warn hidden></div>
      <div class="ah-bar" data-bar>${me.mounts.map((m, i) => `<div class="ah-w ${m.weapon ? '' : 'is-empty'}" data-w="${i}"><kbd>${i + 1}</kbd><span>${m.weapon ? WEAPONS[m.weapon].nameVi.replace(/^(Pháo|Súng máy|Dàn|Tên lửa|Cối)\s?/, '') || WEAPONS[m.weapon].nameVi : '—'}</span><small data-wm></small><i data-wc></i></div>`).join('')}</div>
      <div class="ah-help panel" data-help><small data-helptxt></small></div>
      <div class="ah-score panel" data-score hidden></div>
      <div class="overlay" data-pause hidden><div class="panel"><h2>${H.pause}</h2><div class="actions"><button class="btn btn--small btn--primary" data-resume>${H.resume}</button><button class="btn btn--small" data-leave>${H.leave}</button></div></div></div>
      <div class="overlay" data-end hidden></div>
    </div>`;
  const q = <E extends HTMLElement>(s: string) => root.querySelector<E>(s)!;
  const el = { hp: q('[data-hp]'), hpt: q('[data-hpt]'), thr: q('[data-thr]'), spd: q('[data-spd]'), rud: q('[data-rud]'), feed: q('[data-feed]'), tags: q('[data-tags]'), cross: q('[data-cross]'), read: q('[data-read]'),
    hitm: q('[data-hitm]'), hurt: q('[data-hurt]'), warn: q('[data-warn]'), help: q('[data-help]'), helptxt: q('[data-helptxt]'), score: q('[data-score]'), pause: q('[data-pause]'), end: q('[data-end]'), radar: q<HTMLCanvasElement>('.ah-radar') };
  const wEls = [...root.querySelectorAll<HTMLElement>('[data-w]')];
  const tagEls = new Map<number, HTMLElement>();
  const ctx = el.radar.getContext('2d')!;

  let raf = 0, lastHelp = '', endShown = false, helpUntil = performance.now() + 9000, feedKey = '';

  const board = () => {
    const rows = [...sim.ships].sort((a, b) => b.kills - a.kills || b.damage - a.damage);
    return `<table><thead><tr><th></th><th></th><th>${H.kills}</th><th>${H.dmg}</th><th></th></tr></thead><tbody>${rows.map((s) =>
      `<tr class="${s.id === 0 ? 'is-me' : ''}"><td><i class="swatch" style="background:${col(s.team)}"></i></td><td>${esc(s.name)} <small>${s.hull.nameVi}</small></td><td>${s.kills}</td><td>${Math.round(s.damage)}</td><td>${s.alive ? `${Math.round((s.hp / s.hull.hp) * 100)}%` : H.sunk}</td></tr>`).join('')}</tbody></table>`;
  };

  const radar = (f: ShipState) => {
    const R = 100, k = (R - 8) / (ARENA_RADIUS * 1.05);
    ctx.clearRect(0, 0, 200, 200);
    ctx.save(); ctx.translate(R, R);
    ctx.fillStyle = 'rgba(11,17,23,.72)'; ctx.beginPath(); ctx.arc(0, 0, R - 1, 0, 7); ctx.fill();
    const c = Math.cos(f.h), n = Math.sin(f.h);
    // chiếu vectơ thế giới (dx, dz) sang hệ tàu: trái = (dx·cos − dz·sin), trước = (dx·sin + dz·cos)
    const toRadar = (dx: number, dz: number) => ({ x: -(dx * c - dz * n) * k, y: -(dx * n + dz * c) * k });
    ctx.strokeStyle = 'rgba(79,195,232,.5)';
    ctx.beginPath(); for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2, p = toRadar(-f.x + Math.sin(t) * ARENA_RADIUS, -f.z + Math.cos(t) * ARENA_RADIUS); a ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
    for (const s of sim.ships) {
      if (!s.alive) continue;
      const p = toRadar(s.x - f.x, s.z - f.z);
      ctx.fillStyle = col(s.team);
      if (s === f) { ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); continue; }
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
      const hd = s.h - f.h;
      ctx.strokeStyle = col(s.team); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.sin(hd) * 9, p.y - Math.cos(hd) * 9); ctx.stroke();
    }
    ctx.restore();
  };

  const frame = () => {
    raf = requestAnimationFrame(frame);
    const mode = scene.mode, f = scene.focus, W = innerWidth, Hh = innerHeight;
    // thân tàu, ga, tốc độ, bánh lái
    el.hp.style.setProperty('--v', String(Math.max(0, f.hp / f.hull.hp)));
    el.hpt.textContent = `${Math.ceil(f.hp)}/${f.hull.hp}`;
    const u = f.vx * Math.sin(f.h) + f.vz * Math.cos(f.h);
    el.spd.textContent = String(Math.round(Math.abs(u) * 0.6) * (u < -0.5 ? -1 : 1));
    el.thr.style.setProperty('--v', String((f.throttle + 0.5) / 1.5));
    el.thr.parentElement!.querySelector('b')!.textContent = `${Math.round(f.throttle * 100)}%`;
    el.rud.style.setProperty('--v', String(-f.rudder));

    // thanh khí tài
    wEls.forEach((w, i) => {
      const m = me.mounts[i];
      if (!m.weapon) return;
      const sp = WEAPONS[m.weapon];
      w.classList.toggle('is-active', me.control === i);
      w.classList.toggle('is-cd', m.cd > 0);
      w.querySelector<HTMLElement>('[data-wc]')!.style.setProperty('--v', String(m.cd > 0 ? m.cd / Math.max(sp.reload, 0.1) : 0));
      w.querySelector('[data-wm]')!.textContent = m.cd > 0 ? `${m.cd.toFixed(1)}s` : sp.mag > 1 ? `${m.mag}/${sp.mag}` : H.ready;
    });

    // tâm ngắm và thông số khi cầm khí tài
    el.cross.hidden = mode !== 'weapon';
    if (mode === 'weapon' && scene.aim) {
      const a = scene.aim, id = scene.weaponId;
      el.read.innerHTML = `${id ? WEAPONS[id].nameVi : ''}<br>${H.aimBearing} ${deg(a.beta)}° · ${H.aimElev} ${deg(a.el)}°<br>${H.aimRange} ${Math.round(a.range)} · ${H.aimTime} ${a.tof.toFixed(1)}s`;
    }
    const help = mode === 'weapon' ? H.weaponHelp : mode === 'spectate' ? `${H.spectate} ${f.name} · ${H.specHint}` : H.driveHelp;
    if (help !== lastHelp) { el.helptxt.textContent = help; lastHelp = help; }
    el.help.classList.toggle('is-dim', performance.now() > helpUntil && mode !== 'spectate');

    // hiệu ứng trúng / bị trúng
    el.hitm.style.opacity = String(Math.max(0, 1 - scene.hitConfirm / 0.3));
    el.hurt.style.opacity = String(Math.max(0, 0.7 - scene.hurt / 0.6));
    const out = f.outside > 0.1;
    el.warn.hidden = !out && mode !== 'spectate';
    el.warn.textContent = out ? H.outside : mode === 'spectate' ? `${H.spectate} ${f.name}` : '';

    // nhãn tàu
    for (const s of sim.ships) {
      let t = tagEls.get(s.id);
      if (s === f || !s.alive) { t?.setAttribute('hidden', ''); continue; }
      if (!t) { t = document.createElement('div'); t.className = 'ah-tag'; t.innerHTML = '<b></b><i></i><small></small>'; el.tags.appendChild(t); tagEls.set(s.id, t); }
      const p = scene.project(s.x, s.hull.freeboard + s.hull.tower + 24, s.z, W, Hh), dist = Math.hypot(s.x - f.x, s.z - f.z);
      if (p.behind || p.x < -50 || p.x > W + 50) { t.setAttribute('hidden', ''); continue; }
      t.removeAttribute('hidden');
      t.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      t.style.setProperty('--c', col(s.team));
      t.style.opacity = String(Math.max(0.35, Math.min(1, 1.4 - dist / 2200)));
      t.querySelector('b')!.textContent = s.name;
      t.querySelector<HTMLElement>('i')!.style.setProperty('--v', String(s.hp / s.hull.hp));
      t.querySelector('small')!.textContent = `${Math.round(dist)} m${s.team === f.team ? ' · đồng đội' : ''}`;
    }
    radar(f);

    // nhật ký hạ gục
    const fk = scene.feed.map((x) => x.at).join(',');
    if (fk !== feedKey) { feedKey = fk; el.feed.innerHTML = scene.feed.slice(-5).map((x) => `<div style="--c:${col(x.team)}">${esc(x.text)}</div>`).join(''); }

    if (!el.score.hidden) el.score.innerHTML = board();
    if (sim.over && !endShown && sim.time - sim.over.at > 2.5) showEnd();
  };

  function showEnd() {
    endShown = true;
    const w = sim.over!.winner, won = w === me.team;
    el.end.hidden = false;
    el.end.innerHTML = `<div class="panel endcard"><h1 class="${won ? 'is-win' : 'is-lose'}">${w === null ? H.draw : won ? H.win : H.lose}</h1>
      <h2>${H.score}</h2><div class="ah-score--in">${board()}</div>
      <div class="actions"><button class="btn btn--small btn--primary" data-again>${H.again}</button><button class="btn btn--small" data-leave>${H.leave}</button></div></div>`;
    el.end.querySelector<HTMLElement>('[data-again]')!.focus();
  }

  const setPause = (on: boolean) => { scene.paused = on; el.pause.hidden = !on; if (on) { scene.releaseAll(); q<HTMLElement>('[data-resume]').focus(); } };
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    if (t.hasAttribute('data-resume')) setPause(false);
    else if (t.hasAttribute('data-leave')) app.go('arenaLobby');
    else if (t.hasAttribute('data-again')) app.go('arena', { ...setup, seed: (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0 });
    else {
      const w = (t.closest('[data-w]') as HTMLElement | null)?.dataset.w;
      if (w !== undefined) scene.keyDown(new KeyboardEvent('keydown', { key: String(+w + 1) }));
    }
  });
  const keyUp = (e: KeyboardEvent) => { scene.keyUp(e); if (e.key === 'Tab') el.score.hidden = true; };
  const blur = () => scene.releaseAll();
  addEventListener('keyup', keyUp);
  addEventListener('blur', blur);
  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener('keyup', keyUp);
      removeEventListener('blur', blur);
      scene.releaseAll();
      scene.paused = false;
      scene.clear();
    },
    key(e) {
      if (endShown) return;
      if (e.key === 'Tab') { e.preventDefault(); el.score.hidden = false; return; }
      if (e.key === 'Escape') { if (scene.paused) setPause(false); else if (!scene.requestExit()) setPause(true); return; }
      if (scene.paused) return;
      if (e.key === 'h' || e.key === 'H') { helpUntil = performance.now() + 9000; return; }
      if (scene.keyDown(e)) e.preventDefault();
    },
  };
};
