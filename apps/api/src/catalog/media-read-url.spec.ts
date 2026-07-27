import {
  withMediaReadUrl,
  withMediaReadUrlList,
} from './media-read-url';
import type { ProductMediaStorage } from './media-storage.port';

describe('media read URL helpers', () => {
  const storage: ProductMediaStorage = {
    createUploadIntent: jest.fn(),
    putObject: jest.fn(),
    createReadUrl: jest.fn(async (objectKey: string) => `https://cdn.test/${objectKey}`),
    deleteObject: jest.fn(),
  };

  it('attaches a resolved url for a single media row', async () => {
    await expect(
      withMediaReadUrl(storage, {
        id: 'm1',
        objectKey: 'catalog/products/p1/a.jpg',
        altText: 'Alt',
        mimeType: 'image/jpeg',
        byteSize: 12,
        sortOrder: 2,
      }),
    ).resolves.toEqual({
      id: 'm1',
      objectKey: 'catalog/products/p1/a.jpg',
      url: 'https://cdn.test/catalog/products/p1/a.jpg',
      altText: 'Alt',
      mimeType: 'image/jpeg',
      byteSize: 12,
      sortOrder: 2,
    });
  });

  it('maps a media list', async () => {
    const rows = await withMediaReadUrlList(storage, [
      {
        id: 'm1',
        objectKey: 'a.jpg',
        altText: '',
        mimeType: 'image/jpeg',
        byteSize: 1,
        sortOrder: 0,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.url).toBe('https://cdn.test/a.jpg');
  });
});
