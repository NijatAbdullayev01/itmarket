import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import {
  localizeProductAttributeLabel,
  localizeProductAttributeValue,
} from "./localize-product-attribute";
import { localizeProductDescription } from "./localize-product-description";
import { az } from "./messages/az";
import { en } from "./messages/en";
import { ru } from "./messages/ru";

const DB_URL =
  "postgresql://itmarket_local:local_itmarket_postgres_only@localhost:5433/itmarket_local";
const OUT_DIR = "/tmp/catalog-i18n-audit";

const AZ_CHAR = /[əöğşüçıƏÖĞŞÜÇİ]/;
const AZ_WORD =
  /\b(qara|boz|oyun|ofis|və|üçün|ilə|yoxdur|bəli|xeyr|ədəd|nüvə|simli|qədər|təxminən|qutusuz|tənzimlənən|hüceyrə|sətir|məhsul|yaddaş|qüc|güc|tutumu|eyni|tavan|montaj|rezin|qapaq|qoruyucu|milyon|linza|yuxu|qoşa|profil|ayaq|sönük|işıqsız|əyləcli|seçilir|emosiyalar|gümüş|müştəri|sığır|hamısı|dayandırılıb|olunmur|mötərizə|künc|qalın|işləmə|avadanlığı|məsafə|cərəyan|ləğvi|məlumat|musiqiyə|ölçülü|birgə|dəri|daşımaq|artırır|parkı|doldurulan|qələmlər|taçpad|jestləri)\b/iu;

function hasAz(text: string): boolean {
  const stripped = text.replace(/TÜV/gi, "");
  return AZ_CHAR.test(stripped) || AZ_WORD.test(stripped);
}

function extractAzTokens(text: string): string[] {
  const tokens = new Set<string>();
  const words = text.match(/[\p{L}\p{N}+./%-]+/gu) ?? [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i] ?? "";
    if (AZ_CHAR.test(w) || AZ_WORD.test(w)) {
      tokens.add(w);
      if (i > 0) {
        tokens.add(`${words[i - 1]} ${w}`);
      }
      if (i + 1 < words.length) {
        tokens.add(`${w} ${words[i + 1]}`);
      }
      if (i > 0 && i + 1 < words.length) {
        tokens.add(`${words[i - 1]} ${w} ${words[i + 1]}`);
      }
    }
  }
  return [...tokens];
}

