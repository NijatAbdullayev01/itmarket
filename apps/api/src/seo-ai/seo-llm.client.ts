import type {
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestResponseContract,
} from '@itmarket/contracts';

import {
  assertSeoLlmPayloadKeys,
  buildSeoLlmSafePayload,
  type SeoLlmSafePayload,
} from './seo-ai-boundary';
import {
  clampSeoText,
  PAGE_DESCRIPTION_HARD_MAX,
  SEO_DESCRIPTION_HARD_MAX,
  SEO_TITLE_HARD_MAX,
} from './seo-heuristic';
import {
  buildSeoLlmSystemPrompt,
  buildSeoLlmUserPrompt,
  refineLlmSeoSuggestion,
} from './seo-llm-quality';
import { assertSafeSeoAiBaseUrl } from '../security/outbound-url';

export type SeoLlmClientConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
};

export type SeoLlmFailureReason =
  | 'http_error'
  | 'timeout'
  | 'empty_content'
  | 'parse_error'
  | 'network_error';

export type SeoLlmSuggestOutcome =
  | { ok: true; value: CatalogSeoSuggestResponseContract }
  | {
      ok: false;
      reason: SeoLlmFailureReason;
      httpStatus?: number;
    };

type OpenAiChatResponse = {
  choices?: Array<{
    message?: { content?: unknown };
  }>;
};

function buildUserPrompt(payload: SeoLlmSafePayload): string {
  const outbound: Record<string, unknown> = {
    entityType: payload.entityType,
    brand: payload.brand,
    model: payload.model,
    category: payload.category,
    parentCategory: payload.parentCategory,
    specs: payload.specs,
    existingDescription: payload.existingDescription,
  };
  assertSeoLlmPayloadKeys(outbound);
  return buildSeoLlmUserPrompt(JSON.stringify(outbound));
}

/** Gemini OpenAI-compat may return string or content-part arrays. */
export function extractLlmMessageContent(content: unknown): string | null {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const parts: string[] = [];
  for (const part of content) {
    if (typeof part === 'string' && part.trim().length > 0) {
      parts.push(part.trim());
      continue;
    }
    if (part !== null && typeof part === 'object') {
      const record = part as Record<string, unknown>;
      const text =
        (typeof record.text === 'string' && record.text) ||
        (typeof record.content === 'string' && record.content) ||
        null;
      if (text !== null && text.trim().length > 0) {
        parts.push(text.trim());
      }
    }
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join('\n').trim();
}

export function parseLlmJson(content: string): {
  seoTitle: string;
  seoDescription: string;
  description: string;
} | null {
  const trimmed = content.trim();
  const fenced = trimmed.match(/\{[\s\S]*\}/);
  const raw = fenced?.[0] ?? trimmed;
  try {
    const parsed = JSON.parse(raw) as {
      seoTitle?: unknown;
      seoDescription?: unknown;
      description?: unknown;
    };
    if (
      typeof parsed.seoTitle !== 'string' ||
      typeof parsed.seoDescription !== 'string' ||
      typeof parsed.description !== 'string'
    ) {
      return null;
    }
    const seoTitle = clampSeoText(parsed.seoTitle, SEO_TITLE_HARD_MAX);
    const seoDescription = clampSeoText(
      parsed.seoDescription,
      SEO_DESCRIPTION_HARD_MAX,
    );
    const description = clampSeoText(
      parsed.description,
      PAGE_DESCRIPTION_HARD_MAX,
    );
    if (
      seoTitle.length === 0 ||
      seoDescription.length === 0 ||
      description.length === 0
    ) {
      return null;
    }
    return { seoTitle, seoDescription, description };
  } catch {
    return null;
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

/**
 * Outbound SEO-only LLM call. Caller must pass already-normalized catalog input;
 * this function re-applies the allowlist boundary before network egress.
 */
export async function requestLlmSeoSuggestion(
  input: CatalogSeoSuggestRequestContract,
  config: SeoLlmClientConfig,
): Promise<SeoLlmSuggestOutcome> {
  // Boundary must run outside the network try/catch so BadRequest propagates.
  const safePayload = buildSeoLlmSafePayload(input);
  const userPrompt = buildUserPrompt(safePayload);
  const systemPrompt = buildSeoLlmSystemPrompt(safePayload);
  let safeBaseUrl: URL;
  try {
    safeBaseUrl = assertSafeSeoAiBaseUrl(config.baseUrl);
  } catch {
    return { ok: false, reason: 'network_error' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const endpoint = `${safeBaseUrl.toString().replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      redirect: 'error',
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.25,
        // Do not set max_tokens: Gemini flash models spend budget on
        // "thinking" and truncate JSON mid-object (finish_reason=length).
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!response.ok) {
      return { ok: false, reason: 'http_error', httpStatus: response.status };
    }
    const payload = (await response.json()) as OpenAiChatResponse;
    const content = extractLlmMessageContent(
      payload.choices?.[0]?.message?.content,
    );
    if (content === null) {
      return { ok: false, reason: 'empty_content' };
    }
    const parsed = parseLlmJson(content);
    if (parsed === null) {
      return { ok: false, reason: 'parse_error' };
    }
    const refined = refineLlmSeoSuggestion(parsed, safePayload);
    if (
      refined.seoTitle.length === 0 ||
      refined.seoDescription.length === 0 ||
      refined.description.length === 0
    ) {
      return { ok: false, reason: 'parse_error' };
    }
    return {
      ok: true,
      value: {
        seoTitle: refined.seoTitle,
        seoDescription: refined.seoDescription,
        description: refined.description,
        source: 'llm',
        warnings: refined.warnings,
      },
    };
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}

export function seoLlmFailureWarning(outcome: {
  reason: SeoLlmFailureReason;
  httpStatus?: number;
}): string {
  switch (outcome.reason) {
    case 'timeout':
      return 'LLM vaxt limiti keçdi — qayda əsaslı SEO təklifinə keçildi.';
    case 'http_error':
      return outcome.httpStatus !== undefined
        ? `LLM HTTP ${outcome.httpStatus} — qayda əsaslı SEO təklifinə keçildi.`
        : 'LLM HTTP xətası — qayda əsaslı SEO təklifinə keçildi.';
    case 'empty_content':
      return 'LLM boş cavab verdi — qayda əsaslı SEO təklifinə keçildi.';
    case 'parse_error':
      return 'LLM cavabı oxunmadı — qayda əsaslı SEO təklifinə keçildi.';
    case 'network_error':
      return 'LLM şəbəkə xətası — qayda əsaslı SEO təklifinə keçildi.';
    default: {
      const _exhaustive: never = outcome.reason;
      return `LLM uğursuz (${String(_exhaustive)}) — qayda əsaslı SEO təklifinə keçildi.`;
    }
  }
}
