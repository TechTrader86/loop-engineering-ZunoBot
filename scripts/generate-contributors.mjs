#!/usr/bin/env node
/**
 * Regenerate CONTRIBUTORS.md from GitHub API + story attributions.
 * Requires: gh auth login (read access to public repo is enough)
 *
 *   node scripts/generate-contributors.mjs
 *   node scripts/generate-contributors.mjs --check   # exit 1 if file would change
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'CONTRIBUTORS.md');
const REPO = 'cobusgreyling/loop-engineering';
const MAINTAINER = 'cobusgreyling';
const BOTS = new Set(['github-actions[bot]', 'dependabot[bot]', 'dependabot']);

const CONTRIBUTOR_QUICKSTART =
  'https://github.com/cobusgreyling/loop-engineering/discussions/123';

function ghJson(args) {
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', cwd: ROOT }));
}

function ghApiPaginated(route) {
  const out = execFileSync('gh', ['api', route, '--paginate'], { encoding: 'utf8', cwd: ROOT });
  const items = [];
  for (const line of out.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) items.push(...parsed);
    else items.push(parsed);
  }
  return items;
}

function storyAttributions() {
  const storiesDir = path.join(ROOT, 'stories');
  const attributions = new Map();
  let files;
  try {
    files = readdirSync(storiesDir).filter((f) => f.endsWith('.md'));
  } catch {
    return attributions;
  }
  const re = /Contributed by \[@([^\]]+)\]/g;
  for (const file of files) {
    const text = readFileSync(path.join(storiesDir, file), 'utf8');
    for (const m of text.matchAll(re)) {
      const login = m[1];
      if (!attributions.has(login)) attributions.set(login, []);
      attributions.get(login).push(`story: \`${file}\``);
    }
  }
  return attributions;
}

async function main() {
  const check = process.argv.includes('--check');

  const apiContributors = ghApiPaginated(`repos/${REPO}/contributors`);

  const mergedPrs = ghJson([
    'pr',
    'list',
    '--repo',
    REPO,
    '--state',
    'merged',
    '--limit',
    '200',
    '--json',
    'author,title,number',
  ]);

  const highlights = new Map();
  for (const pr of mergedPrs) {
    const login = pr.author?.login;
    if (!login || login === MAINTAINER || pr.author?.is_bot) continue;
    if (!highlights.has(login)) highlights.set(login, []);
    const list = highlights.get(login);
    if (list.length < 2) list.push(`#${pr.number} ${pr.title}`);
  }

  const storyAttrs = storyAttributions();

  const people = new Map();
  for (const c of apiContributors) {
    const login = c.login;
    if (login === MAINTAINER || BOTS.has(login) || login.endsWith('[bot]')) continue;
    people.set(login, {
      login,
      contributions: c.contributions ?? 0,
      highlights: highlights.get(login) ?? [],
      stories: storyAttrs.get(login) ?? [],
    });
  }

  for (const [login, stories] of storyAttrs) {
    if (people.has(login)) {
      people.get(login).stories = stories;
      continue;
    }
    people.set(login, {
      login,
      contributions: 0,
      highlights: highlights.get(login) ?? [],
      stories,
    });
  }

  const sorted = [...people.values()].sort((a, b) => {
    const score = (p) => p.contributions + p.stories.length * 2 + p.highlights.length;
    return score(b) - score(a) || a.login.localeCompare(b.login);
  });

  const generated = new Date().toISOString().slice(0, 10);
  const lines = [
    '# Contributors',
    '',
    'Thank you to everyone who shipped docs, stories, examples, and tool fixes.',
    '',
    `*Generated ${generated} via \`node scripts/generate-contributors.mjs\` — re-run after merges.*`,
    '',
    '| Contributor | Highlights |',
    '|-------------|------------|',
  ];

  for (const p of sorted) {
    const bits = [...p.highlights, ...p.stories];
    const cell =
      bits.length > 0
        ? bits.map((b) => b.replace(/\|/g, '\\|')).join('<br>')
        : `${p.contributions} commit${p.contributions === 1 ? '' : 's'}`;
    lines.push(`| [@${p.login}](https://github.com/${p.login}) | ${cell} |`);
  }

  lines.push(
    '',
    '## Your first PR',
    '',
    'Pick a scoped ~15 min task: [Contributor quickstart](' + CONTRIBUTOR_QUICKSTART + ').',
    '',
    'Same-day review on stories, adopters, and docs — see [CONTRIBUTING.md](./CONTRIBUTING.md).',
    '',
  );

  const content = lines.join('\n');

  if (check) {
    const existing = readFileSync(OUT, 'utf8');
    if (existing !== content) {
      console.error('CONTRIBUTORS.md is out of date. Run: node scripts/generate-contributors.mjs');
      process.exit(1);
    }
    console.log('CONTRIBUTORS.md is up to date.');
    return;
  }

  writeFileSync(OUT, content);
  console.log(`Wrote ${OUT} (${sorted.length} contributors)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});