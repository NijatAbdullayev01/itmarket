const HIGHLIGHT_IDS_STORAGE_KEY = "bo-new-order-highlight-ids";
const VIEWED_IDS_STORAGE_KEY = "bo-viewed-new-order-ids";

type IdStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let storageOverride: IdStorage | null = null;

export function setOrderHighlightStorageForTests(storage: IdStorage | null) {
  storageOverride = storage;
}

function getStorage(): IdStorage | null {
  if (storageOverride) {
    return storageOverride;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function readIdSet(storageKey: string): Set<string> {
  const storage = getStorage();
  if (!storage) {
    return new Set();
  }

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return new Set();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed.filter((entry): entry is string => typeof entry === "string"),
    );
  } catch {
    return new Set();
  }
}

function writeIdSet(storageKey: string, ids: ReadonlySet<string>) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(storageKey, JSON.stringify([...ids]));
}

export function loadNewOrderHighlightIds(): Set<string> {
  const viewed = readIdSet(VIEWED_IDS_STORAGE_KEY);
  const highlights = readIdSet(HIGHLIGHT_IDS_STORAGE_KEY);
  for (const viewedId of viewed) {
    highlights.delete(viewedId);
  }

  if (highlights.size !== readIdSet(HIGHLIGHT_IDS_STORAGE_KEY).size) {
    writeIdSet(HIGHLIGHT_IDS_STORAGE_KEY, highlights);
  }

  return highlights;
}

export function saveNewOrderHighlightIds(ids: ReadonlySet<string>) {
  writeIdSet(HIGHLIGHT_IDS_STORAGE_KEY, ids);
}

export function loadViewedNewOrderIds(): Set<string> {
  return readIdSet(VIEWED_IDS_STORAGE_KEY);
}

export function markNewOrderViewedInStorage(id: string) {
  const viewed = readIdSet(VIEWED_IDS_STORAGE_KEY);
  viewed.add(id);
  writeIdSet(VIEWED_IDS_STORAGE_KEY, viewed);

  const highlights = readIdSet(HIGHLIGHT_IDS_STORAGE_KEY);
  if (highlights.delete(id)) {
    writeIdSet(HIGHLIGHT_IDS_STORAGE_KEY, highlights);
  }
}

export function mergeNewOrderHighlightIds(
  current: ReadonlySet<string>,
  ids: readonly string[],
): Set<string> {
  const viewed = loadViewedNewOrderIds();
  const next = new Set(current);

  for (const id of ids) {
    if (!viewed.has(id)) {
      next.add(id);
    }
  }

  saveNewOrderHighlightIds(next);
  return next;
}
