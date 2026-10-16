export type Position = Readonly<{
  x: number;
  y: number;
}>;

export type Direction = Readonly<{
  x: number;
  y: number;
}>;

export type ArenaBounds = Readonly<{
  width: number;
  height: number;
}>;

type MovementInput = Readonly<{
  position: Position;
  direction: Direction;
  speed: number;
  deltaSeconds: number;
  playerRadius: number;
  bounds: ArenaBounds;
}>;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

/**
 * Calcula a próxima posição sem conhecer Phaser, canvas ou teclado.
 * Como não possui efeitos colaterais, esta função será simples de testar.
 */
export function calculateNextPosition(input: MovementInput): Position {
  const { position, direction, speed, deltaSeconds, playerRadius, bounds } = input;
  const length = Math.hypot(direction.x, direction.y);

  // Normalizar evita que o movimento diagonal seja mais rápido.
  const normalizedX = length > 0 ? direction.x / length : 0;
  const normalizedY = length > 0 ? direction.y / length : 0;

  return {
    x: clamp(
      position.x + normalizedX * speed * deltaSeconds,
      playerRadius,
      bounds.width - playerRadius,
    ),
    y: clamp(
      position.y + normalizedY * speed * deltaSeconds,
      playerRadius,
      bounds.height - playerRadius,
    ),
  };
}
