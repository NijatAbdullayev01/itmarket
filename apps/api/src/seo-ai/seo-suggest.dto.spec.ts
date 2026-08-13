import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { SeoSuggestDto } from './seo-suggest.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

async function transformBody(payload: unknown): Promise<SeoSuggestDto> {
  const dto: unknown = await pipe.transform(payload, {
    type: 'body',
    metatype: SeoSuggestDto,
  });
  return dto as SeoSuggestDto;
}

describe('SeoSuggestDto', () => {
  it('accepts product specs with label/value (AI SEO yaz)', async () => {
    const dto = await transformBody({
      entityType: 'product',
      name: 'APC Easy UPS BV 650VA',
      brandName: 'APC',
      categoryName: 'UPS',
      parentCategoryName: 'Enerji',
      description: null,
      specs: [
        { label: 'Güc', value: '650VA' },
        { label: 'Çıxış', value: '4 rozetka' },
      ],
    });

    expect(dto.name).toBe('APC Easy UPS BV 650VA');
    expect(dto.specs).toEqual([
      { label: 'Güc', value: '650VA' },
      { label: 'Çıxış', value: '4 rozetka' },
    ]);
  });

  it('keeps name when many UPS-style specs are present', async () => {
    const specs = Array.from({ length: 18 }, (_, index) => ({
      label: `Xüsusiyyət ${index + 1}`,
      value: `Dəyər ${index + 1}`,
    }));
    const dto = await transformBody({
      entityType: 'product',
      name: 'APC BX650LI',
      brandName: 'APC',
      specs,
    });

    expect(dto.name).toBe('APC BX650LI');
    expect(dto.specs).toHaveLength(18);
  });

  it('does not reject label as a non-whitelisted nested property', async () => {
    await expect(
      transformBody({
        entityType: 'product',
        name: 'APC BX650LI',
        brandName: 'APC',
        specs: [{ label: 'Güc', value: '650VA' }],
      }),
    ).resolves.toMatchObject({
      name: 'APC BX650LI',
      specs: [{ label: 'Güc', value: '650VA' }],
    });
  });

  it('drops extra spec keys and empty rows', async () => {
    const dto = await transformBody({
      entityType: 'product',
      name: 'APC BX650LI',
      specs: [
        { label: '', value: 'skip' },
        {
          label: 'Güc',
          value: '650VA',
          id: 'row-1',
          name: 'should-drop',
        },
      ],
    });

    expect(dto.name).toBe('APC BX650LI');
    expect(dto.specs).toEqual([{ label: 'Güc', value: '650VA' }]);
    expect(JSON.stringify(dto.specs)).not.toContain('should-drop');
  });

  it('still rejects unknown top-level fields', async () => {
    await expect(
      transformBody({
        entityType: 'product',
        name: 'APC BX650LI',
        customerEmail: 'leak@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts Excel-imported APC product with full description and specs', async () => {
    const dto = await transformBody({
      entityType: 'product',
      name: 'APC Back-UPS 650VA (BE650G2-GR) 650 VA / 400 W Standby UPS',
      brandName: 'APC',
      categoryName: 'Line-Interactive',
      parentCategoryName: 'UPS',
      description:
        'APC Back-UPS 650VA (BE650G2-GR) kompüter, modem və USB cihazlarını qəfil elektrik kəsilməsindən qoruyan fasiləsiz qida mənbəyidir.\n\nGüc: 650VA\nTopologiya: Standby\nÇıxış: 8 Schuko\nBatareya: APCRBC110',
      specs: [
        { label: 'Güc', value: '650VA / 400W' },
        { label: 'Topologiya', value: 'Standby' },
        { label: 'Giriş gərginliyi', value: '230V' },
        { label: 'Çıxış rozetkaları', value: '8 Schuko (6 ehtiyat + 2 surge)' },
        { label: 'USB', value: 'Type-A 2.4A' },
        { label: 'Batareya', value: 'APCRBC110' },
        { label: 'Zəmanət', value: '3 il' },
        { label: 'Ağırlıq', value: '7.5 kq' },
        { label: 'Ölçülər', value: '325 x 100 x 365 mm' },
      ],
    });

    expect(dto.name).toBe(
      'APC Back-UPS 650VA (BE650G2-GR) 650 VA / 400 W Standby UPS',
    );
    expect(dto.entityType).toBe('product');
    expect(dto.brandName).toBe('APC');
    expect(dto.specs).toHaveLength(9);
  });

  it('accepts product with empty description (Excel import with no description)', async () => {
    const dto = await transformBody({
      entityType: 'product',
      name: 'APC AP9641',
      brandName: 'APC',
      description: '',
    });

    expect(dto.name).toBe('APC AP9641');
    expect(dto.description).toBeUndefined();
  });

  it('accepts product with null optional fields', async () => {
    const dto = await transformBody({
      entityType: 'product',
      name: 'APC SRV2KI',
      brandName: null,
      categoryName: null,
      parentCategoryName: null,
      description: null,
    });

    expect(dto.name).toBe('APC SRV2KI');
    expect(dto.brandName).toBeUndefined();
    expect(dto.categoryName).toBeUndefined();
    expect(dto.description).toBeUndefined();
  });
});
