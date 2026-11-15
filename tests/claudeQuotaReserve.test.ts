import { beforeAll, describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18n from '@/i18n';
import { QuotaMeter } from '@/features/quota/components/QuotaMeter';
import { ClaudeQuotaBody } from '@/features/quota/providers/claude/ClaudeQuotaBody';
import {
  claudeQuotaReserveDraft,
  claudeQuotaReserveMarkers,
  isClaudeQuotaReserveReached,
  parseClaudeQuotaReserveDraft,
  readClaudeQuotaReserve,
} from '@/features/quota/providers/claude/quotaReserve';
import { bindQuotaClasses, QUOTA_CLASS_KEYS } from '@/features/quota/types';
import type { ClaudeQuotaState } from '@/types';

const classes = bindQuotaClasses(
  Object.fromEntries(QUOTA_CLASS_KEYS.map((key) => [key, key])),
  'test-host'
);

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Claude quota reserve', () => {
  test('reads only valid reserve windows from the credential listing', () => {
    const reserve = readClaudeQuotaReserve({
      name: 'claude.json',
      quota_reserve: { five_hour: 10, seven_day: 150, seven_day_fable: 50, monthly: 5 },
    });
    expect(reserve).toEqual({ five_hour: 10, seven_day_fable: 50 });
    expect(readClaudeQuotaReserve({ name: 'claude.json' })).toEqual({});
    expect(claudeQuotaReserveMarkers(reserve)).toEqual({
      'five-hour': 10,
      'seven-day-fable': 50,
    });
  });

  test('parses dialog input, clearing blanks and zeros', () => {
    const draft = claudeQuotaReserveDraft({ seven_day: 50 });
    expect(draft).toEqual({ five_hour: '', seven_day: '50', seven_day_fable: '' });
    expect(parseClaudeQuotaReserveDraft({ ...draft, five_hour: ' 12.5 ' })).toEqual({
      ok: true,
      reserve: { five_hour: 12.5, seven_day: 50 },
    });
    expect(
      parseClaudeQuotaReserveDraft({ five_hour: '0', seven_day: '', seven_day_fable: '' })
    ).toEqual({ ok: true, reserve: null });
    expect(
      parseClaudeQuotaReserveDraft({ five_hour: '100', seven_day: 'x', seven_day_fable: '-1' })
    ).toEqual({ ok: false, invalid: ['five_hour', 'seven_day', 'seven_day_fable'] });
  });

  test('reserve is reached at or below the configured remaining percentage', () => {
    expect(isClaudeQuotaReserveReached(50, 50)).toBe(true);
    expect(isClaudeQuotaReserveReached(51, 50)).toBe(false);
    expect(isClaudeQuotaReserveReached(null, 50)).toBe(false);
    expect(isClaudeQuotaReserveReached(10, undefined)).toBe(false);
  });

  test('meter keeps the full fill and adds a marker at the reserve', () => {
    const markup = renderToStaticMarkup(
      createElement(QuotaMeter, { percent: 93, classes, markerPercent: 50, markerLabel: 'mark' })
    );
    expect(markup).toContain('width:93%');
    expect(markup).toContain('class="quotaBarMarker"');
    expect(markup).toContain('left:50%');
    expect(markup).toContain('aria-label="mark"');
    expect(renderToStaticMarkup(createElement(QuotaMeter, { percent: 93, classes }))).not.toContain(
      'quotaBarMarker'
    );
  });

  test('Claude body marks the configured window and flags a reached reserve', () => {
    const quota: ClaudeQuotaState = {
      status: 'success',
      windows: [
        {
          id: 'seven-day',
          label: 'Weekly limit',
          labelKey: 'claude_quota.seven_day',
          usedPercent: 7,
          resetLabel: '-',
          resetAtMs: null,
          periodHours: 168,
        },
        {
          id: 'seven-day-fable',
          label: 'Weekly Fable',
          labelKey: 'claude_quota.seven_day_fable',
          usedPercent: 60,
          resetLabel: '-',
          resetAtMs: null,
          periodHours: 168,
        },
      ],
    };
    const markup = renderToStaticMarkup(
      createElement(ClaudeQuotaBody, {
        quota,
        classes,
        reserveMarkers: { 'seven-day': 50, 'seven-day-fable': 50 },
      })
    );
    expect(markup.match(/quotaBarMarker/g)?.length).toBe(2);
    expect(markup).toContain('Guardrail: pauses at 50% remaining');
    expect(markup.match(/>Paused</g)?.length).toBe(1);
  });
});
