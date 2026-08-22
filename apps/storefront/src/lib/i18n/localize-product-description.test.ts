import { describe, expect, it } from "vitest";

import { localizeProductDescription } from "./localize-product-description";
import { getMessages } from "./messages";

const en = getMessages("en");
const ru = getMessages("ru");
const az = getMessages("az");

const MOBICOM_DESCRIPTION = `Mobicom DTSPB231XL-CD20 10 q SFP+ BiDi WDM Modul (TX1270/RX1330nm 20km LC) — Mobicom tərəfindən istehsal olunmuş etibarlı və yüksək keyfiyyətli texnoloji məhsuldur.

Əsas göstəricilər və xüsusiyyətlər:
• Vəziyyəti: Tam yeni (istifadə olunmamış, orijinal qablaşdırmada)
• Vəziyyəti: Yeni
• Tip: 10Gbps SFP+ BiDi WDM Single Mode Optik Modul (10GBASE-BX)
• Ötürmə sürəti: 10 Gbps
• Dalğa uzunluğu: TX 1270nm / RX 1330nm
• Maksimal məsafə: 20 km (Single Mode SMF)
• Konnektor: Simplex LC
• Diaqnostika: DDM / DOM dəstəyi
• İş prinsipi: DTSPB321XL-CD20 (TX1330/RX1270) modulu ilə cüt istifadə olunur.

IT Market olaraq bütün məhsullara texniki keyfiyyət zəmanəti, operativ çatdırılma və peşəkar servis dəstəyi təqdim edirik.`;