function psqlJson(sql: string): unknown {
  const compact = sql.replace(/\s+/g, " ").trim();
  const raw = execSync(`psql "${DB_URL}" -t -A -c ${JSON.stringify(compact)}`, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
  if (raw === "" || raw === "null") {
    return null;
  }
  return JSON.parse(raw);
}

describe("live catalog i18n audit", () => {
  it.skipIf(process.env.CATALOG_LIVE_AUDIT !== "1")(
    "finds remaining AZ spec labels, values, and descriptions",
    () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const labels = fs
      .readFileSync(path.join(OUT_DIR, "labels.txt"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const azValueLines = fs
      .readFileSync(path.join(OUT_DIR, "az_values.tsv"), "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const tab = line.indexOf("\t");
        if (tab < 0) {
          return { label: "", value: line };
        }
        return { label: line.slice(0, tab), value: line.slice(tab + 1) };
      });

    const missingEnLabels: string[] = [];
    const missingRuLabels: string[] = [];
    const azRemainingLabels: Array<{
      source: string;
      en: string;
      ru: string;
    }> = [];

    for (const label of labels) {
      if (label.startsWith("- ") || label.startsWith('"')) {
        continue;
      }
      const enLabel = localizeProductAttributeLabel(label, en);
      const ruLabel = localizeProductAttributeLabel(label, ru);
      const inEn = Object.keys(en.product.attributeLabels).some(
        (key) => key.trim().toLocaleLowerCase("az") === label.trim().toLocaleLowerCase("az"),
      );
      const inRu = Object.keys(ru.product.attributeLabels).some(
        (key) => key.trim().toLocaleLowerCase("az") === label.trim().toLocaleLowerCase("az"),
      );

      if (hasAz(label)) {
        if (!inEn) missingEnLabels.push(label);
        if (!inRu) missingRuLabels.push(label);
      }
      if (hasAz(enLabel) || hasAz(ruLabel)) {
        azRemainingLabels.push({ source: label, en: enLabel, ru: ruLabel });
      }
    }

    const untranslatedValues: Array<{
      label: string;
      value: string;
      en: string;
      ru: string;
    }> = [];

    for (const pair of azValueLines) {
      const enVal = localizeProductAttributeValue(pair.label, pair.value, "en");
      const ruVal = localizeProductAttributeValue(pair.label, pair.value, "ru");
      if (hasAz(enVal) || hasAz(ruVal)) {
        untranslatedValues.push({
          label: pair.label,
          value: pair.value,
          en: enVal,
          ru: ruVal,
        });
      }
    }

    const untranslatedDescriptions: Array<{
      slug: string;
      enHits: string[];
      ruHits: string[];
      enSample: string;
      ruSample: string;
    }> = [];
    let untranslatedDescriptionCount = 0;
    const descTokenCounts = new Map<string, number>();

    const rows = (psqlJson(
      `SELECT COALESCE(json_agg(json_build_object('slug', slug, 'description', description) ORDER BY slug), '[]'::json) FROM products WHERE description IS NOT NULL AND TRIM(description) <> ''`,
    ) ?? []) as Array<{ slug: string; description: string }>;
    const total = rows.length;

    for (const row of rows) {
      const localizedEn = localizeProductDescription(row.description, "en", en);
      const localizedRu = localizeProductDescription(row.description, "ru", ru);
      const enHits = hasAz(localizedEn) ? extractAzTokens(localizedEn) : [];
      const ruHits = hasAz(localizedRu) ? extractAzTokens(localizedRu) : [];
      if (enHits.length === 0 && ruHits.length === 0) {
        continue;
      }
      untranslatedDescriptionCount += 1;
      for (const token of [...enHits, ...ruHits]) {
        descTokenCounts.set(token, (descTokenCounts.get(token) ?? 0) + 1);
      }
      if (untranslatedDescriptions.length < 80) {
        const enLine =
          localizedEn.split("\n").find((line) => hasAz(line)) ?? localizedEn.slice(0, 240);
        const ruLine =
          localizedRu.split("\n").find((line) => hasAz(line)) ?? localizedRu.slice(0, 240);
        untranslatedDescriptions.push({
          slug: row.slug,
          enHits: enHits.slice(0, 12),
          ruHits: ruHits.slice(0, 12),
          enSample: enLine.slice(0, 280),
          ruSample: ruLine.slice(0, 280),
        });
      }
    }

    const remainingDescTokens = [...descTokenCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "az"))
      .slice(0, 400)
      .map(([token, n]) => ({ token, n }));

    const report = {
      productCount: total,
      uniqueLabels: labels.length,
      azValuePairs: azValueLines.length,
      missingEnLabels,
      missingRuLabels,
      azRemainingLabels,
      untranslatedValuesCount: untranslatedValues.length,
      untranslatedValues: untranslatedValues.slice(0, 400),
      untranslatedDescriptionCount,
      descriptionTokenHintCount: remainingDescTokens.length,
      remainingDescTokens,
      untranslatedDescriptions,
    };

    fs.writeFileSync(
      path.join(OUT_DIR, "report.json"),
      JSON.stringify(report, null, 2),
    );

    expect(
      {
        missingEnLabels: missingEnLabels.length,
        missingRuLabels: missingRuLabels.length,
        azRemainingLabels: azRemainingLabels.length,
        untranslatedValues: untranslatedValues.length,
        remainingDescTokens: remainingDescTokens.length,
      },
      JSON.stringify(
        {
          missingEnLabels: missingEnLabels.slice(0, 40),
          missingRuLabels: missingRuLabels.slice(0, 40),
          azRemainingLabels: azRemainingLabels.slice(0, 40),
          untranslatedValues: untranslatedValues.slice(0, 40),
          remainingDescTokens: remainingDescTokens.slice(0, 80),
        },
        null,
        2,
      ),
    ).toEqual({
      missingEnLabels: 0,
      missingRuLabels: 0,
      azRemainingLabels: 0,
      untranslatedValues: 0,
      remainingDescTokens: 0,
    });
  },
  180_000,
);
});
