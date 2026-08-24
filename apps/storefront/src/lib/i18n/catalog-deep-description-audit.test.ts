import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import { en } from "./messages/en";
import { ru } from "./messages/ru";
import { localizeProductDescription } from "./localize-product-description";

const WORKSPACE = path.resolve(__dirname, "../../../../..");

const AZ_CHAR = /[əıİŞşĞğÇçöüÖÜ]/;

/**
 * Genuinely-Azerbaijani signal words. English loanwords that are also valid
 * English ("server", "adapter", "port", "monitor", "video", "printer", ...)
 * are intentionally excluded so correctly translated EN/RU copy is not
 * reported as untranslated. Words without AZ-specific characters are kept
 * so leftovers like "bu", "kimi", "olan" are still caught.
 */
const AZ_WORD =
  /\b(və|və ya|üçün|ilə|də|da|kimi|qədər|üzrə|haqqında|bu|o|bir|həm|lakin|ancaq|yalnız|hər|belə|elə|olan|olaraq|edir|edən|olur|olub|vasitəsilə|üçündür|müxtəlif|daxil|daxildir|əlavə|ümumi|tam|təxminən|bəzi|digər|başqa|sonra|əvvəl|arasında|üzərində|bütün|eyni|mümkün|istifadə|təmin|sahib|malik|edilir|olunur|təqdim|təklif|verir|alınır|satılır|qiymət|stok|sifariş|çatdırılma|zəmanət|təhvil|mağaza|sayt|səhifə|vitrin|kataloq|kateqoriya|məhsul|cihaz|avadanlıq|sistem|ağıllı|ev|ofis|oyun|iş|musiqi|şəkil|görüntü|görüntüsü|səs|kamera|mikrofon|dinamik|ekran|noutbuk|kompüter|masaüstü|skaner|çap|surət|kartric|vərəq|dəq|saat|il|ay|gün|həftə|ədəd|tutum|yaddaş|sürət|tezlik|güc|enerji|batareya|akkumulyator|şarj|kabel|konnektor|rozetka|fiş|düymə|klaviatura|siçan|qulaqlıq|kolonka|qoruma|təhlükəsizlik|şifrələmə|şəbəkə|simsiz|naqilli|simli|optik|lazer|kadr|düym|metr|kq|qram|vatt|amper|dərəcə|faiz|dəfə|qat|kanal|zolaq|sətir|funksiya|rejim|ölçü|ölçülər|çəki|hündürlük|uzunluq|dərinlik|qalınlıq|alüminium|dəri|parça|rezin|silikon|şüşə|rəng|rəngli|qara|ağ|boz|mavi|qırmızı|yaşıl|sarı|bənövşəyi|çəhrayı|narıncı|qəhvəyi|qızılı|gümüşü|titanyum|kosmik|monoxrom|tək|qoşa|iki|üç|dörd|beş|altı|yeddi|səkkiz|doqquz|orta|müasir|peşəkar|inkişaf|təkmil|möhkəm|davamlı|etibarlı|keyfiyyət|yüksək|aşağı|sürətli|yavaş|güclü|zəif|böyük|kiçik|geniş|dar|uzun|qısa|incə|qalın|yüngül|ağır|rahat|erqonomik|isti|soyuq|hava|baxış|bucaq|məsafə|versiya|nəsil|dil|ölkə|anbar|ehtiyat|hissə|komplekt|qutu|qablaşdırma|təlimat|zəmanətli|yeni|işlənmiş|saz|təmiz|qüsursuz|mükəmməl|əla|yaxşı|müştəri|dəstək|xidmət|texniki|bağlantı|quraşdırma|montaj|tənzimləmə|nəzarət|idarəetmə|əl ilə|pult|tətbiq|telefon|planşet|hərəkət|aşkarlama|tanıma|izləmə|qeydiyyat|səsyazma|səs-küy|sakit|səssiz|rejimi|yuxu|qənaət|fasiləsiz|çıxış|giriş|kanallar|hüceyrələr|dəst|üstəlik|əsasən|adətən|bəzən|həmişə|çox|az|daha|ən|tamamilə|müəyyən|fərqli|oxşar|hamısı|yaxud|amma|çünki|kim|harada|niyə|hansı)\b/i;

function hasAz(text: string): boolean {
  const stripped = text.replace(/TÜV/gi, "").replace(/IT Market/gi, "");
  return AZ_CHAR.test(stripped) || AZ_WORD.test(stripped);
}

function extractAzStrings(content: string): string[] {
  const results = new Set<string>();
  const patterns = [
    /`([^`]{12,600})`/g,
    /"([^"]{12,600})"/g,
    /'([^']{12,600})'/g,
  ];
  for (const re of patterns) {
    for (const match of content.matchAll(re)) {
      const s = match[1] ?? "";
      // Skip code/template literals — they are runtime builders, not prose.
      if (s.includes("${")) continue;
      if (looksLikeCode(s)) continue;
      if (AZ_CHAR.test(s) && !/^[a-zA-Z0-9 ._-]+$/.test(s)) {
        results.add(s.replace(/\\n/g, "\n"));
      }
    }
  }
  return [...results];
}

/** Detect non-prose strings (code fragments, comments, regexes). */
function looksLikeCode(s: string): boolean {
  if (s.includes("//") || s.includes("/*") || s.includes("*/")) return true;
  return /(^|\n)\s*(function|const|let|return|if|for|while|switch|case|type|interface)\b|=>|\.test\(|\.match\(|Record<|\$\{/.test(
    s,
  );
}

describe("deep description-template translation audit over catalog sources", () => {
  it("finds untranslated AZ prose in SEO builders", () => {
    const dirs = [path.join(WORKSPACE, "apps/api/src/catalog")];

    const texts = new Set<string>();
    const sources: string[] = [];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith("-product-seo.ts")) continue;
        const content = fs.readFileSync(path.join(dir, f), "utf8");
        if (!AZ_CHAR.test(content)) continue;
        sources.push(f);
        for (const s of extractAzStrings(content)) {
          texts.add(s);
        }
      }
    }

    const issues: Array<{ text: string; en: string; ru: string }> = [];
    for (const text of texts) {
      const enOut = localizeProductDescription(text, "en", en);
      const ruOut = localizeProductDescription(text, "ru", ru);
      if (hasAz(enOut) || hasAz(ruOut)) {
        issues.push({ text, en: enOut, ru: ruOut });
      }
    }

    const report = {
      sourceFiles: sources.length,
      templateCount: texts.size,
      issueCount: issues.length,
      issues: issues.slice(0, 200),
    };

    fs.writeFileSync(
      "/tmp/catalog-i18n-audit/deep-description-audit.json",
      JSON.stringify(report, null, 2),
    );

    console.log("template strings:", texts.size);
    console.log("issues:", issues.length);

    expect(issues.length, JSON.stringify(report.issues, null, 2)).toBe(0);
  }, 60_000);
});
