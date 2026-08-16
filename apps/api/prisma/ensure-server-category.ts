/**
 * Ensure the Server root category exists (slug=server) and is not nested.
 */
import { config as loadEnvironment } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

import { CatalogStatus, PrismaClient } from '../src/generated/prisma/client';

loadEnvironment({ path: '../../.env', quiet: true });

const SLUG = 'server';
const NAME = 'Server';

async function ensureServerCategory(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const existing = await prisma.category.findUnique({
      where: { slug: SLUG },
      select: { id: true, parentId: true, status: true, name: true },
    });

    if (existing !== null) {
      if (
        existing.parentId !== null ||
        existing.status !== CatalogStatus.ACTIVE ||
        existing.name !== NAME
      ) {
        await prisma.category.update({
          where: { id: existing.id },
          data: {
            name: NAME,
            parentId: null,
            status: CatalogStatus.ACTIVE,
          },
        });
        process.stdout.write(`Promoted ${SLUG} to a root category\n`);
      } else {
        process.stdout.write(`Root category ${SLUG} already exists\n`);
      }
      return;
    }

    const aggregate = await prisma.category.aggregate({
      where: { parentId: null },
      _max: { sortOrder: true },
    });
    await prisma.category.create({
      data: {
        name: NAME,
        slug: SLUG,
        parentId: null,
        status: CatalogStatus.ACTIVE,
        sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
      },
    });
    process.stdout.write(`Created root category ${SLUG}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void ensureServerCategory().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      level: 'error',
      message: 'Failed to ensure Server category',
      error: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exitCode = 1;
});
