import Phaser from 'phaser';
import { getRandomCoinPosition } from './coin.ts';
import { createEnemyPath, getSpawnInterval } from './enemy.ts';
import { GameSession } from './GameSession.ts';
import { circlesOverlap, getDifficultySettings, type Difficulty } from './gameRules.ts';
import { calculateNextPosition, type Direction } from './movement.ts';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 500;
const PLAYER_RADIUS = 18;
const PLAYER_SPEED = 240;
const ENEMY_MARGIN = 40;
const INVULNERABILITY_MILLISECONDS = 900;
const COIN_RADIUS = 12;
const COIN_SPAWN_INTERVAL = 1_800;
const MAX_COINS = 4;

type GameStatus = 'waiting' | 'running' | 'paused' | 'won' | 'lost';

type Enemy = {
  shape: Phaser.GameObjects.Arc;
  velocity: Direction;
  radius: number;
};

type Coin = {
  shape: Phaser.GameObjects.Container;
  radius: number;
};

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
  }
  return element;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemies: Enemy[] = [];
  private coins: Coin[] = [];
  private elapsedMilliseconds = 0;
  private timeUntilNextEnemy = 0;
  private timeUntilNextCoin = 0;
  private invulnerabilityMilliseconds = 0;
  private session = new GameSession();
  private difficulty: Difficulty = 1;
  private status: GameStatus = 'waiting';
  private shellElement!: HTMLElement;
  private timerElement!: HTMLOutputElement;
  private livesElement!: HTMLOutputElement;
  private scoreElement!: HTMLOutputElement;
  private menuElement!: HTMLElement;
  private menuTitleElement!: HTMLHeadingElement;
  private startButton!: HTMLButtonElement;
  private difficultyButtons = new Map<Difficulty, HTMLButtonElement>();

  constructor() {
    super('arena');
  }

  create(): void {
    this.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2,
      ARENA_WIDTH - 4,
      ARENA_HEIGHT - 4,
      0x101827,
    ).setStrokeStyle(4, 0x38bdf8);

    this.player = this.add.circle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2,
      PLAYER_RADIUS,
      0xfacc15,
    ).setStrokeStyle(3, 0xff1e00).setDepth(2);

    this.connectHtmlInterface();

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Teclado não disponível neste navegador.');
    }

    this.cursors = keyboard.createCursorKeys();
  }

  update(_time: number, deltaMilliseconds: number): void {
    if (this.status !== 'running') {
      return;
    }

    this.session.elapse(deltaMilliseconds);
    this.updateInterface();

    if (this.session.hasWon) {
      this.finishGame('won');
      return;
    }

    this.elapsedMilliseconds += deltaMilliseconds;
    this.timeUntilNextEnemy -= deltaMilliseconds;

    if (this.timeUntilNextEnemy <= 0) {
      this.spawnEnemy();
      const settings = getDifficultySettings(this.difficulty);
      this.timeUntilNextEnemy =
        getSpawnInterval(this.elapsedMilliseconds / 1_000) * settings.spawnIntervalMultiplier;
    }

    this.timeUntilNextCoin -= deltaMilliseconds;
    if (this.timeUntilNextCoin <= 0 && this.coins.length < MAX_COINS) {
      this.spawnCoin();
      this.timeUntilNextCoin = COIN_SPAWN_INTERVAL;
    }

    const direction: Direction = {
      x: Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown),
      y: Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown),
    };

    const nextPosition = calculateNextPosition({
      position: { x: this.player.x, y: this.player.y },
      direction,
      speed: PLAYER_SPEED,
      deltaSeconds: deltaMilliseconds / 1_000,
      playerRadius: PLAYER_RADIUS,
      bounds: { width: ARENA_WIDTH, height: ARENA_HEIGHT },
    });

    this.player.setPosition(nextPosition.x, nextPosition.y);
    this.updateEnemies(deltaMilliseconds / 1_000);
    this.handleCollisions();
    if (this.status !== 'running') {
      return;
    }
    this.handleCoinCollection();

    if (this.invulnerabilityMilliseconds > 0) {
      this.invulnerabilityMilliseconds -= deltaMilliseconds;
      if (this.invulnerabilityMilliseconds <= 0) {
        this.player.setAlpha(1);
      }
    }
  }

  private connectHtmlInterface(): void {
    this.shellElement = requiredElement('#game-shell');
    this.timerElement = requiredElement('#timer');
    this.livesElement = requiredElement('#lives');
    this.scoreElement = requiredElement('#score');
    this.menuElement = requiredElement('#game-menu');
    this.menuTitleElement = requiredElement('#menu-title');
    this.startButton = requiredElement('#start-button');

    requiredElement<HTMLButtonElement>('#menu-button')
      .addEventListener('click', () => this.openMenu());
    this.startButton.addEventListener('click', () => this.handleStart());
    requiredElement<HTMLButtonElement>('#restart-button')
      .addEventListener('click', () => this.startNewGame());

    const buttons = document.querySelectorAll<HTMLButtonElement>('[data-difficulty]');
    for (const button of buttons) {
      const level = Number(button.dataset.difficulty) as Difficulty;
      this.difficultyButtons.set(level, button);
      button.addEventListener('click', () => this.selectDifficulty(level));
    }

    this.updateDifficultyButtons();
    this.updateInterface();
    this.openMenu();
  }

  private openMenu(): void {
    if (this.status === 'running') {
      this.status = 'paused';
    }

    this.startButton.textContent = this.status === 'paused' ? 'Continuar' : 'Iniciar';
    this.menuTitleElement.textContent = this.getMenuTitle();
    this.menuElement.hidden = false;
    this.updateInterface();
  }

  private handleStart(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.menuElement.hidden = true;
      this.updateInterface();
      return;
    }

    this.startNewGame();
  }

  private startNewGame(): void {
    this.resetGameState();
    this.status = 'running';
    this.menuElement.hidden = true;
    this.updateInterface();
  }

  private resetGameState(): void {
    this.clearEnemies();
    this.clearCoins();
    this.session.reset();
    this.elapsedMilliseconds = 0;
    this.timeUntilNextEnemy = 0;
    this.timeUntilNextCoin = 0;
    this.invulnerabilityMilliseconds = 0;
    this.player.setPosition(ARENA_WIDTH / 2, ARENA_HEIGHT / 2).setAlpha(1);
    this.updateInterface();
  }

  private finishGame(result: 'won' | 'lost'): void {
    this.status = result;
    this.clearEnemies();
    this.clearCoins();
    this.openMenu();
  }

  private getMenuTitle(): string {
    if (this.status === 'won') {
      return 'Você sobreviveu!';
    }
    if (this.status === 'lost') {
      return 'Fim de jogo!';
    }
    if (this.status === 'paused') {
      return 'Jogo pausado';
    }
    return 'Arena 60';
  }

  private selectDifficulty(difficulty: Difficulty): void {
    if (difficulty === this.difficulty) {
      return;
    }

    this.difficulty = difficulty;
    this.updateDifficultyButtons();
    this.resetGameState();
    this.status = 'waiting';
    this.startButton.textContent = 'Iniciar';
    this.menuTitleElement.textContent = 'Arena 60';
    this.menuElement.hidden = false;
    this.updateInterface();
  }

  private updateDifficultyButtons(): void {
    for (const [level, button] of this.difficultyButtons) {
      button.setAttribute('aria-pressed', String(level === this.difficulty));
    }
  }

  private spawnEnemy(): void {
    const radius = Phaser.Math.Between(9, 17);
    const settings = getDifficultySettings(this.difficulty);
    const speed = Phaser.Math.Between(110, 190) * settings.enemySpeedMultiplier;
    const path = createEnemyPath({
      bounds: { width: ARENA_WIDTH, height: ARENA_HEIGHT },
      radius,
      speed,
    });

    const shape = this.add.circle(
      path.start.x,
      path.start.y,
      radius,
      0xef4444,
    ).setStrokeStyle(2, 0xfecaca).setDepth(1);

    this.enemies.push({ shape, velocity: path.velocity, radius });
  }

  private spawnCoin(): void {
    const position = getRandomCoinPosition({
      bounds: { width: ARENA_WIDTH, height: ARENA_HEIGHT },
      padding: 35,
      topPadding: 70,
    });
    const outerCircle = this.add.circle(0, 0, COIN_RADIUS, 0xfacc15)
      .setStrokeStyle(2, 0xfef08a);
    const innerCircle = this.add.circle(0, 0, COIN_RADIUS / 2, 0xca8a04);
    const shape = this.add.container(position.x, position.y, [outerCircle, innerCircle]).setDepth(1);

    this.coins.push({ shape, radius: COIN_RADIUS });
  }

  private updateEnemies(deltaSeconds: number): void {
    for (const enemy of this.enemies) {
      enemy.shape.x += enemy.velocity.x * deltaSeconds;
      enemy.shape.y += enemy.velocity.y * deltaSeconds;
    }

    this.enemies = this.enemies.filter((enemy) => {
      const isOutside =
        enemy.shape.x < -ENEMY_MARGIN ||
        enemy.shape.x > ARENA_WIDTH + ENEMY_MARGIN ||
        enemy.shape.y < -ENEMY_MARGIN ||
        enemy.shape.y > ARENA_HEIGHT + ENEMY_MARGIN;

      if (isOutside) {
        enemy.shape.destroy();
      }

      return !isOutside;
    });
  }

  private handleCollisions(): void {
    if (this.invulnerabilityMilliseconds > 0) {
      return;
    }

    const collidedEnemy = this.enemies.find((enemy) =>
      circlesOverlap(
        { position: { x: this.player.x, y: this.player.y }, radius: PLAYER_RADIUS },
        { position: { x: enemy.shape.x, y: enemy.shape.y }, radius: enemy.radius },
      ),
    );

    if (!collidedEnemy) {
      return;
    }

    collidedEnemy.shape.destroy();
    this.enemies = this.enemies.filter((enemy) => enemy !== collidedEnemy);
    this.session.loseLife();
    this.invulnerabilityMilliseconds = INVULNERABILITY_MILLISECONDS;
    this.player.setAlpha(0.35);
    this.updateInterface();

    if (this.session.hasLost) {
      this.finishGame('lost');
    }
  }

  private handleCoinCollection(): void {
    const collectedCoin = this.coins.find((coin) =>
      circlesOverlap(
        { position: { x: this.player.x, y: this.player.y }, radius: PLAYER_RADIUS },
        { position: { x: coin.shape.x, y: coin.shape.y }, radius: coin.radius },
      ),
    );

    if (!collectedCoin) {
      return;
    }

    collectedCoin.shape.destroy();
    this.coins = this.coins.filter((coin) => coin !== collectedCoin);
    this.session.collectCoin();
    this.updateInterface();
  }

  private updateInterface(): void {
    this.timerElement.textContent = `Tempo: ${this.session.remainingSeconds}s`;
    this.livesElement.textContent = `Vidas: ${'♥'.repeat(this.session.lives)}`;
    this.scoreElement.textContent = `Pontos: ${this.session.score}`;
    this.shellElement.dataset.gameStatus = this.status;
    this.shellElement.dataset.difficulty = String(this.difficulty);
    this.shellElement.dataset.lives = String(this.session.lives);
    this.shellElement.dataset.score = String(this.session.score);
    this.shellElement.dataset.remainingSeconds = String(this.session.remainingSeconds);
  }

  private clearEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.shape.destroy();
    }
    this.enemies = [];
  }

  private clearCoins(): void {
    for (const coin of this.coins) {
      coin.shape.destroy();
    }
    this.coins = [];
  }
}
