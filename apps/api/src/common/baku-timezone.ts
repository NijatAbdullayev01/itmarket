import { BadRequestException } from '@nestjs/common';

export const BAKU_TIME_ZONE = 'Asia/Baku';

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type BusinessDateRange = {
  from: string;
  to: string;
  timeZone: typeof BAKU_TIME_ZONE;
  startUtc: Date;
  endUtcExclusive: Date;
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BAKU_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function zonedParts(date: Date): ZonedParts {
  const parts = dateTimeFormatter.formatToParts(date);
  const lookup = new Map(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: lookup.get('year') ?? 0,
    month: lookup.get('month') ?? 0,
    day: lookup.get('day') ?? 0,
    hour: lookup.get('hour') ?? 0,
    minute: lookup.get('minute') ?? 0,
    second: lookup.get('second') ?? 0,
  };
}

function compareParts(left: ZonedParts, right: ZonedParts): number {
  return (
    Date.UTC(
      left.year,
      left.month - 1,
      left.day,
      left.hour,
      left.minute,
      left.second,
    ) -
    Date.UTC(
      right.year,
      right.month - 1,
      right.day,
      right.hour,
      right.minute,
      right.second,
    )
  );
}

function parseDay(
  value: string,
  field: string,
): {
  year: number;
  month: number;
  day: number;
} {
  if (!DAY_PATTERN.test(value)) {
    throw new BadRequestException(`${field} must be a YYYY-MM-DD date`);
  }
  const [yearToken, monthToken, dayToken] = value.split('-');
  const yearValue = Number(yearToken);
  const monthValue = Number(monthToken);
  const dayValue = Number(dayToken);
  const candidate = new Date(
    Date.UTC(yearValue, monthValue - 1, dayValue, 12, 0, 0),
  );
  const check = zonedParts(candidate);
  if (
    check.year !== yearValue ||
    check.month !== monthValue ||
    check.day !== dayValue
  ) {
    throw new BadRequestException(`${field} is not a valid calendar date`);
  }
  return { year: yearValue, month: monthValue, day: dayValue };
}

function utcForBakuLocal(parts: ZonedParts): Date {
  let guess = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const diffMs = compareParts(parts, zonedParts(guess));
    if (diffMs === 0) {
      return guess;
    }
    guess = new Date(guess.getTime() + diffMs);
  }
  return guess;
}

export function parseBakuBusinessDateRange(
  from: string,
  to: string,
  maxDays = 366,
): BusinessDateRange {
  const startDay = parseDay(from, 'from');
  const endDay = parseDay(to, 'to');
  const startUtc = utcForBakuLocal({
    ...startDay,
    hour: 0,
    minute: 0,
    second: 0,
  });
  const endUtcExclusive = utcForBakuLocal({
    ...endDay,
    hour: 23,
    minute: 59,
    second: 59,
  });
  const normalizedEndUtcExclusive = new Date(endUtcExclusive.getTime() + 1000);

  if (normalizedEndUtcExclusive.getTime() <= startUtc.getTime()) {
    throw new BadRequestException('to must be the same day or after from');
  }
  const daySpan = Math.ceil(
    (normalizedEndUtcExclusive.getTime() - startUtc.getTime()) /
      (24 * 60 * 60 * 1000),
  );
  if (daySpan > maxDays) {
    throw new BadRequestException(`date range cannot exceed ${maxDays} days`);
  }

  return {
    from,
    to,
    timeZone: BAKU_TIME_ZONE,
    startUtc,
    endUtcExclusive: normalizedEndUtcExclusive,
  };
}

export function bakuDayKey(date: Date): string {
  const parts = zonedParts(date);
  return `${parts.year.toString().padStart(4, '0')}-${parts.month
    .toString()
    .padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

export function bakuMonthKey(date: Date): string {
  const parts = zonedParts(date);
  return `${parts.year.toString().padStart(4, '0')}-${parts.month
    .toString()
    .padStart(2, '0')}`;
}

export function assertMonthValue(value: string, field: string): void {
  if (!MONTH_PATTERN.test(value)) {
    throw new BadRequestException(`${field} must be a YYYY-MM month`);
  }
}
