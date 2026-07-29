import { buildSeoLlmSafePayload } from './seo-ai-boundary';
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from './seo-heuristic';
import {
  buildSeoLlmBrief,
  buildSeoLlmSystemPrompt,
  refineLlmSeoSuggestion,
  softClampSeoText,
} from './seo-llm-quality';

describe('seo-llm-quality', () => {
  const productPayload = buildSeoLlmSafePayload({
    entityType: 'product',
    name: 'iPhone 16',
    brandName: 'Apple',
    categoryName: 'Smartfonlar',
    parentCategoryName: 'Telefonlar',
    specs: [
      { label: 'Yaddaş', value: '128GB' },
      { label: 'Rəng', value: 'Qara' },
    ],
  });

  it('builds product brief with brand, model and primary specs', () => {
    const brief = buildSeoLlmBrief(productPayload);
    expect(brief).toContain('məhsul');
    expect(brief).toContain('Apple');
    expect(brief).toContain('iPhone 16');
    expect(brief).toContain('128GB');
  });

  it('includes entity brief inside system prompt with SERP limits', () => {
    const system = buildSeoLlmSystemPrompt(productPayload);
    expect(system).toContain(String(SEO_TITLE_SOFT_MAX));
    expect(system).toContain(String(SEO_DESCRIPTION_SOFT_MAX));
    expect(system).toContain(' | IT Market');
    expect(system).toContain('128GB');
    expect(system).toContain('ətraflı landinq/məhsul mətni');
  });

  it('asks for multi-sentence product page copy in brief', () => {
    const brief = buildSeoLlmBrief(productPayload);
    expect(brief).toContain('3–6 cümləlik');
  });

  it('soft-clamps on word boundary', () => {
    const value = softClampSeoText('Apple iPhone 16 128GB smartfon qiymeti', 24);
    expect(value.endsWith('…')).toBe(true);
    expect(value.length).toBeLessThanOrEqual(24);
    expect(value).not.toMatch(/\s…$/);
  });

  it('strips site suffix, price promises and prepends missing brand', () => {
    const refined = refineLlmSeoSuggestion(
      {
        seoTitle: 'iPhone 16 128GB Smartfon | IT Market',
        seoDescription:
          'Ən sərfəli qiymət ilə iPhone 16 alın. Rəsmi zəmanət və çatdırılma.',
        description:
          'Yeni iPhone 16 modelini IT Market-də kəşf edin. Orijinal məhsul və zəmanət.',
      },
      productPayload,
    );

    expect(refined.seoTitle).not.toMatch(/\| IT Market/i);
    expect(refined.seoTitle.startsWith('Apple')).toBe(true);
    expect(refined.seoTitle.length).toBeLessThanOrEqual(SEO_TITLE_SOFT_MAX);
    expect(refined.seoDescription.toLowerCase()).not.toContain('ən sərfəli qiymət');
    expect(refined.seoDescription.length).toBeLessThanOrEqual(
      SEO_DESCRIPTION_SOFT_MAX,
    );
    expect(refined.warnings.some((w) => w.includes('IT Market'))).toBe(true);
    expect(refined.warnings.some((w) => w.includes('brend'))).toBe(true);
  });

  it('builds category brief without inventing SKUs instruction', () => {
    const category = buildSeoLlmSafePayload({
      entityType: 'category',
      name: 'Smartfonlar',
    });
    expect(buildSeoLlmBrief(category)).toContain('SKU uydurma');
  });
});