describe("localizeProductDescription", () => {
  it("keeps Azerbaijani copy on az locale and restores 10G in SFP names", () => {
    const localized = localizeProductDescription(MOBICOM_DESCRIPTION, "az", az);
    expect(localized).toContain("10G SFP+");
    expect(localized).toContain("tərəfindən istehsal olunmuş");
    expect(localized).toContain("Əsas göstəricilər və xüsusiyyətlər:");
  });

  it("translates the shared import boilerplate and spec lines to English", () => {
    const localized = localizeProductDescription(MOBICOM_DESCRIPTION, "en", en);
    expect(localized).toContain(
      "is a reliable, high-quality technology product manufactured by Mobicom.",
    );
    expect(localized).toContain("Key specifications and features:");
    expect(localized).toContain("IT Market provides technical quality warranty");
    expect(localized).toContain("Condition: Brand new (unused, in original packaging)");
    expect(localized).toContain("Wavelength:");
    expect(localized).toContain("Maximum range:");
    expect(localized).toContain("Diagnostics: DDM / DOM support");
    expect(localized).toContain("used as a pair");
    expect(localized).toContain("10G SFP+");
    expect(localized).not.toMatch(/tərəfindən|Əsas göstəricilər|zəmanəti/);
  });

  it("translates the shared import boilerplate to Russian", () => {
    const localized = localizeProductDescription(MOBICOM_DESCRIPTION, "ru", ru);
    expect(localized).toContain(
      "надёжный высококачественный технологический продукт производства Mobicom.",
    );
    expect(localized).toContain("Основные показатели и характеристики:");
    expect(localized).toContain("гарантию технического качества");
    expect(localized).toContain("Состояние: Новый (неиспользованный, в оригинальной упаковке)");
    expect(localized).not.toMatch(/tərəfindən|Əsas göstəricilər/);
  });

  it("translates HP catalog intro sentences", () => {
    const source =
      "HP USB-C G5 Essential Dock (72C71AA) HP kataloqunda orijinal HP dok stansiyası kimi təqdim olunur. Konfiqurasiyanı müqayisə edib rəsmi zəmanət və çatdırılma ilə sifariş edə bilərsiniz.";
    const localized = localizeProductDescription(source, "en", en);
    expect(localized.toLowerCase()).toContain("catalog");
    expect(localized.toLowerCase()).toContain("docking station");
    expect(localized).toContain("compare the configuration");
    expect(localized).not.toMatch(/kataloqunda|təqdim olunur/);
  });

  it("translates 2E original-model and use-case sentences", () => {
    const source =
      "2E 27\" N2723B IPS 75 Hz monitor (2E-N2723B-01.UA) orijinal 2E monitordir. İş və əyləncə üçün nəzərdə tutulub. Orijinal 2E modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.";
    const localized = localizeProductDescription(source, "en", en);
    expect(localized).toContain("Designed for work and entertainment.");
    expect(localized).toMatch(/original 2E monitor/i);
    expect(localized).toContain("It is an original 2E model");
    expect(localized).not.toMatch(/nəzərdə tutulub|modelidir/);
  });

  it("translates IP-phone import boilerplate", () => {
    const source =
      "Grandstream GRP2602 — Grandstream tərəfindən hazırlanmış yüksək etibarlı və peşəkar rabitə avadanlığıdır. Müasir ofis, korporativ şəbəkə və zəng mərkəzləri üçün ideal səs keyfiyyəti, zəng idarəetməsi və şəbəkə sabitliyi təmin edir.";
    const localized = localizeProductDescription(source, "en", en);
    expect(localized).toContain("highly reliable professional communications equipment made by Grandstream");
    expect(localized).toContain("call centres");
    expect(localized).not.toMatch(/tərəfindən hazırlanmış|zəng mərkəzləri/);
  });

  it("returns an empty string for nullish input", () => {
    expect(localizeProductDescription(null, "en", en)).toBe("");
    expect(localizeProductDescription(undefined, "ru", ru)).toBe("");
  });

  it("translates 2E product-about copulas and leftover units", () => {
    const source =
      "2E Beginner 16″ tünd zeytun noutbuk çantası (2E-CBN315DO) orijinal 2E noutbuk çantasıdir. dark olive. Noutbukun daşınması və qorunması üçündür. Orijinal 2E modelidir; rəsmi zəmanət və çatdırılma ilə təqdim olunur.";
    const localized = localizeProductDescription(source, "en", en);
    expect(localized.toLowerCase()).toContain("laptop bag");
    expect(localized).toContain("It is for carrying and protecting a laptop.");
    expect(localized).not.toMatch(/çantasıdir|nəzərdə tutulub|təqdim olunur/);
    expect(
      localizeProductDescription("19\" rels: 4 ədəd, 1U nömrələnmiş", "en", en),
    ).toMatch(/numbered/i);
  });

  it("translates leftover gaming copulas, colors, and 2.4G typos", () => {
    const source =
      "2E Gaming HG340 7.1 Black qara gaming headset (2E-HG340BK-7.1) orijinal 2E Gaming oyun qulaqlığıdır. qara. Oyun, zəng və gündəlik dinləmə üçün nəzərdə tutulub.";
    const localized = localizeProductDescription(source, "en", en);
    expect(localized.toLowerCase()).toContain("gaming headset");
    expect(localized.toLowerCase()).not.toMatch(/\boyun\b/);
    expect(localized.toLowerCase()).not.toMatch(/\bqara\b/);
    expect(localizeProductDescription("wireless (2.4 q / Bluetooth)", "en", en)).toContain(
      "2.4G",
    );
  });

  it("translates leftover print-speed units, power phrases, and də particles", () => {
    expect(
      localizeProductDescription("Çap sürəti: 7.5 səh/dəq.", "en", en),
    ).toMatch(/7\.5 ppm/i);
    expect(
      localizeProductDescription("Çap sürəti: 7.5 səh/dəq.", "ru", ru),
    ).toMatch(/7\.5 стр\/мин/i);

    const ups = localizeProductDescription(
      "140–300 V giriş daha çox enerji tələb edən ofis dəstləri üçündür.",
      "en",
      en,
    );
    expect(ups.toLowerCase()).toContain("more power");
    expect(ups).not.toMatch(/çox|enerji/);

    const battery = localizeProductDescription(
      "Hermetik SLA kimyası texniki xidmət tələb etmir; siqnalizasiya və ehtiyat qidalanma üçün də istifadə olunur.",
      "en",
      en,
    );
    expect(battery.toLowerCase()).toMatch(/alarm/);
    expect(battery).not.toMatch(/\bdə\b|siqnalizasiya/);

    const ssd = localizeProductDescription(
      "OTP; EV/Tesla dashcam də daxil Windows, macOS, iOS və Android.",
      "en",
      en,
    );
    expect(ssd.toLowerCase()).toMatch(/dashcam/);
    expect(ssd).not.toMatch(/\bdə\b/);

    const heatsink = localizeProductDescription(
      "Prosessor heatsink-i. Failed camera avto-reboot edir.",
      "en",
      en,
    );
    expect(heatsink).not.toMatch(/Prosessor|\bedir\b/);
  });
});
