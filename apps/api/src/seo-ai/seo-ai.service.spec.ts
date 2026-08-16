import { ConfigService } from '@nestjs/config';

import type { Environment } from '../config/environment';
import type { LoginThrottle, StaffPrincipal } from '../auth/auth.module';
import { SeoAiService } from './seo-ai.service';
import * as llmClient from './seo-llm.client';

jest.mock('./seo-llm.client', () => {
  const actual = jest.requireActual('./seo-llm.client') as typeof import('./seo-llm.client');
  return {
    ...actual,
    requestLlmSeoSuggestion: jest.fn(),
  };
});

const requestLlmSeoSuggestion = llmClient.requestLlmSeoSuggestion as jest.MockedFunction<
  typeof llmClient.requestLlmSeoSuggestion
>;

describe('SeoAiService', () => {
  const actor: StaffPrincipal = {
    id: 'staff-1',
    email: 'staff@example.invalid',
    displayName: 'Staff',
    role: 'ADMIN',
    permissions: [],
    sessionId: 'session-1',
    mfaEnabled: false,
  };

  function makeService(apiKey: string | undefined) {
    const throttle = {
      assertAllowed: jest.fn().mockResolvedValue(undefined),
      consumeSuccessQuota: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'SEO_AI_API_KEY':
            return apiKey;
          case 'SEO_AI_BASE_URL':
            return 'https://generativelanguage.googleapis.com/v1beta/openai';
          case 'SEO_AI_MODEL':
            return 'gemini-3.5-flash-lite';
          case 'SEO_AI_TIMEOUT_MS':
            return 30_000;
          default:
            return undefined;
        }
      }),
    };
    const service = new SeoAiService(
      config as unknown as ConfigService<Environment, true>,
      throttle as unknown as LoginThrottle,
    );
    return { service, throttle };
  }

  beforeEach(() => {
    requestLlmSeoSuggestion.mockReset();
  });

  it('returns heuristic SEO when the LLM key is missing', async () => {
    const { service, throttle } = makeService(undefined);
    const result = await service.suggest(
      { entityType: 'subcategory', name: 'Printerlər' },
      actor,
      '127.0.0.1',
    );
    expect(result.source).toBe('heuristic');
    expect(result.seoTitle.length).toBeGreaterThan(0);
    expect(result.warnings.some((warning) => /LLM açarı yoxdur/.test(warning))).toBe(
      true,
    );
    expect(requestLlmSeoSuggestion).not.toHaveBeenCalled();
    expect(throttle.consumeSuccessQuota).toHaveBeenCalled();
  });

  it('falls back to heuristic SEO when the LLM client throws', async () => {
    requestLlmSeoSuggestion.mockRejectedValue(new Error('undici boom'));
    const { service } = makeService('test-key');
    const result = await service.suggest(
      { entityType: 'brand', name: 'HP' },
      actor,
      '127.0.0.1',
    );
    expect(result.source).toBe('heuristic');
    expect(result.seoTitle).toContain('HP');
    expect(result.warnings.some((warning) => /şəbəkə xətası/.test(warning))).toBe(
      true,
    );
  });

  it('still returns SEO when quota accounting fails', async () => {
    requestLlmSeoSuggestion.mockResolvedValue({
      ok: true,
      value: {
        seoTitle: 'HP printerlər',
        seoDescription: 'HP printerlərini IT Market-də müqayisə edin.',
        description: 'HP brendinin printerlərini IT Market vitrinində kəşf edin.',
        source: 'llm',
        warnings: [],
      },
    });
    const { service, throttle } = makeService('test-key');
    throttle.consumeSuccessQuota.mockRejectedValue(new Error('db down'));
    const result = await service.suggest(
      { entityType: 'brand', name: 'HP' },
      actor,
      '127.0.0.1',
    );
    expect(result.source).toBe('llm');
    expect(result.seoTitle).toBe('HP printerlər');
  });
});
