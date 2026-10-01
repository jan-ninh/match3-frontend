import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const screenshots = process.env.MATCH3_SCREENSHOTS;
try {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await c.route('http://127.0.0.1:3011/**', (r) => r.fulfill({ contentType: 'application/json', body: '{"ready":true}' }));
  const p = await c.newPage();
  await p.goto('http://127.0.0.1:4173/game-map/play-game?level=1');
  const board = p.locator('[data-match3-level]');
  await board.waitFor();
  await p.waitForTimeout(300);
  const cell = p.getByRole('button', { name: 'cell 0', exact: true });
  const cellBox = await cell.boundingBox();
  const piece = p.locator('[data-piece-id]').first();
  const before = await piece.boundingBox();
  await p.mouse.move(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
  await p.mouse.down();
  await p.mouse.move(cellBox.x + cellBox.width / 2 + cellBox.width * 0.65, cellBox.y + cellBox.height / 2, { steps: 10 });
  await p.waitForTimeout(250);
  const moved = await piece.boundingBox();
  assert.ok(moved.x - before.x > cellBox.width * 0.8, JSON.stringify({ before, moved, cellBox }));
  await p.mouse.up();
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Bomb', exact: true }).click();
  const b = await board.boundingBox();
  await p.mouse.move(b.x + (b.width * 6.5) / 8, b.y + (b.height * 4.5) / 8);
  await p.waitForTimeout(150);
  const targets = await board.locator('div[style*="z-index: 44"] > div').evaluateAll((es) => es.map((e) => e.style.transform));
  assert.ok(targets.includes('translate(300px, 180px)') && targets.includes('translate(420px, 300px)'), JSON.stringify(targets));
  await p.getByRole('button', { name: 'Bomb', exact: true }).click();
  await p.getByRole('button', { name: 'Quit', exact: true }).click();
  await p.waitForTimeout(500);
  if (screenshots) await p.screenshot({ path: screenshots + '/390-quit-confirmation.png' });
  await p.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await c.close();
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
  ])
    for (const outcome of ['Win (unlock next)', 'Lose (reset + lvl1)']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      await ctx.route('http://127.0.0.1:3011/**', (r) => r.fulfill({ contentType: 'application/json', body: '{"ready":true}' }));
      const page = await ctx.newPage();
      await page.goto('http://127.0.0.1:5173/game-map/play-game?level=1');
      await page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
      await page.locator('[data-piece-id]').first().waitFor();
      await page.waitForTimeout(100);
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('d');
      await page.getByRole('button', { name: outcome, exact: true }).waitFor();
      await page.getByRole('button', { name: outcome, exact: true }).evaluate((e) => e.click());
      const title = outcome.startsWith('Win') ? 'You Won!' : 'Game Over';
      await page.getByText(title, { exact: true }).waitFor();
      await page.keyboard.press('d');
      await page.waitForTimeout(500);
      const dialog = page.getByRole('dialog');
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= w + 1 && box.y >= 0 && box.y + box.height <= h + 1);
      if (screenshots) await page.screenshot({ path: `${screenshots}/${w}-${outcome.startsWith('Win') ? 'win' : 'loss'}.png` });
      await ctx.close();
    }
  console.log(
    'PASS: real scaled pointer drag preview and far-column bomb hover; mobile Quit confirmation; immediate WIN/LOSS dialogs at desktop/mobile (development-only forced outcomes).',
  );
} finally {
  await browser.close();
}
