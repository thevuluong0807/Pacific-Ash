/** Thông báo nhanh ở giữa trên (ui-art.md 2.6): trượt xuống 280 ms, tồn tại 2.5 s, không chặn thao tác. */
export function showToast(host: HTMLElement, msg: string, kind: 'info' | 'ok' | 'alert' = 'info') {
  let box = host.querySelector<HTMLElement>(':scope > .toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toasts';
    box.setAttribute('role', 'status');
    host.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = `toast toast--${kind}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 2800);
  while (box.children.length > 3) box.firstElementChild!.remove();
}
