import { When } from '@cucumber/cucumber';
import type { ArenaWorld } from './world.ts';

When('eu colidir com um inimigo', function (this: ArenaWorld) {
  this.session.loseLife();
});

When('eu colidir {int} vezes com inimigos', function (this: ArenaWorld, times: number) {
  for (let collision = 0; collision < times; collision += 1) {
    this.session.loseLife();
  }
});

When('eu coletar {int} moedas', function (this: ArenaWorld, amount: number) {
  for (let coin = 0; coin < amount; coin += 1) {
    this.session.collectCoin();
  }
});

When('passarem {int} segundos', function (this: ArenaWorld, seconds: number) {
  this.session.elapse(seconds * 1_000);
});

When('eu reiniciar a sessão', function (this: ArenaWorld) {
  this.session.reset();
});
