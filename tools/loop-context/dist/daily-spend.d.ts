export interface DailySpendState {
    date: string;
    tokensUsedToday: number;
}
/** Today's date in UTC, as YYYY-MM-DD — the daily-spend rollover boundary. */
export declare function todayUTC(): string;
/**
 * Add `tokensDelta` to a pattern's running daily total and persist it. Rolls
 * over to a fresh total when the stored date isn't today (UTC) — a stale
 * file from a previous day is treated as if it didn't exist.
 */
export declare function recordDailySpend(dir: string, pattern: string, tokensDelta: number): Promise<DailySpendState>;
