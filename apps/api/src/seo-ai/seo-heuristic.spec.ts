import {
  buildHeuristicSeoSuggestion,
  clampSeoText,
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
} from './seo-heuristic';

describe('seo-heuristic', () => {
  it('clamps long text with ellipsis', () => {
    expect(clampSeoText('a'.repeat(20), 10)).toBe(`${'a'.repeat(9)}…`);
  });

  it('builds product SEO without duplicating brand in title', () => {
    const result = buildHeuristicSeoSuggestion({
      entityType: 'product',
      name: 'Apple iPhone 15 128GB',
      brandName: 'Apple',
      categoryName: 'Smartfonlar',
      parentCategoryName: 'Telefonlar',
      specs: [
        { label: 'Yaddaş', value: '128GB' },
        { label: 'Rəng', value: 'Qara' },
      ],
    });
    expect(result.source).toBe('heuristic');
    expect(result.seoTitle).toBe('Apple iPhone 15 128GB');
    expect(result.seoTitle.length).toBeLessThanOrEqual(SEO_TITLE_SOFT_MAX);
    expect(result.seoDescription.toLowerCase()).toContain('iphone');
    expect(result.seoDescription.length).toBeLessThanOrEqual(
      SEO_DESCRIPTION_SOFT_MAX,
    );
    expect(result.seoDescription).not.toMatch(/\| IT Market/i);
  });

  it('prefixes brand when product name omits it', () => {
    const result = buildHeuristicSeoSuggestion({
      entityType: 'product',
      name: 'iPhone 15',
      brandName: 'Apple',
    });
    expect(result.seoTitle.startsWith('Apple')).toBe(true);
  });

  it('prefers long product description for meta description', () => {
    const description =
      'Rəsmi Apple iPhone 15 — A16 çip, 48MP kamera və sürətli şarj ilə gündəlik istifadə üçün ideal seçim.';
    const result = buildHeuristicSeoSuggestion({
      entityType: 'product',
      name: 'iPhone 15',
      brandName: 'Apple',
      description,
    });
    expect(result.seoDescription.startsWith('Rəsmi Apple')).toBe(true);
  });

  it('builds brand landing SEO', () => {
    const result = buildHeuristicSeoSuggestion({
      entityType: 'brand',
      name: 'Samsung',
    });
    expect(result.seoTitle).toBe('Samsung');
    expect(result.seoDescription.toLowerCase()).toContain('samsung');
  });

  it('builds category and subcategory SEO', () => {
    const category = buildHeuristicSeoSuggestion({
      entityType: 'category',
      name: 'Telefonlar',
    });
    expect(category.seoTitle).toContain('Telefonlar');
    expect(category.seoDescription.toLowerCase()).toContain('telefonlar');
    expect(category.description.toLowerCase()).toContain('telefonlar');
    expect(category.description.length).toBeGreaterThan(40);

    const sub = buildHeuristicSeoSuggestion({
      entityType: 'subcategory',
      name: 'Smartfonlar',
      parentCategoryName: 'Telefonlar',
    });
    expect(sub.seoDescription.toLowerCase()).toContain('telefonlar');
    expect(sub.seoDescription.toLowerCase()).toContain('smartfonlar');
    expect(sub.description.toLowerCase()).toContain('smartfonlar');
  });

  it('fills page description for category landing intro', () => {
    const result = buildHeuristicSeoSuggestion({
      entityType: 'category',
      name: 'Noutbuklar',
    });
    expect(result.description.length).toBeGreaterThan(40);
    expect(result.description.toLowerCase()).toContain('noutbuklar');
    expect(result.description).not.toMatch(/\| IT Market/i);
  });

  it('does not append site name to seoTitle', () => {
    const result = buildHeuristicSeoSuggestion({
      entityType: 'category',
      name: 'Noutbuklar',
    });
    expect(result.seoTitle).not.toMatch(/IT Market/i);
  });

  it('includes brand and storage specs in product title when useful', () => {
    const result = buildHeuristicSeoSuggestion({
      entityType: 'product',
      name: 'iPhone 15',
      brandName: 'Apple',
      categoryName: 'Smartfonlar',
      specs: [
        { label: 'Daimi yaddaş', value: '128GB' },
        { label: 'Rəng', value: 'Qara' },
      ],
    });
    expect(result.seoTitle).toContain('Apple');
    expect(result.seoTitle).toContain('iPhone 15');
    expect(result.seoTitle).toContain('128GB');
    expect(result.description.toLowerCase()).toContain('daimi yaddaş');
    expect(result.description.length).toBeGreaterThan(200);
  });
});
