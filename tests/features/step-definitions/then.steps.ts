import { Then } from '@cucumber/cucumber';
import type { ArenaWorld } from './world.ts';

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Esperado: ${String(expected)}. Recebido: ${String(actual)}.`);
  }
}

Then('devo possuir {int} vidas', function (this: ArenaWorld, lives: number) {
  assertEqual(this.session.lives, lives);
});

Then('devo possuir {int} pontos', function (this: ArenaWorld, score: number) {
  assertEqual(this.session.score, score);
});

Then('devem restar {int} segundos', function (this: ArenaWorld, seconds: number) {
  assertEqual(this.session.remainingSeconds, seconds);
});

Then('a sessão deve estar perdida', function (this: ArenaWorld) {
  assertEqual(this.session.hasLost, true);
});

Then('a sessão deve estar vencida', function (this: ArenaWorld) {
  assertEqual(this.session.hasWon, true);
});
