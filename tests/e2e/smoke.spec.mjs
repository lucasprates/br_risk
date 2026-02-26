import { test, expect } from '@playwright/test';

function buildRoomCode() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `E2E${suffix}`;
}

async function joinRoom(page, playerName, roomId) {
  await page.goto('/');
  await expect(page.locator('#board')).toBeVisible();
  await expect(page.locator('g.territory')).toHaveCount(42);

  await page.locator('#player-name').fill(playerName);
  await page.locator('#room-id').fill(roomId);
  await page.locator('#join-button').click();

  await expect(page.locator('#join-button')).toBeDisabled();
  await expect(page.locator('#status-line')).toContainText(`room ${roomId}`);
}

test('three players can join lobby and host starts the game', async ({ browser, page }) => {
  const roomId = buildRoomCode();

  const contextTwo = await browser.newContext();
  const contextThree = await browser.newContext();
  const pageTwo = await contextTwo.newPage();
  const pageThree = await contextThree.newPage();

  try {
    await joinRoom(page, 'Alice', roomId);
    await joinRoom(pageTwo, 'Bruno', roomId);
    await joinRoom(pageThree, 'Carla', roomId);

    await expect(page.locator('#start-button')).toBeEnabled();
    await page.locator('#start-button').click();

    await expect(page.locator('#turn-summary')).toContainText('Round 1');
    await expect(page.locator('#turn-summary')).toContainText('REINFORCE');
    await expect(page.locator('#players-list li')).toHaveCount(3);

    await expect(pageTwo.locator('#turn-summary')).toContainText('Round 1');
    await expect(pageThree.locator('#turn-summary')).toContainText('Round 1');
  } finally {
    await contextTwo.close();
    await contextThree.close();
  }
});

test('public lobby appears in room list and can be joined in one click', async ({ browser, page }) => {
  const roomId = buildRoomCode();

  const contextTwo = await browser.newContext();
  const pageTwo = await contextTwo.newPage();

  try {
    await page.goto('/');
    await expect(page.locator('#board')).toBeVisible();
    await page.locator('#player-name').fill('Alice');
    await page.locator('#room-id').fill(roomId);
    await page.locator('#room-public').check();
    await page.locator('#join-button').click();

    await expect(page.locator('#status-line')).toContainText(`room ${roomId}`);

    await pageTwo.goto('/');
    await expect(pageTwo.locator('#board')).toBeVisible();
    await pageTwo.locator('#player-name').fill('Bruno');

    const roomCard = pageTwo.locator(`li.public-room-item[data-room-id="${roomId}"]`).first();
    await expect(roomCard).toBeVisible();
    await roomCard.locator('button[data-room-id]').click();

    await expect(pageTwo.locator('#join-button')).toBeDisabled();
    await expect(pageTwo.locator('#status-line')).toContainText(`room ${roomId}`);
  } finally {
    await contextTwo.close();
  }
});
