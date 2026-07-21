import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  StaffRoleCode,
  CatalogStatus,
  Prisma,
  LocationType,
} from '../src/generated/prisma/client';
import { PasswordHasher, Permission } from '../src/auth/auth.module';

const rolePermissions: Record<string, string[]> = {
  ADMIN: Object.values(Permission),
  MANAGER: [
    Permission.CATALOG_READ,
    Permission.CATALOG_WRITE,
    Permission.PRICE_CHANGE,
    Permission.ORDERS_READ,
    Permission.FULFILLMENT_WRITE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_RECEIPT,
    Permission.STOCK_ADJUSTMENT,
    Permission.INVENTORY_TRANSFER,
    Permission.CASH_REGISTER_MANAGE,
    Permission.CASH_SHIFT_OPEN,
    Permission.CASH_SHIFT_CLOSE,
    Permission.CASH_MOVEMENT_WRITE,
    Permission.POS_SALE,
    Permission.MANUAL_DISCOUNT,
    Permission.REFUND,
    Permission.SHIFT_APPROVAL,
    Permission.REPORT_READ,
    Permission.AUDIT_READ,
  ],
  CASHIER: [
    Permission.CATALOG_READ,
    Permission.INVENTORY_READ,
    Permission.CASH_SHIFT_OPEN,
    Permission.CASH_SHIFT_CLOSE,
    Permission.CASH_MOVEMENT_WRITE,
    Permission.POS_SALE,
  ],
  WAREHOUSE: [
    Permission.CATALOG_READ,
    Permission.ORDERS_READ,
    Permission.FULFILLMENT_WRITE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_RECEIPT,
    Permission.INVENTORY_TRANSFER,
  ],
  REPORT_VIEWER: [
    Permission.CATALOG_READ,
    Permission.INVENTORY_READ,
    Permission.REPORT_READ,
  ],
};

const demoBrands = [
  { name: 'Lenovo', slug: 'lenovo' },
  { name: 'Apple', slug: 'apple' },
  { name: 'Samsung', slug: 'samsung' },
  { name: 'ASUS', slug: 'asus' },
  { name: 'LG', slug: 'lg' },
  { name: 'Sony', slug: 'sony' },
  { name: 'Dyson', slug: 'dyson' },
  { name: 'HP', slug: 'hp' },
  { name: 'Canon', slug: 'canon' },
  { name: 'Xiaomi', slug: 'xiaomi' },
] as const;

async function retireWhDemoWarehouse(
  prisma: PrismaClient,
  targetLocationId: string,
): Promise<void> {
  const demo = await prisma.location.findUnique({
    where: { code: 'WH-DEMO' },
  });
  if (demo === null) {
    return;
  }

  const demoBalances = await prisma.inventoryBalance.findMany({
    where: { locationId: demo.id },
  });

  for (const balance of demoBalances) {
    const existing = await prisma.inventoryBalance.findUnique({
      where: {
        variantId_locationId: {
          variantId: balance.variantId,
          locationId: targetLocationId,
        },
      },
    });
    if (existing !== null) {
      await prisma.inventoryBalance.update({
        where: { id: existing.id },
        data: {
          onHand: existing.onHand + balance.onHand,
          reserved: existing.reserved + balance.reserved,
        },
      });
    } else {
      await prisma.inventoryBalance.create({
        data: {
          variantId: balance.variantId,
          locationId: targetLocationId,
          onHand: balance.onHand,
          reserved: balance.reserved,
        },
      });
    }
    await prisma.inventoryBalance.delete({ where: { id: balance.id } });
  }

  await prisma.location.update({
    where: { id: demo.id },
    data: { active: false },
  });
}

