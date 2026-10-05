import type { GameEvent } from '../../design/core-api';
import type { AnimSpeed } from './settings';

/** Thời lượng chờ sau mỗi event (ms) ở tốc độ x1. Cinematic 3D sẽ thay thế ở P4. */
const DELAY: Record<GameEvent['type'], number> = {
  ShotFired: 450, PassiveTriggered: 300, ShotNullified: 300, CellResolved: 300, ShipRevealed: 500, ShipSunk: 800, TurnSkipped: 1000, MatchEnded: 600, TurnChanged: 0,
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Phát lần lượt các event của một hành động. `skip()` chạy hết ngay. */
export class EventPlayer {
  private skipping = false;
  constructor(private speed: AnimSpeed) {}

  skip() { this.skipping = true; }

  async play(events: GameEvent[], handle: (e: GameEvent) => void) {
    for (const e of events) {
      handle(e);
      if (this.speed === 'off' || this.skipping) continue;
      const ms = DELAY[e.type] / (this.speed === 'x2' ? 2 : 1);
      if (ms > 0) await sleep(ms);
    }
  }
}

export { sleep };
