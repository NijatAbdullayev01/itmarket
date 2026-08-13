import { Prisma } from '../generated/prisma/client';

export type ActiveCartShopperRow = {
  shopperKey: string;
  cartId: string;
  kind: 'registered' | 'guest';
  customerId: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  itemCount: number;
  quantityTotal: number;
  subtotal: Prisma.Decimal | string;
  currency: string;
  productPreview: string | null;
  lastActivityAt: Date;
};

export type CartShopperIdentity = {
  id: string;
  customerId: string | null;
};

/**
 * Qeydiyyatlı hesab → bir alıcı; qonaq səbəti → özü bir alıcı.
 * Boş və ya ACTIVE olmayan səbətlər sayılmır.
 */
export function cartShopperKey(cart: CartShopperIdentity): string {
  return cart.customerId ? `c:${cart.customerId}` : `g:${cart.id}`;
}

export function uniqueActiveCartShopperCount(
  carts: Array<CartShopperIdentity & { status: string; hasItems: boolean }>,
): number {
  const keys = new Set<string>();

  for (const cart of carts) {
    if (cart.status !== 'ACTIVE' || !cart.hasItems) {
      continue;
    }

    keys.add(cartShopperKey(cart));
  }

  return keys.size;
}

const CART_SHOPPER_KEY_SQL = Prisma.sql`
  CASE
    WHEN c.customer_id IS NOT NULL THEN 'c:' || c.customer_id::text
    ELSE 'g:' || c.id::text
  END
`;

const ACTIVE_CART_WITH_ITEMS_SQL = Prisma.sql`
  c.status = 'ACTIVE'::"CartStatus"
  AND EXISTS (
    SELECT 1
    FROM cart_items i
    WHERE i.cart_id = c.id
      AND i.quantity > 0
  )
`;

export function encodeActiveCartShopperCursor(
  lastActivityAt: Date,
  shopperKey: string,
): string {
  return Buffer.from(
    `${lastActivityAt.toISOString()}\n${shopperKey}`,
    'utf8',
  ).toString('base64url');
}

export function decodeActiveCartShopperCursor(
  cursor: string,
): { lastActivityAt: Date; shopperKey: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const separator = raw.indexOf('\n');
    if (separator <= 0) {
      return null;
    }

    const iso = raw.slice(0, separator);
    const shopperKey = raw.slice(separator + 1);
    const lastActivityAt = new Date(iso);
    if (
      Number.isNaN(lastActivityAt.getTime()) ||
      shopperKey.trim().length === 0
    ) {
      return null;
    }

    return { lastActivityAt, shopperKey };
  } catch {
    return null;
  }
}

export function buildActiveCartShoppersCountSql(): Prisma.Sql {
  return Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM (
      SELECT ${CART_SHOPPER_KEY_SQL} AS shopper_key
      FROM carts c
      WHERE ${ACTIVE_CART_WITH_ITEMS_SQL}
      GROUP BY 1
    ) AS shoppers
  `;
}

export function buildActiveCartShoppersListSql(args: {
  limit: number;
  search?: string;
  cursor?: { lastActivityAt: Date; shopperKey: string };
}): Prisma.Sql {
  const search = args.search?.trim();
  const searchFilter =
    search && search.length > 0
      ? Prisma.sql`AND (
          COALESCE(cu.email, '') ILIKE ${'%' + search + '%'}
          OR COALESCE(cu.phone, '') ILIKE ${'%' + search + '%'}
          OR COALESCE(cu.first_name, '') ILIKE ${'%' + search + '%'}
          OR COALESCE(cu.last_name, '') ILIKE ${'%' + search + '%'}
        )`
      : Prisma.empty;

  const cursorFilter = args.cursor
    ? Prisma.sql`AND (
        r.last_activity_at < ${args.cursor.lastActivityAt}
        OR (
          r.last_activity_at = ${args.cursor.lastActivityAt}
          AND r.shopper_key < ${args.cursor.shopperKey}
        )
      )`
    : Prisma.empty;

  return Prisma.sql`
    WITH filled_carts AS (
      SELECT
        c.id,
        c.customer_id,
        c.currency,
        ${CART_SHOPPER_KEY_SQL} AS shopper_key,
        CASE
          WHEN c.customer_id IS NOT NULL THEN 'registered'
          ELSE 'guest'
        END AS kind,
        GREATEST(
          c.updated_at,
          COALESCE(
            (
              SELECT MAX(i.updated_at)
              FROM cart_items i
              WHERE i.cart_id = c.id
            ),
            c.updated_at
          )
        ) AS last_activity_at,
        (
          SELECT COUNT(*)::int
          FROM cart_items i
          WHERE i.cart_id = c.id
            AND i.quantity > 0
        ) AS item_count,
        (
          SELECT COALESCE(SUM(i.quantity), 0)::int
          FROM cart_items i
          WHERE i.cart_id = c.id
            AND i.quantity > 0
        ) AS quantity_total,
        (
          SELECT COALESCE(SUM(i.quantity * v.price), 0)
          FROM cart_items i
          INNER JOIN product_variants v ON v.id = i.variant_id
          WHERE i.cart_id = c.id
            AND i.quantity > 0
        ) AS subtotal
      FROM carts c
      WHERE ${ACTIVE_CART_WITH_ITEMS_SQL}
    ),
    ranked AS (
      SELECT
        filled_carts.*,
        ROW_NUMBER() OVER (
          PARTITION BY shopper_key
          ORDER BY last_activity_at DESC, id DESC
        ) AS rn
      FROM filled_carts
    )
    SELECT
      r.shopper_key AS "shopperKey",
      r.id AS "cartId",
      r.kind,
      r.customer_id AS "customerId",
      NULLIF(BTRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), '') AS "displayName",
      cu.email,
      cu.phone,
      r.item_count AS "itemCount",
      r.quantity_total AS "quantityTotal",
      r.subtotal::text AS subtotal,
      r.currency,
      (
        SELECT string_agg(preview.name, ', ')
        FROM (
          SELECT p.name
          FROM cart_items i
          INNER JOIN product_variants v ON v.id = i.variant_id
          INNER JOIN products p ON p.id = v.product_id
          WHERE i.cart_id = r.id
            AND i.quantity > 0
          ORDER BY i.updated_at DESC
          LIMIT 2
        ) preview
      ) AS "productPreview",
      r.last_activity_at AS "lastActivityAt"
    FROM ranked r
    LEFT JOIN customers cu ON cu.id = r.customer_id
    WHERE r.rn = 1
      ${searchFilter}
      ${cursorFilter}
    ORDER BY r.last_activity_at DESC, r.shopper_key DESC
    LIMIT ${args.limit}
  `;
}
