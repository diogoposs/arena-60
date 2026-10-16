import { describe, expect, it } from 'vitest';
import { getRandomCoinPosition } from '../src/coin.ts';

function randomSequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

describe('getRandomCoinPosition', () => {
  it('gera a moeda dentro das margens e abaixo do HUD', () => {
    const position = getRandomCoinPosition({
      bounds: { width: 800, height: 500 },
      padding: 35,
      topPadding: 70,
      random: randomSequence([0.5, 0.25]),
    });

    expect(position.x).toBe(400);
    expect(position.y).toBeCloseTo(168.75);
  });

  it('usa os paddings como posição mínima', () => {
    const position = getRandomCoinPosition({
      bounds: { width: 800, height: 500 },
      padding: 35,
      topPadding: 70,
      random: () => 0,
    });

    expect(position).toEqual({ x: 35, y: 70 });
  });
});
