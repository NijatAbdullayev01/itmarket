import { Injectable } from '@nestjs/common';
import type {
  CatalogSeoCoverageBucketContract,
  CatalogSeoCoverageEntityKind,
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
import { missingSeoFields } from './catalog-seo-coverage.domain';
import { parseProductRequiredSpecs } from './product-required-specs';

const SAMPLE_LIMIT = 25;
const FILL_DEFAULT_LIMIT = 40;
const FILL_MAX_LIMIT = 100;
const OOS_SAMPLE_LIMIT = 40;

type OosAuditRow = {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  sku: string;
  available: number;
};

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

  private async loadSeoCoverageBucket(
    entityType: CatalogSeoCoverageEntityKind,
    table: 'products' | 'brands' | 'categories',
  ): Promise<CatalogSeoCoverageBucketContract> {
    const parentColumn =
      table === 'categories' ? Prisma.sql`, parent_id` : Prisma.empty;
    const [statsRows, sampleRows] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          total_active: number;
          missing_any: number;
          missing_seo_title: number;
          missing_seo_description: number;
          missing_description: number;
        }>
      >`
        SELECT
          COUNT(*)::int AS total_active,
          COUNT(*) FILTER (
            WHERE
              BTRIM(COALESCE(seo_title, '')) = ''
              OR BTRIM(COALESCE(seo_description, '')) = ''
              OR BTRIM(COALESCE(description, '')) = ''
          )::int AS missing_any,
          COUNT(*) FILTER (
            WHERE BTRIM(COALESCE(seo_title, '')) = ''
          )::int AS missing_seo_title,
          COUNT(*) FILTER (
            WHERE BTRIM(COALESCE(seo_description, '')) = ''
          )::int AS missing_seo_description,
          COUNT(*) FILTER (
            WHERE BTRIM(COALESCE(description, '')) = ''
          )::int AS missing_description
        FROM ${Prisma.raw(table)}
        WHERE status = CAST('ACTIVE' AS "CatalogStatus")
      `,
      this.prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          slug: string;
          status: CatalogStatus;
          seo_title: string | null;
          seo_description: string | null;
          description: string | null;
          parent_id?: string | null;
        }>
      >`
        SELECT id, name, slug, status, seo_title, seo_description, description
          ${parentColumn}
        FROM ${Prisma.raw(table)}
        WHERE status = CAST('ACTIVE' AS "CatalogStatus")
          AND (
            BTRIM(COALESCE(seo_title, '')) = ''
            OR BTRIM(COALESCE(seo_description, '')) = ''
            OR BTRIM(COALESCE(description, '')) = ''
          )
        ORDER BY name ASC
        LIMIT ${SAMPLE_LIMIT}
      `,
    ]);

    const stats = statsRows[0] ?? {
      total_active: 0,
      missing_any: 0,
      missing_seo_title: 0,
      missing_seo_description: 0,
      missing_description: 0,
    };

    return {
      entityType,
      totalActive: Number(stats.total_active),
      missingAny: Number(stats.missing_any),
      missingSeoTitle: Number(stats.missing_seo_title),
      missingSeoDescription: Number(stats.missing_seo_description),
      missingDescription: Number(stats.missing_description),
      samples: sampleRows.map((row) => {
        const sample: CatalogSeoCoverageBucketContract['samples'][number] = {
          entityType,
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
          missing: missingSeoFields({
            seoTitle: row.seo_title,
            seoDescription: row.seo_description,
            description: row.description,
          }),
        };
        if (entityType === 'category') {
          sample.parentId = row.parent_id ?? null;
        }
        return sample;
      }),
    };
  }

  async getCoverage(): Promise<CatalogSeoCoverageResponseContract> {
    const [productBucket, brandBucket, categoryBucket, oosAudit] =
      await Promise.all([
        this.loadSeoCoverageBucket('product', 'products'),
        this.loadSeoCoverageBucket('brand', 'brands'),
        this.loadSeoCoverageBucket('category', 'categories'),
        this.loadOosWithoutOrderFlag(),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      buckets: [productBucket, brandBucket, categoryBucket],
      oosWithoutOrderFlag: oosAudit,
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

  /**
   * Accurate OOS audit: ACTIVE variants with availableByOrder=false and
   * sellable stock ≤ 0 (including no balance rows). Avoids the old take(2000)
   * undercount.
   */
  private async loadOosWithoutOrderFlag(): Promise<{
    total: number;
    samples: CatalogSeoOosAuditItemContract[];
  }> {
    const [countRows, sampleRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*)::bigint AS total
        FROM (
          SELECT pv.id
          FROM product_variants pv
          INNER JOIN products p ON p.id = pv.product_id
          LEFT JOIN inventory_balances ib ON ib.variant_id = pv.id
          WHERE pv.status = CAST('ACTIVE' AS "CatalogStatus")
            AND p.status = CAST('ACTIVE' AS "CatalogStatus")
            AND pv.available_by_order = false
          GROUP BY pv.id
          HAVING COALESCE(SUM(GREATEST(ib.on_hand - ib.reserved, 0)), 0) <= 0
        ) oos
      `,
      this.prisma.$queryRaw<OosAuditRow[]>`
        SELECT
          pv.id AS variant_id,
          pv.product_id,
          p.name AS product_name,
          p.slug AS product_slug,
          pv.sku,
          COALESCE(SUM(GREATEST(ib.on_hand - ib.reserved, 0)), 0)::int AS available
        FROM product_variants pv
        INNER JOIN products p ON p.id = pv.product_id
        LEFT JOIN inventory_balances ib ON ib.variant_id = pv.id
        WHERE pv.status = CAST('ACTIVE' AS "CatalogStatus")
          AND p.status = CAST('ACTIVE' AS "CatalogStatus")
          AND pv.available_by_order = false
        GROUP BY pv.id, pv.product_id, p.name, p.slug, pv.sku
        HAVING COALESCE(SUM(GREATEST(ib.on_hand - ib.reserved, 0)), 0) <= 0
        ORDER BY p.name ASC, pv.sku ASC
        LIMIT ${OOS_SAMPLE_LIMIT}
      `,
    ]);

    return {
      total: Number(countRows[0]?.total ?? 0n),
      samples: sampleRows.map((row) => ({
        variantId: row.variant_id,
        productId: row.product_id,
        productName: row.product_name,
        productSlug: row.product_slug,
        sku: row.sku,
        available: row.available,
      })),
    };
  }

  /** IDs where any SEO/intro field is null or whitespace-only (trim-aware). */
  private async idsNeedingSeoFill(
    table: 'products' | 'brands' | 'categories',
    limit: number,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM ${Prisma.raw(table)}
      WHERE status = CAST('ACTIVE' AS "CatalogStatus")
        AND (
          BTRIM(COALESCE(seo_title, '')) = ''
          OR BTRIM(COALESCE(seo_description, '')) = ''
          OR BTRIM(COALESCE(description, '')) = ''
        )
      ORDER BY updated_at ASC
      LIMIT ${limit}
    `;
    return rows.map((row) => row.id);
  }

  private async fillProducts(
    limit: number,
    actor: StaffPrincipal,
  ): Promise<{
    filled: CatalogSeoFillMissingItemResultContract[];
    skipped: number;
  }> {
    const ids = await this.idsNeedingSeoFill('products', limit);
    if (ids.length === 0) {
      return { filled: [], skipped: 0 };
    }

    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
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
    const byId = new Map(rows.map((row) => [row.id, row]));

    const filled: CatalogSeoFillMissingItemResultContract[] = [];
    let skipped = 0;

    for (const id of ids) {
      const row = byId.get(id);
      if (!row) {
        skipped += 1;
        continue;
      }
      const missing = missingSeoFields(row);
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
    const ids = await this.idsNeedingSeoFill('brands', limit);
    if (ids.length === 0) {
      return { filled: [], skipped: 0 };
    }

    const rows = await this.prisma.brand.findMany({
      where: { id: { in: ids } },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));

    const filled: CatalogSeoFillMissingItemResultContract[] = [];
    let skipped = 0;

    for (const id of ids) {
      const row = byId.get(id);
      if (!row) {
        skipped += 1;
        continue;
      }
      const missing = missingSeoFields(row);
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
    const ids = await this.idsNeedingSeoFill('categories', limit);
    if (ids.length === 0) {
      return { filled: [], skipped: 0 };
    }

    const rows = await this.prisma.category.findMany({
      where: { id: { in: ids } },
      include: {
        parent: { select: { name: true } },
      },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));

    const filled: CatalogSeoFillMissingItemResultContract[] = [];
    let skipped = 0;

    for (const id of ids) {
      const row = byId.get(id);
      if (!row) {
        skipped += 1;
        continue;
      }
      const missing = missingSeoFields(row);
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
    const candidates = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT pv.id
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      LEFT JOIN inventory_balances ib ON ib.variant_id = pv.id
      WHERE pv.status = CAST('ACTIVE' AS "CatalogStatus")
        AND p.status = CAST('ACTIVE' AS "CatalogStatus")
        AND pv.available_by_order = false
      GROUP BY pv.id
      HAVING COALESCE(SUM(GREATEST(ib.on_hand - ib.reserved, 0)), 0) <= 0
      ORDER BY pv.updated_at ASC
      LIMIT ${limit}
    `;

    const oosIds = candidates.map((row) => row.id);
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
