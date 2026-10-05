import icons from '../../design/art/icons.svg?raw';
import markers from '../../design/art/markers.svg?raw';
import logo from '../../design/art/logo.svg?raw';

/** Thứ tự marker trong design/art/markers.svg (mỗi nhóm `translate(...)` là một marker, ô 100×100). */
const MARKERS = ['unknown', 'miss', 'hit', 'sunk', 'own', 'blocked', 'aim', 'bad', 't1', 't2', 'lane'] as const;
export type MarkerId = (typeof MARKERS)[number];

const NS = 'http://www.w3.org/2000/svg';

/**
 * Nạp icon (`#ship-*`, `#i-*`, `#atk-*`, `#map-*`) và marker (`#mk-*`) từ design/art vào DOM một lần,
 * để dùng bằng `<use href="#id">`. Không vẽ lại, không phụ thuộc đường dẫn ngoài (chạy được bằng file://).
 */
export function installSprites() {
  if (document.getElementById('sprites')) return;
  const parse = (t: string) => new DOMParser().parseFromString(t, 'image/svg+xml').documentElement;
  const sprite = document.createElementNS(NS, 'svg');
  sprite.id = 'sprites';
  sprite.setAttribute('aria-hidden', 'true');
  sprite.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  const defs = document.createElementNS(NS, 'defs');
  sprite.appendChild(defs);
  for (const n of Array.from(parse(icons).querySelectorAll('symbol'))) defs.appendChild(document.importNode(n, true));

  const mk = parse(markers);
  for (const d of Array.from(mk.querySelectorAll(':scope > defs > *'))) if (d.id !== 'cell') defs.appendChild(document.importNode(d, true));
  Array.from(mk.querySelectorAll(':scope > g[transform^="translate"]')).forEach((g, i) => {
    const id = MARKERS[i];
    if (!id) return;
    const sym = document.createElementNS(NS, 'symbol');
    sym.id = `mk-${id}`;
    sym.setAttribute('viewBox', '0 0 100 100');
    for (const c of Array.from(g.children)) if (!(c.tagName === 'use' && c.getAttribute('href') === '#cell')) sym.appendChild(document.importNode(c, true));
    defs.appendChild(sym);
  });
  document.body.prepend(sprite);
}

/** `<svg><use/></svg>` dạng chuỗi HTML. Màu theo `currentColor` (icon) hoặc theo chính marker. */
export const icon = (id: string, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
export const marker = (id: MarkerId) => `<svg class="mkv" viewBox="0 0 100 100" aria-hidden="true"><use href="#mk-${id}"/></svg>`;

/**
 * Logo PACIFIC ASH tối giản (design/logo.md): nhúng SVG nội tuyến. Gói các nhóm theo vai trò để chạy chuyển động mở màn 0.9 s:
 * chữ hiện dần và trượt lên 8 px, đường nước kéo từ trái sang phải cùng lúc chiến hạm hiện ra.
 */
export function logoSvg(): string {
  const doc = new DOMParser().parseFromString(logo, 'image/svg+xml');
  const svg = doc.documentElement;
  svg.removeAttribute('width'); svg.removeAttribute('height');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Pacific Ash');
  const NS = 'http://www.w3.org/2000/svg';
  const wrap = (el: Element, cls: string) => {
    const w = doc.createElementNS(NS, 'g');
    w.setAttribute('class', `lg ${cls}`);
    el.before(w);
    w.appendChild(el);
  };
  for (const k of Array.from(svg.children)) {
    const t = k.getAttribute('transform') ?? '';
    if (k.tagName === 'g' && t.startsWith('translate(144.5')) wrap(k, 'lg-text');
    else if (k.tagName === 'g' && t.startsWith('translate(430')) wrap(k, 'lg-ship');
    else if (k.tagName === 'path' && k.getAttribute('stroke') === '#7F8E9B') { k.setAttribute('pathLength', '1'); k.setAttribute('class', 'lg-water'); }
    else if (k.tagName === 'text') wrap(k, 'lg-sub');
  }
  return new XMLSerializer().serializeToString(svg);
}
