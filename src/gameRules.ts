import type { Position } from './movement.ts';

export const GAME_DURATION_SECONDS = 60;
export const INITIAL_LIVES = 3;

export type Difficulty = 1 | 2 | 3 | 4;

export type DifficultySettings = Readonly<{
  enemySpeedMultiplier: number;
  spawnIntervalMultiplier: number;
}>;

const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  1: { enemySpeedMultiplier: 0.8, spawnIntervalMultiplier: 1.3 },
  2: { enemySpeedMultiplier: 1, spawnIntervalMultiplier: 1 },
  3: { enemySpeedMultiplier: 1.2, spawnIntervalMultiplier: 0.75 },
  4: { enemySpeedMultiplier: 1.45, spawnIntervalMultiplier: 0.55 },
};

export function getDifficultySettings(difficulty: Difficulty): DifficultySettings {
  return DIFFICULTY_SETTINGS[difficulty];
}

type Circle = Readonly<{
  position: Position;
  radius: number;
}>;

/** Retorna true quando a distância entre os centros é menor que a soma dos raios. */
export function circlesOverlap(first: Circle, second: Circle): boolean {
  const distanceX = second.position.x - first.position.x;
  const distanceY = second.position.y - first.position.y;
  const combinedRadius = first.radius + second.radius;

  return distanceX ** 2 + distanceY ** 2 < combinedRadius ** 2;
}
