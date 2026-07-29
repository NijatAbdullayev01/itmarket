import {
  extractLlmMessageContent,
  parseLlmJson,
  seoLlmFailureWarning,
} from './seo-llm.client';

describe('seo-llm.client helpers', () => {
  it('extracts string content', () => {
    expect(extractLlmMessageContent('  {"a":1}  ')).toBe('{"a":1}');
  });

  it('extracts Gemini content-part arrays', () => {
    expect(
      extractLlmMessageContent([
        { type: 'text', text: '{"seoTitle":"A"}' },
        { text: ',"seoDescription":"B"}' },
      ]),
    ).toContain('seoTitle');
  });

  it('returns null for empty content shapes', () => {
    expect(extractLlmMessageContent(null)).toBeNull();
    expect(extractLlmMessageContent('')).toBeNull();
    expect(extractLlmMessageContent([])).toBeNull();
    expect(extractLlmMessageContent([{ type: 'text' }])).toBeNull();
  });

  it('parses fenced SEO JSON', () => {
    const parsed = parseLlmJson(
      'Here you go:\n```json\n{"seoTitle":"Apple iPhone","seoDescription":"Meta təsvir mətni burada.","description":"Səhifə mətni burada kifayət qədər uzundur."}\n```',
    );
    expect(parsed?.seoTitle).toContain('Apple');
    expect(parsed?.seoDescription.length).toBeGreaterThan(0);
    expect(parsed?.description.length).toBeGreaterThan(0);
  });

  it('maps failure reasons to staff warnings', () => {
    expect(seoLlmFailureWarning({ reason: 'timeout' })).toContain('vaxt limiti');
    expect(
      seoLlmFailureWarning({ reason: 'http_error', httpStatus: 404 }),
    ).toContain('404');
    expect(seoLlmFailureWarning({ reason: 'parse_error' })).toContain('oxunmadı');
  });
});
