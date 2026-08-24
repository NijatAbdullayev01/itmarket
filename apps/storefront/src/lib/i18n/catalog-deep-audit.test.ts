import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import { en } from "./messages/en";
import { ru } from "./messages/ru";
import {
  localizeProductAttributeLabel,
  localizeProductAttributeValue,
} from "./localize-product-attribute";

const OUT_DIR = "/tmp/catalog-i18n-audit";

const AZ_CHAR = /[əöğşüçıƏÖĞŞÜÇİ]/;

/**
 * International loanwords / units / acronyms that legitimately appear in
 * English and Russian translations and must NOT be treated as untranslated
 * Azerbaijani text (e.g. "Wi-Fi", "DPI", "Server", "mm", "Hz").
 */
const SHARED_LOANWORDS = new Set([
  "mm", "ms", "nm", "sm", "cm", "km", "mhz", "ghz", "hz", "khz",
  "dpi", "ppi", "fps", "ips", "tn", "va", "led", "lcd", "oled", "amoled",
  "uhd", "4k", "8k", "full hd", "wi-fi", "wi", "fi", "bluetooth", "usb",
  "hdmi", "sku", "server", "adapter", "port", "video", "audio", "model",
  "material", "display", "monitor", "interface", "laser", "scanner",
  "printer", "driver", "firmware", "software", "hardware", "router",
  "switch", "gaming", "cloud", "app", "type", "sensor", "camera",
  "speaker", "battery", "power", "cable", "network", "ethernet", "fiber",
  "optical", "wireless", "dynamic", "static", "rack", "enterprise",
  "desktop", "laptop", "workstation", "stand", "mount", "hub", "receiver",
  "reader", "concurrent", "limited", "lifetime", "metal", "plastic",
  "smart", "pro", "max", "ultra", "mini", "micro", "nano", "plus",
  "standard", "format", "version", "generation", "access", "support",
  "output", "input", "en", "on", "off", "top", "amper", "volt", "toner",
  "manual", "alarm", "region", "soket", "no", "none", "for", "with",
  "and", "up", "to", "pc", "ram", "hdd", "ssd", "matter", "mb", "gb",
  "tb", "slots", "slot", "password", "angled",
  "minimum", "diagonal", "normal", "extreme", "internet", "siren",
  "mat", "o", "az",
]);

/** Labels whose values are proper identifiers and must never be localized. */
const SKIP_LABELS = new Set(["model", "model kodu", "part number", "part nömrəsi"]);

