// Controlled local browser test. No hosted service, real credentials or database.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { GUEST_STORAGE_KEY } from '../src/services/guest/guestStore.ts';
import { ACCOUNT_INTENT_KEY } from '../src/services/account/modeStore.ts';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.MATCH3_PREVIEW_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const contexts = [];
const user = {
  id: '000000000000000000000001',
  email: 'mock@example.test',
  username: 'OnboardingAccount',
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
  totalScore: 0,
  playerLevel: 1,
  playerExp: 0,
  progress: {},
  badges: [],
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
};
const credentials = { Username: 'MockUser', Email: 'mock@example.test', Password: 'Test123!', 'Confirm Password': 'Test123!' };
try {
  const context = await browser.newContext();
  contexts.push(context);
  let releaseReady,
    readinessCalls = 0,
    registered = false,
    registerCalls = 0,
    refreshes = 0;
  const calls = [],
    errors = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(base).origin) return route.continue();
    const path = url.pathname;
    const reply = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
        headers: {
          'Access-Control-Allow-Origin': new URL(base).origin,
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    if (path === '/ready') {
      readinessCalls++;
      if (readinessCalls === 1)
        await new Promise((resolve) => {
          releaseReady = resolve;
        });
      return reply({ ready: true });
    }
    if (!path.startsWith('/api/')) return route.abort();
    calls.push({ path, method: route.request().method() });
    if (path === '/api/auth/register') {
      registerCalls++;
      if (registerCalls === 1) return reply({ error: 'Service unavailable' }, 503);
      registered = true;
      return reply({ accessToken: 'mock-memory-only-access', user }, 201);
    }
    if (path === '/api/auth/refresh') {
      refreshes++;
      return registered ? reply({ accessToken: 'mock-memory-only-access', user }) : reply({ error: 'Session expired' }, 401);
    }
    if (path === '/api/auth/me') return reply(user);
    if (path === '/api/leaderboard/top') return reply({ entries: [], scoreVersion: 'regular-campaign-points-v1' });
    if (path === '/api/auth/logout') {
      registered = false;
      return reply({ ok: true });
    }
    if (path === '/api/auth/login') return reply({ error: 'Invalid credentials' }, 401);
    throw Error('Unexpected onboarding request: ' + path);
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/game-map');
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  const guest = await page.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY);
  assert.equal(calls.length, 0); // One readiness read is separate from guest gameplay.
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('button', { name: 'New Account', exact: true }).click();
  const dialog = page.getByRole('dialog');
  assert.equal(await dialog.getByRole('button', { name: 'Create Account', exact: true }).isEnabled(), false);
  for (const [field, value] of Object.entries(credentials)) {
    await dialog.getByPlaceholder(field, { exact: true }).pressSequentially(value, { delay: 45 });
    await page.mouse.click(8, 8);
    assert.equal(await dialog.isVisible(), true);
  }
  // Deliberately trigger an unrelated coordinator change while the form is open.
  await page.getByRole('button', { name: 'Account', exact: true }).evaluate((button) => button.click());
  assert.equal(await dialog.isVisible(), true);
  releaseReady();
  await page.getByText('Session expired', { exact: true }).waitFor();
  for (const [field, value] of Object.entries(credentials)) assert.equal(await dialog.getByPlaceholder(field, { exact: true }).inputValue(), value);
  await dialog.getByRole('button', { name: 'Create Account', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.match(await dialog.getByRole('alert').textContent(), /unconfirmed.*may have completed.*signing in/);
  await page.waitForTimeout(2300);
  assert.equal(await dialog.getByRole('alert').isVisible(), true);
  assert.equal(registerCalls, 1); // No automatic unsafe mutation retry.
  for (const [field, value] of Object.entries(credentials)) assert.equal(await dialog.getByPlaceholder(field, { exact: true }).inputValue(), value);
  await dialog.getByRole('button', { name: 'Create Account', exact: true }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).waitFor();
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate((key) => sessionStorage.getItem(key), ACCOUNT_INTENT_KEY), 'account');
  await page.reload();
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Logout', exact: true }).waitFor();
  assert.equal(refreshes, 2); // One rejected explicit restore, one verified automatic reload restore.
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY), guest);
  assert.equal(
    await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) => value.includes('mock-memory-only-access'))),
    false,
  );
  await page.getByRole('button', { name: 'Play Demo', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  assert.equal(refreshes, 2);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY), guest);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await dialog.getByPlaceholder('Email', { exact: true }).fill(credentials.Email);
  await dialog.getByPlaceholder('Password', { exact: true }).fill(credentials.Password);
  await dialog.getByRole('button', { name: 'Log in', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  await page.waitForTimeout(2200);
  assert.match(await dialog.getByRole('alert').textContent(), /password not accepted/);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.evaluate(() => {
    history.pushState({}, '', '/game-map/leaderboard');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await dialog.waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  assert.ok(calls.every((call) => !call.path.includes('campaign') && !call.path.includes('attempts')));
  console.log(
    'PASS: held warm-up leaves Demo/forms usable; backdrop/state changes preserve fields; persistent inline errors; explicit retry; verified reload restore; Demo/Guest isolation; navigation/Cancel closes auth.',
  );

  const lateContext = await browser.newContext();
  contexts.push(lateContext);
  await lateContext.addInitScript((key) => sessionStorage.setItem(key, 'account'), ACCOUNT_INTENT_KEY);
  let release,
    lateAuth = 0;
  await lateContext.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === new URL(base).origin) return route.continue();
    if (new URL(route.request().url()).pathname === '/ready') {
      await new Promise((resolve) => {
        release = resolve;
      });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ready":true}' });
    }
    if (new URL(route.request().url()).pathname.startsWith('/api/')) lateAuth++;
    return route.abort();
  });
  const late = await lateContext.newPage();
  await late.goto(base + '/game-map');
  await late.getByText('Restoring account…', { exact: true }).waitFor();
  await late.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
  await late.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  const beforeReady = await late.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY);
  release();
  await late.waitForTimeout(1000);
  assert.equal(lateAuth, 0);
  assert.equal(await late.getByRole('button', { name: 'Account', exact: true }).isVisible(), true);
  assert.equal(await late.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY), beforeReady);
  console.log('PASS: selecting Demo during prior-intent warm-up cancels restoration; late readiness never changes mode or Guest state.');
  const retryContext = await browser.newContext();
  contexts.push(retryContext);
  let checks = 0;
  await retryContext.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(base).origin) return route.continue();
    if (url.pathname === '/ready') return route.fulfill({ status: ++checks === 1 ? 503 : 200, contentType: 'application/json', body: '{"ready":true}' });
    return route.abort();
  });
  const retry = await retryContext.newPage();
  await retry.goto(base + '/game-map');
  await retry.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  await retry.getByRole('button', { name: 'Login', exact: true }).click();
  await retry.getByRole('button', { name: 'New Account', exact: true }).click();
  const retryDialog = retry.getByRole('dialog');
  await retryDialog.getByPlaceholder('Username', { exact: true }).fill('Preserved');
  await retryDialog.getByRole('button', { name: 'Retry account services', exact: true }).waitFor();
  assert.equal(await retryDialog.getByRole('button', { name: 'Create Account', exact: true }).isEnabled(), false);
  await retry.waitForTimeout(700);
  assert.equal(checks, 1);
  await retryDialog.getByRole('button', { name: 'Retry account services', exact: true }).click();
  await retry.waitForFunction(() => !document.body.textContent.includes('Starting account services'));
  assert.equal(checks, 2);
  assert.equal(await retryDialog.getByPlaceholder('Username', { exact: true }).inputValue(), 'Preserved');
  assert.equal(await retryDialog.getByRole('button', { name: 'Create Account', exact: true }).isEnabled(), true);
  await retryDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await retryDialog.waitFor({ state: 'hidden' });
  console.log('PASS: unavailable readiness leaves Demo usable, never polls, and explicit Retry enables auth without discarding form values.');
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
