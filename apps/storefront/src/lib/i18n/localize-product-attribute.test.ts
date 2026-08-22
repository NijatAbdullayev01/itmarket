import { describe, expect, it } from "vitest";

import { getMessages } from "./messages";
import {
  catalogColorLabelMap,
  localizeCatalogColor,
  localizeProductAttributeLabel,
  localizeProductAttributeValue,
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

  it("builds a serializable color label map for client catalog filters", () => {
    const en = catalogColorLabelMap("en");
    expect(en["Tünd mavi"]).toBe("Deep Blue");
    expect(en.Gümüşü).toBe("Silver");
    expect(catalogColorLabelMap("az")["Tünd mavi"]).toBe("Tünd mavi");
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
    expect(localizeProductAttributeLabel("Part nömrəsi", ru)).toBe("Партномер");
    expect(localizeProductAttributeLabel("Ağırlıq", en)).toBe("Weight");
    expect(localizeProductAttributeLabel("Ağırlıq", ru)).toBe("Вес");
    expect(localizeProductAttributeLabel("Oxuma / yazma", en)).toBe(
      "Read / write",
    );
    expect(localizeProductAttributeLabel("Keçid vaxtı", ru)).toBe(
      "Время переключения",
    );
    expect(localizeProductAttributeLabel("Sürücü", en)).toBe("Driver");
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
      ["Партномер", "BV650I-GR"],
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

  it("localizes 2E-KG290UB specifications correctly for en and ru", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");

    const specs: Array<[string, string]> = [
      ["SKU", "2E-KG290UB"],
      ["Brend", "2E (2E Gaming)"],
      ["Model", "KG290 TKL (2E-KG290UB)"],
      ["Barkod", "681920370840"],
      ["Vəziyyəti", "Yeni"],
      [
        "Format",
        "Kompakt TKL (Tenkeyless 85% format - 87 düymə, rəqəm bloku olmadan masada geniş siçan hərəkəti sahəsi yaradır)",
      ],
      [
        "Korpus",
        "Möhkəm metal üst panel və dözümlü ABS plastik keykaplar",
      ],
      ["Düymə resursu", "10 milyon basılma ömrü"],
      ["İşıqlandırma", "3 müxtəlif ssenarili LED işıqlandırma"],
      [
        "Anti-Ghosting",
        "19 əsas oyun düyməsində təsadüfi bloklanmanın qarşısının alınması",
      ],
      ["Kabel", "1.5 metr toxunma parça kabel (USB)"],
      ["Çəki", "650 q"],
      ["Rəng", "Qara (Black)"],
    ];

    expect(localizeProductSpecEntries(specs, "en", en)).toEqual([
      ["SKU", "2E-KG290UB"],
      ["Brand", "2E (2E Gaming)"],
      ["Model", "KG290 TKL (2E-KG290UB)"],
      ["Barcode", "681920370840"],
      ["Condition", "New"],
      [
        "Format",
        "Compact TKL (Tenkeyless 85% format - 87 keys, no number pad for extra mouse space)",
      ],
      [
        "Housing",
        "Solid metal top plate and durable ABS keycaps",
      ],
      ["Key lifespan", "10 million keystroke lifespan"],
      ["Lighting", "3-scenario LED lighting"],
      [
        "Anti-Ghosting",
        "Anti-ghosting prevention on 19 main gaming keys",
      ],
      ["Cable", "1.5m braided fabric cable (USB)"],
      ["Weight", "650 g"],
      ["Color", "Black"],
    ]);

    expect(localizeProductSpecEntries(specs, "ru", ru)).toEqual([
      ["SKU", "2E-KG290UB"],
      ["Бренд", "2E (2E Gaming)"],
      ["Модель", "KG290 TKL (2E-KG290UB)"],
      ["Штрих-код", "681920370840"],
      ["Состояние", "Новый"],
      [
        "Формат",
        "Компактный TKL (формат 85% без цифрового блока - 87 клавиш, оставляет больше места для мыши)",
      ],
      [
        "Корпус",
        "Прочная металлическая верхняя панель и долговечные кейкапы из ABS-пластика",
      ],
      ["Ресурс клавиш", "Ресурс 10 миллионов нажатий"],
      ["Подсветка", "LED-подсветка с 3 различными сценариями"],
      [
        "Anti-Ghosting",
        "Предотвращение случайной блокировки на 19 основных игровых клавишах",
      ],
      ["Кабель", "1.5 м плетёный кабель (USB)"],
      ["Вес", "650 г"],
      ["Цвет", "Чёрный"],
    ]);
  });

  it("localizes Wi-Fi access point and camera specs for en and ru", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");

    const eapSpecs: Array<[string, string]> = [
      ["Brend", "TP-Link (Omada)"],
      ["Model", "Omada EAP653 UR (AX3000 Ceiling Mount Dual-Band Wi-Fi 6 Access Point)"],
      ["Wi-Fi Standartı", "Wi-Fi 6 (IEEE 802.11ax/ac/n/g/b/a)"],
      ["Simsiz Sürət", "5 GHz üzrə 2402 Mbps, 2.4 GHz üzrə 574 Mbps (ümumi 2976 Mbps)"],
      ["Montaj", "Tavan və divar montaj dəsti daxildir"],
    ];

    expect(localizeProductSpecEntries(eapSpecs, "en", en)).toEqual([
      ["Brand", "TP-Link (Omada)"],
      ["Model", "Omada EAP653 UR (AX3000 Ceiling Mount Dual-Band Wi-Fi 6 Access Point)"],
      ["Wi-Fi standard", "Wi-Fi 6 (IEEE 802.11ax/ac/n/g/b/a)"],
      ["Wireless speed", "2402 Mbps on 5 GHz, 574 Mbps on 2.4 GHz (total 2976 Mbps)"],
      ["Mounting", "Ceiling and wall mounting kit included"],
    ]);

    expect(localizeProductSpecEntries(eapSpecs, "ru", ru)).toEqual([
      ["Бренд", "TP-Link (Omada)"],
      ["Модель", "Omada EAP653 UR (AX3000 Ceiling Mount Dual-Band Wi-Fi 6 Access Point)"],
      ["Стандарт Wi-Fi", "Wi-Fi 6 (IEEE 802.11ax/ac/n/g/b/a)"],
      ["Беспроводная скорость", "2402 Мбит/с на 5 ГГц, 574 Мбит/с на 2.4 ГГц (всего 2976 Мбит/с)"],
      ["Монтаж", "Комплект для потолочного и настенного монтажа в комплекте"],
    ]);
  });

  it("localizes enterprise server and printer specifications for en and ru", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");

    const serverSpecs: Array<[string, string]> = [
      ["Prosessor (bu konfiq)", "Intel Xeon E-2314"],
      ["Nüvə / axın", "8 nüvə / 16 axın"],
      ["RAM (bu konfiq)", "16 GB DDR4 UDIMM ECC"],
      ["Yaddaş (bu konfiq)", "1 × 480 GB SATA RI SSD"],
      ["Yaddaş tipi", "DDR4"],
      ["Tutum", "1300 səhifə"],
      ["Çap sürəti (qara, ISO)", "20 səh/dəq"],
      ["Funksiyalar", "Çap, surət, skan"],
      ["PoE", "Yoxdur"],
      ["Saat", "Var"],
      ["Rəng (korpus)", "Qara"],
    ];

    expect(localizeProductSpecEntries(serverSpecs, "en", en)).toEqual([
      ["Processor (this config)", "Intel Xeon E-2314"],
      ["Cores / Threads", "8 cores / 16 threads"],
      ["RAM (this config)", "16 GB DDR4 UDIMM ECC"],
      ["Storage (this config)", "1 × 480 GB SATA RI SSD"],
      ["Memory type", "DDR4"],
      ["Capacity / Yield", "1300 pages"],
      ["Print speed (black, ISO)", "20 ppm"],
      ["Functions", "Print, copy, scan"],
      ["PoE", "None"],
      ["Clock display", "Yes"],
      ["Color (chassis)", "Black"],
    ]);

    expect(localizeProductSpecEntries(serverSpecs, "ru", ru)).toEqual([
      ["Процессор (данная конф.)", "Intel Xeon E-2314"],
      ["Ядра / Потоки", "8 ядер / 16 потоков"],
      ["ОЗУ (данная конф.)", "16 GB DDR4 UDIMM ECC"],
      ["Накопитель (данная конф.)", "1 × 480 GB SATA RI SSD"],
      ["Тип памяти", "DDR4"],
      ["Ресурс / Емкость", "1300 страниц"],
      ["Скорость печати (ч/б, ISO)", "20 стр/мин"],
      ["Функции", "Печать, копирование, сканирование"],
      ["PoE", "Нет"],
      ["LED-часы", "Есть"],
      ["Цвет (корпус)", "Чёрный"],
    ]);
  });

  it("localizes APC UPS catalog rows stored with English waveform and AZ units", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");

    const upsSpecs: Array<[string, string]> = [
      ["SKU", "APC-BVX2200LIGR"],
      ["Marka", "APC"],
      ["Model", "BVX2200LI-GR"],
      ["Part nömrəsi", "BVX2200LI-GR"],
      ["Güc", "2.200 VA / 1.200 W"],
      ["Topologiya", "Line-interactive"],
      ["Dalğa forması", "Stepped approximation to a sinewave"],
      ["AVR", "Bəli"],
      ["Giriş/çıxış", "230 V"],
      ["Çıxış rozetkaları", "8 Schuko (6 ehtiyat + 2 surge)"],
      ["Ağırlıq", "7.5 kq"],
      ["USB", "Type-A 2.4A"],
      ["Doldurulma vaxtı", "6–8 saat"],
      ["Tip", "Ventilyator (fan) modulu"],
      ["Forma", "Duo (stereo / iki qulaq)"],
    ];

    expect(localizeProductSpecEntries(upsSpecs, "en", en)).toEqual([
      ["SKU", "APC-BVX2200LIGR"],
      ["Brand", "APC"],
      ["Model", "BVX2200LI-GR"],
      ["Part number", "BVX2200LI-GR"],
      ["Power", "2.200 VA / 1.200 W"],
      ["Topology", "Line-interactive"],
      ["Waveform type", "Stepped approximation to a sinewave"],
      ["AVR", "Yes"],
      ["Input/output", "230 V"],
      ["Output receptacles", "8 Schuko (6 battery backup + 2 surge)"],
      ["Weight", "7.5 kg"],
      ["USB", "Type-A 2.4A"],
      ["Recharge time", "6–8 hours"],
      ["Type", "Fan module"],
      ["Form factor", "Duo (stereo / both ears)"],
    ]);

    expect(localizeProductSpecEntries(upsSpecs, "ru", ru)).toEqual([
      ["SKU", "APC-BVX2200LIGR"],
      ["Бренд", "APC"],
      ["Модель", "BVX2200LI-GR"],
      ["Партномер", "BVX2200LI-GR"],
      ["Мощность", "2.200 VA / 1.200 W"],
      ["Топология", "Линейно-интерактивная"],
      ["Форма волны", "Ступенчатая аппроксимация синусоиды"],
      ["AVR", "Да"],
      ["Вход/выход", "230 V"],
      [
        "Выходные розетки",
        "8 Schuko (6 с резервным питанием + 2 защита от скачков)",
      ],
      ["Вес", "7.5 кг"],
      ["USB", "Type-A 2.4A"],
      ["Время зарядки", "6–8 ч"],
      ["Тип", "Модуль вентилятора"],
      ["Форм-фактор", "Duo (стерео / оба уха)"],
    ]);
  });

  it("translates previously missing catalog spec labels and dotted-İ values", () => {
    const en = getMessages("en");
    const ru = getMessages("ru");

    expect(localizeProductAttributeLabel("İş temperaturu", en)).toBe(
      "Operating temperature",
    );
    expect(localizeProductAttributeLabel("İş temperaturu", ru)).toBe(
      "Рабочая температура",
    );
    expect(localizeProductAttributeLabel("Keçid tutumu", en)).toBe(
      "Switching capacity",
    );
    expect(localizeProductAttributeLabel("Mikrofon", en)).toBe("Microphone");
    expect(localizeProductAttributeLabel("Mikrofon", ru)).toBe("Микрофон");
    expect(localizeProductAttributeLabel("Tətbiq", ru)).toBe("Применение");

    expect(
      localizeProductSpecEntries(
        [
          ["Vəziyyəti", "İşlənmiş"],
          ["Zəmanət", "2 il (HyperX)"],
          ["Tətbiq", "Alisa ilə Ev"],
          ["Qablaşdırma", "1 ədəd"],
          ["İşıqlandırma", "İşıqlı"],
        ],
        "en",
        en,
      ),
    ).toEqual([
      ["Condition", "Used"],
      ["Warranty", "2 years (HyperX)"],
      ["Application", "Alice Smart Home"],
      ["Packaging", "1 pc"],
      ["Lighting", "Backlit"],
    ]);

    expect(
      localizeProductSpecEntries(
        [
          ["Vəziyyəti", "İşlənmiş"],
          ["Zəmanət", "2 il (HyperX)"],
          ["Tətbiq", "Alisa ilə Ev"],
        ],
        "ru",
        ru,
      ),
    ).toEqual([
      ["Состояние", "Б/у"],
      ["Гарантия", "2 года (HyperX)"],
      ["Применение", "Умный дом Алисы"],
    ]);
  });

  it("translates remaining catalog spec values and mixed units", () => {
    expect(
      localizeProductAttributeValue(
        "Zəmanət",
        "1 il (qeydiyyatla 3 ilə qədər)",
        "en",
      ),
    ).toBe("1 year (up to 3 years with registration)");
    expect(
      localizeProductAttributeValue(
        "Zəmanət",
        "1 il (qeydiyyatla 3 ilə qədər)",
        "ru",
      ),
    ).toBe("1 год (до 3 лет при регистрации)");
    expect(localizeProductAttributeValue("Məsafə", "15 m-ədək", "en")).toBe(
      "up to 15 m",
    );
    expect(
      localizeProductAttributeValue("Rəng", "Bənövşəyi (Magenta)", "en"),
    ).toBe("Purple (Magenta)");
    expect(
      localizeProductAttributeValue(
        "Düymə sayı",
        "3 düymə (sol, sağ və diyircək düyməsi)",
        "en",
      ),
    ).toMatch(/scroll wheel/i);
    expect(
      localizeProductAttributeValue(
        "Əlavə xüsusiyyətlər",
        "USB-C PD 3.0 divar adapteri; 65 W; 5/9/15/20 V; 1.7 m kabel; 56x28.5x56 mm; 175 q; qara; EU fiş; 1 il zəmanət",
        "en",
      ),
    ).not.toMatch(/[əöğşüçı]/i);
    expect(localizeProductAttributeValue("Korpus", "SFF, qara", "en")).toBe(
      "SFF, black",
    );
    expect(
      localizeProductAttributeValue("Korpus", "Slate boz", "en"),
    ).toMatch(/gray/i);
    expect(
      localizeProductAttributeValue("MTBF", "1.5 milyon saat", "en"),
    ).toMatch(/million hours/i);
    expect(
      localizeProductAttributeValue("Növ", "oyun noutbuk çantası", "en"),
    ).toMatch(/gaming laptop bag/i);
    expect(
      localizeProductAttributeValue("Çap sürəti (qara, ISO)", "7.5 səh/dəq", "en"),
    ).toBe("7.5 ppm");
    expect(
      localizeProductAttributeValue("Çap sürəti (qara, ISO)", "7.5 səh/dəq", "ru"),
    ).toBe("7.5 стр/мин");
    expect(
      localizeProductAttributeValue(
        "Texnologiya",
        "hermetik, texniki xidmət tələb etmir",
        "en",
      ),
    ).toMatch(/sealed/i);
    expect(
      localizeProductAttributeValue(
        "HDMI",
        "4K@60 Hz (DP 1.4 host tələb edir)",
        "en",
      ),
    ).not.toMatch(/\bedir\b/i);
    expect(
      localizeProductAttributeValue("Keçid vaxtı", "tipik 6 ms (maks. 10 ms)", "en"),
    ).toMatch(/typical/i);
  });
});
