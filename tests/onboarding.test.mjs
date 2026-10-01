import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BackendReadiness } from '../src/services/network/backendReadiness.ts';
import { RequestError, createRequester } from '../src/api/transport.ts';
import { authFailureMessage } from '../src/features/overlays/authFailure.ts';

test('warm-up is one read with its own deadline, no credentials, retries or keep-alive', async () => {
  let calls = 0,
    options;
  const ready = new BackendReadiness(async (path, opts) => {
    calls++;
    options = opts;
    assert.equal(path, '/ready');
    return { ready: true };
  });
  ready.start();
  ready.start();
  await ready.waitForReady();
  ready.start();
  assert.equal(calls, 1);
  assert.equal(ready.getSnapshot(), 'ready');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.retryRead, false);
  assert.equal(options.deadlineMs, 90000);
});
test('never-resolving readiness terminates; explicit retry begins a new one-shot cycle', async () => {
  let calls = 0;
  const transport = createRequester('', {
    fetch: () => {
      calls++;
      return new Promise(() => {});
    },
  });
  const ready = new BackendReadiness(transport, 20);
  await assert.rejects(ready.waitForReady(), (e) => e.kind === 'unavailable');
  assert.equal(ready.getSnapshot(), 'unavailable');
  assert.equal(calls, 1);
  ready.start();
  assert.equal(calls, 1);
  ready.retry();
  await assert.rejects(ready.waitForReady());
  assert.equal(calls, 2);
});
test('obsolete account waits cancel without cancelling shared readiness or late switching modes', async () => {
  let release;
  const ready = new BackendReadiness(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const controller = new AbortController();
  const wait = ready.waitForReady(controller.signal);
  controller.abort();
  await assert.rejects(wait, (e) => e.kind === 'cancelled');
  release({ ready: true });
  await ready.waitForReady();
  assert.equal(ready.getSnapshot(), 'ready');
});
test('non-ready response fails closed and readiness retry ignores obsolete responses', async () => {
  let release,
    calls = 0;
  const ready = new BackendReadiness(() =>
    ++calls === 1
      ? new Promise((resolve) => {
          release = resolve;
        })
      : Promise.resolve({ ready: true }),
  );
  ready.start();
  ready.retry();
  await ready.waitForReady();
  release({ ready: false });
  await Promise.resolve();
  assert.equal(ready.getSnapshot(), 'ready');
  const notReady = new BackendReadiness(async () => ({ ready: false }));
  await assert.rejects(notReady.waitForReady());
});
test('inline auth copy distinguishes uncertain writes, duplicate registration, invalid credentials and forbidden requests', () => {
  for (const kind of ['timeout', 'unavailable', 'server', 'protocol']) {
    assert.match(authFailureMessage(new RequestError(kind), 'register'), /unconfirmed.*may have completed.*signing in/);
    assert.match(authFailureMessage(new RequestError(kind), 'login'), /could not be reached/);
  }
  assert.match(authFailureMessage(new RequestError('conflict'), 'register'), /already used/);
  assert.match(authFailureMessage(new RequestError('unauthenticated'), 'login'), /password not accepted/);
  assert.doesNotMatch(authFailureMessage(new RequestError('forbidden'), 'login'), /expired/);
  assert.doesNotMatch(authFailureMessage(new Error('sensitive diagnostic'), 'register'), /sensitive/);
});