const AZ_WORD =
  /\b(və|və ya|üçün|ilə|də|da|kimi|qədər|üzrə|haqqında|bu|o|bir|həm|həmçinin|lakin|ancaq|yalnız|hər|belə|elə|olan|olaraq|edir|edən|olur|olub|olmayan|vasitəsilə|səbəbiylə|üçündür|müxtəlif|daxil|daxildir|əlavə|ümumi|tam|təxminən|bəzi|digər|başqa|sonra|əvvəl|arasında|üzərində|altında|yanında|içərisində|bütün|eyni|özü|onun|bunun|buna|bunu|bundan|bunlar|onlar|onlarla|hansı|necə|nə|hansısa|istənilən|hər hansı|hər bir|birlikdə|ayrı-ayrılıqda|müvafiq|mümkün|mümkündür|istifadə|istifadəçi|istifadə olunur|istifadə edilir|təmin|təmin edir|təmin edən|sahib|sahibdir|malik|malikdir|edilir|olunur|olunub|göstərilir|təqdim|təqdim edilir|təklif|təklif edir|verir|verilir|alır|alınır|satılır|satış|satıcı|alıcı|qiymət|stok|endirim|sifariş|çatdırılma|zəmanət|təhvil|mağaza|magaza|sayt|səhifə|vitrin|kataloq|kateqoriya|model|seriya|marka|brend|məhsul|məhsulu|cihaz|cihazı|avadanlıq|avadanlığı|sistem|sistemə|qurğu|komponent|komponentlər|ağıllı|ev|ofis|gaming|oyun|iş|istirahət|musiqi|video|şəkil|görüntü|görüntüsü|səs|audio|kamera|mikrofon|dinamik|ekran|monitor|televizor|noutbuk|kompüter|masaüstü|server|printer|skaner|faks|çap|surət|kartric|toner|kağız|vərəq|dəq|saat|il|ay|gün|həftə|ədəd|ədədə|tutum|yaddaş|sürət|tezlik|güc|enerji|batareya|akkumulyator|şarj|kabel|adapter|port|konnektor|rozetka|fiş|yuvası|düymə|düyməsi|klaviatura|siçan|qulaqlıq|veb-kamera|kolonka|qoruma|təhlükəsizlik|şifrələmə|şəbəkə|internet|wi-fi|bluetooth|simsiz|naqilli|simli|optik|lazer|LED|LCD|IPS|TN|VA|OLED|AMOLED|Full HD|UHD|4K|8K|Hz|GHz|MHz|kadr|fps|dpi|ppi|ms|nm|mm|sm|metr|kq|qram|düym|düyməli|millimetr|santimetr|ton|vatt|amper|volt|dərəcə|faiz|dəfə|dəfədən|dəfəyə|lay|qat|seqment|kanal|zolaq|sətir|sütun|hüceyrə|funksiya|rejim|mod|parametr|göstərici|ölçü|ölçülər|çəki|hündürlük|en|uzunluq|dərinlik|qalınlıq|material|plastik|metal|alüminium|polad|dəri|parça|rezin|silikon|şüşə|mat|parlaq|rəng|rəngli|qara|ağ|boz|göy|mavi|qırmızı|yaşıl|sarı|bənövşəyi|çəhrayı|narıncı|qəhvəyi|bej|qızılı|gümüşü|titanyum|kosmik|tünd|açıq|qarışıq|monoxrom|çoxrəngli|tək|qoşa|iki|üç|dörd|beş|altı|yeddi|səkkiz|doqquz|on|birinci|ikinci|üçüncü|sonuncu|maksimum|minimum|orta|standart|klassik|müasir|peşəkar|həvəskar|başlanğıc|qabaqcıl|inkişaf|təkmil|genişləndirilmiş|genişləndirmə|yenilənmiş|yenilənmə|möhkəm|davamlı|dayanıqlı|etibarlı|keyfiyyət|yüksək|aşağı|sürətli|yavaş|tez|güclü|zəif|böyük|kiçik|geniş|dar|uzun|qısa|incə|qalın|yüngül|ağır|rahat|erqonomik|funksional|praktik|isti|soyuq|nəm|quru|toz|suy|yağış|hava|iqlim|istiqamət|baxış|bucaq|məsafə|region|versiya|nəsil|ailə|dil|ölkə|bazar|təchizat|logistika|anbar|ehtiyat|hissə|komplekt|qutuda|qutu|qablaşdırma|təlimat|broşura|zəmanətli|yeni|işlənmiş|istifadə olunmuş|tam|saz|test edilmiş|yoxlanmış|təmiz|qüsursuz|mükəmməl|əla|yaxşı|normal|kifayət|qane|məmnun|müştəri|dəstək|servis|xidmət|texniki|texnologiya|proqram|proqram təminatı|hardware|aparatura|interfeys|qoşulma|bağlantı|qurğu|quraşdırma|montaj|tənzimləmə|nəzarət|idarəetmə|idarə|avtomatik|əl ilə|manual|uzaqdan|yaxından|pult|mobil|tətbiq|smartfon|telefon|planşet|taymer|siqnal|bildiriş|alarm|siren|hərəkət|aşkarlama|tanıma|izləmə|qeydiyyat|səsyazma|səs-küy|gurultu|sakit|səssiz|rejimi|yuxu|qənaət|fasiləsiz|kesintisiz|çıxış|giriş|portlar|girişlər|çıxışlar|kanallar|zolaqlar|hüceyrələr|qatlar|laylar|dəstə|dəstələr|top|dəst|dəstinə|dəstində|üstəlik|əlavə olaraq|bununla|beləliklə|nəticədə|ümumiyyətlə|əsasən|adətən|bəzən|həmişə|tez-tez|nadir|ara-sıra|çox|az|daha|ən|yetərli|azacıq|bir qədər|tamamilə|qismən|müəyyən|fərqli|oxşar|bənzər|heç bir|hamısı|hər kəs|hər şey|heç nə|heç kim|nə də|yaxud|ya da|ya|yoxsa|amma|çünki|buna görə|ona görə|belə ki|hansı ki|kim|harada|nə vaxt|niyə|nə qədər|hansı)\b/i;

