/**
 * Category slug → related buying-guide slugs (AZ-primary, locale-independent).
 * Used on category landings and product pages for internal links.
 */
export const BLOG_GUIDES_BY_CATEGORY_SLUG: Record<string, readonly string[]> = {
  smartfonlar: [
    "smartfon-secimi-2026",
    "aksesuarlar-vacib-olanlar",
    "batareya-omru-uzatmaq",
  ],
  apple: ["smartfon-secimi-2026", "aksesuarlar-vacib-olanlar"],
  "sarj-cihazi": ["aksesuarlar-vacib-olanlar", "batareya-omru-uzatmaq"],
  "usb-kabel": ["aksesuarlar-vacib-olanlar", "batareya-omru-uzatmaq"],
  powerbank: ["aksesuarlar-vacib-olanlar", "batareya-omru-uzatmaq"],
  "simsiz-sarj": ["aksesuarlar-vacib-olanlar", "batareya-omru-uzatmaq"],
  noutbuklar: [
    "noutbuk-is-tehsil-secimi",
    "oyun-pc-yoxsa-noutbuk",
    "ssd-ram-yukseltme",
    "mini-pc-secimi",
    "batareya-omru-uzatmaq",
  ],
  noutbuk: [
    "noutbuk-is-tehsil-secimi",
    "oyun-pc-yoxsa-noutbuk",
    "ssd-ram-yukseltme",
    "mini-pc-secimi",
    "batareya-omru-uzatmaq",
  ],
  "2-in-1-noutbuk": ["noutbuk-is-tehsil-secimi", "oyun-pc-yoxsa-noutbuk"],
  "mobil-workstation": ["noutbuk-is-tehsil-secimi"],
  "noutbuk-cantasi": ["aksesuarlar-vacib-olanlar", "noutbuk-is-tehsil-secimi"],
  monitorlar: ["monitor-secimi-is-oyun", "oyun-pc-yoxsa-noutbuk"],
  monitor: ["monitor-secimi-is-oyun", "oyun-pc-yoxsa-noutbuk"],
  "gaming-monitor": ["monitor-secimi-is-oyun", "oyun-pc-yoxsa-noutbuk"],
  "ultra-genis-monitor": ["monitor-secimi-is-oyun"],
  "monitor-stendi": ["monitor-secimi-is-oyun"],
  "gamer-zona": [
    "oyun-pc-yoxsa-noutbuk",
    "monitor-secimi-is-oyun",
    "ssd-ram-yukseltme",
  ],
  "gaming-klaviatura": ["oyun-pc-yoxsa-noutbuk"],
  "gaming-sican": ["oyun-pc-yoxsa-noutbuk"],
  "gaming-qulaqliq": ["oyun-pc-yoxsa-noutbuk"],
  "gaming-ram": ["ssd-ram-yukseltme", "oyun-pc-yoxsa-noutbuk"],
  "gaming-ssd": ["ssd-ram-yukseltme", "oyun-pc-yoxsa-noutbuk"],
  computer: ["ssd-ram-yukseltme", "mini-pc-secimi", "noutbuk-is-tehsil-secimi"],
  masaustu: ["oyun-pc-yoxsa-noutbuk", "mini-pc-secimi", "ssd-ram-yukseltme"],
  ram: ["ssd-ram-yukseltme"],
  "ddr4-ram": ["ssd-ram-yukseltme"],
  "ddr5-ram": ["ssd-ram-yukseltme"],
  ssd: ["ssd-ram-yukseltme"],
  "m2-nvme-ssd": ["ssd-ram-yukseltme"],
  "xarici-ssd": ["ssd-ram-yukseltme", "aksesuarlar-vacib-olanlar"],
  "xarici-hdd": ["ssd-ram-yukseltme"],
  "mini-pc": ["mini-pc-secimi", "monitor-secimi-is-oyun", "ssd-ram-yukseltme"],
  printerler: ["printer-secimi-ofis-ev"],
  "inkjet-mfp": ["printer-secimi-ofis-ev"],
  "lazer-printer": ["printer-secimi-ofis-ev"],
  "lazer-mfp": ["printer-secimi-ofis-ev"],
  "rengli-lazer-printer": ["printer-secimi-ofis-ev"],
  "rengli-lazer-mfp": ["printer-secimi-ofis-ev"],
  skaner: ["printer-secimi-ofis-ev"],
  kartric: ["printer-secimi-ofis-ev"],
  "sebeke-avadanliqlari": ["wifi-router-secimi"],
  router: ["wifi-router-secimi"],
  "access-point": ["wifi-router-secimi"],
  kommutator: ["wifi-router-secimi"],
  "sebeke-adapteri": ["wifi-router-secimi"],
  ups: ["ssd-ram-yukseltme", "mini-pc-secimi"],
  "portativ-enerji": ["aksesuarlar-vacib-olanlar", "batareya-omru-uzatmaq"],
  "portativ-enerji-stansiyasi": [
    "aksesuarlar-vacib-olanlar",
    "batareya-omru-uzatmaq",
  ],
  "usb-hub": ["aksesuarlar-vacib-olanlar", "mini-pc-secimi"],
  sican: ["mini-pc-secimi"],
};

export function relatedBlogSlugsForCategory(
  ...categorySlugs: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const raw of categorySlugs) {
    const slug = raw?.trim();
    if (!slug) continue;
    for (const postSlug of BLOG_GUIDES_BY_CATEGORY_SLUG[slug] ?? []) {
      if (seen.has(postSlug)) continue;
      seen.add(postSlug);
      ordered.push(postSlug);
    }
  }
  return ordered;
}
