import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type {
  CatalogSeoEntityType,
  CatalogSeoSuggestRequestContract,
} from '@itmarket/contracts';

import {
  SEO_SUGGEST_BRAND_MAX,
  SEO_SUGGEST_DESCRIPTION_MAX,
  SEO_SUGGEST_NAME_MAX,
  SEO_SUGGEST_SPEC_LABEL_MAX,
  SEO_SUGGEST_SPEC_VALUE_MAX,
  SEO_SUGGEST_SPECS_MAX,
} from './seo-ai-boundary';

const SEO_ENTITY_TYPES = [
  'product',
  'brand',
  'category',
  'subcategory',
] as const satisfies readonly CatalogSeoEntityType[];

function optionalSeoText(maxLength: number) {
  return ({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    return trimmed.slice(0, maxLength);
  };
}

function requiredSeoText(maxLength: number) {
  return ({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().slice(0, maxLength);
  };
}

export type SeoSuggestSpec = {
  label: string;
  value: string;
};

/**
 * Strip empty/invalid rows to `{ label, value }` only.
 *
 * Do not use `@ValidateNested` + `@Type` on this array: class-transformer
 * then treats nested plain objects as non-whitelisted (`specs.0.property
 * label should not exist`) and can also coerce sibling fields such as `name`.
 */
export function sanitizeInboundSpecs({ value }: { value: unknown }) {
  if (!Array.isArray(value)) {
    return [];
  }

  const specs: SeoSuggestSpec[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const specValue =
      typeof record.value === 'string' ? record.value.trim() : '';
    if (label.length === 0 || specValue.length === 0) {
      continue;
    }
    specs.push({
      label: label.slice(0, SEO_SUGGEST_SPEC_LABEL_MAX),
      value: specValue.slice(0, SEO_SUGGEST_SPEC_VALUE_MAX),
    });
    if (specs.length >= SEO_SUGGEST_SPECS_MAX) {
      break;
    }
  }
  return specs;
}

export class SeoSuggestDto implements CatalogSeoSuggestRequestContract {
  @IsIn([...SEO_ENTITY_TYPES])
  entityType!: CatalogSeoEntityType;

  @Transform(requiredSeoText(SEO_SUGGEST_NAME_MAX))
  @IsString()
  @MinLength(1)
  @MaxLength(SEO_SUGGEST_NAME_MAX)
  name!: string;

  @Transform(optionalSeoText(SEO_SUGGEST_DESCRIPTION_MAX))
  @IsOptional()
  @IsString()
  @MaxLength(SEO_SUGGEST_DESCRIPTION_MAX)
  description?: string | null;

  @Transform(optionalSeoText(SEO_SUGGEST_BRAND_MAX))
  @IsOptional()
  @IsString()
  @MaxLength(SEO_SUGGEST_BRAND_MAX)
  brandName?: string | null;

  @Transform(optionalSeoText(SEO_SUGGEST_BRAND_MAX))
  @IsOptional()
  @IsString()
  @MaxLength(SEO_SUGGEST_BRAND_MAX)
  categoryName?: string | null;

  @Transform(optionalSeoText(SEO_SUGGEST_BRAND_MAX))
  @IsOptional()
  @IsString()
  @MaxLength(SEO_SUGGEST_BRAND_MAX)
  parentCategoryName?: string | null;

  @Transform(sanitizeInboundSpecs)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SEO_SUGGEST_SPECS_MAX)
  specs?: SeoSuggestSpec[];
}
