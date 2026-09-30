import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { GUEST_STORAGE_KEY } from '../src/services/guest/guestStore.ts';
const { chromium } = createRequire(import.meta.url)(process.env.MATCH3_PLAYWRIGHT_PACKAGE || 'playwright');
const backend = spawn(process.execPath, ['--conditions', 'development', 'tests/local-auth-server.mjs'], {
  cwd: process.cwd(),
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'],
});
let output = '',
  diagnostics = '';
backend.stdout.on('data', (b) => (output += b.toString()));
backend.stderr.on('data', (b) => (diagnostics += b.toString()));
const until = async (fn, ms = 15000) => {
  const end = Date.now() + ms;
  while (!fn() && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  assert.ok(fn(), 'Timed out waiting for test process');
};
let browser;
try {
  await until(() => output.includes('TEST_BACKEND_READY') || backend.exitCode !== null, 30000).catch(() => {
    throw Error('Test startup stalled: ' + output.slice(-300) + ' ' + diagnostics.slice(-1800));
  });
  if (!output.includes('TEST_BACKEND_READY')) throw Error('Isolated test backend failed: ' + diagnostics.slice(-1800));
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext();
  await context.route('**/api/**', (route) => (new URL(route.request().url()).origin === 'http://127.0.0.1:3011' ? route.continue() : route.abort()));
  const page = await context.newPage();
  const errors = [],
    calls = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) calls.push({ path: new URL(r.url()).pathname, authorization: r.headers().authorization });
  });
  await page.goto('http://127.0.0.1:4173/game-map');
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  const guest = await page.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY);
  assert.equal(calls.length, 0);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByPlaceholder('Email', { exact: true }).fill('browser@example.test');
  await page.getByPlaceholder('Password', { exact: true }).fill('Test123!');
  const loginAck = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/login' && r.status() === 200);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await loginAck;
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  const cookies = await context.cookies('http://127.0.0.1:3011/api/auth/refresh');
  assert.ok(cookies.some((c) => c.name === 'match3_refresh' && c.httpOnly && c.path === '/api/auth'));
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await page.getByText('BrowserAccount', { exact: true }).waitFor();
  // JWT lasts one second only in this isolated test server.
  await page.waitForTimeout(1500);
  const before = calls.filter((c) => c.path === '/api/auth/refresh').length;
  const confirmed = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/me' && r.status() === 200);
  await page.getByRole('button', { name: 'Refresh account', exact: true }).click();
  await confirmed;
  await page.waitForFunction(() => !document.body.textContent.includes('Updating account data'));
  assert.equal(calls.filter((c) => c.path === '/api/auth/refresh').length, before + 1);
  assert.ok(calls.some((c) => c.path === '/api/auth/me' && c.authorization?.startsWith('Bearer ')));
  const persisted = await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)]);
  for (const request of calls) if (request.authorization) assert.ok(persisted.every((v) => !v.includes(request.authorization.slice(7))));
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY), guest);
  // Actual server expiry/rejection, not an intercepted refresh response.
  backend.stdin.write('expire\n');
  await until(() => output.includes('TEST_SESSIONS_EXPIRED'));
  await page.getByRole('button', { name: 'Refresh account', exact: true }).click();
  await page.getByText('Session expired', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Sign in', exact: true }).isVisible(), true);
  await page.getByRole('button', { name: 'Play Demo', exact: true }).first().click();
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY), guest);
  // Explicit restore with an expired family cannot establish authority.
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByText('Session expired', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByPlaceholder('Email', { exact: true }).fill('browser@example.test');
  await page.getByPlaceholder('Password', { exact: true }).fill('Test123!');
  const again = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/login' && r.status() === 200);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await again;
  await page.getByRole('button', { name: 'Stage 1', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.getByRole('button', { name: 'Account', exact: true }).waitFor();
  await until(() => calls.some((c) => c.path === '/api/auth/logout'));
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByText('Session expired', { exact: true }).waitFor();
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), GUEST_STORAGE_KEY), guest);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: real isolated backend login, HttpOnly cookie, bearer /me, JWT expiry/rotation, rejected expiry, logout revocation, no stored access tokens, Guest save unchanged.',
  );
  await context.close();
} finally {
  await browser?.close();
  backend.stdin.write('stop\n');
  await until(() => backend.exitCode !== null, 10000).catch(() => backend.kill());
}
