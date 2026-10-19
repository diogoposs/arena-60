import { expect, test } from '@playwright/test';

test('conecta dois jogadores por um link de convite', async ({ browser }) => {
  test.setTimeout(45_000);
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  try {
    await host.goto('/');
    await host.getByTestId('create-room-button').click();
    await expect(host.getByTestId('invite-link')).toHaveValue(/\?room=arena60-/, { timeout: 15_000 });
    const inviteLink = await host.getByTestId('invite-link').inputValue();

    await guest.goto(inviteLink);
    await expect(host.getByTestId('multiplayer-status')).toContainText('Adversário conectado', {
      timeout: 20_000,
    });
    await expect(guest.getByTestId('multiplayer-status')).toContainText('Conectado');

    await host.getByTestId('start-button').click();
    await expect(host.getByTestId('game-shell')).toHaveAttribute('data-game-status', 'running');
    await expect(guest.getByTestId('game-shell')).toHaveAttribute('data-game-status', 'running');
    await expect(host.getByTestId('opponent-view')).toBeVisible();
    await expect(guest.getByTestId('opponent-view')).toBeVisible();

    const localArena = await host.getByTestId('game-shell').boundingBox();
    const opponentArena = await host.getByTestId('opponent-view').boundingBox();
    expect(localArena).not.toBeNull();
    expect(opponentArena).not.toBeNull();
    expect(opponentArena!.x).toBeGreaterThanOrEqual(localArena!.x + localArena!.width);

    const hostRoundId = await host.getByTestId('game-shell').getAttribute('data-round-id');
    await expect(guest.getByTestId('game-shell')).toHaveAttribute('data-round-id', hostRoundId ?? '');
    await expect(host.getByTestId('game-shell')).toHaveAttribute('data-opponent-round-id', hostRoundId ?? '', {
      timeout: 5_000,
    });

    await expect.poll(async () => host.getByTestId('opponent-canvas').evaluate((canvas) => {
      const context = (canvas as HTMLCanvasElement).getContext('2d');
      if (!context) return false;
      const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] < 100 && pixels[index + 1] > 150 && pixels[index + 2] > 150) {
          return true;
        }
      }
      return false;
    })).toBe(true);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
