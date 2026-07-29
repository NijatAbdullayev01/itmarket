import { Injectable } from '@nestjs/common';
import type {
  CatalogSeoCoverageBucketContract,
  CatalogSeoCoverageEntityKind,
  CatalogSeoCoverageGapField,
  CatalogSeoCoverageItemContract,
  CatalogSeoCoverageResponseContract,
  CatalogSeoFillMissingItemResultContract,
  CatalogSeoFillMissingRequestContract,
  CatalogSeoFillMissingResponseContract,
  CatalogSeoOosAuditItemContract,
} from '@itmarket/contracts';
import { CatalogStatus, Prisma } from '../generated/prisma/client';
import type { StaffPrincipal } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { buildHeuristicSeoSuggestion } from '../seo-ai/seo-heuristic';
import { parseProductRequiredSpecs } from './product-required-specs';

const SAMPLE_LIMIT = 25;
const FILL_DEFAULT_LIMIT = 40;
const FILL_MAX_LIMIT = 100;
const OOS_SAMPLE_LIMIT = 40;

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim().length === 0;
}

function missingFields(row: {
  seoTitle: string | null;
  seoDescription: string | null;
  description: string | null;
}): CatalogSeoCoverageGapField[] {
  const missing: CatalogSeoCoverageGapField[] = [];
  if (isBlank(row.seoTitle)) {
    missing.push('seoTitle');
  }
  if (isBlank(row.seoDescription)) {
    missing.push('seoDescription');
  }
  if (isBlank(row.description)) {
    missing.push('description');
  }
  return missing;
}

@Injectable()
export class CatalogSeoCoverageService {
  constructor(private readonly prisma: PrismaService) {}

  private async writeAudit(
    tx: Prisma.TransactionClient,
    actor: StaffPrincipal,
    action: string,
    entityType: string,
    entityId: string,
    before: Prisma.InputJsonValue | undefined,
    after: Prisma.InputJsonValue | undefined,
  ) {
    await tx.auditLog.create({
      data: {
        actorType: 'staff',
        actorId: actor.id,
        action,
        entityType,
        entityId,
        before: before === undefined ? Prisma.DbNull : before,
        after: after === undefined ? Prisma.DbNull : after,
      },
    });
  }

