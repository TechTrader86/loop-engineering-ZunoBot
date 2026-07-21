/**
 * Mechanical enforcement of static policy (path denylist, auto-merge
 * allowlist, max changed files) — the machine-readable twin of
 * docs/safety.md's prose. Deliberately has no knowledge of run history
 * (stagnation, repeat failures): that already belongs to loop-context's
 * circuit breaker and must not be duplicated here.
 */
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { minimatch } from 'minimatch';
export const VALID_ACTIONS = ['commit', 'merge', 'auto-merge'];
export function assertValidAction(action) {
    if (!VALID_ACTIONS.includes(action)) {
        throw new Error(`Invalid --action: ${action}. Use one of: ${VALID_ACTIONS.join(', ')}.`);
    }
}
function isStringArray(value) {
    return Array.isArray(value) && value.every((v) => typeof v === 'string');
}
export async function loadGateConfig(file) {
    let raw;
    try {
        raw = await readFile(file, 'utf8');
    }
    catch {
        throw new Error(`Gate config not found: ${file}. Create one (see templates/gate.yaml.template) or pass --gate-file <path>.`);
    }
    let parsed;
    try {
        parsed = parse(raw);
    }
    catch (err) {
        throw new Error(`Invalid YAML in ${file}: ${err.message}`);
    }
    const config = parsed;
    const invalid = (detail) => new Error(`Invalid gate config at ${file}: ${detail}`);
    if (!config || config.version !== 1) {
        throw invalid('expected { version: 1, denylist: string[], ... }.');
    }
    if (!isStringArray(config.denylist)) {
        throw invalid('"denylist" must be an array of strings.');
    }
    if (config.maxFiles !== undefined && (typeof config.maxFiles !== 'number' || !Number.isFinite(config.maxFiles))) {
        throw invalid('"maxFiles" must be a number.');
    }
    if (config.autoMergeAllowlist !== undefined && !isStringArray(config.autoMergeAllowlist)) {
        throw invalid('"autoMergeAllowlist" must be an array of strings.');
    }
    return config;
}
/**
 * Evaluate a proposed change against static policy. Checks the cheapest and
 * most severe condition first (denylist), then file-count, then the
 * auto-merge allowlist — mirroring loop-context's checkCircuitBreaker
 * "most specific trigger first" ordering.
 *
 * All glob matching uses minimatch's `dot: true` — without it, `*` never
 * matches a path segment starting with `.`, so denylist entries like
 * `**\/secrets/**` or `**\/*_key*` would silently miss `.secrets/prod.json`
 * or `.aws_key`, exactly the paths a denylist most needs to catch.
 */
export function checkGate(input) {
    const { config, action, paths } = input;
    const denylistHits = paths.filter((p) => config.denylist.some((glob) => minimatch(p, glob, { dot: true })));
    if (denylistHits.length > 0) {
        return {
            allowed: false,
            trigger: 'denylist',
            reason: `${denylistHits.length} path(s) match the denylist: ${denylistHits.join(', ')}. Escalating for human review.`,
            matchedPaths: denylistHits,
        };
    }
    if (config.maxFiles !== undefined && paths.length > config.maxFiles) {
        return {
            allowed: false,
            trigger: 'file-count',
            reason: `${paths.length} changed file(s) exceeds the max-files threshold (${config.maxFiles}). Escalating for human review.`,
            matchedPaths: paths,
        };
    }
    if (action === 'auto-merge') {
        const allowlist = config.autoMergeAllowlist ?? [];
        const notAllowlisted = paths.filter((p) => !allowlist.some((glob) => minimatch(p, glob, { dot: true })));
        if (notAllowlisted.length > 0) {
            return {
                allowed: false,
                trigger: 'not-allowlisted',
                reason: `${notAllowlisted.length} path(s) are not on the auto-merge allowlist: ${notAllowlisted.join(', ')}. Escalating for human review.`,
                matchedPaths: notAllowlisted,
            };
        }
    }
    return {
        allowed: true,
        trigger: 'ok',
        reason: 'Within policy — cleared to proceed.',
        matchedPaths: [],
    };
}
