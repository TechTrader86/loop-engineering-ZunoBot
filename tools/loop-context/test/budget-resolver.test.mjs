import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCostCli,
  resolveTokenBudgetFromPattern,
  resolveDailyBudgetFromPattern,
} from '../dist/budget-resolver.js';

test('resolveCostCli finds the monorepo sibling loop-cost CLI', async () => {
  const cli = await resolveCostCli();
  assert.ok(cli, 'expected a resolved CLI path');
  assert.match(cli, /loop-cost[\\/]dist[\\/]cli\.js$/);
});

test('resolveTokenBudgetFromPattern returns the realistic per-run estimate by default', async () => {
  const tokens = await resolveTokenBudgetFromPattern({ pattern: 'ci-sweeper', level: 'L2' });
  assert.equal(typeof tokens, 'number');
  assert.ok(tokens > 0);
});

test('resolveTokenBudgetFromPattern honors --budget-scenario', async () => {
  const realistic = await resolveTokenBudgetFromPattern({ pattern: 'ci-sweeper', level: 'L2', scenario: 'realistic' });
  const action = await resolveTokenBudgetFromPattern({ pattern: 'ci-sweeper', level: 'L2', scenario: 'action' });
  assert.ok(action >= realistic, 'worst-case action scenario should be at least the realistic blend');
});

test('resolveTokenBudgetFromPattern rejects an unknown pattern with loop-cost\'s own message', async () => {
  await assert.rejects(
    () => resolveTokenBudgetFromPattern({ pattern: 'not-a-pattern' }),
    /Unknown pattern: not-a-pattern/,
  );
});

test('resolveTokenBudgetFromPattern rejects an invalid scenario before spawning loop-cost', async () => {
  await assert.rejects(
    () => resolveTokenBudgetFromPattern({ pattern: 'ci-sweeper', scenario: 'garbage' }),
    /Invalid --budget-scenario/,
  );
});

test('resolveDailyBudgetFromPattern returns loop-cost\'s suggested daily cap', async () => {
  const cap = await resolveDailyBudgetFromPattern({ pattern: 'ci-sweeper', level: 'L2' });
  assert.equal(typeof cap, 'number');
  assert.ok(cap > 0);
});

test('resolveDailyBudgetFromPattern is at least the per-run realistic estimate', async () => {
  const perRun = await resolveTokenBudgetFromPattern({ pattern: 'ci-sweeper', level: 'L2' });
  const dailyCap = await resolveDailyBudgetFromPattern({ pattern: 'ci-sweeper', level: 'L2' });
  assert.ok(dailyCap >= perRun, 'a daily cap should cover at least one run');
});

test('resolveDailyBudgetFromPattern rejects an unknown pattern with loop-cost\'s own message', async () => {
  await assert.rejects(
    () => resolveDailyBudgetFromPattern({ pattern: 'not-a-pattern' }),
    /Unknown pattern: not-a-pattern/,
  );
});
