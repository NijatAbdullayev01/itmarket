export const FETCH_CURSOR_PAGES_MAX = 200;
export const FETCH_OFFSET_PAGE_SIZE = 100;

export type CursorPage<T> = {
  items: T[];
  nextCursor?: string | null;
};

export type OffsetPage<T> = {
  items: T[];
  total: number;
};

export function withCursorQuery(path: string, cursor?: string): string {
  if (cursor === undefined || cursor.length === 0) {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cursor=${encodeURIComponent(cursor)}`;
}

function defaultItemKey<T>(item: T): string {
  if (item !== null && typeof item === "object" && "id" in item) {
    const id = (item as { id: unknown }).id;
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
  }
  throw new Error("fetchAllCursorPages: pass itemKey for items without id");
}

/**
 * Follows `nextCursor` until the API reports the last page.
 * Staff list endpoints cap each response at 100 rows.
 */
export async function fetchAllCursorPages<T>(
  fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>,
  options?: { maxPages?: number; itemKey?: (item: T) => string },
): Promise<{ items: T[] }> {
  const maxPages = Math.max(1, options?.maxPages ?? FETCH_CURSOR_PAGES_MAX);
  const itemKey = options?.itemKey ?? defaultItemKey<T>;
  const items: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage(cursor);
    for (const item of result.items) {
      const key = itemKey(item);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push(item);
    }

    const nextCursor = result.nextCursor ?? null;
    if (
      nextCursor === null ||
      nextCursor.length === 0 ||
      result.items.length === 0 ||
      nextCursor === cursor
    ) {
      break;
    }
    cursor = nextCursor;
  }

  return { items };
}

/**
 * Walks offset/limit pages until `items.length` covers `total`.
 * POS product search caps each response at 100 rows.
 */
export async function fetchAllOffsetPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<OffsetPage<T>>,
  options?: {
    pageSize?: number;
    maxPages?: number;
    itemKey?: (item: T) => string;
  },
): Promise<{ items: T[]; total: number }> {
  const pageSize = Math.max(1, options?.pageSize ?? FETCH_OFFSET_PAGE_SIZE);
  const maxPages = Math.max(1, options?.maxPages ?? FETCH_CURSOR_PAGES_MAX);
  const itemKey = options?.itemKey ?? defaultItemKey<T>;
  const items: T[] = [];
  const seen = new Set<string>();
  let total = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const result = await fetchPage(offset, pageSize);
    total = Math.max(0, result.total);
    for (const item of result.items) {
      const key = itemKey(item);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push(item);
    }

    if (
      result.items.length === 0 ||
      result.items.length < pageSize ||
      total === 0 ||
      items.length >= total
    ) {
      break;
    }
  }

  return { items, total };
}
