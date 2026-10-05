// Cổng vào của core. Hợp đồng kiểu: design/core-api.ts.
export * from './rng';
export { loadSpecs, FLEET, ROSTER, FLEET_SIZE, GRID, MAX_FLEET, cellCount } from './specs';
export { randomPlacement, isValidPlacement, shipCells } from './board';
export { newMatch, effectiveAttack, isDamaged, previewCells, isValidAction, readyShips, applyAction, skipTurn, viewOfEnemy, sunkShips, runPassivesAtMatchStart, runPassivesAtTurnStart } from './match';
export { createAi } from './ai';
export { playTurn, playMatch } from './runner';