async function seedDevCatalogFixtures(prisma: PrismaClient): Promise<void> {
  const store28May = await prisma.location.upsert({
    where: { code: 'ST-28MAY' },
    create: {
      code: 'ST-28MAY',
      name: '28 may küçəsi 69C',
      type: LocationType.STORE,
    },
    update: {
      name: '28 may küçəsi 69C',
      type: LocationType.STORE,
      active: true,
    },
  });

  await prisma.pickupLocation.upsert({
    where: { code: '28MAY-69C' },
    create: {
      id: '2869690c-0000-4000-8000-000000000001',
      code: '28MAY-69C',
      name: '28 may küçəsi 69C',
      addressLine: '28 may küçəsi 69C, Bakı',
      locationId: store28May.id,
    },
    update: {
      name: '28 may küçəsi 69C',
      addressLine: '28 may küçəsi 69C, Bakı',
      locationId: store28May.id,
      active: true,
    },
  });

  const bakuCoveredAreas = [
    'baku',
    'Bakı',
    'bineqedi',
    'xetai',
    'xezer',
    'qaradag',
    'nerimanov',
    'nesimi',
    'nizami',
    'pirallahi',
    'sabuncu',
    'sebail',
    'suraxani',
    'yasamal',
  ];

  await prisma.deliveryZone.upsert({
    where: { code: 'BAKU' },
    create: {
      code: 'BAKU',
      name: 'Bakı',
      fee: new Prisma.Decimal('5.00'),
      freeDeliveryMinimum: new Prisma.Decimal('4000.00'),
      estimatedMinDays: 1,
      estimatedMaxDays: 2,
      coveredAdministrativeAreas: bakuCoveredAreas,
      active: true,
    },
    update: {
      name: 'Bakı',
      fee: new Prisma.Decimal('5.00'),
      freeDeliveryMinimum: new Prisma.Decimal('4000.00'),
      estimatedMinDays: 1,
      estimatedMaxDays: 2,
      coveredAdministrativeAreas: bakuCoveredAreas,
      active: true,
    },
  });

  for (const brand of demoBrands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      create: {
        name: brand.name,
        slug: brand.slug,
        status: CatalogStatus.ACTIVE,
      },
      update: {
        name: brand.name,
        status: CatalogStatus.ACTIVE,
      },
    });
  }

  await retireWhDemoWarehouse(prisma, store28May.id);
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Seed is restricted to NODE_ENV=development');
  }
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required to seed the database');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    await prisma.systemMetadata.upsert({
      where: { key: 'schema' },
      create: {
        key: 'schema',
        value: { version: 1 },
      },
      update: {
        value: { version: 1 },
      },
    });

    for (const code of Object.values(Permission)) {
      await prisma.permission.upsert({
        where: { code },
        create: { code, description: code },
        update: { description: code },
      });
    }

    for (const [code, permissions] of Object.entries(rolePermissions)) {
      const role = await prisma.role.upsert({
        where: { code: code as StaffRoleCode },
        create: { code: code as StaffRoleCode, name: code },
        update: { name: code },
      });
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      const permissionRows = await prisma.permission.findMany({
        where: { code: { in: permissions } },
        select: { id: true },
      });
      await prisma.rolePermission.createMany({
        data: permissionRows.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }

    const staffEmail = process.env.SEED_STAFF_EMAIL?.trim().toLowerCase();
    const staffPassword = process.env.SEED_STAFF_PASSWORD;
    if ((staffEmail === undefined) !== (staffPassword === undefined)) {
      throw new Error(
        'SEED_STAFF_EMAIL and SEED_STAFF_PASSWORD must be set together',
      );
    }
    if (staffEmail !== undefined && staffPassword !== undefined) {
      if (staffPassword.length < 12) {
        throw new Error(
          'SEED_STAFF_PASSWORD must contain at least 12 characters',
        );
      }
      const adminRole = await prisma.role.findUniqueOrThrow({
        where: { code: 'ADMIN' },
      });
      const passwordHash = await new PasswordHasher().hash(staffPassword);
      await prisma.staffUser.upsert({
        where: { email: staffEmail },
        create: {
          email: staffEmail,
          displayName: 'Development administrator',
          passwordHash,
          roleId: adminRole.id,
        },
        update: {
          passwordHash,
          roleId: adminRole.id,
          active: true,
        },
      });
    }

    const catalogCategories = [
      { name: 'Noutbuklar', slug: 'noutbuklar' },
      { name: 'Smartfonlar və aksesuarlar', slug: 'smartfonlar' },
      { name: 'Gamer zona', slug: 'gamer-zona' },
      { name: 'Apple', slug: 'apple' },
      { name: 'Monitorlar', slug: 'monitorlar' },
      { name: 'TV və audio', slug: 'tv-audio' },
      { name: 'Məişət texnikası', slug: 'meiset-texnikasi' },
      { name: 'Printerlər', slug: 'printerler' },
      { name: 'Kamera və foto', slug: 'kamera-foto' },
      { name: 'Şəbəkə avadanlıqları', slug: 'sebeke-avadanliqlari' },
      {
        name: 'Təhlükəsizlik avadanlıqları',
        slug: 'tehlukesizlik-avadanliqlari',
      },
    ];

    for (const [index, entry] of catalogCategories.entries()) {
      await prisma.category.upsert({
        where: { slug: entry.slug },
        create: {
          name: entry.name,
          slug: entry.slug,
          sortOrder: index,
          status: CatalogStatus.ACTIVE,
        },
        update: {
          name: entry.name,
          sortOrder: index,
          status: CatalogStatus.ACTIVE,
        },
      });
    }

    await prisma.category.updateMany({
      where: { slug: 'computer' },
      data: { name: 'Kompüter və komponentləri' },
    });

    await prisma.category.deleteMany({
      where: { slug: 'tehlukesizlik-mehsullari' },
    });

    await seedDevCatalogFixtures(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

void seed().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      level: 'error',
      message: 'Database seed failed',
      error: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exitCode = 1;
});
