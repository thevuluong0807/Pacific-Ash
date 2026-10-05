import type { AiLevel, Player } from '../../../design/core-api';
import { createEasyAi } from './easy';
import { createHardAi } from './hard';
import { createMediumAi } from './medium';

export function createAi(level: AiLevel, seed: number): Player {
  switch (level) {
    case 'easy': return createEasyAi(seed);
    case 'medium': return createMediumAi(seed);
    case 'hard': return createHardAi(seed);
  }
}
