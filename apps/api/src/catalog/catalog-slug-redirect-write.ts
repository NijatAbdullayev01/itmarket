import type { CatalogSlugEntityType, Prisma } from '../generated/prisma/client';

/**
 * Persist old→new slug for storefront 308s and collapse redirect chains
 * (A→B then B→C becomes A→C, B→C).
 * When targetPath is set (archive), prior chain rows inherit that path so
 * older slugs do not soft-404 after the live entity is archived.
 */
export async function upsertCatalogSlugRedirect(
  tx: Prisma.TransactionClient,
  input: {
    entityType: CatalogSlugEntityType;
    entityId: string;
    oldSlug: string;
    newSlug: string;
    targetPath?: string;
  },
): Promise<void> {
  const { entityType, entityId, oldSlug, newSlug, targetPath } = input;
  if (oldSlug === newSlug) {
    return;
  }

  await tx.catalogSlugRedirect.deleteMany({
    where: { entityType, oldSlug: newSlug },
  });

  await tx.catalogSlugRedirect.updateMany({
    where: { entityType, newSlug: oldSlug },
    data: {
      newSlug,
      ...(targetPath !== undefined ? { targetPath } : {}),
    },
  });

  await tx.catalogSlugRedirect.upsert({
    where: {
      entityType_oldSlug: { entityType, oldSlug },
    },
    create: {
      entityType,
      entityId,
      oldSlug,
      newSlug,
      ...(targetPath !== undefined ? { targetPath } : {}),
    },
    update: {
      entityId,
      newSlug,
      ...(targetPath !== undefined
        ? { targetPath }
        : { targetPath: null }),
    },
  });
}
