import { buildHeuristicSeoSuggestion } from './seo-heuristic';

/**
 * Smoke: bulk fill uses the same heuristic as suggest — empty CMS fields
 * get stable AZ titles/descriptions suitable for SERP.
 */
describe('catalog SEO fill heuristic', () => {
  it('fills product SEO fields', () => {
    const result = buildHeuristicSeoSuggestion({
      entityType: 'product',
      name: 'iPhone 16',
      brandName: 'Apple',
      categoryName: 'Smartfonlar',
    });
    expect(result.seoTitle.length).toBeGreaterThan(5);
    expect(result.seoDescription.length).toBeGreaterThan(20);
    expect(result.description.length).toBeGreaterThan(20);
    expect(result.source).toBe('heuristic');
  });

  it('fills brand and category SEO fields', () => {
    const brand = buildHeuristicSeoSuggestion({
      entityType: 'brand',
      name: 'Samsung',
    });
    const category = buildHeuristicSeoSuggestion({
      entityType: 'category',
      name: 'Noutbuklar',
    });
    expect(brand.seoTitle).toContain('Samsung');
    expect(category.seoTitle).toContain('Noutbuklar');
  });
});