  async getCoverage(): Promise<CatalogSeoCoverageResponseContract> {
    const [products, brands, categories, oosVariants] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: CatalogStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          seoTitle: true,
          seoDescription: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.brand.findMany({
        where: { status: CatalogStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          seoTitle: true,
          seoDescription: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.findMany({
        where: { status: CatalogStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          seoTitle: true,
          seoDescription: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.productVariant.findMany({
        where: {
          status: CatalogStatus.ACTIVE,
          availableByOrder: false,
          product: { status: CatalogStatus.ACTIVE },
        },
        select: {
          id: true,
          sku: true,
          productId: true,
          balances: { select: { onHand: true, reserved: true } },
          product: { select: { name: true, slug: true } },
        },
        take: 2000,
      }),
    ]);

    const buckets: CatalogSeoCoverageBucketContract[] = [
      this.toBucket('product', products),
      this.toBucket('brand', brands),
      this.toBucket('category', categories),
    ];

    const oosSamples: CatalogSeoOosAuditItemContract[] = [];
    for (const variant of oosVariants) {
      const available = variant.balances.reduce(
        (sum, balance) =>
          sum + Math.max(0, balance.onHand - balance.reserved),
        0,
      );
      if (available > 0) {
        continue;
      }
      oosSamples.push({
        variantId: variant.id,
        productId: variant.productId,
        productName: variant.product.name,
        productSlug: variant.product.slug,
        sku: variant.sku,
        available,
      });
      if (oosSamples.length >= OOS_SAMPLE_LIMIT) {
        break;
      }
    }

    const oosTotal = oosVariants.filter((variant) => {
      const available = variant.balances.reduce(
        (sum, balance) =>
          sum + Math.max(0, balance.onHand - balance.reserved),
        0,
      );
      return available <= 0;
    }).length;

    return {
      generatedAt: new Date().toISOString(),
      buckets,
      oosWithoutOrderFlag: {
        total: oosTotal,
        samples: oosSamples,
      },
    };
  }

  async fillMissing(
    raw: CatalogSeoFillMissingRequestContract,
    actor: StaffPrincipal,
  ): Promise<CatalogSeoFillMissingResponseContract> {
    const entityTypes = new Set<CatalogSeoCoverageEntityKind>(
      raw.entityTypes ?? ['product', 'brand', 'category'],
    );
    const limit = Math.min(
      FILL_MAX_LIMIT,
      Math.max(1, raw.limit ?? FILL_DEFAULT_LIMIT),
    );
    const filled: CatalogSeoFillMissingItemResultContract[] = [];
    let skipped = 0;

    if (entityTypes.has('product') && filled.length < limit) {
      const result = await this.fillProducts(limit - filled.length, actor);
      filled.push(...result.filled);
      skipped += result.skipped;
    }
    if (entityTypes.has('brand') && filled.length < limit) {
      const result = await this.fillBrands(limit - filled.length, actor);
      filled.push(...result.filled);
      skipped += result.skipped;
    }
    if (entityTypes.has('category') && filled.length < limit) {
      const result = await this.fillCategories(limit - filled.length, actor);
      filled.push(...result.filled);
      skipped += result.skipped;
    }

    let availableByOrderEnabled = 0;
    if (raw.enableAvailableByOrderForOos === true) {
      availableByOrderEnabled = await this.enableAvailableByOrderForOos(
        Math.min(FILL_MAX_LIMIT, limit),
        actor,
      );
    }

    const coverage = await this.getCoverage();
    const remainingGaps = coverage.buckets.reduce(
      (sum, bucket) => sum + bucket.missingAny,
      0,
    );

    return {
      filled,
      skipped,
      remainingGaps,
      availableByOrderEnabled,
    };
  }

  private toBucket(
    entityType: CatalogSeoCoverageEntityKind,
    rows: Array<{
      id: string;
      name: string;
      slug: string;
      status: CatalogStatus;
      seoTitle: string | null;
      seoDescription: string | null;
      description: string | null;
    }>,
  ): CatalogSeoCoverageBucketContract {
    const samples: CatalogSeoCoverageItemContract[] = [];
    let missingSeoTitle = 0;
    let missingSeoDescription = 0;
    let missingDescription = 0;
    let missingAny = 0;

    for (const row of rows) {
      const missing = missingFields(row);
      if (missing.length === 0) {
        continue;
      }
      missingAny += 1;
      if (missing.includes('seoTitle')) {
        missingSeoTitle += 1;
      }
      if (missing.includes('seoDescription')) {
        missingSeoDescription += 1;
      }
      if (missing.includes('description')) {
        missingDescription += 1;
      }
      if (samples.length < SAMPLE_LIMIT) {
        samples.push({
          entityType,
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
          missing,
        });
      }
    }

    return {
      entityType,
      totalActive: rows.length,
      missingAny,
      missingSeoTitle,
      missingSeoDescription,
      missingDescription,
      samples,
    };
  }

  private async fillProducts(
    limit: number,
    actor: StaffPrincipal,
  ): Promise<{
    filled: CatalogSeoFillMissingItemResultContract[];
    skipped: number;
  }> {
    const rows = await this.prisma.product.findMany({
      where: {
        status: CatalogStatus.ACTIVE,
        OR: [
          { seoTitle: null },
          { seoTitle: '' },
          { seoDescription: null },
          { seoDescription: '' },
          { description: null },
          { description: '' },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'asc' },
      include: {
        brand: { select: { name: true } },
        category: {
          select: {
            name: true,
            parent: { select: { name: true } },
          },
        },
      },
    });

    const filled: CatalogSeoFillMissingItemResultContract[] = [];
    let skipped = 0;

    for (const row of rows) {
      const missing = missingFields(row);
      if (missing.length === 0) {
        skipped += 1;
        continue;
      }

      const specs = parseProductRequiredSpecs(row.requiredSpecs);
      const suggestion = buildHeuristicSeoSuggestion({
        entityType: 'product',
        name: row.name,
        description: row.description,
        brandName: row.brand?.name ?? null,
        categoryName: row.category.name,
        parentCategoryName: row.category.parent?.name ?? null,
        specs: specs.map((spec) => ({
          label: spec.label,
          value: spec.value,
        })),
      });

      const data: {
        seoTitle?: string;
        seoDescription?: string;
        description?: string;
      } = {};
      const updatedFields: string[] = [];
      if (missing.includes('seoTitle')) {
        data.seoTitle = suggestion.seoTitle;
        updatedFields.push('seoTitle');
      }
      if (missing.includes('seoDescription')) {
        data.seoDescription = suggestion.seoDescription;
        updatedFields.push('seoDescription');
      }
      if (missing.includes('description')) {
        data.description = suggestion.description;
        updatedFields.push('description');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: row.id }, data });
        await this.writeAudit(
          tx,
          actor,
          'catalog.seo.filled',
          'product',
          row.id,
          {
            seoTitle: row.seoTitle,
            seoDescription: row.seoDescription,
            description: row.description,
          },
          data,
        );
      });

      filled.push({
        entityType: 'product',
        id: row.id,
        name: row.name,
        updatedFields,
      });
    }

    return { filled, skipped };
  }

  private async fillBrands(
    limit: number,
    actor: StaffPrincipal,
  ): Promise<{
    filled: CatalogSeoFillMissingItemResultContract[];
    skipped: number;
  }> {
    const rows = await this.prisma.brand.findMany({
      where: {
        status: CatalogStatus.ACTIVE,
        OR: [
          { seoTitle: null },
          { seoTitle: '' },
          { seoDescription: null },
          { seoDescription: '' },
          { description: null },
          { description: '' },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });

    const filled: CatalogSeoFillMissingItemResultContract[] = [];
    let skipped = 0;

    for (const row of rows) {
      const missing = missingFields(row);
      if (missing.length === 0) {
        skipped += 1;
        continue;
      }

      const suggestion = buildHeuristicSeoSuggestion({
        entityType: 'brand',
        name: row.name,
        description: row.description,
      });

      const data: {
        seoTitle?: string;
        seoDescription?: string;
        description?: string;
      } = {};
      const updatedFields: string[] = [];
      if (missing.includes('seoTitle')) {
        data.seoTitle = suggestion.seoTitle;
        updatedFields.push('seoTitle');
      }
      if (missing.includes('seoDescription')) {
        data.seoDescription = suggestion.seoDescription;
        updatedFields.push('seoDescription');
      }
      if (missing.includes('description')) {
        data.description = suggestion.description;
        updatedFields.push('description');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.brand.update({ where: { id: row.id }, data });
        await this.writeAudit(
          tx,
          actor,
          'catalog.seo.filled',
          'brand',
          row.id,
          {
            seoTitle: row.seoTitle,
            seoDescription: row.seoDescription,
            description: row.description,
          },
          data,
        );
      });

      filled.push({
        entityType: 'brand',
        id: row.id,
        name: row.name,
        updatedFields,
      });
    }

    return { filled, skipped };
  }

  private async fillCategories(
    limit: number,
    actor: StaffPrincipal,
  ): Promise<{
    filled: CatalogSeoFillMissingItemResultContract[];
    skipped: number;
  }> {
    const rows = await this.prisma.category.findMany({
      where: {
        status: CatalogStatus.ACTIVE,
        OR: [
          { seoTitle: null },
          { seoTitle: '' },
          { seoDescription: null },
          { seoDescription: '' },
          { description: null },
          { description: '' },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'asc' },
      include: {
        parent: { select: { name: true } },
      },
    });

    const filled: CatalogSeoFillMissingItemResultContract[] = [];
    let skipped = 0;

    for (const row of rows) {
      const missing = missingFields(row);
      if (missing.length === 0) {
        skipped += 1;
        continue;
      }

      const suggestion = buildHeuristicSeoSuggestion({
        entityType: row.parentId ? 'subcategory' : 'category',
        name: row.name,
        description: row.description,
        parentCategoryName: row.parent?.name ?? null,
      });

      const data: {
        seoTitle?: string;
        seoDescription?: string;
        description?: string;
      } = {};
      const updatedFields: string[] = [];
      if (missing.includes('seoTitle')) {
        data.seoTitle = suggestion.seoTitle;
        updatedFields.push('seoTitle');
      }
      if (missing.includes('seoDescription')) {
        data.seoDescription = suggestion.seoDescription;
        updatedFields.push('seoDescription');
      }
      if (missing.includes('description')) {
        data.description = suggestion.description;
        updatedFields.push('description');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.category.update({ where: { id: row.id }, data });
        await this.writeAudit(
          tx,
          actor,
          'catalog.seo.filled',
          'category',
          row.id,
          {
            seoTitle: row.seoTitle,
            seoDescription: row.seoDescription,
            description: row.description,
          },
          data,
        );
      });

      filled.push({
        entityType: 'category',
        id: row.id,
        name: row.name,
        updatedFields,
      });
    }

    return { filled, skipped };
  }

  private async enableAvailableByOrderForOos(
    limit: number,
    actor: StaffPrincipal,
  ): Promise<number> {
    const candidates = await this.prisma.productVariant.findMany({
      where: {
        status: CatalogStatus.ACTIVE,
        availableByOrder: false,
        product: { status: CatalogStatus.ACTIVE },
      },
      select: {
        id: true,
        sku: true,
        balances: { select: { onHand: true, reserved: true } },
      },
      take: 2000,
    });

    const oosIds = candidates
      .filter((variant) => {
        const available = variant.balances.reduce(
          (sum, balance) =>
            sum + Math.max(0, balance.onHand - balance.reserved),
          0,
        );
        return available <= 0;
      })
      .slice(0, limit)
      .map((variant) => variant.id);

    if (oosIds.length === 0) {
      return 0;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productVariant.updateMany({
        where: { id: { in: oosIds } },
        data: { availableByOrder: true },
      });
      await this.writeAudit(
        tx,
        actor,
        'catalog.seo.availableByOrder.enabled',
        'product-variant',
        oosIds[0]!,
        undefined,
        { variantIds: oosIds, count: oosIds.length },
      );
    });

    return oosIds.length;
  }
}
