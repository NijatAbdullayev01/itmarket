/** Next 16 `generateSitemaps` passes `id` as a string (`"0"`); coerce for `=== 0`. */
export function resolveSitemapId(raw: number | string): number {
  const id = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(id) ? id : Number.NaN;
}
