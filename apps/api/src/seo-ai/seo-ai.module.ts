import {
  Body,
  Controller,
  Module,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  CatalogSeoEntityType,
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestResponseContract,
} from '@itmarket/contracts';

import {
  AuthModule,
  CurrentStaff,
  Permission,
  PermissionsGuard,
  RequirePermissions,
  StaffAuthGuard,
  type StaffPrincipal,
} from '../auth/auth.module';
import { getClientIp } from '../security/client-ip';
import { SeoAiService } from './seo-ai.service';

const SEO_ENTITY_TYPES = [
  'product',
  'brand',
  'category',
  'subcategory',
] as const satisfies readonly CatalogSeoEntityType[];

class SeoSuggestSpecDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value!: string;
}

class SeoSuggestDto implements CatalogSeoSuggestRequestContract {
  @IsIn(SEO_ENTITY_TYPES)
  entityType!: CatalogSeoEntityType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brandName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoryName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  parentCategoryName?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => SeoSuggestSpecDto)
  specs?: SeoSuggestSpecDto[];
}

@ApiTags('catalog')
@ApiCookieAuth('itmarket_staff_access')
@UseGuards(StaffAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.CATALOG_READ)
@Controller({ path: 'catalog', version: '1' })
class CatalogSeoController {
  constructor(private readonly seoAi: SeoAiService) {}

  @Post('seo/suggest')
  @RequirePermissions(Permission.CATALOG_WRITE)
  @ApiOperation({
    summary:
      'Suggest SEO title/description for catalog create/edit forms (heuristic + optional LLM)',
  })
  suggest(
    @Body() dto: SeoSuggestDto,
    @CurrentStaff() actor: StaffPrincipal,
    @Req() request: { ip?: string; socket?: { remoteAddress?: string } },
  ): Promise<CatalogSeoSuggestResponseContract> {
    const ip = getClientIp(request);
    return this.seoAi.suggest(dto, actor, ip);
  }
}

/**
 * Isolated SEO AI surface: AuthModule only (staff + catalog.write).
 * Do not import Payments, Orders, Customers, Prisma, or other data modules —
 * the LLM must never receive payment/user payloads from this process path.
 */
@Module({
  imports: [AuthModule],
  controllers: [CatalogSeoController],
  providers: [SeoAiService],
})
export class SeoAiModule {}
