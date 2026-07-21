import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

export interface DailySpendState {
  date: string;
  tokensUsedToday: number;
}

/** Today's date in UTC, as YYYY-MM-DD — the daily-spend rollover boundary. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function statePath(dir: string, pattern: string): string {
  return path.join(dir, `daily-spend.${pattern}.json`);
}

async function readState(dir: string, pattern: string): Promise<DailySpendState | null> {
  try {
    const raw = await readFile(statePath(dir, pattern), 'utf8');
    return JSON.parse(raw) as DailySpendState;
  } catch {
    return null;
  }
}

/**
 * Add `tokensDelta` to a pattern's running daily total and persist it. Rolls
 * over to a fresh total when the stored date isn't today (UTC) — a stale
 * file from a previous day is treated as if it didn't exist.
 */
export async function recordDailySpend(
  dir: string,
  pattern: string,
  tokensDelta: number,
): Promise<DailySpendState> {
  const today = todayUTC();
  const existing = await readState(dir, pattern);
  const carryOver = existing && existing.date === today ? existing.tokensUsedToday : 0;
  const state: DailySpendState = { date: today, tokensUsedToday: carryOver + tokensDelta };

  await mkdir(dir, { recursive: true });
  await writeFile(statePath(dir, pattern), JSON.stringify(state, null, 2));
  return state;
}
