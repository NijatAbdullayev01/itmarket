import type {
  CatalogSeoCoverageBucketContract,
  CatalogSeoCoverageEntityKind,
  CatalogSeoCoverageGapField,
  CatalogSeoCoverageItemContract,
} from '@itmarket/contracts';
import type { CatalogStatus } from '../generated/prisma/client';

export function isBlankSeoField(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim().length === 0;
}

export function missingSeoFields(row: {
  seoTitle: string | null;
  seoDescription: string | null;
  description: string | null;
}): CatalogSeoCoverageGapField[] {
  const missing: CatalogSeoCoverageGapField[] = [];
  if (isBlankSeoField(row.seoTitle)) {
    missing.push('seoTitle');
  }
  if (isBlankSeoField(row.seoDescription)) {
    missing.push('seoDescription');
  }
  if (isBlankSeoField(row.description)) {
    missing.push('description');
  }
  return missing;
}

export function availableQtyFromBalances(
  balances: Array<{ onHand: number; reserved: number }>,
): number {
  return balances.reduce(
    (sum, balance) => sum + Math.max(0, balance.onHand - balance.reserved),
    0,
  );
}

export function buildCoverageBucket(
  entityType: CatalogSeoCoverageEntityKind,
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    status: CatalogStatus;
    seoTitle: string | null;
    seoDescription: string | null;
    description: string | null;
    parentId?: string | null;
  }>,
  sampleLimit: number,
): CatalogSeoCoverageBucketContract {
  const samples: CatalogSeoCoverageItemContract[] = [];
  let missingSeoTitle = 0;
  let missingSeoDescription = 0;
  let missingDescription = 0;
  let missingAny = 0;

  for (const row of rows) {
    const missing = missingSeoFields(row);
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
    if (samples.length < sampleLimit) {
      const sample: CatalogSeoCoverageItemContract = {
        entityType,
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        missing,
      };
      if (entityType === 'category' && row.parentId !== undefined) {
        sample.parentId = row.parentId;
      }
      samples.push(sample);
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
