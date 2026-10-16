import { describe, expect, it } from 'vitest';
import { calculateNextPosition } from '../src/movement.ts';

describe('calculateNextPosition', () => {
  it('move o jogador usando velocidade e tempo decorrido', () => {
    const position = calculateNextPosition({
      position: { x: 100, y: 100 },
      direction: { x: 1, y: 0 },
      speed: 200,
      deltaSeconds: 0.5,
      playerRadius: 10,
      bounds: { width: 800, height: 500 },
    });

    expect(position).toEqual({ x: 200, y: 100 });
  });

  it('normaliza a diagonal para não ficar mais rápida', () => {
    const position = calculateNextPosition({
      position: { x: 100, y: 100 },
      direction: { x: 1, y: 1 },
      speed: 100,
      deltaSeconds: 1,
      playerRadius: 10,
      bounds: { width: 800, height: 500 },
    });

    expect(position.x).toBeCloseTo(170.71, 2);
    expect(position.y).toBeCloseTo(170.71, 2);
  });

  it('impede que o jogador ultrapasse os limites da arena', () => {
    const position = calculateNextPosition({
      position: { x: 785, y: 485 },
      direction: { x: 1, y: 1 },
      speed: 500,
      deltaSeconds: 1,
      playerRadius: 15,
      bounds: { width: 800, height: 500 },
    });

    expect(position).toEqual({ x: 785, y: 485 });
  });
});
