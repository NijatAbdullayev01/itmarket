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

  it('preserves inclusive business-day boundaries across a year change', () => {
    const range = parseBakuBusinessDateRange('2026-12-31', '2027-01-01');

    expect(range.startUtc.toISOString()).toBe('2026-12-30T20:00:00.000Z');
    expect(range.endUtcExclusive.toISOString()).toBe(
      '2027-01-01T20:00:00.000Z',
    );
  });

  it('rejects invalid calendar dates', () => {
    expect(() =>
      parseBakuBusinessDateRange('2026-02-30', '2026-02-30'),
    ).toThrow('from is not a valid calendar date');
  });

  it('rejects ranges that exceed the configured day limit', () => {
    expect(() =>
      parseBakuBusinessDateRange('2026-01-01', '2027-01-03'),
    ).toThrow('date range cannot exceed 366 days');
  });
});
