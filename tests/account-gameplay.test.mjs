import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SessionStore } from '../src/services/account/modeStore.ts';
import { AccountGameplayStore, ACCOUNT_JOURNAL_KEY } from '../src/services/account/gameplayStore.ts';
import { RequestError } from '../src/api/transport.ts';
import { GuestStore } from '../src/services/guest/guestStore.ts';
const ownerA = '000000000000000000000001',
  ownerB = '000000000000000000000002';
const profile = (id = ownerA) => ({
  id,
  email: 'account@example.test',
  username: 'Account',
  avatar: 'default.png',
  hearts: 3,
  powers: { bomb: 120, laser: 120, extraShuffle: 120 },
  progress: {},
  playerLevel: 1,
  playerExp: 0,
  totalScore: 0,
  badges: [],
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
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
});
const clone = (v) => JSON.parse(JSON.stringify(v));
const tick = () => new Promise((r) => setImmediate(r));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function fixture() {
  let data = profile(),
    fail = null,
    held = null;
  const receipts = new Map(),
    calls = [],
    storageValues = new Map();
  const storage = { getItem: (k) => storageValues.get(k) ?? null, setItem: (k, v) => storageValues.set(k, v) };
  const transport = async (path, opts) => {
    calls.push({ path, body: opts?.body });
    if (path.endsWith('/login') || path.endsWith('/refresh')) return { accessToken: 'memory-access', user: clone(data) };
    if (path.endsWith('/me')) return clone(data);
    if (path.includes('/operations/')) {
      const receipt = receipts.get(path.split('/').at(-1));
      return receipt ? { status: 'committed', receipt, snapshot: clone(data) } : { status: 'not-found', safeToRetry: true, snapshot: clone(data) };
    }
    const b = JSON.parse(opts.body);
    const old = receipts.get(b.operationId);
    if (old) return { receipt: old, snapshot: clone(data) };
    const command = path.endsWith('/start') ? 'START' : path.endsWith('/claim') ? 'REWARD' : path.endsWith('/new-run') ? 'NEW_RUN' : 'TERMINAL';
    if (fail === 'before') throw new RequestError('timeout');
    if (command === 'START') {
      data.revision++;
      data.runId ??= randomUUID();
      data.activeAttempt = {
        attemptId: randomUUID(),
        runId: data.runId,
        stageNumber: b.stageNumber,
        scenarioVersion: 'stage-catalog-2026-09-29-v1:clean-room',
        startedAt: new Date().toISOString(),
        startedRevision: data.revision,
        startOperationId: b.operationId,
        initialPowers: clone(data.powers),
      };
    } else if (command === 'TERMINAL') {
      for (const e of b.usage) data.powers[e.power]--;
      data.totalScore += 800;
      data.playerExp += 1000;
      data.gamesWon++;
      data.frontier++;
      if (data.activeAttempt.stageNumber === 11 && data.campaign) {
        const date = new Date().toISOString();
        data.campaign = {
          ...data.campaign,
          status: 'COMPLETED',
          closedAt: date,
          score: 8800,
          completedStages: Array.from({ length: 11 }, (_, i) => i + 1),
          result: {
            runId: data.runId,
            score: 8800,
            finalizedAt: date,
            finalizedRevision: data.revision + 1,
            rulesVersion: data.rulesVersion,
            catalogVersion: data.campaignVersion,
            scoreVersion: 'regular-campaign-points-v1',
            regularStages: 11,
          },
        };
        data.sandboxUnlocked = true;
      }
      data.progress['stage' + data.activeAttempt.stageNumber] = { completed: true, points: 800 };
      data.activeAttempt = null;
      data.revision++;
    } else if (command === 'NEW_RUN') {
      data.revision++;
      data.progress = {};
      data.frontier = 1;
      data.totalScore = 0;
      data.runId = randomUUID();
      data.sandboxUnlocked = false;
      data.campaignNeedsReset = false;
      data.pendingRewards = [];
    } else {
      data.powers[b.power] += 2;
      data.pendingRewards = [];
      data.revision++;
    }
    const receipt = {
      operationId: b.operationId,
      command,
      attemptId: command === 'START' ? data.activeAttempt.attemptId : command === 'NEW_RUN' ? null : b.attemptId,
      status: 'committed',
      resultingRevision: data.revision,
      resultSnapshot: clone(data),
    };
    receipts.set(b.operationId, receipt);
    if (held) await held.promise;
    if (fail === 'after') throw new RequestError('timeout');
    return { receipt, snapshot: clone(data) };
  };
  const session = new SessionStore(transport),
    store = new AccountGameplayStore(session, () => storage);
  return {
    session,
    store,
    calls,
    storage,
    storageValues,
    receipts,
    get data() {
      return data;
    },
    set data(v) {
      data = v;
    },
    set fail(v) {
      fail = v;
    },
    set held(v) {
      held = v;
    },
    async login() {
      await session.credentials('/api/auth/login', {});
      await tick();
    },
    async start() {
      store.retain('entry');
      await store.start(data.frontier, 'entry');
    },
    dispose() {
      store.dispose();
    },
  };
}
test('acknowledged start binds durable attempt exactly once through StrictMode release/retain and duplicate entry call', async () => {
  const f = fixture();
  await f.login();
  f.store.retain('entry');
  const first = f.store.start(1, 'entry');
  f.store.release('entry');
  f.store.retain('entry');
  await first;
  await f.store.start(1, 'entry');
  assert.equal(f.calls.filter((c) => c.path.endsWith('/attempts/start')).length, 1);
  assert.equal(f.store.getSnapshot().binding.attemptId, f.data.activeAttempt.attemptId);
  assert.equal(f.store.getSnapshot().powers.bomb, 120);
  f.dispose();
});
test('real route leave does not infer LOSS or restart an interrupted board; explicit abandon is required', async () => {
  const f = fixture();
  await f.login();
  await f.start();
  f.store.release('entry');
  await tick();
  assert.equal(f.store.getSnapshot().binding, null);
  assert.equal(f.store.canStart(), false);
  assert.equal(f.calls.filter((c) => c.path.endsWith('/terminal')).length, 0);
  await assert.rejects(f.store.start(1, 'other'));
  f.dispose();
});
test('engine-confirmed power ACKs have one canonical owner; aliases/double callbacks consume once and old attempt ACKs are ignored', async () => {
  const f = fixture();
  await f.login();
  await f.start();
  const attempt = f.store.getSnapshot().binding.attemptId;
  f.store.consume(attempt, 'gridlaser', 1);
  f.store.consume(attempt, 'bomb', 1);
  f.store.consume('old', 'laser', 2);
  assert.equal(f.store.getSnapshot().powers.bomb, 119);
  assert.equal(f.store.getSnapshot().powers.laser, 120);
  const row = JSON.parse(f.storageValues.get(ACCOUNT_JOURNAL_KEY)).entries[0];
  assert.deepEqual(row.usage, [{ id: 1, power: 'bomb' }]);
  f.dispose();
});
test('WIN/LOSS presentation happens before remote work; duplicate terminal callback sends one immutable operation', async () => {
  for (const result of ['WIN', 'LOSS']) {
    const f = fixture();
    await f.login();
    await f.start();
    const gate = deferred();
    f.held = gate;
    let shown = 0;
    const attempt = f.store.getSnapshot().binding.attemptId;
    const write = f.store.finish(attempt, result, () => shown++);
    assert.equal(shown, 1);
    assert.equal(f.store.getSnapshot().status, 'saving');
    await f.store.finish(attempt, result, () => shown++);
    assert.equal(shown, 1);
    gate.resolve();
    await write;
    assert.equal(f.calls.filter((c) => c.path.endsWith('/terminal')).length, 1);
    assert.equal(f.store.getSnapshot().status, 'saved');
    f.dispose();
  }
});
test('ambiguous outcome stores exactly one minimal journal record, blocks new attempts and never automatically replays', async () => {
  const f = fixture();
  await f.login();
  await f.start();
  f.fail = 'after';
  await f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN');
  const journal = JSON.parse(f.storageValues.get(ACCOUNT_JOURNAL_KEY));
  assert.equal(journal.entries.length, 1);
  const pending = journal.entries[0].pending;
  assert.equal(pending.command, 'TERMINAL');
  assert.equal(pending.ownerId, ownerA);
  assert.equal('accessToken' in pending, false);
  assert.equal(JSON.stringify(journal).includes('memory-access'), false);
  assert.equal(f.store.getSnapshot().status, 'unconfirmed');
  assert.equal(f.store.canStart(), false);
  await assert.rejects(f.store.start(2, 'next'));
  assert.equal(f.calls.filter((c) => c.path.endsWith('/terminal')).length, 1);
  f.dispose();
});
test('reload restores metadata without board; same verified owner reconciles committed receipt and adopts snapshot without mutation replay', async () => {
  const f = fixture();
  await f.login();
  await f.start();
  f.fail = 'after';
  await f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN');
  f.fail = null;
  f.dispose();
  const session = new SessionStore(async (path, opts) => {
    if (path.endsWith('/refresh')) return { accessToken: 'restored-memory-token', user: clone(f.data) };
    if (path.includes('/operations/')) {
      const receipt = f.receipts.get(path.split('/').at(-1));
      return { status: 'committed', receipt, snapshot: clone(f.data) };
    }
    throw Error('unexpected replay');
  });
  const reload = new AccountGameplayStore(session, () => f.storage);
  assert.equal(reload.getSnapshot().binding, null);
  assert.equal(session.getSnapshot().mode, 'demo');
  await session.restore();
  await tick();
  assert.equal(reload.getSnapshot().status, 'saved');
  assert.equal(reload.getSnapshot().data.totalScore, 800);
  assert.equal(reload.getSnapshot().binding, null);
  assert.equal(reload.canStart(), true);
  assert.equal(JSON.parse(f.storageValues.get(ACCOUNT_JOURNAL_KEY)).entries.length, 0);
  reload.dispose();
});
test('explicit recovery queries receipt first; not-found safe retry preserves operation ID and payload byte-for-byte', async () => {
  const f = fixture();
  await f.login();
  await f.start();
  f.fail = 'before';
  await f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN');
  const first = f.calls.filter((c) => c.path.endsWith('/terminal'))[0].body;
  f.fail = null;
  await f.session.restore();
  await tick();
  assert.equal(f.store.getSnapshot().safeToRetry, true);
  assert.equal(f.calls.filter((c) => c.path.endsWith('/terminal')).length, 1);
  await f.store.reconcile(true);
  const writes = f.calls.filter((c) => c.path.endsWith('/terminal'));
  assert.equal(writes.length, 2);
  assert.equal(writes[1].body, first);
  assert.equal(f.store.getSnapshot().data.totalScore, 800);
  assert.ok(f.calls.findIndex((c) => c.path.includes('/operations/')) < f.calls.lastIndexOf(writes[1]));
  f.dispose();
});
test('different account login cannot replay/read pending owner data; Demo/guest save remain independent', async () => {
  const f = fixture(),
    guest = new GuestStore();
  const original = JSON.stringify(guest.getSnapshot().save);
  await f.login();
  await f.start();
  f.fail = 'after';
  await f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN');
  const oldPending = JSON.parse(f.storageValues.get(ACCOUNT_JOURNAL_KEY)).entries[0].pending;
  f.session.playDemo();
  assert.equal(f.store.getSnapshot().ownerId, null);
  assert.equal(f.session.getSnapshot().mode, 'demo');
  f.data = profile(ownerB);
  f.fail = null;
  const count = f.calls.length;
  await f.login();
  assert.equal(f.store.getSnapshot().ownerId, ownerB);
  assert.equal(f.store.canStart(), true);
  assert.equal(
    f.calls.slice(count).some((c) => c.path.includes('/operations/')),
    false,
  );
  assert.equal(JSON.parse(f.storageValues.get(ACCOUNT_JOURNAL_KEY)).entries[0].pending.body.operationId, oldPending.body.operationId);
  assert.equal(JSON.stringify(guest.getSnapshot().save), original);
  f.dispose();
});
test('late old-account write cannot overwrite Demo/new account or a newer authoritative revision', async () => {
  const f = fixture();
  await f.login();
  await f.start();
  const held = deferred();
  f.held = held;
  const save = f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN');
  f.session.playDemo();
  f.data = profile(ownerB);
  f.held = null;
  await f.login();
  held.resolve();
  await save;
  assert.equal(f.store.getSnapshot().ownerId, ownerB);
  assert.equal(f.store.getSnapshot().data.totalScore, 0);
  const current = clone(f.data);
  current.revision = 5;
  f.session.adoptGameplay(f.session.getSnapshot().generation, current);
  assert.equal(f.session.adoptGameplay(f.session.getSnapshot().generation, { ...current, revision: 4, totalScore: 999 }), false);
  assert.equal(f.session.getSnapshot().profile.totalScore, 0);
  f.dispose();
});
test('same-owner receipt unavailable on restoration keeps pending transitions blocked with no background replay', async () => {
  const f = fixture();
  await f.login();
  await f.start();
  f.fail = 'before';
  await f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN');
  f.dispose();
  const session = new SessionStore(async (path) =>
    path.endsWith('/refresh') ? { accessToken: 'x', user: clone(f.data) } : Promise.reject(new RequestError('unavailable')),
  );
  const store = new AccountGameplayStore(session, () => f.storage);
  await session.restore();
  await tick();
  assert.equal(store.getSnapshot().status, 'unconfirmed');
  assert.equal(store.canStart(), false);
  assert.ok(store.getSnapshot().pending);
  session.playDemo();
  assert.equal(store.getSnapshot().ownerId, null);
  store.dispose();
});
test('journal parsing rejects unsupported/corrupt/secrets payloads; storage failure retains safe in-memory operations', async () => {
  const f = fixture();
  f.storageValues.set(ACCOUNT_JOURNAL_KEY, '{broken');
  const extra = new AccountGameplayStore(f.session, () => f.storage);
  assert.equal(extra.getSnapshot().storage, 'recovered');
  extra.dispose();
  const failStorage = new AccountGameplayStore(f.session, () => ({
    getItem: () => null,
    setItem: () => {
      throw Error('blocked');
    },
  }));
  await f.login();
  failStorage.retain('entry');
  await failStorage.start(1, 'entry');
  assert.equal(failStorage.getSnapshot().storage, 'visit-only');
  assert.ok(failStorage.getSnapshot().binding);
  failStorage.dispose();
  f.dispose();
});
test('earned reward uses stable command and no predicted grant or arbitrary PATCH', async () => {
  const f = fixture();
  await f.login();
  const attemptId = randomUUID();
  f.data.runId = randomUUID();
  f.data.pendingRewards = [{ attemptId, runId: f.data.runId, quantity: 2 }];
  f.session.adoptGameplay(f.session.getSnapshot().generation, clone(f.data));
  const gate = deferred();
  f.held = gate;
  const write = f.store.claimReward(attemptId, 'bomb');
  assert.equal(f.store.getSnapshot().powers.bomb, 120);
  assert.equal(f.store.getSnapshot().status, 'saving');
  gate.resolve();
  await write;
  assert.equal(f.store.getSnapshot().powers.bomb, 122);
  assert.equal(f.calls.filter((c) => c.path.endsWith('/claim')).length, 1);
  assert.equal(
    f.calls.some((c) => c.path.endsWith('/powers')),
    false,
  );
  f.dispose();
});

