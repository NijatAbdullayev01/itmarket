import { Prisma } from '../generated/prisma/client';

export type GuestCustomerAggRow = {
  identityKey: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  orderCount: number;
  lastOrderAt: Date;
  firstOrderAt: Date;
  totalSpent: Prisma.Decimal | string;
};

/** Identity key used to merge guest orders into one “customer” row. */
export const GUEST_IDENTITY_SQL = Prisma.sql`
  CASE
    WHEN NULLIF(BTRIM(o.guest_email), '') IS NOT NULL
      THEN 'e:' || lower(BTRIM(o.guest_email))
    WHEN NULLIF(
      regexp_replace(COALESCE(o.guest_phone, ''), '[^0-9]', '', 'g'),
      ''
    ) IS NOT NULL
      THEN 'p:' || regexp_replace(o.guest_phone, '[^0-9]', '', 'g')
    ELSE 'o:' || o.id::text
  END
`;

export function encodeGuestCustomerCursor(
  lastOrderAt: Date,
  identityKey: string,
): string {
  return Buffer.from(
    `${lastOrderAt.toISOString()}\n${identityKey}`,
    'utf8',
  ).toString('base64url');
}

export function decodeGuestCustomerCursor(
  cursor: string,
): { lastOrderAt: Date; identityKey: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = raw.indexOf('\n');
    if (separator <= 0) {
      return null;
    }
    const iso = raw.slice(0, separator);
    const identityKey = raw.slice(separator + 1);
    const lastOrderAt = new Date(iso);
    if (
      Number.isNaN(lastOrderAt.getTime()) ||
      identityKey.trim().length === 0
    ) {
      return null;
    }
    return { lastOrderAt, identityKey };
  } catch {
    return null;
  }
}

export function buildGuestCustomersListSql(args: {
  limit: number;
  search?: string;
  cursor?: { lastOrderAt: Date; identityKey: string };
}): Prisma.Sql {
  const search = args.search?.trim();
  const searchFilter =
    search && search.length > 0
      ? Prisma.sql`AND (
          COALESCE(r.guest_email, '') ILIKE ${'%' + search + '%'}
          OR COALESCE(r.guest_phone, '') ILIKE ${'%' + search + '%'}
          OR COALESCE(r.address_phone, '') ILIKE ${'%' + search + '%'}
          OR COALESCE(r.recipient_name, '') ILIKE ${'%' + search + '%'}
        )`
      : Prisma.empty;

  const cursorFilter = args.cursor
    ? Prisma.sql`AND (
        a.last_order_at < ${args.cursor.lastOrderAt}
        OR (
          a.last_order_at = ${args.cursor.lastOrderAt}
          AND a.identity_key < ${args.cursor.identityKey}
        )
      )`
    : Prisma.empty;

  return Prisma.sql`
    WITH guest_orders AS (
      SELECT
        o.id,
        o.guest_email,
        o.guest_phone,
        o.created_at,
        o.grand_total,
        oa.recipient_name,
        oa.phone AS address_phone,
        ${GUEST_IDENTITY_SQL} AS identity_key
      FROM orders o
      LEFT JOIN order_addresses oa ON oa.order_id = o.id
      WHERE o.customer_id IS NULL
    ),
    ranked AS (
      SELECT
        guest_orders.*,
        ROW_NUMBER() OVER (
          PARTITION BY identity_key
          ORDER BY created_at DESC, id DESC
        ) AS rn
      FROM guest_orders
    ),
    aggregated AS (
      SELECT
        identity_key,
        COUNT(*)::int AS order_count,
        MAX(created_at) AS last_order_at,
        MIN(created_at) AS first_order_at,
        SUM(grand_total) AS total_spent
      FROM guest_orders
      GROUP BY identity_key
    )
    SELECT
      a.identity_key AS "identityKey",
      NULLIF(BTRIM(r.guest_email), '') AS email,
      COALESCE(
        NULLIF(BTRIM(r.address_phone), ''),
        NULLIF(BTRIM(r.guest_phone), '')
      ) AS phone,
      NULLIF(BTRIM(r.recipient_name), '') AS "displayName",
      a.order_count AS "orderCount",
      a.last_order_at AS "lastOrderAt",
      a.first_order_at AS "firstOrderAt",
      a.total_spent::text AS "totalSpent"
    FROM aggregated a
    INNER JOIN ranked r
      ON r.identity_key = a.identity_key AND r.rn = 1
    WHERE TRUE
      ${searchFilter}
      ${cursorFilter}
    ORDER BY a.last_order_at DESC, a.identity_key DESC
    LIMIT ${args.limit}
  `;
}

export function buildGuestCustomersCountSql(): Prisma.Sql {
  return Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT DISTINCT ${GUEST_IDENTITY_SQL} AS identity_key
      FROM orders o
      WHERE o.customer_id IS NULL
    ) AS guests
  `;
}
