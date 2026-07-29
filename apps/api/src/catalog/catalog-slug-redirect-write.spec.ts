import { CatalogSlugEntityType } from '../generated/prisma/client';
import { upsertCatalogSlugRedirect } from './catalog-slug-redirect-write';

describe('upsertCatalogSlugRedirect', () => {
  function createTx() {
    return {
      catalogSlugRedirect: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
  }

  it('no-ops when old and new slug match', async () => {
    const tx = createTx();
    await upsertCatalogSlugRedirect(tx as never, {
      entityType: CatalogSlugEntityType.PRODUCT,
      entityId: 'p1',
      oldSlug: 'same',
      newSlug: 'same',
    });
    expect(tx.catalogSlugRedirect.deleteMany).not.toHaveBeenCalled();
  });

  it('collapses rename chains without targetPath', async () => {
    const tx = createTx();
    await upsertCatalogSlugRedirect(tx as never, {
      entityType: CatalogSlugEntityType.PRODUCT,
      entityId: 'p1',
      oldSlug: 'old-b',
      newSlug: 'new-c',
    });

    expect(tx.catalogSlugRedirect.updateMany).toHaveBeenCalledWith({
      where: {
        entityType: CatalogSlugEntityType.PRODUCT,
        newSlug: 'old-b',
      },
      data: { newSlug: 'new-c' },
    });
    expect(tx.catalogSlugRedirect.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          newSlug: 'new-c',
          targetPath: null,
        }),
      }),
    );
  });

  it('inherits targetPath onto prior chain rows on archive', async () => {
    const tx = createTx();
    await upsertCatalogSlugRedirect(tx as never, {
      entityType: CatalogSlugEntityType.PRODUCT,
      entityId: 'p1',
      oldSlug: 'live-slug',
      newSlug: 'archived-p1',
      targetPath: '/categories/phones',
    });

    expect(tx.catalogSlugRedirect.updateMany).toHaveBeenCalledWith({
      where: {
        entityType: CatalogSlugEntityType.PRODUCT,
        newSlug: 'live-slug',
      },
      data: {
        newSlug: 'archived-p1',
        targetPath: '/categories/phones',
      },
    });
    expect(tx.catalogSlugRedirect.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          targetPath: '/categories/phones',
        }),
        update: expect.objectContaining({
          targetPath: '/categories/phones',
        }),
      }),
    );
  });
});
