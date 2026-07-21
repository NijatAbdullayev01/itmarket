import { CatalogStatus, type PrismaClient } from '../generated/prisma/client';

export const INTAKE_PENDING_CATEGORY_SLUG = 'intake-pending';

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

export async function ensureIntakePendingCategory(tx: TransactionClient) {
  const existing = await tx.category.findUnique({
    where: { slug: INTAKE_PENDING_CATEGORY_SLUG },
    select: { id: true, status: true },
  });
  if (existing !== null) {
    if (existing.status === CatalogStatus.ARCHIVED) {
      return tx.category.update({
        where: { id: existing.id },
        data: { status: CatalogStatus.DRAFT },
        select: { id: true },
      });
    }
    return existing;
  }

  return tx.category.create({
    data: {
      name: 'Qəbul gözləyən',
      slug: INTAKE_PENDING_CATEGORY_SLUG,
      status: CatalogStatus.DRAFT,
    },
    select: { id: true },
  });
}
