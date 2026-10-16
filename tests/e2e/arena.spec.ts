import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.getByTestId('game-menu')).toBeVisible();
});

test('inicia uma partida pela interface', async ({ page }, testInfo) => {
  const game = page.getByTestId('game-shell');

  await page.getByTestId('difficulty-2').click();
  await expect(page.getByTestId('difficulty-2')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('start-button').click();

  await expect(page.getByTestId('game-menu')).toBeHidden();
  await expect(game).toHaveAttribute('data-game-status', 'running');
  await expect(game).toHaveAttribute('data-difficulty', '2');
  await expect(page.getByTestId('lives')).toHaveText('Vidas: ♥♥♥');
  await expect(page.getByTestId('score')).toHaveText('Pontos: 0');
  await expect(page.getByTestId('timer')).toContainText('Tempo:');

  const screenshot = await game.screenshot();
  await testInfo.attach('Arena iniciada', {
    body: screenshot,
    contentType: 'image/png',
  });
});

test('pausa o cronômetro ao abrir o menu', async ({ page }) => {
  const game = page.getByTestId('game-shell');

  await page.getByTestId('start-button').click();
  await page.waitForTimeout(1_100);
  await page.getByTestId('menu-button').click();

  await expect(game).toHaveAttribute('data-game-status', 'paused');
  await expect(page.getByTestId('game-menu')).toBeVisible();
  await expect(page.getByTestId('menu-title')).toHaveText('Jogo pausado');

  const pausedAt = await game.getAttribute('data-remaining-seconds');
  await page.waitForTimeout(1_100);
  await expect(game).toHaveAttribute('data-remaining-seconds', pausedAt ?? '');
});
