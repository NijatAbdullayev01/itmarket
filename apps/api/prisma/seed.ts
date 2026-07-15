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

const demoProducts = [
  {
    name: 'Lenovo ThinkPad X1 Carbon Gen 12',
    slug: 'demo-lenovo-thinkpad-x1',
    categorySlug: 'noutbuklar',
    brandSlug: 'lenovo',
    description: 'Yüngül biznes noutbuku, Intel Core Ultra və 32 GB RAM.',
    sku: 'DEMO-NBK-001',
    price: '3499.00',
    previousPrice: '3699.00',
    stock: 12,
    attributes: {
      Prosessor: 'Intel Core Ultra 7',
      RAM: '32 GB',
      Yaddaş: '1 TB SSD',
      Ekran: '14" 2.8K OLED',
    },
  },
  {
    name: 'Apple MacBook Air 13" M3',
    slug: 'demo-apple-macbook-air-m3',
    categorySlug: 'apple',
    brandSlug: 'apple',
    description: 'Apple M3 çipi, 512 GB SSD, gün ərzində 18 saat batareya.',
    sku: 'DEMO-NBK-002',
    price: '2899.00',
    stock: 8,
    attributes: {
      Çip: 'Apple M3',
      RAM: '16 GB',
      Yaddaş: '512 GB SSD',
      Batareya: '18 saat',
    },
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    slug: 'demo-samsung-galaxy-s24-ultra',
    categorySlug: 'smartfonlar',
    brandSlug: 'samsung',
    description: '200 MP kamera, S Pen dəstəyi və 12 GB RAM.',
    sku: 'DEMO-PHN-001',
    price: '3299.00',
    previousPrice: '3599.00',
    stock: 15,
    attributes: {
      Ekran: '6.8" AMOLED',
      Kamera: '200 MP',
      RAM: '12 GB',
      Yaddaş: '256 GB',
    },
  },
  {
    name: 'ASUS ROG Strix G16',
    slug: 'demo-asus-rog-strix-g16',
    categorySlug: 'gamer-zona',
    brandSlug: 'asus',
    description: 'RTX 4060, 165 Hz ekran və RGB klaviatura.',
    sku: 'DEMO-GMR-001',
    price: '4199.00',
    stock: 5,
    attributes: {
      GPU: 'RTX 4060',
      Prosessor: 'Intel Core i7',
      Ekran: '16" 165 Hz',
      RAM: '16 GB',
    },
  },
  {
    name: 'LG UltraWide 34WP85C',
    slug: 'demo-lg-ultrawide-34',
    categorySlug: 'monitorlar',
    brandSlug: 'lg',
    description: '34" QHD IPS panel, USB-C və HDR10.',
    sku: 'DEMO-MON-001',
    price: '1299.00',
    previousPrice: '1499.00',
    stock: 10,
    attributes: {
      Ölçü: '34"',
      Rezolyusiya: '3440×1440',
      Panel: 'IPS',
      Yeniləmə: '60 Hz',
    },
  },
  {
    name: 'Sony Bravia XR 55"',
    slug: 'demo-sony-bravia-xr-55',
    categorySlug: 'tv-audio',
    brandSlug: 'sony',
    description: '4K OLED televizor, Google TV və Dolby Vision.',
    sku: 'DEMO-TV-001',
    price: '2199.00',
    stock: 6,
    attributes: {
      Ölçü: '55"',
      Rezolyusiya: '4K UHD',
      Panel: 'OLED',
      'Smart TV': 'Google TV',
    },
  },
  {
    name: 'Dyson V15 Detect',
    slug: 'demo-dyson-v15-detect',
    categorySlug: 'meiset-texnikasi',
    brandSlug: 'dyson',
    description: 'Lazer toz aşkarlanması və güclü sorğu.',
    sku: 'DEMO-HME-001',
    price: '1899.00',
    previousPrice: '2099.00',
    stock: 9,
    attributes: {
      'Sorğu gücü': '240 AW',
      'Toz həcmi': '0.76 L',
      Batareya: '60 dəq',
      Filtr: 'HEPA',
    },
  },
  {
    name: 'HP LaserJet Pro M404dn',
    slug: 'demo-hp-laserjet-m404dn',
    categorySlug: 'printerler',
    brandSlug: 'hp',
    description: 'Sürətli lazer printer, duplex çap dəstəyi.',
    sku: 'DEMO-PRT-001',
    price: '899.00',
    stock: 20,
    attributes: {
      Növ: 'Lazer',
      Sürət: '38 səh/san',
      Çap: 'Duplex',
      Qoşulma: 'Ethernet',
    },
  },
  {
    name: 'Canon EOS R50 Kit',
    slug: 'demo-canon-eos-r50',
    categorySlug: 'kamera-foto',
    brandSlug: 'canon',
    description: '24.2 MP mirrorless kamera, 4K video.',
    sku: 'DEMO-CAM-001',
    price: '2799.00',
    stock: 4,
    attributes: {
      Sensor: '24.2 MP',
      Video: '4K 30fps',
      Ekran: '3" flip',
      Stabilizasiya: 'Digital IS',
    },
  },
  {
    name: 'Xiaomi Redmi Note 13 Pro',
    slug: 'demo-xiaomi-redmi-note-13-pro',
    categorySlug: 'smartfonlar',
    brandSlug: 'xiaomi',
    description: '200 MP kamera, 120 Hz AMOLED ekran.',
    sku: 'DEMO-PHN-002',
    price: '899.00',
    previousPrice: '999.00',
    stock: 25,
    attributes: {
      Ekran: '6.67" AMOLED',
      Yeniləmə: '120 Hz',
      Kamera: '200 MP',
      Batareya: '5100 mAh',
    },
  },
] as const;

