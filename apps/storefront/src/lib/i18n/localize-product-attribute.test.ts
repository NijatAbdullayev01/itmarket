import { describe, expect, it } from "vitest";

import { getMessages } from "./messages";
import {
  localizeCatalogColor,
  localizeProductAttributeLabel,
  localizeProductSpecEntries,
} from "./localize-product-attribute";

describe("localizeProductAttribute", () => {
  it("keeps Azerbaijani catalog colors on az locale", () => {
    expect(localizeCatalogColor("Tünd mavi", "az")).toBe("Tünd mavi");
    expect(localizeCatalogColor("Gümüşü", "az")).toBe("Gümüşü");
    expect(localizeCatalogColor("Qara / Ağ vurğularla", "az")).toBe(
      "Qara / Ağ vurğularla",
    );
  });

  it("translates catalog colors for en and ru", () => {
    expect(localizeCatalogColor("Tünd mavi", "en")).toBe("Deep Blue");
    expect(localizeCatalogColor("Tünd mavi", "ru")).toBe("Тёмно-синий");
    expect(localizeCatalogColor("Gümüşü", "en")).toBe("Silver");
    expect(localizeCatalogColor("Gümüşü", "ru")).toBe("Серебристый");
    expect(localizeCatalogColor("Qara / Ağ vurğularla", "en")).toBe(
      "Black with white accents",
    );
    expect(localizeCatalogColor("Qara / Ağ vurğularla", "ru")).toBe(
      "Чёрный с белыми акцентами",
    );
  });

  it("translates common spec labels", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");

    expect(localizeProductAttributeLabel("Marka", en)).toBe("Brand");
    expect(localizeProductAttributeLabel("Daimi yaddaş", en)).toBe(
      "Internal storage",
    );
    expect(localizeProductAttributeLabel("Rəng", en)).toBe("Color");
    expect(localizeProductAttributeLabel("Vəziyyəti", en)).toBe("Condition");
    expect(localizeProductAttributeLabel("Format", en)).toBe("Format");
    expect(localizeProductAttributeLabel("Barkod", en)).toBe("Barcode");
    expect(localizeProductAttributeLabel("Müvəqqəti yaddaş", ru)).toBe(
      "Оперативная память",
    );
    expect(localizeProductAttributeLabel("Vəziyyəti", ru)).toBe("Состояние");
    expect(localizeProductAttributeLabel("Barkod", ru)).toBe("Штрих-код");
    expect(localizeProductAttributeLabel("Akkumulyator", ru)).toBe(
      "Аккумулятор",
    );
    expect(localizeProductAttributeLabel("İşıqlandırma", ru)).toBe("Подсветка");
  });

  it("localizes full spec entry rows including color values and boolean/technical values", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");
    const az = getMessages("az");

    const sampleSpecs: Array<[string, string]> = [
      ["Marka", "APC"],
      ["Model", "BV650I-GR"],
      ["Part number", "BV650I-GR"],
      ["Güc", "650 VA / 375 W"],
      ["Topologiya", "Line-interactive"],
      ["Dalğa forması", "Stepped approximation (line-interactive)"],
      ["AVR", "Bəli"],
      ["Giriş/çıxış", "230 V"],
      ["Zəmanət", "2 il"],
    ];

    expect(localizeProductSpecEntries(sampleSpecs, "en", en)).toEqual([
      ["Brand", "APC"],
      ["Model", "BV650I-GR"],
      ["Part number", "BV650I-GR"],
      ["Power", "650 VA / 375 W"],
      ["Topology", "Line-interactive"],
      ["Waveform type", "Stepped approximation (line-interactive)"],
      ["AVR", "Yes"],
      ["Input/output", "230 V"],
      ["Warranty", "2 years"],
    ]);

    expect(localizeProductSpecEntries(sampleSpecs, "ru", ru)).toEqual([
      ["Бренд", "APC"],
      ["Модель", "BV650I-GR"],
      ["Part number", "BV650I-GR"],
      ["Мощность", "650 VA / 375 W"],
      ["Топология", "Линейно-интерактивная"],
      ["Форма волны", "Ступенчатая аппроксимация (линейно-интерактивный)"],
      ["AVR", "Да"],
      ["Вход/выход", "230 V"],
      ["Гарантия", "2 года"],
    ]);

    expect(localizeProductSpecEntries(sampleSpecs, "az", az)).toEqual([
      ["Marka", "APC"],
      ["Model", "BV650I-GR"],
      ["Part nömrəsi", "BV650I-GR"],
      ["Güc", "650 VA / 375 W"],
      ["Topologiya", "Line-interactive"],
      ["Dalğa forması", "Stepped approximation (line-interactive)"],
      ["AVR", "Bəli"],
      ["Giriş/çıxış", "230 V"],
      ["Zəmanət", "2 il"],
    ]);
  });

  it("localizes keyboard specifications correctly for en and ru", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");

    const keyboardSpecs: Array<[string, string]> = [
      ["SKU", "2E-KG360UBK"],
      ["Brand", "2E (2E Gaming)"],
      ["Model", "KG360 RGB Wireless (2E-KG360UBK)"],
      ["Barkod", "681920370079"],
      ["Vəziyyəti", "Yeni"],
      [
        "Format",
        "Ultra kompakt 65% format (cəmi 68 düymə - səyahət və minimalist masa quraşdırmaları üçün ideal)",
      ],
      [
        "Qoşulma",
        "Simsiz 2.4 GHz radio kanal (USB adapter) və Type-C kabel ilə simli istifadə",
      ],
      ["Akkumulyator", "Daxili 1000 mAh təkrar doldurulan batareya"],
      [
        "İşıqlandırma",
        "Dinamik çoxrejimli RGB arxa işıqlandırma (parlaqlıq və sürət tənzimlənməsi)",
      ],
      ["Düymə resursu", "10 milyon klik, 19 düyməlik Anti-Ghosting"],
      ["Qorunma", "Nəmə qarşı daxili qoruyucu lay"],
      ["Ölçülər", "323 × 106 × 35 mm, Çəki: 350 q"],
      ["Rəng", "Qara / Ağ vurğularla"],
    ];

    expect(localizeProductSpecEntries(keyboardSpecs, "en", en)).toEqual([
      ["SKU", "2E-KG360UBK"],
      ["Brand", "2E (2E Gaming)"],
      ["Model", "KG360 RGB Wireless (2E-KG360UBK)"],
      ["Barcode", "681920370079"],
      ["Condition", "New"],
      [
        "Format",
        "Ultra compact 65% format (only 68 keys - ideal for travel and minimalists)",
      ],
      [
        "Connectivity",
        "Wireless 2.4 GHz (USB adapter) and wired Type-C cable use",
      ],
      ["Rechargeable battery", "Built-in 1000 mAh rechargeable battery"],
      [
        "Lighting",
        "Dynamic multi-mode RGB backlighting (brightness and speed adjustment)",
      ],
      ["Key lifespan", "10 million clicks, 19-key Anti-Ghosting"],
      ["Protection", "Internal moisture-resistant protective layer"],
      ["Dimensions", "323 × 106 × 35 mm, Weight: 350 g"],
      ["Color", "Black with white accents"],
    ]);

    expect(localizeProductSpecEntries(keyboardSpecs, "ru", ru)).toEqual([
      ["SKU", "2E-KG360UBK"],
      ["Бренд", "2E (2E Gaming)"],
      ["Модель", "KG360 RGB Wireless (2E-KG360UBK)"],
      ["Штрих-код", "681920370079"],
      ["Состояние", "Новый"],
      [
        "Формат",
        "Ультракомпактный формат 65% (всего 68 клавиш - идеально для путешествий и минималистов)",
      ],
      [
        "Подключение",
        "Беспроводной радиоканал 2.4 ГГц (USB-адаптер) и проводное подключение через кабель Type-C",
      ],
      ["Аккумулятор", "Встроенный перезаряжаемый аккумулятор 1000 мАч"],
      [
        "Подсветка",
        "Динамическая многорежимная RGB-подсветка (регулировка яркости и скорости)",
      ],
      ["Ресурс клавиш", "10 миллионов кликов, 19-клавишный Anti-Ghosting"],
      ["Защита", "Внутренний влагозащитный слой"],
      ["Габариты", "323 × 106 × 35 мм, Вес: 350 г"],
      ["Цвет", "Чёрный с белыми акцентами"],
    ]);
  });
});
