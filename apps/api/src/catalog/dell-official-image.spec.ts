import {
  buildDellGalleryAssetPaths,
  buildDellModelGalleryGuesses,
  extractDellModelToken,
  isDellScene7Url,
  isDellSnpUrl,
  scene7CardImageUrl,
  snpPartImageUrl,
} from './dell-official-image';

describe('dell-official-image', () => {
  it('classifies Scene7 vs SNP urls', () => {
    expect(
      isDellScene7Url(
        'https://i.dell.com/is/image/DellContent/content/dam/ss2/x.psd?fmt=jpg',
      ),
    ).toBe(true);
    expect(
      isDellSnpUrl(
        'https://snpi.dell.com/snp/images/products/large/en-us~460-BFCQ/460-BFCQ.jpg',
      ),
    ).toBe(true);
    expect(
      isDellScene7Url(
        'https://snpi.dell.com/snp/images/products/large/en-us~460-BFCQ/460-BFCQ.jpg',
      ),
    ).toBe(false);
  });

  it('prefers media-gallery packshots derived from relsize spi paths', () => {
    const paths = buildDellGalleryAssetPaths(
      'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/dell-pro-max/mc14250/spi/notebook-pro-max-14-mc14250-t-black-relsize-500-ng.psd?fmt=jpg&wid=500&hei=204',
    );
    expect(paths).toContain(
      'content/dam/ss2/product-images/dell-client-products/notebooks/dell-pro-max/mc14250/media-gallery/non-fpr/notebook-pro-max-14-mc14250t-black-gallery-1.psd',
    );
    expect(paths[0]).toContain('/media-gallery/');
  });

  it('keeps existing gallery assets and normalizes to gallery-1', () => {
    const paths = buildDellGalleryAssetPaths(
      'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/dell-pro/pv15250/media-gallery/notebook-pv15250-nt-laptop-bk-plastic-gallery-3.png?fmt=jpg&wid=800',
    );
    expect(paths).toContain(
      'content/dam/ss2/product-images/dell-client-products/notebooks/dell-pro/pv15250/media-gallery/notebook-pv15250-nt-laptop-bk-plastic-gallery-3.png',
    );
    expect(paths).toContain(
      'content/dam/ss2/product-images/dell-client-products/notebooks/dell-pro/pv15250/media-gallery/notebook-pv15250-nt-laptop-bk-plastic-gallery-1.png',
    );
  });

  it('builds SNP and Scene7 card urls', () => {
    expect(snpPartImageUrl('460-bfcq')).toBe(
      'https://snpi.dell.com/snp/images/products/large/en-us~460-BFCQ/460-BFCQ.jpg',
    );
    expect(
      scene7CardImageUrl(
        'content/dam/ss2/product-images/x/media-gallery/a-gallery-1.psd',
      ),
    ).toContain('fmt=png-alpha');
  });

  it('extracts model tokens for official lookups', () => {
    expect(extractDellModelToken('Dell Pro Max 14 MC14250')).toBe('MC14250');
    expect(extractDellModelToken('Alienware AW2525HM')).toBe('AW2525HM');
    expect(extractDellModelToken('Dell P2425E')).toBe('P2425E');
    expect(buildDellModelGalleryGuesses('Alienware AW2725QF').length).toBeGreaterThan(
      0,
    );
  });
});
