import Phaser from 'phaser';
import { getRandomCoinPosition } from './coin.ts';
import { createEnemyPath, getSpawnInterval } from './enemy.ts';
import { GameSession } from './GameSession.ts';
import { circlesOverlap, getDifficultySettings, type Difficulty } from './gameRules.ts';
import { calculateNextPosition, type Direction } from './movement.ts';
import {
  createInviteUrl,
  getMatchResult,
  getRoomIdFromUrl,
  isStateForRound,
  MultiplayerClient,
  type PlayerState,
} from './multiplayer.ts';

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
  private multiplayer!: MultiplayerClient;
  private multiplayerStatusElement!: HTMLElement;
  private opponentScoreElement!: HTMLOutputElement;
  private createRoomButton!: HTMLButtonElement;
  private copyInviteButton!: HTMLButtonElement;
  private leaveRoomButton!: HTMLButtonElement;
  private inviteLabel!: HTMLElement;
  private inviteLinkInput!: HTMLInputElement;
  private opponentState?: PlayerState;
  private multiplayerUpdateMilliseconds = 0;
  private currentRoundId?: string;
  private opponentViewElement!: HTMLElement;
  private opponentCanvas!: HTMLCanvasElement;

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
    this.connectFromInviteLink();
  }

  update(_time: number, deltaMilliseconds: number): void {
    if (this.status !== 'running') {
      return;
    }

    this.session.elapse(deltaMilliseconds);
    this.updateInterface();
    this.multiplayerUpdateMilliseconds -= deltaMilliseconds;
    if (this.multiplayerUpdateMilliseconds <= 0) {
      this.sendMultiplayerState(false);
      this.multiplayerUpdateMilliseconds = 30;
    }

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
    this.multiplayerStatusElement = requiredElement('#multiplayer-status');
    this.opponentScoreElement = requiredElement('#opponent-score');
    this.createRoomButton = requiredElement('#create-room-button');
    this.copyInviteButton = requiredElement('#copy-invite-button');
    this.leaveRoomButton = requiredElement('#leave-room-button');
    this.inviteLabel = requiredElement('#invite-label');
    this.inviteLinkInput = requiredElement('#invite-link');
    this.opponentViewElement = requiredElement('#opponent-view');
    this.opponentCanvas = requiredElement('#opponent-canvas');

    this.multiplayer = new MultiplayerClient({
      onConnected: (role) => this.handleMultiplayerConnected(role),
      onDisconnected: () => this.handleMultiplayerDisconnected(),
      onStart: (difficulty, roundId) => this.handleRemoteStart(difficulty, roundId),
      onState: (state) => this.handleOpponentState(state),
      onError: (message) => this.showMultiplayerError(message),
    });

    requiredElement<HTMLButtonElement>('#menu-button')
      .addEventListener('click', () => this.openMenu());
    this.startButton.addEventListener('click', () => this.handleStart());
    requiredElement<HTMLButtonElement>('#restart-button')
      .addEventListener('click', () => this.handleRestart());
    this.createRoomButton.addEventListener('click', () => void this.createMultiplayerRoom());
    this.copyInviteButton.addEventListener('click', () => void this.copyInviteLink());
    this.leaveRoomButton.addEventListener('click', () => this.leaveMultiplayerRoom());

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
    if (this.status === 'running' && this.multiplayer.connected) {
      return;
    }

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

    if (this.multiplayer.connected && this.multiplayer.role === 'guest') {
      this.multiplayerStatusElement.textContent = 'Aguardando o anfitrião iniciar a partida…';
      return;
    }

    this.startHostedOrSoloGame();
  }

  private handleRestart(): void {
    if (this.multiplayer.connected && this.multiplayer.role === 'guest') {
      this.multiplayerStatusElement.textContent = 'Somente o anfitrião pode reiniciar o duelo.';
      return;
    }

    this.startHostedOrSoloGame();
  }

  private startHostedOrSoloGame(): void {
    if (!this.multiplayer.connected) {
      this.currentRoundId = undefined;
      this.startNewGame();
      return;
    }

    const roundId = `round-${crypto.randomUUID()}`;
    this.currentRoundId = roundId;
    this.startNewGame();
    this.multiplayer.sendStart(this.difficulty, roundId);
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
    this.multiplayerUpdateMilliseconds = 0;
    this.opponentState = undefined;
    this.clearOpponentView();
    this.opponentScoreElement.textContent = 'Adversário: 0 | Vidas: 3';
    this.player.setPosition(ARENA_WIDTH / 2, ARENA_HEIGHT / 2).setAlpha(1);
    this.updateInterface();
  }

  private finishGame(result: 'won' | 'lost'): void {
    this.status = result;
    this.clearEnemies();
    this.clearCoins();
    this.sendMultiplayerState(true);
    this.openMenu();
  }

  private getMenuTitle(): string {
    if ((this.status === 'won' || this.status === 'lost') && this.multiplayer.connected) {
      if (!this.opponentState?.finished) {
        return 'Aguardando adversário…';
      }

      const result = getMatchResult(this.session.score, this.opponentState.score);
      if (result === 'win') return 'Você venceu o duelo!';
      if (result === 'loss') return 'O adversário venceu!';
      return 'Duelo empatado!';
    }

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
    if (this.multiplayer.connected && this.multiplayer.role === 'guest') {
      this.multiplayerStatusElement.textContent = 'A dificuldade é escolhida pelo anfitrião.';
      return;
    }
    if (difficulty === this.difficulty) {
      return;
    }

    this.difficulty = difficulty;
    this.updateDifficultyButtons();
    this.currentRoundId = undefined;
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

  private connectFromInviteLink(): void {
    const roomId = getRoomIdFromUrl(new URL(window.location.href));
    if (!roomId) {
      return;
    }

    this.createRoomButton.hidden = true;
    this.leaveRoomButton.hidden = false;
    this.startButton.disabled = true;
    this.startButton.textContent = 'Aguardando';
    this.multiplayerStatusElement.textContent = 'Entrando na sala…';
    void this.multiplayer.joinRoom(roomId)
      .catch((error: unknown) => this.showMultiplayerError(
        error instanceof Error ? error.message : 'Não foi possível carregar o multiplayer.',
      ));
  }

  private async createMultiplayerRoom(): Promise<void> {
    this.createRoomButton.disabled = true;
    this.multiplayerStatusElement.textContent = 'Criando sala…';

    try {
      const roomId = await this.multiplayer.createRoom();
      const inviteUrl = createInviteUrl(new URL(window.location.href), roomId);
      this.inviteLinkInput.value = inviteUrl;
      this.inviteLabel.hidden = false;
      this.copyInviteButton.hidden = false;
      this.leaveRoomButton.hidden = false;
      this.createRoomButton.hidden = true;
      this.startButton.disabled = true;
      this.multiplayerStatusElement.textContent = 'Sala criada. Envie o link e aguarde o adversário.';
    } catch {
      this.createRoomButton.disabled = false;
    }
  }

  private async copyInviteLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteLinkInput.value);
      this.multiplayerStatusElement.textContent = 'Convite copiado! Envie o link ao segundo jogador.';
    } catch {
      this.inviteLinkInput.select();
      this.multiplayerStatusElement.textContent = 'Selecione e copie o link exibido abaixo.';
    }
  }

  private leaveMultiplayerRoom(): void {
    this.multiplayer.destroy();
    this.opponentState = undefined;
    this.currentRoundId = undefined;
    this.opponentScoreElement.hidden = true;
    this.opponentViewElement.hidden = true;
    this.clearOpponentView();
    this.inviteLabel.hidden = true;
    this.copyInviteButton.hidden = true;
    this.leaveRoomButton.hidden = true;
    this.createRoomButton.hidden = false;
    this.createRoomButton.disabled = false;
    this.startButton.disabled = false;
    this.startButton.textContent = this.status === 'paused' ? 'Continuar' : 'Iniciar';
    this.multiplayerStatusElement.textContent = 'Modo solo. Crie uma sala para desafiar alguém.';
    window.history.replaceState({}, '', window.location.pathname);
  }

  private handleMultiplayerConnected(role: 'host' | 'guest'): void {
    this.opponentScoreElement.hidden = false;
    this.opponentViewElement.hidden = false;
    this.leaveRoomButton.hidden = false;
    this.startButton.disabled = role === 'guest';
    this.startButton.textContent = role === 'host' ? 'Iniciar duelo' : 'Aguardando';
    this.multiplayerStatusElement.textContent = role === 'host'
      ? 'Adversário conectado. Você pode iniciar o duelo!'
      : 'Conectado! Aguarde o anfitrião iniciar o duelo.';
    this.updateInterface();
  }

  private handleMultiplayerDisconnected(): void {
    this.opponentState = undefined;
    this.currentRoundId = undefined;
    this.opponentScoreElement.textContent = 'Adversário: desconectado';
    this.clearOpponentView();
    this.multiplayerStatusElement.textContent = 'O adversário saiu da sala.';
    this.startButton.disabled = false;
  }

  private handleRemoteStart(difficulty: Difficulty, roundId: string): void {
    this.currentRoundId = roundId;
    this.difficulty = difficulty;
    this.updateDifficultyButtons();
    this.startNewGame();
    this.multiplayerStatusElement.textContent = 'Duelo em andamento!';
  }

  private handleOpponentState(state: PlayerState): void {
    if (!isStateForRound(this.currentRoundId, state)) {
      return;
    }

    this.opponentState = state;
    this.opponentScoreElement.textContent = `Adversário: ${state.score} | Vidas: ${state.lives}`;
    this.drawOpponentView(state);
    this.updateMatchResultIfReady();
  }

  private updateMatchResultIfReady(): void {
    const localFinished = this.status === 'won' || this.status === 'lost';
    if (!localFinished || !this.opponentState?.finished) {
      return;
    }

    this.menuTitleElement.textContent = this.getMenuTitle();
    this.multiplayerStatusElement.textContent =
      `Placar final: você ${this.session.score} × ${this.opponentState.score} adversário`;
  }

  private sendMultiplayerState(finished: boolean): void {
    if (!this.multiplayer.connected || !this.currentRoundId) {
      return;
    }

    this.multiplayer.sendState({
      roundId: this.currentRoundId,
      score: this.session.score,
      lives: this.session.lives,
      remainingSeconds: this.session.remainingSeconds,
      finished,
      player: { x: this.player.x, y: this.player.y },
      enemies: this.enemies.map((enemy) => ({
        x: enemy.shape.x,
        y: enemy.shape.y,
        radius: enemy.radius,
      })),
      coins: this.coins.map((coin) => ({
        x: coin.shape.x,
        y: coin.shape.y,
        radius: coin.radius,
      })),
    });
  }

  private drawOpponentView(state: PlayerState): void {
    const context = this.opponentCanvas.getContext('2d');
    if (!context) return;

    const scaleX = this.opponentCanvas.width / ARENA_WIDTH;
    const scaleY = this.opponentCanvas.height / ARENA_HEIGHT;
    context.clearRect(0, 0, this.opponentCanvas.width, this.opponentCanvas.height);
    context.fillStyle = '#101827';
    context.fillRect(0, 0, this.opponentCanvas.width, this.opponentCanvas.height);

    for (const coin of state.coins) {
      this.drawOpponentCircle(context, coin.x, coin.y, coin.radius, scaleX, scaleY, '#facc15');
    }
    for (const enemy of state.enemies) {
      this.drawOpponentCircle(context, enemy.x, enemy.y, enemy.radius, scaleX, scaleY, '#ef4444');
    }
    this.drawOpponentCircle(
      context,
      state.player.x,
      state.player.y,
      PLAYER_RADIUS,
      scaleX,
      scaleY,
      '#22d3ee',
    );
  }

  private drawOpponentCircle(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    scaleX: number,
    scaleY: number,
    color: string,
  ): void {
    context.beginPath();
    context.arc(x * scaleX, y * scaleY, radius * Math.min(scaleX, scaleY), 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  }

  private clearOpponentView(): void {
    const context = this.opponentCanvas?.getContext('2d');
    context?.clearRect(0, 0, this.opponentCanvas.width, this.opponentCanvas.height);
  }

  private showMultiplayerError(message: string): void {
    this.multiplayerStatusElement.textContent = `Erro de conexão: ${message}`;
    this.createRoomButton.disabled = false;
    this.startButton.disabled = false;
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
    this.shellElement.dataset.multiplayerConnected = String(this.multiplayer?.connected ?? false);
    this.shellElement.dataset.multiplayerRole = this.multiplayer?.role ?? 'solo';
    this.shellElement.dataset.opponentScore = String(this.opponentState?.score ?? 0);
    this.shellElement.dataset.roundId = this.currentRoundId ?? '';
    this.shellElement.dataset.opponentRoundId = this.opponentState?.roundId ?? '';
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
