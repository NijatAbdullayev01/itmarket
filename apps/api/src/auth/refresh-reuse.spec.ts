import {
  collectForwardRotationChainIds,
  isRotatedRefreshReuse,
} from './refresh-reuse';

describe('refresh reuse helpers', () => {
  it('detects reuse only when revoked via rotation', () => {
    expect(
      isRotatedRefreshReuse({
        id: 'a',
        revokedAt: new Date(),
        rotatedToId: 'b',
      }),
    ).toBe(true);
    expect(
      isRotatedRefreshReuse({
        id: 'a',
        revokedAt: new Date(),
        rotatedToId: null,
      }),
    ).toBe(false);
    expect(
      isRotatedRefreshReuse({
        id: 'a',
        revokedAt: null,
        rotatedToId: null,
      }),
    ).toBe(false);
  });

  it('collects the forward rotation chain and stops on cycles', () => {
    const sessions = new Map([
      ['b', { id: 'b', rotatedToId: 'c' }],
      ['c', { id: 'c', rotatedToId: 'd' }],
      ['d', { id: 'd', rotatedToId: null }],
    ]);
    expect(
      collectForwardRotationChainIds('b', (id) => sessions.get(id) ?? null),
    ).toEqual(['b', 'c', 'd']);

    const cyclic = new Map([
      ['b', { id: 'b', rotatedToId: 'c' }],
      ['c', { id: 'c', rotatedToId: 'b' }],
    ]);
    expect(
      collectForwardRotationChainIds('b', (id) => cyclic.get(id) ?? null),
    ).toEqual(['b', 'c']);
  });
});
