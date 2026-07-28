import {
  BAKU_TIME_ZONE,
  bakuBusinessDateUtc,
  bakuCalendarDayDiff,
  bakuDayKey,
  bakuHour,
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
    expect(bakuBusinessDateUtc(instant).toISOString()).toBe(
      '2026-07-13T00:00:00.000Z',
    );
    expect(bakuHour(instant)).toBe(1);
  });

  it('counts inclusive Asia/Baku calendar day differences', () => {
    const sale = new Date('2026-07-01T08:00:00.000Z'); // 12:00 Asia/Baku
    const sameLocalDay = new Date('2026-07-01T18:00:00.000Z'); // 22:00 Asia/Baku
    const day13 = new Date('2026-07-14T08:00:00.000Z');
    const day14 = new Date('2026-07-15T08:00:00.000Z');

    expect(bakuDayKey(sale)).toBe('2026-07-01');
    expect(bakuCalendarDayDiff(sale, sameLocalDay)).toBe(0);
    expect(bakuCalendarDayDiff(sale, day13)).toBe(13);
    expect(bakuCalendarDayDiff(sale, day14)).toBe(14);
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
