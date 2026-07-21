/**
 * Mechanical enforcement of static policy (path denylist, auto-merge
 * allowlist, max changed files) — the machine-readable twin of
 * docs/safety.md's prose. Deliberately has no knowledge of run history
 * (stagnation, repeat failures): that already belongs to loop-context's
 * circuit breaker and must not be duplicated here.
 */
export type Action = 'commit' | 'merge' | 'auto-merge';
export declare const VALID_ACTIONS: Action[];
export declare function assertValidAction(action: string): asserts action is Action;
export interface GateConfig {
    version: 1;
    /** Glob patterns that must never be touched without human approval. */
    denylist: string[];
    /** Escalate when more than this many paths are in the proposed change. */
    maxFiles?: number;
    /** For --action auto-merge: every path must match one of these globs. */
    autoMergeAllowlist?: string[];
}
export declare function loadGateConfig(file: string): Promise<GateConfig>;
export type GateTrigger = 'ok' | 'denylist' | 'file-count' | 'not-allowlisted';
export interface GateDecision {
    allowed: boolean;
    trigger: GateTrigger;
    reason: string;
    /** Paths responsible for the trigger (empty when trigger is 'ok'). */
    matchedPaths: string[];
}
export interface CheckInput {
    config: GateConfig;
    action: Action;
    paths: string[];
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
export declare function checkGate(input: CheckInput): GateDecision;
