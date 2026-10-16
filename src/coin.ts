import type { ArenaBounds, Position } from './movement.ts';

type RandomCoinPositionInput = Readonly<{
  bounds: ArenaBounds;
  padding: number;
  topPadding?: number;
  random?: () => number;
}>;

/** Gera uma posição dentro da arena, preservando espaço nas bordas e no HUD. */
export function getRandomCoinPosition(input: RandomCoinPositionInput): Position {
  const { bounds, padding, topPadding = padding, random = Math.random } = input;

  return {
    x: padding + random() * (bounds.width - padding * 2),
    y: topPadding + random() * (bounds.height - topPadding - padding),
  };
}
