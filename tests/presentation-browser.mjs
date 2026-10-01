// Presentation regression checks against local preview and controlled responses only.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GUEST_STORAGE_KEY, GUEST_CAMPAIGN_VERSION } from '../src/services/guest/guestStore.ts';
import { ACCOUNT_INTENT_KEY } from '../src/services/account/modeStore.ts';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MATCH3_PREVIEW_URL || 'http://127.0.0.1:4173';
const screenshots = process.env.MATCH3_SCREENSHOTS;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const views = [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [820, 1180],
  [430, 932],
  [390, 844],
  [360, 800],
];
const user = {
  id: '000000000000000000000001',
  email: 'mock@example.test',
  username: 'PortfolioAccount',
  avatar: 'default.png',
  revision: 0,
  rulesVersion: 'account-gameplay-v1',
  campaignVersion: 'stage-catalog-2026-09-29-v1',
  runId: null,
  frontier: 1,
  activeAttempt: null,
  pendingRewards: [],
  legacyInterrupted: false,
  campaign: null,
  sandboxUnlocked: false,
  campaignNeedsReset: false,
  powers: { bomb: 1, laser: 1, extraShuffle: 2 },
  hearts: 3,
  totalScore: 1600,
  playerLevel: 1,
  playerExp: 2000,
  progress: {},
  badges: [],
  gamesPlayed: 2,
  gamesWon: 2,
  gamesLost: 0,
};
const rows = Array.from({ length: 10 }, (_, i) => ({
  accountId: String(i + 1).padStart(24, '0'),
  username: i === 0 ? 'PortfolioAccount' : 'CampaignPlayer' + (i + 1),
  avatar: 'default.png',
  score: 8800,
  rank: i + 1,
  finalizedAt: '2026-09-30T12:00:00.000Z',
  scoreVersion: 'regular-campaign-points-v1',
}));
async function setup(width, height, { account = false, delay = 0, unavailable = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  if (account) await context.addInitScript((key) => sessionStorage.setItem(key, 'account'), ACCOUNT_INTENT_KEY);
  let probes = 0,
    apiCalls = 0;
  const errors = [];
  await context.route('http://127.0.0.1:3011/**', async (r) => {
    const path = new URL(r.request().url()).pathname;
    if (path === '/ready') {
      probes++;
      if (delay) await new Promise((res) => setTimeout(res, delay));
      return r.fulfill({
        status: unavailable ? 503 : 200,
        contentType: 'application/json',
        body: JSON.stringify({ ready: !unavailable }),
        headers: { 'Access-Control-Allow-Origin': new URL(base).origin, 'Access-Control-Allow-Credentials': 'true' },
      });
    }
    apiCalls++;
    let data;
    if (path === '/api/auth/refresh') data = { accessToken: 'mock-token', user };
    else if (path === '/api/auth/me' || path === '/api/game/snapshot') data = user;
    else if (path === '/api/leaderboard/top') data = { entries: rows, scoreVersion: 'regular-campaign-points-v1' };
    else if (path === '/api/leaderboard/me') data = { rank: 1, best: rows[0], scoreVersion: 'regular-campaign-points-v1' };
    else return r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Invalid credentials"}' });
    return r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(data),
      headers: { 'Access-Control-Allow-Origin': new URL(base).origin, 'Access-Control-Allow-Credentials': 'true' },
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  return { context, page, errors, counts: () => ({ probes, apiCalls }) };
}
async function shot(page, name) {
  if (screenshots) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshots}/${name}.png` });
  }
}
async function bounds(page, board = false) {
  const m = await page.evaluate(() => {
    const s = document.querySelector('#app-stage'),
      b = document.querySelector('[data-match3-level]');
    const r = b?.getBoundingClientRect();
    return {
      overflow: s.scrollWidth - s.clientWidth,
      board: r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height } : null,
      w: innerWidth,
      h: innerHeight,
    };
  });
  assert.ok(m.overflow <= 1, JSON.stringify(m));
  if (board) {
    assert.ok(m.board);
    assert.ok(Math.abs(m.board.width - m.board.height) < 1);
    assert.ok(m.board.left >= 0 && m.board.right <= m.w + 1 && m.board.top >= 0 && m.board.bottom <= m.h + 1, JSON.stringify(m));
    assert.ok(m.board.width >= 280, JSON.stringify(m));
  }
}
try {
  if (screenshots) await mkdir(screenshots, { recursive: true });
  for (const [w, h] of views) {
    const f = await setup(w, h);
    const p = f.page;
    for (const path of ['/', '/game-map', '/game-map/play-game?level=1', '/game-map/leaderboard', '/game-map/profile', '/missing']) {
      await p.goto(base + path);
      await p.waitForTimeout(250);
      await bounds(p, path.includes('play-game'));
      if (path === '/game-map/leaderboard') await p.getByText('PortfolioAccount', { exact: true }).waitFor();
      if (w === 1440 || w === 390)
        await shot(
          p,
          `${w}-${path.includes('play-game') ? 'gameplay' : path.includes('leaderboard') ? 'leaderboard' : path === '/missing' ? '404' : path === '/game-map' ? 'map' : path.includes('profile') ? 'profile-demo' : 'home'}`,
        );
    }
    await p.goto(base + '/game-map');
    await p.getByRole('button', { name: 'Login', exact: true }).click();
    const dialog = p.getByRole('dialog');
    await dialog.waitFor();
    assert.equal((await dialog.getAttribute('aria-labelledby')) !== null, true);
    await dialog.getByRole('button', { name: 'New Account', exact: true }).click();
    await dialog.getByPlaceholder('Username', { exact: true }).fill('Retained');
    await p.mouse.click(2, 2);
    assert.equal(await dialog.isVisible(), true);
    if (w === 390 || w === 1440) await shot(p, `${w}-register`);
    if (w <= 430) {
      await p.setViewportSize({ width: w, height: 460 });
      await dialog.getByPlaceholder('Confirm Password', { exact: true }).fill('RetainedPassword');
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).scrollIntoViewIfNeeded();
      assert.equal(await dialog.getByPlaceholder('Username', { exact: true }).inputValue(), 'Retained');
      const box = await dialog.boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= 461);
    }
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.deepEqual(f.errors, []);
    await f.context.close();
    console.log(`PASS public pages/auth viewport ${w}x${h}`);
  }
  // Canonical account screens, warm reload and delayed readiness.
  for (const [w, h] of [
    [1440, 900],
    [820, 1180],
    [390, 844],
    [360, 800],
  ]) {
    const f = await setup(w, h, { account: true, delay: 150 });
    const p = f.page;
    await p.goto(base + '/game-map');
    await p.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
    const observed = [];
    await p.exposeFunction('recordPresentation', (s) => observed.push(s));
    await p.addInitScript(() => {
      new MutationObserver(() => window.recordPresentation(document.body?.textContent || '')).observe(document, { childList: true, subtree: true });
    });
    await p.reload();
    await p.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
    assert.equal(
      observed.some((t) => t.includes('Starting account services') || t.includes('Checking account')),
      false,
    );
    await p.goto(base + '/game-map/profile');
    await p.getByRole('button', { name: 'Change avatar' }).waitFor();
    await bounds(p);
    await shot(p, `${w}-profile-account`);
    await p.goto(base + '/game-map/leaderboard');
    await p.getByText('Your best completed campaign · rank 1').waitFor();
    await bounds(p);
    await shot(p, `${w}-leaderboard-account`);
    assert.deepEqual(f.errors, []);
    await f.context.close();
  }
  const slow = await setup(390, 844, { account: true, delay: 3500 });
  await slow.page.goto(base + '/game-map');
  await slow.page.getByText('Restoring account…', { exact: true }).waitFor();
  assert.equal(await slow.page.getByText('Starting account services…', { exact: true }).count(), 0);
  await slow.page.getByText('Starting account services…', { exact: true }).waitFor();
  assert.equal(await slow.page.getByText('Starting account services…', { exact: true }).count(), 1);
  await shot(slow.page, '390-account-restoration');
  await slow.page.getByRole('button', { name: 'Play Demo', exact: true }).last().click();
  await slow.page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  await slow.page.waitForTimeout(4000);
  assert.equal(slow.counts().probes, 1);
  assert.equal(slow.counts().apiCalls, 0);
  await slow.context.close();
  const down = await setup(360, 800, { account: true, unavailable: true });
  await down.page.goto(base + '/game-map');
  await down.page.getByText('Account unavailable', { exact: true }).waitFor();
  await down.page.getByRole('button', { name: 'Play Demo', exact: true }).last().click();
  await down.page.getByRole('button', { name: 'Stage 1', exact: true }).click();
  await down.page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
  await bounds(down.page, true);
  assert.equal(down.counts().apiCalls, 0);
  await down.context.close();
  // Every catalog stage uses the same board fit; safe locally seeded Guest fixtures.
  for (const [w, h] of [
    [1366, 768],
    [360, 800],
  ])
    for (let stage = 1; stage <= 12; stage++) {
      const f = await setup(w, h);
      await f.context.addInitScript(
        ({ key, version, stage }) =>
          localStorage.setItem(
            key,
            JSON.stringify({
              schemaVersion: 1,
              campaignVersion: version,
              runId: crypto.randomUUID(),
              completedStages: Array.from({ length: stage - 1 }, (_, i) => i + 1),
              lastPlayedStage: stage,
              powers: { bomb: 1, laser: 1, extraShuffle: 2 },
              activeAttempt: null,
            }),
          ),
        { key: GUEST_STORAGE_KEY, version: GUEST_CAMPAIGN_VERSION, stage },
      );
      await f.page.goto(base + '/game-map/play-game?level=' + stage);
      await f.page.getByRole('button', { name: 'Reshuffle', exact: true }).waitFor();
      await f.page.waitForTimeout(250);
      await bounds(f.page, true);
      await f.page.getByRole('button', { name: 'Quit', exact: true }).click();
      await f.page.getByRole('dialog').waitFor();
      await f.page.getByRole('button', { name: 'Keep playing', exact: true }).click();
      assert.equal(f.counts().apiCalls, 0);
      assert.deepEqual(f.errors, []);
      await f.context.close();
    }
  console.log(
    'PASS: warm restore, delayed readiness/Demo cancellation, unavailable fallback, owner-bound profile/rank, all 12 stages at laptop/mobile, Quit confirmation, zero Guest API calls.',
  );
} finally {
  await browser.close();
}
