import { describe, expect, it } from 'vitest';
import { createEnemyPath, getSpawnInterval } from '../src/enemy.ts';

function randomSequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('createEnemyPath', () => {
  it('cria um trajeto do topo até a borda oposta', () => {
    const path = createEnemyPath({
      bounds: { width: 800, height: 500 },
      radius: 10,
      speed: 100,
      random: randomSequence([0, 0.25, 0.75]),
    });

    expect(path.start).toEqual({ x: 200, y: -10 });
    expect(Math.hypot(path.velocity.x, path.velocity.y)).toBeCloseTo(100);
    expect(path.velocity.y).toBeGreaterThan(0);
  });
});

describe('getSpawnInterval', () => {
  it('reduz o intervalo com o tempo sem ficar menor que 250 ms', () => {
    expect(getSpawnInterval(0)).toBe(1_200);
    expect(getSpawnInterval(40)).toBe(600);
    expect(getSpawnInterval(1_000)).toBe(250);
  });
});
