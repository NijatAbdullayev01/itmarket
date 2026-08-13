import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  HOME_BESTSELLERS_LIMIT,
  HOME_BESTSELLERS_WINDOW_DAYS,
  type ProductSoldQuantity,
} from './bestsellers-ranking';

type BestsellerSqlRow = {
  productId: string;
  soldQty: number | bigint;
};

export async function queryBestsellerSoldQuantities(
  prisma: PrismaService,
  options?: { limit?: number; windowDays?: number },
): Promise<ProductSoldQuantity[]> {
  const limit = options?.limit ?? HOME_BESTSELLERS_LIMIT;
  const windowDays = options?.windowDays ?? HOME_BESTSELLERS_WINDOW_DAYS;
  const rows = await prisma.$queryRaw<BestsellerSqlRow[]>`
    SELECT s.product_id AS "productId", SUM(s.qty)::int AS "soldQty"
    FROM (
      SELECT pv.product_id, oi.quantity AS qty
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.status IN (
        'CONFIRMED'::"OrderStatus",
        'PROCESSING'::"OrderStatus",
        'READY_FOR_PICKUP'::"OrderStatus",
        'READY_FOR_DELIVERY'::"OrderStatus",
        'OUT_FOR_DELIVERY'::"OrderStatus",
        'COMPLETED'::"OrderStatus"
      )
        AND o.created_at >= NOW() - (${windowDays} * INTERVAL '1 day')

      UNION ALL

      SELECT pv.product_id,
        GREATEST(psi.quantity - COALESCE(ret.returned, 0), 0) AS qty
      FROM pos_sale_items psi
      INNER JOIN pos_sales ps ON ps.id = psi.sale_id
      INNER JOIN product_variants pv ON pv.id = psi.variant_id
      LEFT JOIN (
        SELECT sale_item_id, SUM(quantity)::int AS returned
        FROM pos_return_items
        GROUP BY sale_item_id
      ) ret ON ret.sale_item_id = psi.id
      WHERE ps.created_at >= NOW() - (${windowDays} * INTERVAL '1 day')
    ) s
    INNER JOIN products p ON p.id = s.product_id
    WHERE p.status = CAST('ACTIVE' AS "CatalogStatus")
    GROUP BY s.product_id
    HAVING SUM(s.qty) > 0
    ORDER BY SUM(s.qty) DESC, s.product_id ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    productId: row.productId,
    soldQty: Number(row.soldQty),
  }));
}
