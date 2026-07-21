import { CatalogStatus } from '../generated/prisma/client';
import { resolveIntakeVariantId } from './inventory-intake.catalog';

describe('resolveIntakeVariantId brand registration', () => {
  const actor = { id: 'staff-1' };

  it('creates a brand record before creating a new intake product', async () => {
    const brandCreate = jest.fn().mockResolvedValue({
      id: 'brand-new',
      name: 'Nova Brend',
      slug: 'nova-brend',
      status: CatalogStatus.ACTIVE,
    });
    const auditLogCreate = jest.fn().mockResolvedValue({});

    const tx = {
      brand: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: brandCreate,
        update: jest.fn(),
      },
      category: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'category-pending',
          status: CatalogStatus.DRAFT,
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'product-1',
          brandId: 'brand-new',
          status: CatalogStatus.DRAFT,
        }),
        update: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'variant-1' }),
      },
      auditLog: {
        create: auditLogCreate,
      },
    };

    await resolveIntakeVariantId(
      tx as never,
      {
        brandName: 'Nova Brend',
        modelName: 'Model X',
        barcode: '',
      },
      actor as never,
    );

    expect(brandCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Nova Brend',
          status: CatalogStatus.ACTIVE,
        }),
      }),
    );
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'brand.created',
          entityType: 'brand',
        }),
      }),
    );
  });

  it('links an existing product without brand to the ensured brand', async () => {
    const existingBrand = {
      id: 'brand-apple',
      name: 'Apple',
      slug: 'apple',
      status: CatalogStatus.ACTIVE,
    };

    const tx = {
      brand: {
        findFirst: jest.fn().mockResolvedValue(existingBrand),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'category-pending',
          status: CatalogStatus.DRAFT,
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'product-legacy',
          brandId: null,
          status: CatalogStatus.DRAFT,
        }),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          id: 'product-legacy',
          brandId: 'brand-apple',
          status: CatalogStatus.DRAFT,
        }),
      },
      productVariant: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'variant-2' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    await resolveIntakeVariantId(
      tx as never,
      {
        brandName: 'Apple',
        modelName: 'iPhone 15',
        barcode: '2901234567894',
      },
      actor as never,
    );

    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-legacy' },
        data: { brandId: 'brand-apple' },
      }),
    );
  });
});
