import { icon, logoSvg } from './sprites';

export interface MenuItem {
  id: string;
  label: string;
  primary?: boolean;
  onSelect: () => void;
}

export class MainMenu {
  private root = document.createElement('section');

  constructor(title: [string, string], items: MenuItem[], opts: { onMute?: () => boolean; intro?: boolean } = {}) {
    this.root.className = 'menu';
    this.root.innerHTML = `<h1 class="logo${opts.intro === false ? '' : ' logo--intro'}" aria-label="${title[0]} ${title[1]}">${logoSvg()}</h1><nav class="menu__nav"></nav>`;
    if (opts.onMute) {
      const m = document.createElement('button');
      m.className = 'iconbtn menu__mute';
      m.setAttribute('aria-label', 'Âm thanh');
      m.setAttribute('aria-pressed', 'false');
      m.innerHTML = icon('i-sound');
      m.onclick = () => m.setAttribute('aria-pressed', String(opts.onMute!()));
      this.root.appendChild(m);
    }
    // Chuyển động mở màn bỏ qua được bằng phím hoặc chạm (logo.md mục 7)
    const intro = this.root.querySelector<HTMLElement>('.logo--intro');
    const skip = () => { intro?.classList.remove('logo--intro'); this.root.classList.add('menu--ready'); removeEventListener('keydown', skip); removeEventListener('pointerdown', skip); };
    setTimeout(skip, 1000);
    addEventListener('keydown', skip, { once: true });
    addEventListener('pointerdown', skip, { once: true });
    const nav = this.root.querySelector('nav')!;
    for (const it of items) {
      const b = document.createElement('button');
      b.className = 'btn' + (it.primary ? ' btn--primary' : '');
      b.textContent = it.label;
      b.dataset.id = it.id;
      b.onclick = it.onSelect;
      nav.appendChild(b);
    }
  }

  mount(parent: HTMLElement) {
    parent.appendChild(this.root);
  }

  unmount() {
    this.root.remove();
  }
}
