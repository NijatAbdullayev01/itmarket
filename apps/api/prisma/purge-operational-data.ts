import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

loadEnvironment({ path: '../../.env', quiet: true });

/** Tables with append-only triggers; delete in FK-safe order. */
const TABLES_TO_PURGE = [
  'product_reviews',
  'pos_return_items',
  'pos_returns',
  'pos_payments',
  'pos_sale_items',
  'refunds',
  'payment_events',
  'payment_attempts',
  'payments',
  'fulfillment_events',
  'order_status_history',
  'order_addresses',
  'stock_reservations',
  'order_items',
  'orders',
  'pos_sales',
  'cart_items',
  'credit_applications',
  'product_availability_requests',
  'carts',
  'support_chat_messages',
  'support_messages',
  'inventory_movements',
  'inventory_balances',
  'product_variant_media',
  'product_media',
  'catalog_slug_redirects',
  'product_variants',
  'products',
  'cash_movements',
  'cash_shifts',
  'pos_daily_ledgers',
  'customer_password_resets',
  'customer_sessions',
  'customer_addresses',
  'customers',
  'report_exports',
] as const;

async function purgeOperationalData(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const counts = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'SET LOCAL session_replication_role = replica',
      );

      const result: Record<string, number> = {};

      for (const table of TABLES_TO_PURGE) {
        const rows = await tx.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
        );
        const before = Number(rows[0]?.count ?? 0);
        await tx.$executeRawUnsafe(`DELETE FROM "${table}"`);
        result[table] = before;
      }

      return result;
    });

    process.stdout.write('Operational data purge complete:\n');
    for (const [table, count] of Object.entries(counts)) {
      process.stdout.write(`  ${table}: ${count}\n`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void purgeOperationalData().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
