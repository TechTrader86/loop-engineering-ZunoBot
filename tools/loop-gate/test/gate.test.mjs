import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { checkGate, loadGateConfig, assertValidAction } from '../dist/gate.js';

const baseConfig = {
  version: 1,
  denylist: ['.env', '**/secrets/**', 'auth/**'],
  maxFiles: 3,
  autoMergeAllowlist: ['docs/**', '**/*.md'],
};

async function freshGateFile(contents) {
  const dir = await mkdtemp(path.join(tmpdir(), 'loop-gate-'));
  const file = path.join(dir, 'gate.yaml');
  await writeFile(file, contents);
  return file;
}

test('assertValidAction accepts the three known actions', () => {
  for (const a of ['commit', 'merge', 'auto-merge']) {
    assert.doesNotThrow(() => assertValidAction(a));
  }
});

test('assertValidAction rejects an unknown action', () => {
  assert.throws(() => assertValidAction('deploy'), /Invalid --action: deploy/);
});

test('checkGate allows a clean, in-policy change', () => {
  const decision = checkGate({ config: baseConfig, action: 'commit', paths: ['src/index.ts'] });
  assert.equal(decision.allowed, true);
  assert.equal(decision.trigger, 'ok');
});

test('checkGate escalates on a denylist hit', () => {
  const decision = checkGate({ config: baseConfig, action: 'commit', paths: ['auth/login.ts'] });
  assert.equal(decision.allowed, false);
  assert.equal(decision.trigger, 'denylist');
  assert.deepEqual(decision.matchedPaths, ['auth/login.ts']);
});

test('checkGate escalates on a nested secrets path via **', () => {
  const decision = checkGate({ config: baseConfig, action: 'commit', paths: ['config/secrets/prod.json'] });
  assert.equal(decision.trigger, 'denylist');
});

test('checkGate escalates when file count exceeds maxFiles', () => {
  const decision = checkGate({
    config: baseConfig,
    action: 'commit',
    paths: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.trigger, 'file-count');
});

test('checkGate denylist takes priority over file-count', () => {
  const decision = checkGate({
    config: baseConfig,
    action: 'commit',
    paths: ['.env', 'a.ts', 'b.ts', 'c.ts', 'd.ts'],
  });
  assert.equal(decision.trigger, 'denylist');
});

test('checkGate auto-merge allows only allowlisted paths', () => {
  const ok = checkGate({ config: baseConfig, action: 'auto-merge', paths: ['docs/guide.md'] });
  assert.equal(ok.allowed, true);

  const blocked = checkGate({ config: baseConfig, action: 'auto-merge', paths: ['src/index.ts'] });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.trigger, 'not-allowlisted');
  assert.deepEqual(blocked.matchedPaths, ['src/index.ts']);
});

test('checkGate auto-merge allowlist is not enforced for commit/merge actions', () => {
  const decision = checkGate({ config: baseConfig, action: 'commit', paths: ['src/index.ts'] });
  assert.equal(decision.allowed, true);
});

test('checkGate with no maxFiles configured never trips file-count', () => {
  const config = { version: 1, denylist: [] };
  const decision = checkGate({ config, action: 'commit', paths: Array.from({ length: 50 }, (_, i) => `f${i}.ts`) });
  assert.equal(decision.allowed, true);
});

test('checkGate denylist globs match dotfile leaves (dot: true)', () => {
  const config = { version: 1, denylist: ['**/*_key*', '**/*_secret*'] };
  for (const p of ['.aws_key', 'config/.ssh_secret_token']) {
    const decision = checkGate({ config, action: 'commit', paths: [p] });
    assert.equal(decision.trigger, 'denylist', `expected "${p}" to hit the denylist`);
  }
});

test('checkGate denylist ** traverses into a hidden (dot) directory (dot: true)', () => {
  const config = { version: 1, denylist: ['**/secrets/**'] };
  const decision = checkGate({ config, action: 'commit', paths: ['.config/secrets/prod.json'] });
  assert.equal(decision.trigger, 'denylist');
});

test('loadGateConfig rejects a non-string denylist element', async () => {
  const file = await freshGateFile('version: 1\ndenylist:\n  - 42\n');
  await assert.rejects(() => loadGateConfig(file), /"denylist" must be an array of strings/);
});

test('loadGateConfig rejects a non-numeric maxFiles instead of silently disabling the check', async () => {
  const file = await freshGateFile('version: 1\ndenylist: []\nmaxFiles: "ten"\n');
  await assert.rejects(() => loadGateConfig(file), /"maxFiles" must be a number/);
});

test('loadGateConfig rejects a malformed (non-array) autoMergeAllowlist', async () => {
  const file = await freshGateFile('version: 1\ndenylist: []\nautoMergeAllowlist: "docs/**"\n');
  await assert.rejects(() => loadGateConfig(file), /"autoMergeAllowlist" must be an array of strings/);
});

test('loadGateConfig parses a valid file', async () => {
  const file = await freshGateFile('version: 1\ndenylist:\n  - ".env"\nmaxFiles: 5\n');
  const config = await loadGateConfig(file);
  assert.equal(config.version, 1);
  assert.deepEqual(config.denylist, ['.env']);
  assert.equal(config.maxFiles, 5);
});

test('loadGateConfig rejects a missing file with a clear message', async () => {
  await assert.rejects(() => loadGateConfig('/no/such/gate.yaml'), /Gate config not found/);
});

test('loadGateConfig rejects invalid YAML', async () => {
  const file = await freshGateFile('version: 1\ndenylist: [\n');
  await assert.rejects(() => loadGateConfig(file), /Invalid YAML/);
});

test('loadGateConfig rejects a config missing required fields', async () => {
  const file = await freshGateFile('version: 1\n');
  await assert.rejects(() => loadGateConfig(file), /Invalid gate config/);
});

test('loadGateConfig rejects the wrong version', async () => {
  const file = await freshGateFile('version: 2\ndenylist: []\n');
  await assert.rejects(() => loadGateConfig(file), /Invalid gate config/);
});
