import { BadRequestException } from '@nestjs/common';

import {
  assertSeoLlmPayloadKeys,
  buildSeoLlmSafePayload,
  SEO_LLM_ALLOWED_PAYLOAD_KEYS,
  SEO_SUGGEST_SPECS_MAX,
} from './seo-ai-boundary';

describe('seo-ai-boundary', () => {
  const baseProduct = {
    entityType: 'product' as const,
    name: 'iPhone 15 128GB',
    brandName: 'Apple',
    categoryName: 'Smartfonlar',
    parentCategoryName: 'Telefonlar',
    specs: [
      { label: 'Yaddaş', value: '128GB' },
      { label: 'Rəng', value: 'Qara' },
    ],
    description: 'Apple iPhone 15 smartfon.',
  };

  it('builds allowlisted catalog-only payload', () => {
    const payload = buildSeoLlmSafePayload(baseProduct);
    expect(Object.keys(payload).sort()).toEqual(
      [...SEO_LLM_ALLOWED_PAYLOAD_KEYS].sort(),
    );
    expect(payload).toEqual({
      entityType: 'product',
      brand: 'Apple',
      model: 'iPhone 15 128GB',
      category: 'Smartfonlar',
      parentCategory: 'Telefonlar',
      specs: [
        { label: 'Yaddaş', value: '128GB' },
        { label: 'Rəng', value: 'Qara' },
      ],
      existingDescription: 'Apple iPhone 15 smartfon.',
    });
  });

  it('rejects email in description', () => {
    expect(() =>
      buildSeoLlmSafePayload({
        ...baseProduct,
        description: 'Əlaqə: customer@example.com',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects payment card digits', () => {
    expect(() =>
      buildSeoLlmSafePayload({
        ...baseProduct,
        description: 'Kart: 4111 1111 1111 1111',
      }),
    ).toThrow(BadRequestException);
  });

  it('allows IMEI and EAN-13 style numbers (not 16-digit cards)', () => {
    expect(() =>
      buildSeoLlmSafePayload({
        ...baseProduct,
        specs: [
          { label: 'IMEI', value: '490154203237518' },
          { label: 'Barkod', value: '8600123456789' },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects AZ phone numbers', () => {
    expect(() =>
      buildSeoLlmSafePayload({
        ...baseProduct,
        description: 'Zəng: +994 50 123 45 67',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      buildSeoLlmSafePayload({
        ...baseProduct,
        description: 'Zəng: 0501234567',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects sensitive spec labels (payment / PII)', () => {
    expect(() =>
      buildSeoLlmSafePayload({
        ...baseProduct,
        specs: [{ label: 'Kart', value: 'Visa' }],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      buildSeoLlmSafePayload({
        ...baseProduct,
        specs: [{ label: 'email', value: 'x@y.com' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects outbound keys outside the allowlist', () => {
    expect(() =>
      assertSeoLlmPayloadKeys({
        entityType: 'product',
        brand: null,
        model: 'x',
        category: null,
        parentCategory: null,
        specs: [],
        existingDescription: null,
        customerEmail: 'leak@example.com',
      }),
    ).toThrow(BadRequestException);
  });

  it('drops extra spec keys such as name before LLM egress', () => {
    const payload = buildSeoLlmSafePayload({
      ...baseProduct,
      specs: [
        {
          label: 'Güc',
          value: '650VA',
          name: 'should-not-egress',
        } as unknown as { label: string; value: string },
      ],
    });
    expect(payload.specs).toEqual([{ label: 'Güc', value: '650VA' }]);
    expect(JSON.stringify(payload)).not.toContain('should-not-egress');
  });

  it('keeps more than 12 product specs for SEO (UPS-style sheets)', () => {
    const specs = Array.from({ length: 18 }, (_, index) => ({
      label: `Xüsusiyyət ${index + 1}`,
      value: `Dəyər ${index + 1}`,
    }));
    const payload = buildSeoLlmSafePayload({
      ...baseProduct,
      specs,
    });
    expect(payload.specs).toHaveLength(18);
    expect(payload.specs[0]).toEqual({
      label: 'Xüsusiyyət 1',
      value: 'Dəyər 1',
    });
    expect(payload.specs[17]).toEqual({
      label: 'Xüsusiyyət 18',
      value: 'Dəyər 18',
    });
  });

  it('caps oversized spec lists instead of rejecting them', () => {
    const specs = Array.from({ length: 50 }, (_, index) => ({
      label: `Spec ${index + 1}`,
      value: `Val ${index + 1}`,
    }));
    const payload = buildSeoLlmSafePayload({
      ...baseProduct,
      specs,
    });
    expect(payload.specs).toHaveLength(SEO_SUGGEST_SPECS_MAX);
  });
});
