import type { ArenaBounds, Direction, Position } from './movement.ts';

export type EnemyPath = Readonly<{
  start: Position;
  velocity: Direction;
}>;

type CreateEnemyPathInput = Readonly<{
  bounds: ArenaBounds;
  radius: number;
  speed: number;
  random?: () => number;
}>;

/**
 * Cria um trajeto que começa fora de uma borda e termina na borda oposta.
 * A função recebe o gerador aleatório para poder ser testada de forma previsível.
 */
export function createEnemyPath(input: CreateEnemyPathInput): EnemyPath {
  const { bounds, radius, speed, random = Math.random } = input;
  const edge = Math.floor(random() * 4);
  let start: Position;
  let destination: Position;

  if (edge === 0) {
    start = { x: random() * bounds.width, y: -radius };
    destination = { x: random() * bounds.width, y: bounds.height + radius };
  } else if (edge === 1) {
    start = { x: bounds.width + radius, y: random() * bounds.height };
    destination = { x: -radius, y: random() * bounds.height };
  } else if (edge === 2) {
    start = { x: random() * bounds.width, y: bounds.height + radius };
    destination = { x: random() * bounds.width, y: -radius };
  } else {
    start = { x: -radius, y: random() * bounds.height };
    destination = { x: bounds.width + radius, y: random() * bounds.height };
  }

  const differenceX = destination.x - start.x;
  const differenceY = destination.y - start.y;
  const distance = Math.hypot(differenceX, differenceY);

  return {
    start,
    velocity: {
      x: (differenceX / distance) * speed,
      y: (differenceY / distance) * speed,
    },
  };
}

export function getSpawnInterval(elapsedSeconds: number): number {
  return Math.max(250, 1_200 - elapsedSeconds * 15);
}
