import {
  buildS3ObjectKey,
  S3ProductMediaStorage,
} from './s3-media-storage';

describe('S3ProductMediaStorage keys', () => {
  it('builds opaque catalog object keys (not public URLs)', () => {
    const key = buildS3ObjectKey(
      '11111111-1111-1111-1111-111111111111',
      'image/jpeg',
    );
    expect(key).toMatch(
      /^catalog\/products\/11111111-1111-1111-1111-111111111111\/[a-f0-9-]+\.jpg$/,
    );
    expect(key.startsWith('http://')).toBe(false);
    expect(key.startsWith('https://')).toBe(false);
  });

  it('normalizes legacy URL-like object keys back to storage keys', () => {
    const storage = Object.create(S3ProductMediaStorage.prototype) as {
      endpoint: string;
      bucket: string;
      forcePathStyle: boolean;
      toStorageKey: (objectKey: string) => string;
    };
    storage.endpoint = 'http://localhost:9000';
    storage.bucket = 'itmarket-local';
    storage.forcePathStyle = true;
    storage.toStorageKey = S3ProductMediaStorage.prototype.toStorageKey;

    expect(
      storage.toStorageKey(
        'http://localhost:9000/itmarket-local/catalog/products/p1/a.jpg',
      ),
    ).toBe('catalog/products/p1/a.jpg');
    expect(storage.toStorageKey('catalog/products/p1/a.jpg')).toBe(
      'catalog/products/p1/a.jpg',
    );
  });
});
