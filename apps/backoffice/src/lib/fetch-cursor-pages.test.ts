import { describe, expect, it, vi } from "vitest";
import {
  FETCH_CURSOR_PAGES_MAX,
  FETCH_OFFSET_PAGE_SIZE,
  fetchAllCursorPages,
  fetchAllOffsetPages,
  withCursorQuery,
} from "./fetch-cursor-pages";

describe("withCursorQuery", () => {
  it("leaves the path unchanged without a cursor", () => {
    expect(withCursorQuery("/catalog/products?limit=100")).toBe(
      "/catalog/products?limit=100",
    );
  });

  it("appends an encoded cursor to an existing query string", () => {
    expect(withCursorQuery("/catalog/products?limit=100", "a b")).toBe(
      "/catalog/products?limit=100&cursor=a%20b",
    );
  });
});

describe("fetchAllCursorPages", () => {
  it("returns a single page when nextCursor is missing", async () => {
    const fetchPage = vi.fn(async () => ({
      items: [{ id: "1" }, { id: "2" }],
    }));

    await expect(fetchAllCursorPages(fetchPage)).resolves.toEqual({
      items: [{ id: "1" }, { id: "2" }],
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(undefined);
  });

  it("walks every cursor page and concatenates items", async () => {
    const fetchPage = vi.fn(async (cursor: string | undefined) => {
      if (cursor === undefined) {
        return { items: [{ id: "a" }, { id: "b" }], nextCursor: "b" };
      }
      if (cursor === "b") {
        return { items: [{ id: "c" }], nextCursor: "c" };
      }
      return { items: [{ id: "d" }], nextCursor: null };
    });

    await expect(fetchAllCursorPages(fetchPage)).resolves.toEqual({
      items: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    });
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "b");
    expect(fetchPage).toHaveBeenNthCalledWith(3, "c");
  });

  it("skips duplicate ids if a page overlaps the previous cursor", async () => {
    const fetchPage = vi.fn(async (cursor: string | undefined) => {
      if (cursor === undefined) {
        return { items: [{ id: "a" }, { id: "b" }], nextCursor: "b" };
      }
      return { items: [{ id: "b" }, { id: "c" }], nextCursor: null };
    });

    await expect(fetchAllCursorPages(fetchPage)).resolves.toEqual({
      items: [{ id: "a" }, { id: "b" }, { id: "c" }],
    });
  });

  it("stops at maxPages to avoid an infinite cursor loop", async () => {
    const fetchPage = vi.fn(async (cursor: string | undefined) => ({
      items: [{ id: cursor ?? "start" }],
      nextCursor: `${cursor ?? "start"}-next`,
    }));

    const result = await fetchAllCursorPages(fetchPage, { maxPages: 3 });
    expect(result.items).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("uses a finite default page cap", () => {
    expect(FETCH_CURSOR_PAGES_MAX).toBe(200);
  });

  it("dedupes with a custom itemKey for rows without id", async () => {
    const fetchPage = vi.fn(async (cursor: string | undefined) => {
      if (cursor === undefined) {
        return {
          items: [{ identityKey: "e:a" }, { identityKey: "e:b" }],
          nextCursor: "e:b",
        };
      }
      return {
        items: [{ identityKey: "e:b" }, { identityKey: "e:c" }],
        nextCursor: null,
      };
    });

    await expect(
      fetchAllCursorPages(fetchPage, {
        itemKey: (row) => row.identityKey,
      }),
    ).resolves.toEqual({
      items: [
        { identityKey: "e:a" },
        { identityKey: "e:b" },
        { identityKey: "e:c" },
      ],
    });
  });
});

describe("fetchAllOffsetPages", () => {
  it("uses a 100-row page size by default", () => {
    expect(FETCH_OFFSET_PAGE_SIZE).toBe(100);
  });

  it("returns one page when total fits in the first response", async () => {
    const fetchPage = vi.fn(async (offset: number, limit: number) => {
      expect(offset).toBe(0);
      expect(limit).toBe(100);
      return { items: [{ id: "1" }, { id: "2" }], total: 2 };
    });

    await expect(fetchAllOffsetPages(fetchPage)).resolves.toEqual({
      items: [{ id: "1" }, { id: "2" }],
      total: 2,
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("walks offset pages until items cover total", async () => {
    const fetchPage = vi.fn(async (offset: number, limit: number) => {
      if (offset === 0) {
        return {
          items: Array.from({ length: limit }, (_, index) => ({
            id: `p${index}`,
          })),
          total: 150,
        };
      }
      return {
        items: Array.from({ length: 50 }, (_, index) => ({
          id: `p${limit + index}`,
        })),
        total: 150,
      };
    });

    const result = await fetchAllOffsetPages(fetchPage, { pageSize: 100 });
    expect(result.total).toBe(150);
    expect(result.items).toHaveLength(150);
    expect(result.items[0]).toEqual({ id: "p0" });
    expect(result.items[149]).toEqual({ id: "p149" });
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 100, 100);
  });
});