test('lost START acknowledgement reconciles into the still-mounted entry, without sending another start', async () => {
  const f = fixture();
  await f.login();
  f.fail = 'after';
  await f.start();
  assert.equal(f.store.getSnapshot().binding, null);
  f.fail = null;
  await f.store.reconcile(true);
  assert.equal(f.store.getSnapshot().binding.attemptId, f.data.activeAttempt.attemptId);
  assert.equal(f.calls.filter((c) => c.path.endsWith('/start')).length, 1);
  f.dispose();
});
test('unsupported version and secret-bearing retry bodies are rejected without importing data', () => {
  const f = fixture();
  for (const value of [
    { schemaVersion: 2, entries: [] },
    {
      schemaVersion: 1,
      entries: [
        {
          ownerId: ownerA,
          usageAttemptId: null,
          usage: [],
          pending: {
            ownerId: ownerA,
            command: 'START',
            runId: null,
            createdAt: 0,
            body: { operationId: randomUUID(), expectedRevision: 0, stageNumber: 1, accessToken: 'secret' },
          },
        },
      ],
    },
  ]) {
    f.storageValues.set(ACCOUNT_JOURNAL_KEY, JSON.stringify(value));
    const store = new AccountGameplayStore(f.session, () => f.storage);
    assert.equal(store.getSnapshot().storage, 'recovered');
    store.dispose();
  }
  f.dispose();
});
test('unreadable storage identifies visit-only recovery and still acknowledges an in-memory attempt', async () => {
  const f = fixture();
  const store = new AccountGameplayStore(f.session, () => {
    throw Error('blocked');
  });
  assert.equal(store.getSnapshot().storage, 'visit-only');
  await f.login();
  store.retain('entry');
  await store.start(1, 'entry');
  assert.ok(store.getSnapshot().binding);
  store.dispose();
  f.dispose();
});

