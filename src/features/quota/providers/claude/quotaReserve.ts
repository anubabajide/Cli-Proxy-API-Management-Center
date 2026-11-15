/**
 * Claude usage guardrails ("quota_reserve" on the credential).
 *
 * Each window maps to the minimum remaining percentage CPA preserves. When a window's
 * remaining percentage drops to its reserve, CPA stops routing to the credential until
 * that window resets. The Fable reserve only gates Fable models.
 */

import type { AuthFileItem } from '@/types';

export const CLAUDE_QUOTA_RESERVE_WINDOWS = [
  { key: 'five_hour', windowId: 'five-hour', labelKey: 'claude_quota.five_hour' },
  { key: 'seven_day', windowId: 'seven-day', labelKey: 'claude_quota.seven_day' },
  { key: 'seven_day_fable', windowId: 'seven-day-fable', labelKey: 'claude_quota.seven_day_fable' },
] as const;

export type ClaudeQuotaReserveKey = (typeof CLAUDE_QUOTA_RESERVE_WINDOWS)[number]['key'];
export type ClaudeQuotaReserve = Partial<Record<ClaudeQuotaReserveKey, number>>;

const isValidReserve = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100;

/** Read the configured reserves from a credential listing entry. */
export const readClaudeQuotaReserve = (file: AuthFileItem): ClaudeQuotaReserve => {
  const raw = file['quota_reserve'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const reserve: ClaudeQuotaReserve = {};
  for (const { key } of CLAUDE_QUOTA_RESERVE_WINDOWS) {
    const value = source[key];
    if (isValidReserve(value)) reserve[key] = value;
  }
  return reserve;
};

/** Reserve markers keyed by the quota body's window ids. */
export const claudeQuotaReserveMarkers = (reserve: ClaudeQuotaReserve): Record<string, number> => {
  const markers: Record<string, number> = {};
  for (const { key, windowId } of CLAUDE_QUOTA_RESERVE_WINDOWS) {
    const value = reserve[key];
    if (value !== undefined) markers[windowId] = value;
  }
  return markers;
};

export type ClaudeQuotaReserveDraft = Record<ClaudeQuotaReserveKey, string>;

export const claudeQuotaReserveDraft = (reserve: ClaudeQuotaReserve): ClaudeQuotaReserveDraft => ({
  five_hour: reserve.five_hour === undefined ? '' : String(reserve.five_hour),
  seven_day: reserve.seven_day === undefined ? '' : String(reserve.seven_day),
  seven_day_fable: reserve.seven_day_fable === undefined ? '' : String(reserve.seven_day_fable),
});

export type ClaudeQuotaReserveParseResult =
  | { ok: true; reserve: ClaudeQuotaReserve | null }
  | { ok: false; invalid: ClaudeQuotaReserveKey[] };

/**
 * Parse dialog inputs. Blank or 0 clears a window; values must be below 100.
 * Returns null when no window keeps a reserve, which clears the whole setting.
 */
export const parseClaudeQuotaReserveDraft = (
  draft: ClaudeQuotaReserveDraft
): ClaudeQuotaReserveParseResult => {
  const reserve: ClaudeQuotaReserve = {};
  const invalid: ClaudeQuotaReserveKey[] = [];
  for (const { key } of CLAUDE_QUOTA_RESERVE_WINDOWS) {
    const text = draft[key].trim();
    if (!text) continue;
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0 || value >= 100) {
      invalid.push(key);
      continue;
    }
    if (value > 0) reserve[key] = value;
  }
  if (invalid.length > 0) return { ok: false, invalid };
  return { ok: true, reserve: Object.keys(reserve).length > 0 ? reserve : null };
};

/** True when the remaining percentage has reached the configured reserve. */
export const isClaudeQuotaReserveReached = (
  remainingPercent: number | null,
  reservePercent: number | undefined
): boolean =>
  remainingPercent !== null && reservePercent !== undefined && remainingPercent <= reservePercent;