async function seedDemoCatalog(prisma: PrismaClient): Promise<void> {
  const warehouse = await prisma.location.upsert({
    where: { code: 'WH-DEMO' },
    create: {
      code: 'WH-DEMO',
      name: 'Demo anbar',
      type: LocationType.WAREHOUSE,
    },
    update: {
      name: 'Demo anbar',
      active: true,
    },
  });

  const brandIds = new Map<string, string>();
  for (const brand of demoBrands) {
    const row = await prisma.brand.upsert({
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
    brandIds.set(brand.slug, row.id);
  }

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const categoryIds = new Map(categories.map((entry) => [entry.slug, entry.id]));

  for (const item of demoProducts) {
    const categoryId = categoryIds.get(item.categorySlug);
    if (categoryId === undefined) {
      throw new Error(`Missing category for demo product: ${item.categorySlug}`);
    }

    const brandId = brandIds.get(item.brandSlug);
    if (brandId === undefined) {
      throw new Error(`Missing brand for demo product: ${item.brandSlug}`);
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      create: {
        categoryId,
        brandId,
        name: item.name,
        slug: item.slug,
        description: item.description,
        warrantyMonths: 24,
        status: CatalogStatus.ACTIVE,
      },
      update: {
        categoryId,
        brandId,
        name: item.name,
        description: item.description,
        warrantyMonths: 24,
        status: CatalogStatus.ACTIVE,
      },
    });

    const variant = await prisma.productVariant.upsert({
      where: { sku: item.sku },
      create: {
        productId: product.id,
        sku: item.sku,
        name: 'Standart',
        attributes: item.attributes,
        price: new Prisma.Decimal(item.price),
        previousPrice:
          item.previousPrice !== undefined
            ? new Prisma.Decimal(item.previousPrice)
            : null,
        currency: 'AZN',
        status: CatalogStatus.ACTIVE,
      },
      update: {
        productId: product.id,
        name: 'Standart',
        attributes: item.attributes,
        price: new Prisma.Decimal(item.price),
        previousPrice:
          item.previousPrice !== undefined
            ? new Prisma.Decimal(item.previousPrice)
            : null,
        status: CatalogStatus.ACTIVE,
      },
    });

    await prisma.inventoryBalance.upsert({
      where: {
        variantId_locationId: {
          variantId: variant.id,
          locationId: warehouse.id,
        },
      },
      create: {
        variantId: variant.id,
        locationId: warehouse.id,
        onHand: item.stock,
        reserved: 0,
      },
      update: {
        onHand: item.stock,
        reserved: 0,
      },
    });

    const imageUrl = `https://picsum.photos/seed/${item.slug}/640/480`;
    await prisma.productMedia.upsert({
      where: { objectKey: imageUrl },
      create: {
        productId: product.id,
        objectKey: imageUrl,
        mimeType: 'image/jpeg',
        byteSize: 0,
        altText: item.name,
        sortOrder: 0,
      },
      update: {
        productId: product.id,
        altText: item.name,
      },
    });
  }
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
    ];

    for (const entry of catalogCategories) {
      await prisma.category.upsert({
        where: { slug: entry.slug },
        create: {
          name: entry.name,
          slug: entry.slug,
          status: CatalogStatus.ACTIVE,
        },
        update: {
          name: entry.name,
          status: CatalogStatus.ACTIVE,
        },
      });
    }

    await seedDemoCatalog(prisma);
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