test('late stale START response cannot bind an attempt that a newer canonical revision already ended', async () => {
  const f = fixture();
  await f.login();
  const gate = deferred();
  f.held = gate;
  f.store.retain('entry');
  const start = f.store.start(1, 'entry');
  const ended = { ...clone(f.data), revision: 2, activeAttempt: null, totalScore: 800, frontier: 2 };
  f.session.adoptGameplay(f.session.getSnapshot().generation, ended);
  gate.resolve();
  await start;
  assert.equal(f.store.getSnapshot().binding, null);
  assert.equal(f.store.getSnapshot().data.revision, 2);
  assert.equal(f.store.getSnapshot().data.totalScore, 800);
  f.dispose();
});

test('lost stage-11 response restores the same finalized campaign; sandbox never changes that displayed result', async () => {
  const f = fixture();
  f.data.runId = randomUUID();
  f.data.frontier = 11;
  f.data.totalScore = 8000;
  f.data.campaign = {
    runId: f.data.runId,
    status: 'ACTIVE',
    startedAt: new Date().toISOString(),
    score: 8000,
    completedStages: Array.from({ length: 10 }, (_, i) => i + 1),
    result: null,
  };
  await f.login();
  await f.start();
  f.fail = 'after';
  let shown = 0;
  await f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN', () => shown++);
  assert.equal(shown, 1);
  assert.equal(f.store.getSnapshot().status, 'unconfirmed');
  assert.equal(f.store.getSnapshot().data.campaign.status, 'ACTIVE');
  f.fail = null;
  await f.session.restore();
  await tick();
  assert.equal(f.store.getSnapshot().data.campaign.status, 'COMPLETED');
  const finalized = clone(f.store.getSnapshot().data.campaign.result);
  assert.equal(finalized.score, 8800);
  f.store.retain('sandbox');
  await f.store.start(12, 'sandbox');
  await f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN');
  assert.deepEqual(f.store.getSnapshot().data.campaign.result, finalized);
  f.session.playDemo();
  assert.equal(f.store.getSnapshot().data, null);
  f.dispose();
});
test('explicit new campaign uses a receipt-backed command with no fabricated leaderboard or Guest mutation', async () => {
  const f = fixture(),
    guest = new GuestStore();
  const before = JSON.stringify(guest.getSnapshot().save);
  await f.login();
  await f.start();
  await f.store.finish(f.store.getSnapshot().binding.attemptId, 'WIN');
  await f.store.newRun();
  assert.equal(f.store.getSnapshot().data.frontier, 1);
  assert.equal(f.store.getSnapshot().status, 'saved');
  assert.equal(f.calls.filter((c) => c.path.endsWith('/new-run')).length, 1);
  assert.equal(JSON.stringify(guest.getSnapshot().save), before);
  f.dispose();
});
