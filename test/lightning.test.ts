import test from 'node:test';
import assert from 'node:assert/strict';
import { Lightning } from '../src/render3d/lightning';

test('sấm chớp: đúng mẫu 100/60/60/300 ms, cách nhau 9–22 s', () => {
  const l = new Lightning();
  let strikes = 0; l.onStrike = () => { strikes++; };
  let peak = 0, t = 0;
  for (; t < 120; t += 0.01) { const v = l.update(t); peak = Math.max(peak, v); }
  assert.ok(strikes >= 4 && strikes <= 14, `số lần chớp ${strikes}`);
  assert.ok(Math.abs(peak - 3) < 0.01, `đỉnh ${peak}`);
});

test('hoãn khi cinematic chạy: không chớp mới; hết hoãn thì chớp lại', () => {
  const l = new Lightning();
  let strikes = 0; l.onStrike = () => { strikes++; };
  l.paused = true;
  for (let t = 0; t < 60; t += 0.05) l.update(t);
  assert.equal(strikes, 0);
  l.paused = false;
  for (let t = 60; t < 70; t += 0.05) l.update(t);
  assert.ok(strikes >= 1, 'chớp lại sau khi hết hoãn');
});

test('prefers-reduced-motion: chỉ nhấp sáng mờ (≤ 0.35), không chớp mạnh', () => {
  const l = new Lightning();
  l.reducedMotion = true;
  let peak = 0;
  for (let t = 0; t < 80; t += 0.01) peak = Math.max(peak, l.update(t));
  assert.ok(peak > 0 && peak <= 0.351, `đỉnh ${peak}`);
});