function hasAz(text: string): boolean {
  const stripped = text.replace(/TÜV/gi, "").replace(/IT Market/gi, "");
  if (AZ_CHAR.test(stripped)) {
    return true;
  }
  const words = stripped.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  return words.some((word) => !SHARED_LOANWORDS.has(word) && AZ_WORD.test(word));
}

function parseSpecPairs(): Array<{ label: string; value: string }> {
  const raw = fs.readFileSync(path.join(OUT_DIR, "spec_pairs.json"), "utf8");
  const text = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  let data = JSON.parse(text);
  if (typeof data === "string") {
    data = JSON.parse(data);
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    data = data.specPairs ?? data.pairs ?? [];
  }
  return data;
}

describe("deep catalog translation audit over real DB data", () => {
  it(
    "finds any remaining untranslated feature labels / values",
    () => {
      const pairs = parseSpecPairs();
    expect(pairs.length).toBeGreaterThan(0);

    const uniqueLabels = new Set(pairs.map((p) => p.label.trim()));
    const labelIssues: Array<{ label: string; en: string; ru: string }> = [];

    for (const label of [...uniqueLabels].sort()) {
      const enL = localizeProductAttributeLabel(label, en);
      const ruL = localizeProductAttributeLabel(label, ru);
      if (hasAz(enL) || hasAz(ruL)) {
        labelIssues.push({ label, en: enL, ru: ruL });
      }
    }

    const valueIssues: Array<{
      label: string;
      value: string;
      en: string;
      ru: string;
    }> = [];

    for (const pair of pairs) {
      const value = pair.value.trim();
      if (SKIP_LABELS.has(pair.label.trim().toLowerCase())) continue;
      if (!hasAz(value)) continue;
      const enV = localizeProductAttributeValue(pair.label, value, "en");
      const ruV = localizeProductAttributeValue(pair.label, value, "ru");
      if (hasAz(enV) || hasAz(ruV)) {
        valueIssues.push({ label: pair.label, value, en: enV, ru: ruV });
      }
    }

    const report = {
      pairCount: pairs.length,
      uniqueLabelCount: uniqueLabels.size,
      labelIssues,
      valueIssueCount: valueIssues.length,
      valueIssues: valueIssues.slice(0, 600),
    };

    fs.writeFileSync(
      path.join(OUT_DIR, "deep-spec-audit.json"),
      JSON.stringify(report, null, 2),
    );

    console.log("unique labels:", uniqueLabels.size);
    console.log("label issues:", labelIssues.length);
    console.log("value issues:", valueIssues.length);

      expect(
        {
          labelIssues: labelIssues.length,
          valueIssues: valueIssues.length,
        },
        JSON.stringify(
          {
            labelIssues: labelIssues.slice(0, 40),
            valueIssues: valueIssues.slice(0, 40),
          },
          null,
          2,
        ),
      ).toEqual({ labelIssues: 0, valueIssues: 0 });
    },
    30_000,
  );
});
