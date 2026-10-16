import { Given } from '@cucumber/cucumber';
import { GameSession } from '../../../src/GameSession.ts';
import type { ArenaWorld } from './world.ts';

Given('que iniciei uma nova sessão', function (this: ArenaWorld) {
  this.session = new GameSession();
});

Given('que perdi uma vida e coletei uma moeda', function (this: ArenaWorld) {
  this.session.loseLife();
  this.session.collectCoin();
});
