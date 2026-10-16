import { describe, expect, it } from 'vitest';
import { circlesOverlap, getDifficultySettings } from '../src/gameRules.ts';

describe('circlesOverlap', () => {
  it('detecta quando dois círculos estão sobrepostos', () => {
    const collided = circlesOverlap(
      { position: { x: 10, y: 10 }, radius: 10 },
      { position: { x: 25, y: 10 }, radius: 10 },
    );

    expect(collided).toBe(true);
  });

  it('não detecta colisão quando os círculos estão afastados', () => {
    const collided = circlesOverlap(
      { position: { x: 10, y: 10 }, radius: 10 },
      { position: { x: 40, y: 10 }, radius: 10 },
    );

    expect(collided).toBe(false);
  });
});

describe('getDifficultySettings', () => {
  it('aumenta a velocidade e reduz o intervalo nos níveis mais difíceis', () => {
    const easiest = getDifficultySettings(1);
    const hardest = getDifficultySettings(4);

    expect(hardest.enemySpeedMultiplier).toBeGreaterThan(easiest.enemySpeedMultiplier);
    expect(hardest.spawnIntervalMultiplier).toBeLessThan(easiest.spawnIntervalMultiplier);
  });
});
