import { GAME_DURATION_SECONDS, INITIAL_LIVES } from './gameRules.ts';

export class GameSession {
  private currentLives = INITIAL_LIVES;
  private currentScore = 0;
  private currentRemainingMilliseconds = GAME_DURATION_SECONDS * 1_000;

  get lives(): number {
    return this.currentLives;
  }

  get score(): number {
    return this.currentScore;
  }

  get remainingMilliseconds(): number {
    return this.currentRemainingMilliseconds;
  }

  get remainingSeconds(): number {
    return Math.ceil(this.currentRemainingMilliseconds / 1_000);
  }

  get hasWon(): boolean {
    return this.currentRemainingMilliseconds === 0 && this.currentLives > 0;
  }

  get hasLost(): boolean {
    return this.currentLives === 0;
  }

  loseLife(): void {
    this.currentLives = Math.max(0, this.currentLives - 1);
  }

  collectCoin(): void {
    this.currentScore += 1;
  }

  elapse(milliseconds: number): void {
    this.currentRemainingMilliseconds = Math.max(
      0,
      this.currentRemainingMilliseconds - milliseconds,
    );
  }

  reset(): void {
    this.currentLives = INITIAL_LIVES;
    this.currentScore = 0;
    this.currentRemainingMilliseconds = GAME_DURATION_SECONDS * 1_000;
  }
}
