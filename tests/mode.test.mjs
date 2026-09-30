import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionStore } from '../src/services/account/modeStore.ts';
import { RequestError, createRequester } from '../src/api/transport.ts';
import { GuestStore } from '../src/services/guest/guestStore.ts';
const user = (id = '000000000000000000000001') => ({
  revision: 0,
  rulesVersion: 'account-gameplay-v1',
  campaignVersion: 'stage-catalog-2026-09-29-v1',
  runId: null,
  frontier: 1,
  activeAttempt: null,
  pendingRewards: [],
  legacyInterrupted: false,
  id,
  email: 'account@example.test',
  username: 'Account',
  avatar: 'default.png',
  hearts: 3,
  powers: { bomb: 1, laser: 1, extraShuffle: 2 },
  progress: {},
  playerLevel: 1,
  playerExp: 0,
  totalScore: 0,
  badges: [],
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
});
const bundle = (accessToken = 'access-a', id) => ({ accessToken, user: user(id) });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const signIn = (store) => store.credentials('/api/auth/login', { email: 'account@example.test', password: 'test password' });
test('immediate Demo ignores arbitrary saved localStorage user ID; no token or account authority from storage', async () => {
  let calls = 0;
  const store = new SessionStore(async () => {
    calls++;
    return bundle();
  });
  const guest = new GuestStore();
  const save = JSON.stringify(guest.getSnapshot().save);
  assert.equal(store.getSnapshot().mode, 'demo');
  assert.equal(store.getSnapshot().session, 'none');
  assert.equal(store.getSnapshot().selected, null);
  await assert.rejects(store.request('/api/auth/me'), (e) => e.kind === 'unauthenticated');
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(guest.getSnapshot().save), save);
});
test('login/register establish verified owner-bound snapshot; access token exists only in private-request memory', async () => {
  const calls = [];
  const store = new SessionStore(async (path, options) => {
    calls.push({ path, options });
    return bundle();
  });
  await signIn(store);
  assert.equal(store.getSnapshot().session, 'verified');
  assert.equal(store.getSnapshot().mode, 'account');
  assert.equal(store.getSnapshot().profile.id, user().id);
  assert.equal(JSON.stringify(store.getSnapshot()).includes('access-a'), false);
  await store.request('/private');
  assert.equal(calls[1].options.headers.get('Authorization'), 'Bearer access-a');
  assert.equal(calls[1].options.credentials, 'omit');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.retryRead, false);
  await store.credentials('/api/auth/register', {});
  assert.equal(store.getSnapshot().session, 'verified');
});
test('explicit Account restore calls rotating refresh once and /me supplies canonical verified snapshot', async () => {
  const paths = [];
  const store = new SessionStore(async (path) => {
    paths.push(path);
    return path.endsWith('/refresh') ? bundle() : { ...user(), playerLevel: 4 };
  });
  await store.restore();
  assert.equal(store.getSnapshot().session, 'verified');
  assert.deepEqual(paths, ['/api/auth/refresh']);
  await store.refreshProfile();
  assert.equal(store.getSnapshot().profile.playerLevel, 4);
  assert.deepEqual(paths, ['/api/auth/refresh', '/api/auth/me']);
});
test('concurrent definitive access 401s cause one single-flight refresh and one replay each with updated token', async () => {
  let refreshes = 0;
  const calls = [];
  const gate = deferred();
  const store = new SessionStore(async (path, options) => {
    if (path.endsWith('/login')) return bundle();
    if (path.endsWith('/refresh')) {
      refreshes++;
      await gate.promise;
      return bundle('access-b');
    }
    const token = options.headers.get('Authorization');
    calls.push(token);
    if (token === 'Bearer access-a') throw new RequestError('unauthenticated', 401);
    return { ok: true };
  });
  await signIn(store);
  const a = store.request('/a'),
    b = store.request('/b');
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(refreshes, 1);
  gate.resolve();
  await Promise.all([a, b]);
  assert.deepEqual(calls.sort(), ['Bearer access-a', 'Bearer access-a', 'Bearer access-b', 'Bearer access-b']);
  assert.equal(refreshes, 1);
});
test('definitive pre-controller mutation 401 may replay once; transport ambiguity cannot renew or replay mutation', async () => {
  for (const kind of ['unauthenticated', 'timeout', 'unavailable', 'server']) {
    let writes = 0,
      refreshes = 0;
    const store = new SessionStore(async (path) => {
      if (path.endsWith('/login')) return bundle();
      if (path.endsWith('/refresh')) {
        refreshes++;
        return bundle('b');
      }
      writes++;
      if (writes === 1) throw new RequestError(kind, kind === 'unauthenticated' ? 401 : undefined);
      return { ok: true };
    });
    await signIn(store);
    const request = store.request('/mutation', { method: 'POST', body: '{"fixedOperationId":"same"}' });
    if (kind === 'unauthenticated') {
      await request;
      assert.equal(writes, 2);
      assert.equal(refreshes, 1);
    } else {
      await assert.rejects(request, (e) => e.kind === kind);
      assert.equal(writes, 1);
      assert.equal(refreshes, 0);
    }
  }
});
test('refresh rejection expires session, clears authority, and stops subsequent private requests', async () => {
  let reads = 0;
  const store = new SessionStore(async (path) => {
    if (path.endsWith('/login')) return bundle();
    reads++;
    throw new RequestError('unauthenticated', 401);
  });
  await signIn(store);
  await assert.rejects(store.request('/private'));
  assert.equal(store.getSnapshot().session, 'expired');
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(store.getSnapshot().selected, null);
  const previous = reads;
  await assert.rejects(store.request('/private'), (e) => e.kind === 'unauthenticated');
  assert.equal(reads, previous);
});
test('second definitive 401 after auth replay stops instead of creating a renewal loop', async () => {
  let renewals = 0,
    reads = 0;
  const store = new SessionStore(async (path) => {
    if (path.endsWith('/login')) return bundle();
    if (path.endsWith('/refresh')) {
      renewals++;
      return bundle('b');
    }
    reads++;
    throw new RequestError('unauthenticated', 401);
  });
  await signIn(store);
  await assert.rejects(store.request('/private'));
  assert.equal(renewals, 1);
  assert.equal(reads, 2);
  assert.equal(store.getSnapshot().session, 'expired');
});
test('backend unavailable is distinct from session expiry; bounded explicit restoration cannot fabricate progress', async () => {
  const raw = createRequester('', { deadlineMs: 10, readBudgetMs: 25, retryDelayMs: 2, fetch: () => new Promise(() => {}) });
  const store = new SessionStore(raw);
  await store.restore();
  assert.equal(store.getSnapshot().availability, 'unavailable');
  assert.equal(store.getSnapshot().session, 'unknown');
  assert.equal(store.getSnapshot().profile, null);
});
test('late refresh after Demo and online/reconnect observation never changes mode or guest save', async () => {
  const pending = deferred();
  const guest = new GuestStore();
  const saved = JSON.stringify(guest.getSnapshot().save);
  const store = new SessionStore(async () => pending.promise);
  const read = store.restore();
  await Promise.resolve();
  store.playDemo();
  pending.resolve(bundle());
  await read;
  assert.equal(store.getSnapshot().mode, 'demo');
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(JSON.stringify(guest.getSnapshot().save), saved);
});
test('late credential/current-user responses cannot overwrite a new account; old owner IDs cannot issue private requests', async () => {
  const pending = deferred();
  let logins = 0;
  const second = '000000000000000000000002';
  const store = new SessionStore(async (path) => {
    if (path.endsWith('/login')) {
      logins++;
      return logins === 1 ? pending.promise : bundle('b', second);
    }
    return user();
  });
  const first = signIn(store);
  const rejected = assert.rejects(first, (e) => e.kind === 'cancelled');
  await Promise.resolve();
  await Promise.resolve();
  const next = signIn(store);
  pending.resolve(bundle());
  await rejected;
  await next;
  assert.equal(store.getSnapshot().selected.id, second);
  await assert.rejects(store.ownerRequest(user().id, '/mutation', { method: 'POST' }), (e) => e.kind === 'cancelled');
});
test('logout immediately selects Demo, preserves guest data, and marks unconfirmed remote revocation truthfully', async () => {
  const guest = new GuestStore();
  const save = JSON.stringify(guest.getSnapshot().save);
  const gate = deferred();
  const store = new SessionStore(async (path) => (path.endsWith('/logout') ? gate.promise : bundle()));
  await signIn(store);
  const logout = store.logout();
  assert.equal(store.getSnapshot().mode, 'demo');
  assert.equal(store.getSnapshot().profile, null);
  gate.resolve();
  await logout;
  assert.equal(JSON.stringify(guest.getSnapshot().save), save);
  const fail = new SessionStore(async (path) => {
    if (path.endsWith('/logout')) throw new RequestError('timeout');
    return bundle();
  });
  await signIn(fail);
  await fail.logout();
  assert.equal(fail.getSnapshot().logoutUnconfirmed, true);
  assert.equal(fail.getSnapshot().mode, 'demo');
});
test('malformed current-user snapshot rejects instead of creating account authority', async () => {
  const store = new SessionStore(async () => ({ accessToken: 'a', user: { id: 'arbitrary', progress: {} } }));
  await store.restore();
  assert.equal(store.getSnapshot().session, 'unknown');
  assert.equal(store.getSnapshot().profile, null);
});
test('route cancellation does not expire a verified session or publish obsolete current-user data', async () => {
  const gate = deferred();
  const store = new SessionStore(async (path) => (path.endsWith('/login') ? bundle() : gate.promise));
  await signIn(store);
  const controller = new AbortController();
  const request = store.request('/read', { signal: controller.signal });
  controller.abort();
  gate.resolve({ old: true });
  await assert.rejects(request, (e) => e.kind === 'cancelled');
  assert.equal(store.getSnapshot().session, 'verified');
});

test('current-user owner mismatch expires authority rather than adopting another account snapshot', async () => {
  const store = new SessionStore(async (path) => (path.endsWith('/login') ? bundle() : user('000000000000000000000002')));
  await signIn(store);
  await store.refreshProfile();
  assert.equal(store.getSnapshot().session, 'expired');
  assert.equal(store.getSnapshot().selected, null);
});
