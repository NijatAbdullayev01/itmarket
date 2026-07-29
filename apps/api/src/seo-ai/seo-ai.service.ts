import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestResponseContract,
} from '@itmarket/contracts';

import type { Environment } from '../config/environment';
import {
  LoginThrottle,
  type StaffPrincipal,
} from '../auth/auth.module';
import { buildSeoLlmSafePayload } from './seo-ai-boundary';
import { buildHeuristicSeoSuggestion } from './seo-heuristic';
import {
  requestLlmSeoSuggestion,
  seoLlmFailureWarning,
} from './seo-llm.client';

/**
 * Catalog SEO suggestions only. Intentionally has no Prisma / Payments /
 * Orders / Customers dependencies — LLM egress is allowlisted in seo-ai-boundary.
 */
const SUGGEST_MAX_PER_WINDOW = 30;
const SUGGEST_WINDOW_SECONDS = 60;

@Injectable()
export class SeoAiService {
  private readonly logger = new Logger(SeoAiService.name);

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly throttle: LoginThrottle,
  ) {}

  private normalizeRequest(
    input: CatalogSeoSuggestRequestContract,
  ): CatalogSeoSuggestRequestContract {
    const name = input.name?.trim() ?? '';
    if (name.length === 0) {
      throw new BadRequestException('SEO təklifi üçün ad tələb olunur');
    }
    if (name.length > 200) {
      throw new BadRequestException('Ad çox uzundur');
    }

    const specs = (input.specs ?? [])
      .map((spec) => ({
        label: spec.label?.trim() ?? '',
        value: spec.value?.trim() ?? '',
      }))
      .filter((spec) => spec.label.length > 0 && spec.value.length > 0)
      .slice(0, 12);

    return {
      entityType: input.entityType,
      name,
      description: input.description?.trim() || null,
      brandName: input.brandName?.trim() || null,
      categoryName: input.categoryName?.trim() || null,
      parentCategoryName: input.parentCategoryName?.trim() || null,
      specs,
    };
  }

  async suggest(
    raw: CatalogSeoSuggestRequestContract,
    actor: StaffPrincipal,
    ip: string,
  ): Promise<CatalogSeoSuggestResponseContract> {
    await this.throttle.assertAllowed('seo-suggest', actor.id, ip);
    const input = this.normalizeRequest(raw);
    // Boundary check before any LLM egress (also re-run inside the client).
    buildSeoLlmSafePayload(input);
    const heuristic = buildHeuristicSeoSuggestion(input);

    const apiKey = this.config.get('SEO_AI_API_KEY', { infer: true });
    if (apiKey === undefined || apiKey.trim().length === 0) {
      await this.throttle.consumeSuccessQuota('seo-suggest', actor.id, ip, {
        maxUses: SUGGEST_MAX_PER_WINDOW,
        windowSeconds: SUGGEST_WINDOW_SECONDS,
      });
      return {
        ...heuristic,
        warnings: [
          ...heuristic.warnings,
          'LLM açarı yoxdur — qayda əsaslı SEO təklifi verildi.',
        ],
      };
    }

    const llm = await requestLlmSeoSuggestion(input, {
      apiKey: apiKey.trim(),
      baseUrl: this.config.get('SEO_AI_BASE_URL', { infer: true }),
      model: this.config.get('SEO_AI_MODEL', { infer: true }),
      timeoutMs: this.config.get('SEO_AI_TIMEOUT_MS', { infer: true }),
    });

    await this.throttle.consumeSuccessQuota('seo-suggest', actor.id, ip, {
      maxUses: SUGGEST_MAX_PER_WINDOW,
      windowSeconds: SUGGEST_WINDOW_SECONDS,
    });

    if (!llm.ok) {
      this.logger.warn(
        `SEO LLM fallback (${llm.reason}${llm.httpStatus !== undefined ? `/${llm.httpStatus}` : ''}) timeoutMs=${this.config.get('SEO_AI_TIMEOUT_MS', { infer: true })} model=${this.config.get('SEO_AI_MODEL', { infer: true })}`,
      );
      return {
        ...heuristic,
        warnings: [...heuristic.warnings, seoLlmFailureWarning(llm)],
      };
    }

    return llm.value;
  }
}
