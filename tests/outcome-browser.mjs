import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const base = process.env.MATCH3_DEV_URL || 'http://127.0.0.1:5173';
try {
  for (const outcome of ['WIN', 'LOSS']) {
    const context = await browser.newContext();
    const writes = [];
    const errors = [];
    await context.addInitScript(() => localStorage.setItem('user', JSON.stringify({ id: '000000000000000000000001', username: 'Account' })));
    await context.route('**/*', (r) =>
      new URL(r.request().url()).origin !== new URL(base).origin && !r.request().url().includes('/api/') ? r.abort() : r.continue(),
    );
    await context.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (!new URL(url).pathname.startsWith('/api/')) return route.continue();
      if (url.includes('/completeStage/') || url.includes('/lose/')) {
        writes.push(url);
        await new Promise((r) => setTimeout(r, 11000));
        try {
          await route.fulfill({ status: 503, body: '{}' });
        } catch {}
        return;
      }
      const profile = {
        username: 'Account',
        avatar: 'default.png',
        powers: { bomb: 1, laser: 1, extraShuffle: 2 },
        progress: {},
        playerLevel: 1,
        playerExp: 0,
        totalScore: 0,
        badges: [],
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
      };
      const data = url.includes('/profile/')
        ? profile
        : url.includes('/status')
          ? { allowedStage: 1, powers: profile.powers }
          : url.includes('/start/')
            ? { boosters: profile.powers }
            : { CAMPAIGN_ID: crypto.randomUUID() };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/game-map');
    await page.getByRole('button', { name: 'Resume saved account' }).click();
    await page.getByRole('button', { name: 'Stage 1', exact: true }).click();
    await page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
    await page.locator('[data-piece-id]').first().waitFor();
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('d');
    const start = Date.now();
    await page.getByRole('button', { name: outcome === 'WIN' ? 'Win (unlock next)' : 'Lose (reset + lvl1)', exact: true }).click();
    await page.getByText(outcome === 'WIN' ? 'You Won!' : 'Game Over', { exact: true }).waitFor({ timeout: 3000 });
    assert.ok(Date.now() - start < 3000);
    await page.getByText('Saving', { exact: true }).waitFor();
    await page.getByText('Save unconfirmed', { exact: true }).waitFor({ timeout: 10000 });
    assert.equal(writes.length, 1);
    await page
      .getByRole('button', { name: /Return to map/i })
      .last()
      .click();
    await page.getByText('Save unconfirmed', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Stage 1', exact: true }).isEnabled(), false);
    await page.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
    await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: ' + outcome + ' overlay immediate, mutation sends once, timeout unconfirmed, map/Demo usable.');
    await context.close();
  }
} finally {
  await browser.close();
}
