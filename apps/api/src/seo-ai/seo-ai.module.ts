import { Body, Controller, Module, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CatalogSeoSuggestResponseContract } from '@itmarket/contracts';

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
import { SeoSuggestDto } from './seo-suggest.dto';

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
