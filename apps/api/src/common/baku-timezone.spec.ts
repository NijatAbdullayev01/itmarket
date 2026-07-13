import {
  BAKU_TIME_ZONE,
  bakuDayKey,
  bakuMonthKey,
  parseBakuBusinessDateRange,
} from './baku-timezone';

describe('baku-timezone helpers', () => {
  it('maps a Baku business day into the correct UTC boundaries', () => {
    const range = parseBakuBusinessDateRange('2026-07-13', '2026-07-13');

    expect(range.timeZone).toBe(BAKU_TIME_ZONE);
    expect(range.startUtc.toISOString()).toBe('2026-07-12T20:00:00.000Z');
    expect(range.endUtcExclusive.toISOString()).toBe(
      '2026-07-13T20:00:00.000Z',
    );
  });

  it('formats day and month buckets using Baku local time', () => {
    const instant = new Date('2026-07-12T21:30:00.000Z');

    expect(bakuDayKey(instant)).toBe('2026-07-13');
    expect(bakuMonthKey(instant)).toBe('2026-07');
  });
});
