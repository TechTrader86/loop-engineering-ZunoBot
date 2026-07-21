import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { recordDailySpend, todayUTC } from '../dist/daily-spend.js';

async function freshDir() {
  return mkdtemp(path.join(tmpdir(), 'loop-context-daily-spend-'));
}

test('recordDailySpend starts a fresh total when no state file exists', async () => {
  const dir = await freshDir();
  const state = await recordDailySpend(dir, 'ci-sweeper', 1200);
  assert.equal(state.date, todayUTC());
  assert.equal(state.tokensUsedToday, 1200);
});

test('recordDailySpend accumulates across repeated calls on the same day', async () => {
  const dir = await freshDir();
  await recordDailySpend(dir, 'ci-sweeper', 1000);
  await recordDailySpend(dir, 'ci-sweeper', 500);
  const state = await recordDailySpend(dir, 'ci-sweeper', 250);
  assert.equal(state.tokensUsedToday, 1750);
});

test('recordDailySpend tracks separate patterns independently', async () => {
  const dir = await freshDir();
  await recordDailySpend(dir, 'ci-sweeper', 1000);
  const other = await recordDailySpend(dir, 'dependency-sweeper', 300);
  assert.equal(other.tokensUsedToday, 300);
});

test('recordDailySpend rolls over a stale date instead of carrying its total forward', async () => {
  const dir = await freshDir();
  await writeFile(
    path.join(dir, 'daily-spend.ci-sweeper.json'),
    JSON.stringify({ date: '2000-01-01', tokensUsedToday: 999999 }),
  );
  const state = await recordDailySpend(dir, 'ci-sweeper', 400);
  assert.equal(state.date, todayUTC());
  assert.equal(state.tokensUsedToday, 400);
});

test('recordDailySpend persists the state to disk', async () => {
  const dir = await freshDir();
  await recordDailySpend(dir, 'ci-sweeper', 700);
  const raw = await readFile(path.join(dir, 'daily-spend.ci-sweeper.json'), 'utf8');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.tokensUsedToday, 700);
});
