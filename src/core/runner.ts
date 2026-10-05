import type { GameEvent, MatchState, Player } from '../../design/core-api';
import { applyAction, readyShips, runPassivesAtMatchStart, runPassivesAtTurnStart, skipTurn } from './match';

/** Chạy một lượt của bên đang đi: kỹ năng nội tại đầu lượt, rồi tự bỏ lượt nếu không có tàu sẵn sàng. */
export async function playTurn(state: MatchState, players: [Player, Player]): Promise<{ state: MatchState; events: GameEvent[] }> {
  const me = state.turn;
  const pre = runPassivesAtTurnStart(state, me);
  if (pre.state.winner !== null) return pre;
  state = pre.state;
  const r = readyShips(state, me).length === 0
    ? skipTurn(state, me)
    : applyAction(state, me, await players[me].chooseAction({ state, me }));
  return { state: r.state, events: [...pre.events, ...r.events] };
}

/** Chạy tới khi có người thắng (gồm cắn lén đầu trận). Ném lỗi nếu quá `maxTurns` (phát hiện kẹt). */
export async function playMatch(state: MatchState, players: [Player, Player], maxTurns = 2000) {
  const start = runPassivesAtMatchStart(state);
  state = start.state;
  const log: GameEvent[] = [...start.events];
  while (state.winner === null) {
    if (state.turnNumber > maxTurns) throw new Error(`Ván không kết thúc sau ${maxTurns} lượt`);
    const r = await playTurn(state, players);
    state = r.state;
    log.push(...r.events);
  }
  return { state, events: log };
}
