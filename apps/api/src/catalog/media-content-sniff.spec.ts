import {
  resolveProductMediaMime,
  sniffProductMediaMime,
} from './media-content-sniff';
import { fixtureJpeg, fixturePng, fixtureWebp } from './media-test-fixtures';

describe('media-content-sniff (D-013)', () => {
  it('sniffs jpeg/png/webp magic bytes', () => {
    expect(sniffProductMediaMime(fixtureJpeg())).toBe('image/jpeg');
    expect(sniffProductMediaMime(fixturePng())).toBe('image/png');
    expect(sniffProductMediaMime(fixtureWebp())).toBe('image/webp');
  });

  it('rejects SVG/HTML prefixes even when truncated', () => {
    expect(() =>
      resolveProductMediaMime({
        body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'),
        declaredMimeType: 'image/png',
      }),
    ).toThrow(/markup|script|Unsupported/i);
  });

  it('rejects MIME spoofing (declared jpeg, content png)', () => {
    expect(() =>
      resolveProductMediaMime({
        body: fixturePng(),
        declaredMimeType: 'image/jpeg',
      }),
    ).toThrow('Declared MIME does not match file content');
  });

  it('accepts matching declared MIME', () => {
    expect(
      resolveProductMediaMime({
        body: fixtureJpeg(),
        declaredMimeType: 'image/jpeg',
      }),
    ).toBe('image/jpeg');
  });

  it('ignores multer octet-stream default and sniffs bytes', () => {
    expect(
      resolveProductMediaMime({
        body: fixturePng(),
        declaredMimeType: 'application/octet-stream',
      }),
    ).toBe('image/png');
  });

  it('normalizes image/jpg alias to jpeg', () => {
    expect(
      resolveProductMediaMime({
        body: fixtureJpeg(),
        declaredMimeType: 'image/jpg',
      }),
    ).toBe('image/jpeg');
  });

  it('rejects PE executable bytes', () => {
    expect(sniffProductMediaMime(Buffer.from('MZ\x90\x00executable'))).toBe(
      null,
    );
  });
});
