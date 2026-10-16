import { setWorldConstructor, World } from '@cucumber/cucumber';
import { GameSession } from '../../../src/GameSession.ts';

export class ArenaWorld extends World {
  session = new GameSession();
}

setWorldConstructor(ArenaWorld);
