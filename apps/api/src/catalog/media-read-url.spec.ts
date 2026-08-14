import {
  resetMediaReadUrlCache,
  withMediaReadUrl,
  withMediaReadUrlList,
} from './media-read-url';
import type { ProductMediaStorage } from './media-storage.port';

describe('media read URL helpers', () => {
  const createReadUrl = jest.fn((objectKey: string) =>
    Promise.resolve(`https://cdn.test/${objectKey}`),
  );
  const storage: ProductMediaStorage = {
    createUploadIntent: jest.fn(),
    putObject: jest.fn(),
    createReadUrl,
    deleteObject: jest.fn(),
  };

  beforeEach(() => {
    resetMediaReadUrlCache();
    createReadUrl.mockClear();
  });

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

  it('uses public object keys as read URLs without calling storage', async () => {
    await expect(
      withMediaReadUrl(storage, {
        id: 'm2',
        objectKey: '/images/catalog/local.jpg',
        altText: '',
        mimeType: 'image/jpeg',
        byteSize: 4,
        sortOrder: 0,
      }),
    ).resolves.toMatchObject({
      url: '/images/catalog/local.jpg',
    });
    expect(createReadUrl).not.toHaveBeenCalled();
  });

  it('reuses in-flight and cached signed URLs for the same object key', async () => {
    let release: ((url: string) => void) | undefined;
    createReadUrl.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );

    const first = withMediaReadUrl(storage, {
      id: 'a',
      objectKey: 'catalog/shared.jpg',
      altText: '',
      mimeType: 'image/jpeg',
      byteSize: 1,
      sortOrder: 0,
    });
    const second = withMediaReadUrl(storage, {
      id: 'b',
      objectKey: 'catalog/shared.jpg',
      altText: '',
      mimeType: 'image/jpeg',
      byteSize: 1,
      sortOrder: 1,
    });

    release?.('https://cdn.test/catalog/shared.jpg');
    const [left, right] = await Promise.all([first, second]);
    expect(left?.url).toBe('https://cdn.test/catalog/shared.jpg');
    expect(right?.url).toBe('https://cdn.test/catalog/shared.jpg');
    expect(createReadUrl).toHaveBeenCalledTimes(1);

    await withMediaReadUrl(storage, {
      id: 'c',
      objectKey: 'catalog/shared.jpg',
      altText: '',
      mimeType: 'image/jpeg',
      byteSize: 1,
      sortOrder: 2,
    });
    expect(createReadUrl).toHaveBeenCalledTimes(1);
  });
});
