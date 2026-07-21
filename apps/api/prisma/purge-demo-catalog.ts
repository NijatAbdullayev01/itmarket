import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

loadEnvironment({ path: '../../.env', quiet: true });

async function purgeDemoCatalog(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const demoProducts = await prisma.product.findMany({
      where: {
        OR: [
          { slug: { startsWith: 'demo-' } },
          { variants: { some: { sku: { startsWith: 'DEMO-' } } } },
        ],
      },
      select: {
        id: true,
        slug: true,
        variants: { select: { id: true, sku: true } },
      },
    });

    if (demoProducts.length === 0) {
      process.stdout.write('No demo catalog products found.\n');
      return;
    }

    const productIds = demoProducts.map((product) => product.id);
    const variantIds = demoProducts.flatMap((product) =>
      product.variants.map((variant) => variant.id),
    );

    await prisma.$transaction(async (tx) => {
      await tx.productReview.deleteMany({
        where: { productId: { in: productIds } },
      });
      await tx.posReturnItem.deleteMany({
        where: { variantId: { in: variantIds } },
      });
      await tx.posSaleItem.deleteMany({
        where: { variantId: { in: variantIds } },
      });
      await tx.orderItem.deleteMany({
        where: { variantId: { in: variantIds } },
      });
      await tx.cartItem.deleteMany({
        where: { variantId: { in: variantIds } },
      });
      await tx.stockReservation.deleteMany({
        where: { variantId: { in: variantIds } },
      });
      await tx.inventoryMovement.deleteMany({
        where: { variantId: { in: variantIds } },
      });
      await tx.inventoryBalance.deleteMany({
        where: { variantId: { in: variantIds } },
      });
      await tx.productAvailabilityRequest.deleteMany({
        where: { productId: { in: productIds } },
      });
      await tx.creditApplication.deleteMany({
        where: { productId: { in: productIds } },
      });
      await tx.productVariant.deleteMany({
        where: { id: { in: variantIds } },
      });
      await tx.product.deleteMany({
        where: { id: { in: productIds } },
      });
    });

    process.stdout.write(
      `Removed ${demoProducts.length} demo product(s) and ${variantIds.length} variant(s).\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void purgeDemoCatalog().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
