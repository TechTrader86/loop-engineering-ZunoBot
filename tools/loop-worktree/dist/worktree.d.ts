export declare const MANIFEST_DIR = ".loop-worktrees";
export declare const MANIFEST_FILE: string;
export type WorktreeStatus = 'active' | 'rejected' | 'escalated' | 'merged' | 'stale';
export declare const VALID_STATUSES: WorktreeStatus[];
/** Terminal states cleanup discards by default; "active" is never swept automatically. */
export declare const CLEANUP_DEFAULT_STATUSES: WorktreeStatus[];
export interface WorktreeEntry {
    id: string;
    /** Repo-relative, posix-style path to the worktree. */
    path: string;
    branch: string;
    baseBranch: string;
    pattern: string;
    createdAt: string;
    status: WorktreeStatus;
}
export interface Manifest {
    version: 1;
    worktrees: WorktreeEntry[];
}
export declare function isGitRepo(cwd: string): Promise<boolean>;
export declare function readManifest(root: string): Promise<Manifest>;
export declare function writeManifest(root: string, manifest: Manifest): Promise<void>;
export interface CreateInput {
    root: string;
    runId: string;
    pattern: string;
    base?: string;
}
export declare function createWorktree(input: CreateInput): Promise<WorktreeEntry>;
export interface MarkInput {
    root: string;
    runId: string;
    status: WorktreeStatus;
}
export declare function markWorktree(input: MarkInput): Promise<WorktreeEntry>;
/** Parse a duration like "30m", "24h", "7d" into milliseconds. Shared with lock.ts's --ttl. */
export declare function parseDurationMs(token: string, flag: string): number;
export interface CleanupInput {
    root: string;
    statuses?: WorktreeStatus[];
    olderThan?: string;
    force?: boolean;
}
export interface CleanupResult {
    removed: WorktreeEntry[];
    /** Entries git refused to remove (e.g. uncommitted changes) without --force. */
    skipped: {
        entry: WorktreeEntry;
        reason: string;
    }[];
}
export declare function cleanupWorktrees(input: CleanupInput): Promise<CleanupResult>;
export interface GcInput {
    root: string;
    force?: boolean;
}
export interface GcResult {
    /** On disk under .loop-worktrees but absent from the manifest. */
    orphans: string[];
    /** In the manifest but no longer on disk; dropped from the manifest. */
    dropped: WorktreeEntry[];
    /** Orphans actually removed (only when force is set). */
    removedOrphans: string[];
}
export declare function gc(input: GcInput): Promise<GcResult>;
export interface ListInput {
    root: string;
    status?: WorktreeStatus;
}
export declare function listWorktrees(input: ListInput): Promise<WorktreeEntry[]>;
