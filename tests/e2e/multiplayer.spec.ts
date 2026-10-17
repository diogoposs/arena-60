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
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
