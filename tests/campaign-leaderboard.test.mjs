import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readTop, readOwnRank, leaderboardPresentation } from '../src/api/leaderboardShape.ts';
import { readCampaign, readCurrentUser } from '../src/api/profileShape.ts';
import { RequestError } from '../src/api/transport.ts';
const date = new Date().toISOString(),
  id = '000000000000000000000001';
const row = (rank = 1) => ({
  accountId: id,
  username: 'Display',
  avatar: 'default.png',
  score: 8800,
  rank,
  finalizedAt: date,
  scoreVersion: 'regular-campaign-points-v1',
});
test('one canonical leaderboard parser keeps server rank and order, rejects incompatible historical/fake fallback data', () => {
  const list = readTop({ entries: [row()], scoreVersion: 'regular-campaign-points-v1' });
  assert.equal(list[0].id, id);
  assert.equal(list[0].score, 8800);
  assert.equal(list[0].rank, 1);
  for (const v of [
    { top10: [{ username: 'Old', totalScore: 99999 }] },
    { entries: [{ ...row(), rank: 9 }], scoreVersion: 'regular-campaign-points-v1' },
    { entries: Array.from({ length: 11 }, row), scoreVersion: 'regular-campaign-points-v1' },
  ])
    assert.throws(() => readTop(v), RequestError);
});
test('Loading/unavailable/empty are separate and own rank can be outside top ten without using current gameplay score', () => {
  assert.equal(leaderboardPresentation('loading', undefined), 'loading');
  assert.equal(leaderboardPresentation('error', undefined), 'unavailable');
  assert.equal(leaderboardPresentation('success', []), 'empty');
  assert.deepEqual(readOwnRank({ rank: null, best: null, scoreVersion: 'regular-campaign-points-v1' }), { rank: null, best: null });
  const own = readOwnRank({ rank: 42, best: row(42), scoreVersion: 'regular-campaign-points-v1' });
  assert.equal(own.rank, 42);
  assert.equal(own.best.score, 8800);
  assert.throws(() => readOwnRank({ rank: 1, best: row(42), scoreVersion: 'regular-campaign-points-v1' }), RequestError);
});
const result = {
  runId: randomUUID(),
  score: 8800,
  finalizedAt: date,
  finalizedRevision: 22,
  rulesVersion: 'account-gameplay-v1',
  catalogVersion: 'stage-catalog-2026-09-29-v1',
  scoreVersion: 'regular-campaign-points-v1',
  regularStages: 11,
};
const campaign = {
  runId: result.runId,
  status: 'COMPLETED',
  startedAt: date,
  closedAt: date,
  score: 8800,
  completedStages: Array.from({ length: 11 }, (_, i) => i + 1),
  result,
};
test('confirmed completion has exactly regular stages 1–11; sandbox gameplay score is separate from immutable campaign result', () => {
  assert.equal(readCampaign(campaign).result.score, 8800);
  assert.throws(() => readCampaign({ ...campaign, completedStages: [...campaign.completedStages, 12] }), RequestError);
  const user = {
    id,
    email: 'test@example.test',
    username: 'Test',
    avatar: 'default.png',
    hearts: 3,
    totalScore: 9600,
    gamesPlayed: 12,
    gamesWon: 12,
    gamesLost: 0,
    progress: {},
    badges: [],
    playerExp: 0,
    playerLevel: 5,
    powers: { bomb: 120, laser: 120, extraShuffle: 120 },
    revision: 24,
    rulesVersion: 'account-gameplay-v1',
    campaignVersion: 'stage-catalog-2026-09-29-v1',
    runId: result.runId,
    activeAttempt: null,
    pendingRewards: [],
    legacyInterrupted: false,
    campaign,
    sandboxUnlocked: true,
    campaignNeedsReset: false,
    frontier: 12,
  };
  const parsed = readCurrentUser(user);
  assert.equal(parsed.totalScore, 9600);
  assert.equal(parsed.campaign.result.score, 8800);
  assert.equal(parsed.sandboxUnlocked, true);
  assert.throws(() => readCampaign({ ...campaign, result: { ...result, score: 9600 } }), RequestError);
});
