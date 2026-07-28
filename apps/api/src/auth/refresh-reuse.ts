/**
 * Refresh-token reuse detection helpers.
 * A previously rotated refresh presented again means the token family may be compromised.
 */

export type RotatableSession = {
  id: string;
  revokedAt: Date | null;
  rotatedToId: string | null;
};

export function isRotatedRefreshReuse(session: RotatableSession): boolean {
  return session.revokedAt !== null && session.rotatedToId !== null;
}

/**
 * Walks the forward rotation chain starting at `rotatedToId` (the session that
 * replaced the reused token). Returns ids in order; stops on cycles/missing rows.
 */
export function collectForwardRotationChainIds(
  rotatedToId: string | null,
  lookup: (id: string) => { id: string; rotatedToId: string | null } | null,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  let nextId = rotatedToId;
  while (nextId !== null && !seen.has(nextId)) {
    seen.add(nextId);
    ids.push(nextId);
    const session = lookup(nextId);
    if (session === null) {
      break;
    }
    nextId = session.rotatedToId;
  }
  return ids;
}
