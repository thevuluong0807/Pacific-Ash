/** Sấm chớp theo design/env-and-fx.md mục 4: chớp 1 (100 ms, 3.0) → nghỉ 60 ms → chớp 2 (60 ms, 1.6) → tắt dần 300 ms; cách nhau 9–22 s. */
export class Lightning {
  value = 0;
  private next = 6 + Math.random() * 6;
  private start = -100;
  /** Gọi khi sét đánh (để phát tiếng sấm sau này). */
  onStrike?: () => void;
  reducedMotion = false;
  /** Hoãn khi cinematic chạy (maps.md 4.4): không bắt đầu chớp mới. */
  paused = false;

  update(t: number) {
    if (t >= this.next && this.paused) this.next = t + 0.8; // dời lại, không bỏ
    else if (t >= this.next) { this.start = t; this.next = t + 9 + Math.random() * 13; this.onStrike?.(); }
    const e = t - this.start;
    let v = 0;
    if (this.reducedMotion) v = e >= 0 && e < 0.5 ? 0.35 * Math.sin((e / 0.5) * Math.PI) : 0; // nhấp sáng mờ thay chớp
    else if (e < 0) v = 0;
    else if (e < 0.1) v = 3 * Math.min(1, e / 0.02);
    else if (e < 0.16) v = 0;
    else if (e < 0.22) v = 1.6;
    else if (e < 0.52) v = 1.6 * (1 - (e - 0.22) / 0.3);
    this.value = v;
    return v;
  }
}
