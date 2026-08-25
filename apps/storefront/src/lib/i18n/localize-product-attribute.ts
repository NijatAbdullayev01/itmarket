import { EXTRA_AZ_FRAGMENTS, EXTRA_LIVE_SPEC_VALUES } from "./catalog-az-lexicon";
import { EXTRA_CATALOG_SPEC_VALUES } from "./catalog-spec-values";
import type { Locale } from "./locales";
import type { StorefrontMessages } from "./messages";

const COLOR_KEYS = new Set(
  [
    "rəng",
    "reng",
    "color",
    "renk",
    "цвет",
    "rəng (korpus)",
    "reng (korpus)",
    "color (chassis)",
    "цвет (корпус)",
  ].map((label) => label.toLocaleLowerCase("az")),
);

/** Catalog color names stored in Azerbaijani → localized display labels. */
const CATALOG_COLOR_LABELS: Record<
  string,
  Partial<Record<Exclude<Locale, "az">, string>>
> = {
  Ağ: { en: "White", ru: "Белый" },
  "Ağ (White)": { en: "White", ru: "Белый" },
  "Açıq boz": { en: "Light Gray", ru: "Светло-серый" },
  Bej: { en: "Beige", ru: "Бежевый" },
  Bənövşəyi: { en: "Purple", ru: "Фиолетовый" },
  Boz: { en: "Gray", ru: "Серый" },
  Çəhrayı: { en: "Pink", ru: "Розовый" },
  "Çəhrayı-göy": { en: "Pink-Blue", ru: "Розово-синий" },
  "Dark Ash Silver": { en: "Dark Ash Silver", ru: "Тёмно-пепельный серебристый" },
  "Dərin bənövşəyi": { en: "Deep Purple", ru: "Тёмно-фиолетовый" },
  Göy: { en: "Blue", ru: "Синий" },
  Gümüşü: { en: "Silver", ru: "Серебристый" },
  "Kosmik Boz": { en: "Space Gray", ru: "Космический серый" },
  "Kosmik Boz (Space Gray)": { en: "Space Gray", ru: "Космический серый" },
  "Kosmik Boz / Ağ": { en: "Space Gray / White", ru: "Космический серый / Белый" },
  "16.7 milyon; ~83% CIE 1976 / 72% NTSC": {
    en: "16.7 million; ~83% CIE 1976 / 72% NTSC",
    ru: "16.7 млн; ~83% CIE 1976 / 72% NTSC",
  },
  "Kosmik narıncı": { en: "Cosmic Orange", ru: "Космический оранжевый" },
  Mavi: { en: "Blue", ru: "Синий" },
  "Mavi (Cyan)": { en: "Cyan", ru: "Голубой (Cyan)" },
  "Luna Grey": { en: "Luna Grey", ru: "Серый Luna" },
  Narıncı: { en: "Orange", ru: "Оранжевый" },
  Qara: { en: "Black", ru: "Чёрный" },
  "Qara (Black)": { en: "Black", ru: "Чёрный" },
  "Qara / Ağ vurğularla": { en: "Black with white accents", ru: "Чёрный с белыми акцентами" },
  "Qara / Qırmızı": { en: "Black / Red", ru: "Чёрно-красный" },
  "Qara / Qırmızı (Black-Red)": { en: "Black / Red", ru: "Чёрно-красный" },
  Qırmızı: { en: "Red", ru: "Красный" },
  Qızılı: { en: "Gold", ru: "Золотой" },
  Rəngli: { en: "Color", ru: "Цветной" },
  Sarı: { en: "Yellow", ru: "Жёлтый" },
  Silver: { en: "Silver", ru: "Серебристый" },
  "Space Gray": { en: "Space Gray", ru: "Space Gray" },
  Şəffaf: { en: "Transparent", ru: "Прозрачный" },
  Titan: { en: "Titanium", ru: "Титан" },
  "Titan Ağ": { en: "White Titanium", ru: "Белый титан" },
  "Titan Bənövşəyi": { en: "Purple Titanium", ru: "Фиолетовый титан" },
  "Titan Gümüşü": { en: "Natural Titanium", ru: "Натуральный титан" },
  "Titan Mavi": { en: "Blue Titanium", ru: "Синий титан" },
  "Titan Qara": { en: "Black Titanium", ru: "Чёрный титан" },
  "Tünd boz": { en: "Dark Gray", ru: "Тёмно-серый" },
  "Tünd göy": { en: "Midnight Blue", ru: "Тёмно-синий" },
  "Tünd mavi": { en: "Deep Blue", ru: "Тёмно-синий" },
  Ultramarin: { en: "Ultramarine", ru: "Ультрамарин" },
  "Ultramarin mavi": { en: "Ultramarine Blue", ru: "Ультрамариновый синий" },
  Yaşıl: { en: "Green", ru: "Зелёный" },
  "Zərif Çəhrayı": { en: "Mallow Pink", ru: "Нежно-розовый" },
  "Zərif Çəhrayı (Mallow Pink)": { en: "Mallow Pink", ru: "Нежно-розовый (Mallow Pink)" },
  "Bənövşəyi (Magenta)": { en: "Purple (Magenta)", ru: "Фиолетовый (Magenta)" },
  "Açıq mavi": { en: "Light Blue", ru: "Голубой" },
  "Açıq mavi (WORM)": { en: "Light Blue (WORM)", ru: "Голубой (WORM)" },
  "Paslanmayan polad / bənövşəyi": {
    en: "Stainless steel / purple",
    ru: "Нержавеющая сталь / фиолетовый",
  },
  "Çoxrəngli": { en: "Multicolor", ru: "Многоцветный" },
  "Zümrüd": { en: "Emerald", ru: "Изумрудный" },
  "Qızılı / şampan": { en: "Gold / champagne", ru: "Золотой / шампань" },
  "Qızılı / şampan (C)": { en: "Gold / champagne (C)", ru: "Золотой / шампань (C)" },
  "Business black (qara)": { en: "Business black", ru: "Деловой чёрный" },
  "Deep Valley Black (qara)": { en: "Deep Valley Black", ru: "Deep Valley Black" },
  "Jet black (qara)": { en: "Jet black", ru: "Иссиня-чёрный" },
  "Rock black (qara)": { en: "Rock black", ru: "Иссиня-чёрный Rock" },
  "Boz RAL 7035 (.02)": { en: "Gray RAL 7035 (.02)", ru: "Серый RAL 7035 (.02)" },
  "Slate boz": { en: "Slate gray", ru: "Серый Slate" },
  "black incə teksturalı / white mat / gray mat": {
    en: "fine-textured black / matte white / matte gray",
    ru: "мелкотекстурированный чёрный / матовый белый / матовый серый",
  },
  "RGB + ağ": { en: "RGB + white", ru: "RGB + белый" },
  "Tünd zeytun": { en: "Dark olive", ru: "Тёмно-оливковый" },
  "Tünd yaşıl": { en: "Dark green", ru: "Тёмно-зелёный" },
  Bordo: { en: "Burgundy", ru: "Бордовый" },
  "Rəngli (CMYK, 4 şüşə)": { en: "Color (CMYK, 4 bottles)", ru: "Цветной (CMYK, 4 флакона)" },
  "Rəngli (CMYK, 4 kartric)": {
    en: "Color (CMYK, 4 cartridges)",
    ru: "Цветной (CMYK, 4 картриджа)",
  },
  "Yaşıl fon üzərində qara yazı (Black on Green)": {
    en: "Black print on a green background",
    ru: "Чёрная надпись на зелёном фоне",
  },
  "Black, cızıqlara davamlı örtük": {
    en: "Black, scratch-resistant coating",
    ru: "Чёрный, покрытие устойчиво к царапинам",
  },
  "RGB + ağ, 16 mln rəng": {
    en: "RGB + white, 16 million colors",
    ru: "RGB + белый, 16 млн цветов",
  },
  "Jet black (qara), çıxarılan rezin tutacaqlar": {
    en: "Jet black, removable rubber grips",
    ru: "Иссиня-чёрный, съёмные резиновые рукоятки",
  },
  "AP22 qövdəsinə uyğun ağ": {
    en: "White, matching the AP22 housing",
    ru: "Белый, в цвет корпуса AP22",
  },
  "Sink örtüklü polad": { en: "Zinc-coated steel", ru: "Сталь с цинковым покрытием" },
  "SFF (Small Form Factor), qara": {
    en: "SFF (Small Form Factor), black",
    ru: "SFF (Small Form Factor), чёрный",
  },
  "Açıq mavi (Cisco Light Blue)": {
    en: "Light blue (Cisco Light Blue)",
    ru: "Голубой (Cisco Light Blue)",
  },
  "Sunrise Red (qırmızı)": { en: "Sunrise Red", ru: "Sunrise Red" },
  Yasəmən: { en: "Lilac", ru: "Сиреневый" },
  Firuzəyi: { en: "Turquoise", ru: "Бирюзовый" },
  Mərcan: { en: "Coral", ru: "Коралловый" },
  "Quartz (çəhrayı)": { en: "Quartz (pink)", ru: "Quartz (розовый)" },
  "Gece göyü": { en: "Midnight blue", ru: "Ночной синий" },
  "Qırmızı (Red)": { en: "Red", ru: "Красный" },
  "Mercury (ağ)": { en: "Mercury (white)", ru: "Mercury (белый)" },
  "Garnet red (qranat qırmızı)": { en: "Garnet red", ru: "Гранатовый красный" },
  "Garnet red (qranat qırmızı; prays-listdə: brown)": {
    en: "Garnet red (listed as brown in the price list)",
    ru: "Гранатовый красный (в прайсе: brown)",
  },
  "Mavi fon üzərində qara yazı (Black on Blue)": {
    en: "Black print on a blue background",
    ru: "Чёрная надпись на синем фоне",
  },
  "Bənövşəyi / Paslanmayan polad": {
    en: "Purple / stainless steel",
    ru: "Фиолетовый / нержавеющая сталь",
  },
};

function normalizeKey(label: string): string {
  return foldAz(label);
}

/** Case-fold for AZ catalog text without turning English "I" into "ı" or "İ" into "i̇". */
function foldAz(text: string): string {
  return text
    .trim()
    .replace(/\u0130/g, "i")
    .replace(/i\u0307/gi, "i")
    .toLowerCase()
    .replace(/i\u0307/g, "i")
    .normalize("NFC");
}

function findCatalogColorKey(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  for (const key of Object.keys(CATALOG_COLOR_LABELS)) {
    if (
      key.localeCompare(trimmed, "az", { sensitivity: "base" }) === 0
    ) {
      return key;
    }
  }

  return null;
}

/** Serializable color → label map for Client Components (no functions over RSC). */
export function catalogColorLabelMap(locale: Locale): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const key of Object.keys(CATALOG_COLOR_LABELS)) {
    labels[key] = localizeCatalogColor(key, locale);
  }
  return labels;
}

export function localizeCatalogColor(
  value: string,
  locale: Locale,
): string {
  if (locale === "az") {
    return value;
  }

  const key = findCatalogColorKey(value);
  if (key !== null) {
    return CATALOG_COLOR_LABELS[key]?.[locale] ?? value;
  }

  // Fallback for compound / parenthesized colors
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes("qara") && lower.includes("ağ")) {
    return locale === "en" ? "Black with white accents" : "Чёрный с белыми акцентами";
  }
  if (lower.includes("qara") && lower.includes("qırmızı")) {
    return locale === "en" ? "Black / Red" : "Чёрно-красный";
  }
  if (lower.includes("kosmik boz")) {
    return locale === "en" ? "Space Gray" : "Космический серый";
  }
  if (lower.includes("mallow pink") || lower.includes("zərif çəhrayı")) {
    return locale === "en" ? "Mallow Pink" : "Нежно-розовый (Mallow Pink)";
  }
  if (lower.includes("qara")) {
    return locale === "en" ? "Black" : "Чёрный";
  }
  if (lower.includes("boz")) {
    return locale === "en" ? "Gray" : "Серый";
  }
  if (lower.startsWith("ağ") || lower.startsWith("ag")) {
    return locale === "en" ? "White" : "Белый";
  }
  if (lower.startsWith("mavi")) {
    const gloss = trimmed.match(/\(([^)]*)\)/);
    const base = locale === "en" ? "Blue" : "Синий";
    return gloss ? `${base} (${gloss[1]})` : base;
  }
  if (lower.startsWith("bej")) {
    const gloss = trimmed.match(/\(([^)]*)\)/);
    const base = locale === "en" ? "Beige" : "Бежевый";
    return gloss ? `${base} (${gloss[1]})` : base;
  }
  if (lower.includes("mat") && lower.includes("black")) {
    return locale === "en" ? "Matte Black" : "Матовый чёрный";
  }

  // Drop redundant Azerbaijani color gloss, e.g. "Ocean Blue (mavi)" → "Ocean Blue".
  const withoutGloss = trimmed.replace(/\s*\(mavi\)\s*/giu, "").trim();
  if (withoutGloss !== trimmed && withoutGloss !== "") {
    return withoutGloss;
  }

  return value;
}

export function localizeProductAttributeLabel(
  label: string,
  messages: StorefrontMessages,
): string {
  const map = messages.product.attributeLabels;
  const normalized = normalizeKey(label);
  for (const [source, translated] of Object.entries(map)) {
    if (normalizeKey(source) === normalized) {
      return translated;
    }
  }
  return label;
}

export function isColorAttributeLabel(label: string): boolean {
  return COLOR_KEYS.has(normalizeKey(label));
}

const COMMON_VALUE_TRANSLATIONS: Record<
  string,
  { en: string; ru: string }
> = {
  "line-interactive": { en: "Line-interactive", ru: "Линейно-интерактивная" },
  "on-line": { en: "Online", ru: "Онлайн" },
  "online": { en: "Online", ru: "Онлайн" },
  "standby": { en: "Standby", ru: "Резервная (Standby)" },
  "təmiz sinus": { en: "Pure sine wave", ru: "Чистая синусоида" },
  "təmiz sinus dalğası": { en: "Pure sine wave", ru: "Чистая синусоида" },
  "approksimasiya olunmuş sinus": {
    en: "Stepped approximation to a sinewave",
    ru: "Аппроксимированная синусоида",
  },
  "stepped approximation to a sinewave": {
    en: "Stepped approximation to a sinewave",
    ru: "Ступенчатая аппроксимация синусоиды",
  },
  "stepped approximation (line-interactive)": {
    en: "Stepped approximation (line-interactive)",
    ru: "Ступенчатая аппроксимация (линейно-интерактивный)",
  },
  "4 rozetka": { en: "4 outlets", ru: "4 розетки" },
  "8 schuko (6 ehtiyat + 2 surge)": {
    en: "8 Schuko (6 battery backup + 2 surge)",
    ru: "8 Schuko (6 с резервным питанием + 2 защита от скачков)",
  },
  "8 schuko rozetka (6 ehtiyat + 2 yalnız surge)": {
    en: "8 Schuko outlets (6 battery backup + 2 surge-only)",
    ru: "8 розеток Schuko (6 с резервным питанием + 2 только защита от скачков)",
  },
  "4 schuko": { en: "4 Schuko", ru: "4 Schuko" },
  "4 schuko rozetka": { en: "4 Schuko outlets", ru: "4 розетки Schuko" },
  "ventilyator (fan) modulu": { en: "Fan module", ru: "Модуль вентилятора" },
  "universal telephone headset kabeli / cord": {
    en: "Universal telephone headset cord",
    ru: "Универсальный кабель телефонной гарнитуры",
  },
  "duo (stereo / iki qulaq)": {
    en: "Duo (stereo / both ears)",
    ru: "Duo (стерео / оба уха)",
  },
  "usb kondensator mikrofon (solocast)": {
    en: "USB condenser microphone (SoloCast)",
    ru: "USB конденсаторный микрофон (SoloCast)",
  },
  "hyperx vision s veb kamera": {
    en: "HyperX Vision S webcam",
    ru: "Веб-камера HyperX Vision S",
  },
  "naqilli rgb oyun pultu (clutch gladiate)": {
    en: "Wired RGB gaming controller (Clutch Gladiate)",
    ru: "Проводной RGB игровой контроллер (Clutch Gladiate)",
  },
  "usb audio mikser (hyperx audio mixer)": {
    en: "USB audio mixer (HyperX Audio Mixer)",
    ru: "USB аудиомикшер (HyperX Audio Mixer)",
  },
  "usb-c multifunksional hub": {
    en: "USB-C multifunctional hub",
    ru: "Многофункциональный USB-C хаб",
  },
  "led lent": { en: "LED strip", ru: "Светодиодная лента" },
  "wired call-center headset": {
    en: "Wired call-center headset",
    ru: "Проводная гарнитура для колл-центра",
  },
  "bluetooth headset (blueparrott / jabra)": {
    en: "Bluetooth headset (BlueParrott / Jabra)",
    ru: "Bluetooth-гарнитура (BlueParrott / Jabra)",
  },
  "professional wireless dect headset": {
    en: "Professional wireless DECT headset",
    ru: "Профессиональная беспроводная DECT-гарнитура",
  },
  "wired stereo headset": {
    en: "Wired stereo headset",
    ru: "Проводная стереогарнитура",
  },
  "foldable wireless stereo headset": {
    en: "Foldable wireless stereo headset",
    ru: "Складная беспроводная стереогарнитура",
  },
  "premium wireless stereo headset + charging stand": {
    en: "Premium wireless stereo headset + charging stand",
    ru: "Премиальная беспроводная стереогарнитура + зарядная станция",
  },
  "true wireless earbuds (uc)": {
    en: "True wireless earbuds (UC)",
    ru: "Беспроводные TWS-наушники (UC)",
  },
  "usb adapter / link": {
    en: "USB adapter / link",
    ru: "USB-адаптер / линк",
  },
  "portable speakerphone": {
    en: "Portable speakerphone",
    ru: "Портативный спикерфон",
  },
  "intelligent video bar / conferencing camera": {
    en: "Intelligent video bar / conferencing camera",
    ru: "Интеллектуальная видеокамера для конференций",
  },
  "wireless stereo headset (evolve3)": {
    en: "Wireless stereo headset (Evolve3)",
    ru: "Беспроводная стереогарнитура (Evolve3)",
  },
  "indoor wi-fi 6 (802.11ax) access point": {
    en: "Indoor Wi-Fi 6 (802.11ax) access point",
    ru: "Внутренняя точка доступа Wi-Fi 6 (802.11ax)",
  },
  "indoor wi-fi 6 (802.11ax) access point (mid-range / dense)": {
    en: "Indoor Wi-Fi 6 (802.11ax) access point (mid-range / dense)",
    ru: "Внутренняя точка доступа Wi-Fi 6 (802.11ax), средний класс / высокая плотность",
  },
  "10g sfp+ dac (direct attach copper)": {
    en: "10G SFP+ DAC (direct attach copper)",
    ru: "10G SFP+ DAC (прямой медный кабель)",
  },
  "cpu heatsink": { en: "CPU heatsink", ru: "Радиатор процессора" },
  "dect voip base station": {
    en: "DECT VoIP Base Station",
    ru: "Базовая станция DECT VoIP",
  },
  "enterprise gigabit ethernet + 4g lte router": {
    en: "Enterprise Gigabit Ethernet + 4G LTE router",
    ru: "Корпоративный маршрутизатор Gigabit Ethernet + 4G LTE",
  },
  "l2 ethernet switch (fiber)": {
    en: "L2 Ethernet Switch (Fiber)",
    ru: "Коммутатор L2 Ethernet (оптика)",
  },
  "wi-fi access point (wlan ap)": {
    en: "Wi-Fi Access Point (WLAN AP)",
    ru: "Точка доступа Wi-Fi (WLAN AP)",
  },
  "yandex stansiya mini plus (mini 2)": {
    en: "Yandex Station Mini Plus (Mini 2)",
    ru: "Яндекс Станция Мини Плюс (Мини 2)",
  },
  "yandex stansiya strit": {
    en: "Yandex Station Street",
    ru: "Яндекс Станция Стрит",
  },
  "yandex lamp": { en: "Yandex Lamp", ru: "Яндекс Лампа" },
  "quraşdırılmış": { en: "Built-in", ru: "Встроенный" },
  "xarici": { en: "External", ru: "Внешний" },
  "yeni": { en: "New", ru: "Новый" },
  "işlənmiş": { en: "Used", ru: "Б/у" },
  "islenmis": { en: "Used", ru: "Б/у" },
  "bəli": { en: "Yes", ru: "Да" },
  "beli": { en: "Yes", ru: "Да" },
  "xeyr": { en: "No", ru: "Нет" },
  "yox": { en: "No", ru: "Нет" },
  "tam yeni (istifadə olunmamış, orijinal rəsmi qablaşdırmada)": {
    en: "Brand new (unused, in original retail packaging)",
    ru: "Новый (неиспользованный, в оригинальной упаковке)",
  },
  "işlənmiş (tam test edilmiş və saz vəziyyətdə)": {
    en: "Used (fully tested and in working condition)",
    ru: "Б/у (протестирован, в рабочем состоянии)",
  },
  "simli erqonomik oyun siçanı": {
    en: "Wired ergonomic gaming mouse",
    ru: "Проводная эргономичная игровая мышь",
  },
  "şəffaf korpuslu simli peşəkar oyun siçanı": {
    en: "Transparent body wired professional gaming mouse",
    ru: "Проводная профессиональная игровая мышь с прозрачным корпусом",
  },
  "simsiz erqonomik optik siçan": {
    en: "Wireless ergonomic optical mouse",
    ru: "Беспроводная эргономичная оптическая мышь",
  },
  "simsiz tws bluetooth qulaqlıq": {
    en: "Wireless TWS Bluetooth earbuds",
    ru: "Беспроводные TWS Bluetooth-наушники",
  },
  "peşəkar 4k ultra hd avtomobil videoqeydiyyatçısı": {
    en: "Professional 4K Ultra HD dash cam",
    ru: "Профессиональный автомобильный видеорегистратор 4K Ultra HD",
  },
  "tam ölçülü (full-size 100%) oyun klaviaturası": {
    en: "Full-size (100%) gaming keyboard",
    ru: "Полноразмерная (100%) игровая клавиатура",
  },
  "tam ölçülü 104 düyməli membran oyun klaviaturası": {
    en: "Full-size 104-key membrane gaming keyboard",
    ru: "Полноразмерная 104-клавишная мембранная игровая клавиатура",
  },
  "tam ölçülü simli membran klaviatura + erqonomik simli optik siçan": {
    en: "Full-size wired membrane keyboard + ergonomic wired optical mouse",
    ru: "Полноразмерная проводная мембранная клавиатура + эргономичная проводная оптическая мышь",
  },
  "simsiz erqonomik klaviatura və simsiz optik siçan (vahid usb nano adapter vasitəsilə qoşulur)": {
    en: "Wireless ergonomic keyboard and wireless optical mouse (connected via single USB Nano adapter)",
    ru: "Беспроводная эргономичная клавиатура и беспроводная оптическая мышь (подключение через один USB-наноадаптер)",
  },
  "qoruyucu silikon keys daxildir": {
    en: "Protective silicone case included",
    ru: "Защитный силиконовый чехол в комплекте",
  },
  "tavan və divar montaj dəsti daxildir": {
    en: "Ceiling and wall mounting kit included",
    ru: "Комплект для потолочного и настенного монтажа в комплекте",
  },
  "10 milyon klik": {
    en: "10 million clicks",
    ru: "10 миллионов кликов",
  },
  "10 milyon basılma ömrü": {
    en: "10 million keystroke lifespan",
    ru: "Ресурс 10 миллионов нажатий",
  },
  "10 milyondan çox basılma ömrü": {
    en: "Over 10 million keystroke lifespan",
    ru: "Ресурс более 10 миллионов нажатий",
  },
  "10 milyon klik, 19 düyməlik anti-ghosting": {
    en: "10 million clicks, 19-key Anti-Ghosting",
    ru: "10 миллионов кликов, 19-клавишный Anti-Ghosting",
  },
  "nəmə qarşı daxili qoruyucu lay": {
    en: "Internal moisture-resistant protective layer",
    ru: "Внутренний влагозащитный слой",
  },
  "nəmə və maye sıçramalarına qarşı daxili qoruyucu konstruksiya": {
    en: "Moisture and spill-resistant internal structure",
    ru: "Влагозащитная конструкция с защитой от брызг",
  },
  "daxili 1000 mah təkrar doldurulan batareya": {
    en: "Built-in 1000 mAh rechargeable battery",
    ru: "Встроенный перезаряжаемый аккумулятор 1000 мАч",
  },
  "500 mah daxili akkumulyator": {
    en: "500 mAh built-in rechargeable battery",
    ru: "Встроенный аккумулятор 500 мАч",
  },
  "1× aa batareya": {
    en: "1× AA battery",
    ru: "1× батарейка AA",
  },
  "1× aa batareya (avtomatik enerjiyə qənaət və yuxu rejimi)": {
    en: "1× AA battery (auto energy saving and sleep mode)",
    ru: "1× батарейка AA (автоматическое энергосбережение и спящий режим)",
  },
  "2× aaa batareya (uzunmüddətli enerji qənaət rejimi)": {
    en: "2× AAA batteries (long-term energy saving mode)",
    ru: "2× батарейки AAA (режим длительного энергосбережения)",
  },
  "aa tipli batareyalar": {
    en: "AA type batteries",
    ru: "Батарейки типа AA",
  },
  "5 ghz üzrə 2402 mbps, 2.4 ghz üzrə 574 mbps (ümumi 2976 mbps)": {
    en: "2402 Mbps on 5 GHz, 574 Mbps on 2.4 GHz (total 2976 Mbps)",
    ru: "2402 Мбит/с на 5 ГГц, 574 Мбит/с на 2.4 ГГц (всего 2976 Мбит/с)",
  },
  "5 ghz üzrə 1201 mbps, 2.4 ghz üzrə 300 mbps (ümumi ax1500)": {
    en: "1201 Mbps on 5 GHz, 300 Mbps on 2.4 GHz (total AX1500)",
    ru: "1201 Мбит/с на 5 ГГц, 300 Мбит/с на 2.4 ГГц (всего AX1500)",
  },
  "5 ghz üzrə 867 mbps, 2.4 ghz üzrə 300 mbps (ümumi ac1200)": {
    en: "867 Mbps on 5 GHz, 300 Mbps on 2.4 GHz (total AC1200)",
    ru: "867 Мбит/с на 5 ГГц, 300 Мбит/с на 2.4 ГГц (всего AC1200)",
  },
  "5 ghz üzrə 867 mbps, 2.4 ghz üzrə 300 mbps (ümumi 1.2 gbps)": {
    en: "867 Mbps on 5 GHz, 300 Mbps on 2.4 GHz (total 1.2 Gbps)",
    ru: "867 Мбит/с на 5 ГГц, 300 Мбит/с на 2.4 ГГц (всего 1.2 Гбит/с)",
  },
  "1× gigabit ethernet (rj-45) portu (ieee 802.3at poe dəstəkli)": {
    en: "1× Gigabit Ethernet (RJ-45) port (IEEE 802.3at PoE supported)",
    ru: "1× порт Gigabit Ethernet (RJ-45) (поддержка IEEE 802.3at PoE)",
  },
  "802.3at poe və ya 12v dc xarici qida adapteri (poe+ dəstəyi)": {
    en: "802.3at PoE or 12V DC external power adapter (PoE+ supported)",
    ru: "802.3at PoE или внешний адаптер питания 12 В пост. тока (поддержка PoE+)",
  },
  "omada sdn mərkəzləşdirilmiş bulud idarəetməsi, omada mesh simsiz körpü, seamless roaming (fasiləsiz keçid), he160 (160 mhz kanal zolağı), ofdma, mu-mimo, wpa3 təhlükəsizlik şifrələməsi, 250+ eyni vaxtda istifadəçi tutumu": {
    en: "Omada SDN centralized cloud management, Omada Mesh wireless bridge, Seamless Roaming, HE160 (160 MHz channel bandwidth), OFDMA, MU-MIMO, WPA3 security encryption, 250+ concurrent client capacity",
    ru: "Централизованное облачное управление Omada SDN, беспроводной мост Omada Mesh, бесшовный роуминг (Seamless Roaming), HE160 (полоса 160 МГц), OFDMA, MU-MIMO, шифрование WPA3, 250+ одновременных подключений",
  },
  "6× 10/100 mbps rj45 port (4 ədəd poe+ port, 2 ədəd uplink port)": {
    en: "6× 10/100 Mbps RJ45 ports (4 PoE+ ports, 2 Uplink ports)",
    ru: "6 портов RJ45 10/100 Мбит/с (4 порта PoE+, 2 порта Uplink)",
  },
  "5× 10/100 mbps rj45 portu (auto-negotiation, auto mdi/mdix)": {
    en: "5× 10/100 Mbps RJ45 ports (Auto-Negotiation, Auto MDI/MDIX)",
    ru: "5 портов RJ45 10/100 Мбит/с (автосогласование, авто-MDI/MDIX)",
  },
  "8× 10/100 mbps rj45 portu (auto-negotiation, auto mdi/mdix)": {
    en: "8× 10/100 Mbps RJ45 ports (Auto-Negotiation, Auto MDI/MDIX)",
    ru: "8 портов RJ45 10/100 Мбит/с (автосогласование, авто-MDI/MDIX)",
  },
  "5× 10/100/1000 mbps gigabit rj45 port (1–4 portlar poe+ dəstəkli)": {
    en: "5× 10/100/1000 Mbps Gigabit RJ45 ports (ports 1–4 support PoE+)",
    ru: "5 портов Gigabit RJ45 10/100/1000 Мбит/с (порты 1–4 с поддержкой PoE+)",
  },
  "ümumi 65w (hər bir poe porta 30w-a qədər güc)": {
    en: "Total 65W (up to 30W per PoE port)",
    ru: "Общий бюджет 65 Вт (до 30 Вт на каждый порт PoE)",
  },
  "ümumi 65w (hər porta 30w-a qədər)": {
    en: "Total 65W (up to 30W per port)",
    ru: "Общий бюджет 65 Вт (до 30 Вт на порт)",
  },
  "extend mode rejimində 250 metrə qədər kabel vasitəsilə qidalanma və məlumat ötürülməsi": {
    en: "Up to 250m power and data transmission in Extend Mode",
    ru: "Передача питания и данных на расстояние до 250 м в режиме Extend Mode",
  },
  "isolation mode (bir toxunuşla portların təhlükəsiz ayrılması), poe auto recovery (donmuş ip kameraların avtomatik bərpası), fansız tam səssiz iş rejimi (fanless), plug and play": {
    en: "Isolation Mode (one-touch port isolation), PoE Auto Recovery (automatic reboot of frozen IP cameras), Fanless silent operation, Plug and Play",
    ru: "Режим изоляции (изоляция портов в одно касание), PoE Auto Recovery (автовосстановление зависших IP-камер), безвентиляторный бесшумный режим (Fanless), Plug and Play",
  },
  "green ethernet texnologiyası ilə enerjiyə qənaət, fansız səssiz dizayn (fanless), masaüstü və divara montaj imkanı, quraşdırma tələb etmir (plug and play)": {
    en: "Green Ethernet energy-saving technology, fanless quiet design, desktop and wall mounting, Plug and Play",
    ru: "Энергосберегающая технология Green Ethernet, бесшумный безвентиляторный дизайн (Fanless), настольный и настенный монтаж, Plug and Play",
  },
  "green ethernet enerjiyə qənaət texnologiyası, kompakt plastik korpus, fansız səssiz konstruksiya, plug and play": {
    en: "Green Ethernet energy-saving technology, compact plastic casing, fanless silent construction, Plug and Play",
    ru: "Энергосберегающая технология Green Ethernet, компактный пластиковый корпус, бесшумная безвентиляторная конструкция, Plug and Play",
  },
  "extend mode (250 metr məsafəyə qədər poe ötürülməsi), poe auto recovery (donmuş cihazların avtomatik bərpası), 802.1p/dscp qos prioritetləşdirmə, dayanıqlı metal korpus, fansız səssiz soyutma": {
    en: "Extend Mode (PoE transmission up to 250m), PoE Auto Recovery, 802.1p/DSCP QoS prioritization, durable metal housing, fanless quiet cooling",
    ru: "Режим Extend Mode (передача PoE до 250 м), PoE Auto Recovery, приоритезация 802.1p/DSCP QoS, прочный металлический корпус, бесшумное охлаждение",
  },
  "bütün ev üçün mesh wi-fi 6 sistemi (2 moduldan ibarət komplekt)": {
    en: "Whole-home Mesh Wi-Fi 6 system (2-pack unit)",
    ru: "Mesh Wi-Fi 6 система для всего дома (комплект из 2 модулей)",
  },
  "bütün ev üçün ac1200 mesh wi-fi sistemi (2 modul)": {
    en: "Whole-home AC1200 Mesh Wi-Fi system (2-pack)",
    ru: "Mesh Wi-Fi система AC1200 для всего дома (2 модуля)",
  },
  "360 m²-ə qədər fasiləsiz və ölü zonasız wi-fi sahəsi": {
    en: "Up to 360 m² seamless and dead-zone-free Wi-Fi coverage",
    ru: "Бесшовное покрытие Wi-Fi без мертвых зон до 360 м²",
  },
  "260 m²-ə qədər fasiləsiz wi-fi örtüyü": {
    en: "Up to 260 m² seamless Wi-Fi coverage",
    ru: "Бесшовное покрытие Wi-Fi до 260 м²",
  },
  "hər modulda 2× gigabit ethernet portu (wan/lan avtomatik aşkarlama)": {
    en: "2× Gigabit Ethernet ports per unit (WAN/LAN auto-sensing)",
    ru: "2 порта Gigabit Ethernet на каждом модуле (автоопределение WAN/LAN)",
  },
  "hər modulda 2× gigabit ethernet portu (wan/lan avtomatik təyin olunur)": {
    en: "2× Gigabit Ethernet ports per unit (WAN/LAN auto-sensing)",
    ru: "2 порта Gigabit Ethernet на каждом модуле (автоопределение WAN/LAN)",
  },
  "ai ilə gücləndirilmiş mesh şəbəkə, seamless roaming (tək şəbəkə adı altında evin hər yerində kəsintisiz internet), 120-dən çox cihaza eyni vaxtda stabil bağlantı, valideyn nəzarəti (parental controls), wpa3 şifrələmə, deco tətbiqi ilə 3 dəqiqəyə asan quraşdırma": {
    en: "AI-driven Mesh network, Seamless Roaming under single network name, stable connection for 120+ devices simultaneously, Parental Controls, WPA3 encryption, easy 3-minute setup via Deco app",
    ru: "Mesh-сеть с поддержкой ИИ, бесшовный роуминг (единое имя сети по всему дому), стабильное подключение более 120 устройств, родительский контроль, шифрование WPA3, простая настройка за 3 минуты в приложении Deco",
  },
  "tp-link mesh texnologiyası, seamless roaming (tək ssid ilə kəsintisiz keçid), 100-ə qədər qoşulan cihaz tutumu, router və giriş nöqtəsi (ap) rejimləri, valideyn nəzarəti, deco mobil tətbiqi ilə idarəetmə": {
    en: "TP-Link Mesh technology, Seamless Roaming with single SSID, supports up to 100 connected devices, Router and Access Point (AP) modes, Parental Controls, Deco mobile app management",
    ru: "Технология TP-Link Mesh, бесшовный роуминг с единым SSID, поддержка до 100 устройств, режимы роутера и точки доступа (AP), родительский контроль, управление через приложение Deco",
  },
  "2 ədəd xarici tənzimlənən antena": {
    en: "2 external adjustable antennas",
    ru: "2 внешние регулируемые антенны",
  },
  "1× 10/100m ethernet (rj45) portu": {
    en: "1× 10/100M Ethernet (RJ45) port",
    ru: "1× порт 10/100M Ethernet (RJ45)",
  },
  "tp-link onemesh dəstəyi (onemesh routerlərlə vahid mesh şəbəkə yaradır), ağıllı siqnal göstərici led lampası (ən yaxşı yeri tapmaq üçün), giriş nöqtəsi (access point) rejimi, bütün standart wi-fi routerlərlə uyğunluq, tp-link tether tətbiqi ilə idarəetmə": {
    en: "TP-Link OneMesh support (creates unified mesh network with OneMesh routers), intelligent signal indicator LED, Access Point mode, compatible with all standard Wi-Fi routers, TP-Link Tether app control",
    ru: "Поддержка TP-Link OneMesh, умный светодиодный индикатор сигнала, режим точки доступа (Access Point), совместимость со всеми стандартными Wi-Fi роутерами, управление через приложение TP-Link Tether",
  },
  "110 × 110 × 114 mm (hər modul)": {
    en: "110 × 110 × 114 mm (each unit)",
    ru: "110 × 110 × 114 мм (каждый модуль)",
  },
  "90.7 × 90.7 × 190 mm (hər modul)": {
    en: "90.7 × 90.7 × 190 mm (each unit)",
    ru: "90.7 × 90.7 × 190 мм (каждый модуль)",
  },
  "daxili məkan üçün süni intellektli dönən wi-fi təhlükəsizlik kamerası": {
    en: "Indoor AI pan/tilt Wi-Fi security camera",
    ru: "Поворотная Wi-Fi камера безопасности с искусственным интеллектом для помещений",
  },
  "daxili məkan üçün dönən wi-fi təhlükəsizlik kamerası": {
    en: "Indoor pan/tilt Wi-Fi security camera",
    ru: "Поворотная Wi-Fi камера безопасности для помещений",
  },
  "xarici məkan (küçə və həyət) üçün nəzərdə tutulmuş mühafizə kamerası": {
    en: "Outdoor security camera (street and yard)",
    ru: "Уличная камера видеонаблюдения для наружной установки",
  },
  "premium xarici məkan (küçə) wi-fi təhlükəsizlik kamerası": {
    en: "Premium outdoor Wi-Fi security camera",
    ru: "Премиальная уличная Wi-Fi камера безопасности",
  },
  "360° üfüqi (pan) və 114° şaquli (tilt) əhatə": {
    en: "360° horizontal (Pan) and 114° vertical (Tilt) coverage",
    ru: "360° по горизонтали (Pan) и 114° по вертикали (Tilt)",
  },
  "360° üfüqi və 114° şaquli fırlanma": {
    en: "360° horizontal and 114° vertical rotation",
    ru: "Вращение 360° по горизонтали и 114° по вертикали",
  },
  "850 nm ir led ilə 12 metrə qədər aydın gecə görmə": {
    en: "850 nm IR LED clear night vision up to 12 meters",
    ru: "Четкое ночное видение до 12 метров с ИК-подсветкой 850 нм",
  },
  "850 nm infraqırmızı gecə görmə (9 metrə qədər)": {
    en: "850 nm infrared night vision (up to 9 meters)",
    ru: "Инфракрасное ночное видение 850 нм (до 9 метров)",
  },
  "30 metrə (98 ft) qədər güclü infraqırmızı gecə görmə məsafəsi": {
    en: "Powerful infrared night vision up to 30 meters (98 ft)",
    ru: "Мощное инфракрасное ночное видение до 30 метров (98 футов)",
  },
  "full-color night vision (quraşdırılmış 2 ədəd güclü projektor ilə zülmət qaranlıqda tam rəngli görüntü) və 30 metrə qədər ir gecə görmə": {
    en: "Full-Color Night Vision (full color in total darkness with 2 built-in spotlights) and up to 30m IR night vision",
    ru: "Полноцветное ночное видение Full-Color (2 встроенных прожектора для цветного изображения в полной темноте) и ИК-видение до 30 м",
  },
  "i̇nsan, ev heyvanı, nəqliyyat, körpə ağlaması, şüşə sınması aşkarlama və ağıllı hərəkət izləmə (smart motion tracking)": {
    en: "Human, pet, vehicle, baby crying, glass break detection and Smart Motion Tracking",
    ru: "Обнаружение людей, домашних животных, транспорта, плача ребенка, разбития стекла и умное слежение за движением (Smart Motion Tracking)",
  },
  "i̇kitərəfli səsli danışıq (daxili mikrofon və dinamik, səs-küyün ləğvi)": {
    en: "Two-way audio (built-in microphone and speaker, noise cancellation)",
    ru: "Двусторонняя аудиосвязь (встроенный микрофон и динамик, шумоподавление)",
  },
  "i̇kitərəfli səsli danışıq (daxili mikrofon və dinamik)": {
    en: "Two-way audio (built-in microphone and speaker)",
    ru: "Двусторонняя аудиосвязь (встроенный микрофон и динамик)",
  },
  "i̇kitərəfli səs (mikrofon və güclü daxili siren)": {
    en: "Two-way audio (microphone and powerful built-in siren)",
    ru: "Двусторонняя аудиосвязь (микрофон и мощная встроенная сирена)",
  },
  "i̇kitərəfli danışıq (mikrofon və fərdiləşdirilə bilən güclü səsli siren)": {
    en: "Two-way audio (microphone and customizable loud siren)",
    ru: "Двусторонняя аудиосвязь (микрофон и настраиваемая громкая сирена)",
  },
  "512 gb-a qədər microsd kart dəstəyi və tapo care bulud saxlama imkanı": {
    en: "Up to 512 GB MicroSD card support and Tapo Care cloud storage",
    ru: "Поддержка карт MicroSD до 512 ГБ и облачного хранилища Tapo Care",
  },
  "512 gb-a qədər microsd kart yuvası və bulud saxlama dəstəyi": {
    en: "Up to 512 GB MicroSD card slot and cloud storage support",
    ru: "Слот для карт MicroSD до 512 ГБ и поддержка облачного хранилища",
  },
  "512 gb-a qədər microsd kart dəstəyi və tapo care bulud saxlama": {
    en: "Up to 512 GB MicroSD card support and Tapo Care cloud storage",
    ru: "Поддержка карт MicroSD до 512 ГБ и облачного хранилища Tapo Care",
  },
  "512 gb-a qədər microsd kart yuvası və bulud dəstəyi": {
    en: "Up to 512 GB MicroSD card slot and cloud storage support",
    ru: "Слот для карт MicroSD до 512 ГБ и поддержка облака",
  },
  "səsli və işıqlı daxili siren (99 db), məxfilik rejimi (privacy mode)": {
    en: "Sound and light built-in siren (99 dB), Privacy Mode",
    ru: "Звуковая и световая встроенная сигнализация (сирена 99 дБ), режим приватности (Privacy Mode)",
  },
  "daxili səs və işıq siqnalizasiyası (siren), məxfilik rejimi (privacy mode)": {
    en: "Built-in sound and light alarm (Siren), Privacy Mode",
    ru: "Встроенная звуковая и световая сигнализация (сирена), режим приватности (Privacy Mode)",
  },
  "2.4 ghz wi-fi, alexa və google assistant dəstəyi": {
    en: "2.4 GHz Wi-Fi, Alexa and Google Assistant support",
    ru: "2.4 ГГц Wi-Fi, поддержка Alexa и Google Assistant",
  },
  "2.4 ghz wi-fi, tapo mobil tətbiqi ilə 24/7 canlı nəzarət": {
    en: "2.4 GHz Wi-Fi, 24/7 live monitoring via Tapo mobile app",
    ru: "2.4 ГГц Wi-Fi, круглосуточный мониторинг 24/7 в приложении Tapo",
  },
  "hərəkət və insan tanıma, ani smartfon xəbərdarlığı": {
    en: "Motion and person detection, instant smartphone notifications",
    ru: "Обнаружение движения и распознавание людей, мгновенные уведомления на смартфон",
  },
  "ip66 suya, toza və sərt hava şəraitinə tam davamlı korpus": {
    en: "IP66 weatherproof casing, fully resistant to water, dust and harsh weather",
    ru: "Класс защиты IP66: всепогодный корпус с полной защитой от воды, пыли и суровых условий",
  },
  "ip66 suya və toza qarşı tam davamlı xarici korpus": {
    en: "IP66 weatherproof casing, fully resistant to water and dust",
    ru: "Всепогодный корпус IP66 с полной защитой от воды и пыли",
  },
  "simsiz wi-fi və ya ethernet (rj-45) kabeli ilə qoşulma": {
    en: "Wireless Wi-Fi or Ethernet (RJ-45) cable connection",
    ru: "Беспроводное подключение по Wi-Fi или через кабель Ethernet (RJ-45)",
  },
  "wi-fi və ya ethernet (rj-45) kabel bağlantısı": {
    en: "Wi-Fi or Ethernet (RJ-45) cable connectivity",
    ru: "Подключение по Wi-Fi или через кабель Ethernet (RJ-45)",
  },
  "hərəkət və insan tanıma sensoru, ani bildirişlər": {
    en: "Motion and person detection sensor, instant notifications",
    ru: "Датчик движения и обнаружения людей, мгновенные уведомления",
  },
  "ai insan, hərəkət, xətt keçmə və ərazi mühafizə funksiyaları": {
    en: "AI human, motion, line-crossing, and area intrusion detection",
    ru: "ИИ-функции: обнаружение людей, движения, пересечения линии и контроль периметра",
  },
  "yüksək həssaslıqlı f1.6 starlight sensor": {
    en: "High-sensitivity F1.6 Starlight sensor",
    ru: "Высокочувствительный сенсор F1.6 Starlight",
  },
  "simli ofis və gündəlik istifadə üçün optik siçan": {
    en: "Wired optical mouse for office and daily use",
    ru: "Проводная оптическая мышь для офиса и повседневного использования",
  },
  "simsiz kompakt optik siçan": {
    en: "Wireless compact optical mouse",
    ru: "Беспроводная компактная оптическая мышь",
  },
  "səssiz mexanizmli simsiz optik siçan": {
    en: "Silent wireless optical mouse",
    ru: "Беспроводная оптическая мышь с бесшумными клавишами",
  },
  "instant a825 yüksək həssaslıqlı optik sensor": {
    en: "Instant A825 high-sensitivity optical sensor",
    ru: "Высокочувствительный оптический сенсор Instant A825",
  },
  "pixart 3327 peşəkar optik oyun sensoru": {
    en: "PixArt 3327 professional optical gaming sensor",
    ru: "Профессиональный оптический игровой сенсор PixArt 3327",
  },
  "dəqiq optik sensor": {
    en: "Precise optical sensor",
    ru: "Точный оптический сенсор",
  },
  "pixart 3212 yüksək dəqiqlikli optik sensor": {
    en: "PixArt 3212 high-precision optical sensor",
    ru: "Высокоточный оптический сенсор PixArt 3212",
  },
  "200 – 12 800 dpi (standart: 1000/1600/2400/3200/4800/8000/12800)": {
    en: "200 – 12,800 DPI (default: 1000/1600/2400/3200/4800/8000/12800)",
    ru: "200 – 12 800 DPI (стандартно: 1000/1600/2400/3200/4800/8000/12800)",
  },
  "200 – 12 000 dpi (proqram təminatı ilə tam tənzimlənən)": {
    en: "200 – 12,000 DPI (fully adjustable via software)",
    ru: "200 – 12 000 DPI (полная настройка через ПО)",
  },
  "7 ədəd proqramlaşdırıla bilən düymə": {
    en: "7 programmable buttons",
    ru: "7 программируемых кнопок",
  },
  "6 ədəd proqramlaşdırıla bilən düymə": {
    en: "6 programmable buttons",
    ru: "6 программируемых кнопок",
  },
  "3 düymə və rezinləşdirilmiş təkər": {
    en: "3 buttons and rubberized scroll wheel",
    ru: "3 кнопки и прорезиненное колесо прокрутки",
  },
  "4 düymə (sol, sağ, diyircək və dpi dəyişmə düyməsi)": {
    en: "4 buttons (Left, Right, Wheel and DPI button)",
    ru: "4 кнопки (левая, правая, колесо и кнопка DPI)",
  },
  "7 ədəd tam səssiz düymə (silent switch texnologiyası)": {
    en: "7 silent buttons (Silent switch technology)",
    ru: "7 бесшумных кнопок (технология Silent switch)",
  },
  "huano 10m (10 milyon klik resurslu dözümlü sviçlər)": {
    en: "Huano 10M (durable switches rated for 10M clicks)",
    ru: "Huano 10M (долговечные переключатели на 10 млн кликов)",
  },
  "huano 10m əsas düymələr, huano 3m yan düymələr": {
    en: "Huano 10M main buttons, Huano 3M side buttons",
    ru: "Huano 10M на основных кнопках, Huano 3M на боковых",
  },
  "şəffaf korpusu bürüyən dinamik rgb dynamic glow işıqlandırma": {
    en: "Dynamic RGB Dynamic Glow lighting covering transparent body",
    ru: "Динамическая подсветка RGB Dynamic Glow через прозрачный корпус",
  },
  "20g sürətlənmə, 1000 hz sorğu tezliyi, 7000 fps skan tezliyi": {
    en: "20G acceleration, 1000 Hz polling rate, 7000 FPS scan rate",
    ru: "Ускорение 20G, частота опроса 1000 Гц, частота сканирования 7000 FPS",
  },
  "20g, 7000 fps, 1000 hz usb cavab tezliyi": {
    en: "20G, 7000 FPS, 1000 Hz USB polling rate",
    ru: "Ускорение 20G, 7000 FPS, частота опроса 1000 Гц",
  },
  "1.8 metr elastik parça toxumalı usb kabel": {
    en: "1.8m flexible braided fabric USB cable",
    ru: "1.8 м гибкий тканевый плетёный USB-кабель",
  },
  "cəmi 86 qram (ultra yüngül çəki)": {
    en: "Only 86 grams (ultra lightweight)",
    ru: "Всего 86 грамм (сверхлегкий вес)",
  },
  "yan rezin reliesli əlavələr ilə sürüşməyən rahat tutuş, makroslar və düymə proqramlaşdırma dəstəyi": {
    en: "Non-slip comfortable grip with textured side rubber pads, macro and button programming support",
    ru: "Нескользящий удобный хват с рельефными боковыми резиновыми вставками, поддержка макросов и переназначения кнопок",
  },
  "silent switch tamamilə səssiz düymələr, premium soft-touch məxməri örtük, simmetrik zərif incə profil": {
    en: "Silent Switch fully silent buttons, Premium Soft-Touch velvet coating, symmetrical slim profile",
    ru: "Полностью бесшумные кнопки Silent Switch, бархатистое покрытие Premium Soft-Touch, симметричный тонкий профиль",
  },
  "kompakt və yüngül, səyahət və noutbuk istifadəsi üçün ideal": {
    en: "Compact and lightweight, ideal for travel and laptop use",
    ru: "Компактный и легкий, идеален для поездок и работы с ноутбуком",
  },
  "qara korpus üzərində qırmızı dekorativ əlavələr, erqonomik yan tutuş": {
    en: "Black body with red decorative accents, ergonomic side grip",
    ru: "Черный корпус с красными декоративными вставками, эргономичный боковой хват",
  },
  "dəyişdirilə bilən 800 / 1200 / 1600 dpi": {
    en: "Switchable 800 / 1200 / 1600 DPI",
    ru: "Переключаемое разрешение 800 / 1200 / 1600 DPI",
  },
  "800 / 1200 / 1600 dpi dəyişdirilə bilən sensor": {
    en: "800 / 1200 / 1600 DPI switchable sensor",
    ru: "Переключаемый сенсор 800 / 1200 / 1600 DPI",
  },
  "800 / 1200 / 1600 / 2400 dpi pilləli tənzimləmə": {
    en: "800 / 1200 / 1600 / 2400 DPI stepped adjustment",
    ru: "Ступенчатая регулировка 800 / 1200 / 1600 / 2400 DPI",
  },
  "3 funksional düymə və rezinləşdirilmiş təkər": {
    en: "3 functional buttons and rubberized scroll wheel",
    ru: "3 функциональные кнопки и прорезиненное колесо",
  },
  "bluetooth və 2.4 ghz usb qəbuledici (iki cihaz arasında dərhal keçid)": {
    en: "Bluetooth and 2.4 GHz USB receiver (instant switching between two devices)",
    ru: "Bluetooth и USB-приемник 2.4 ГГц (мгновенное переключение между двумя устройствами)",
  },
  "30 ips izləmə sürəti, 10g sürətlənmə": {
    en: "30 IPS tracking speed, 10G acceleration",
    ru: "Скорость слежения 30 IPS, ускорение 10G",
  },
  "hi-fi clear voice kristal səs keyfiyyəti, gb/t14471-2013 standartına tam uyğunluq": {
    en: "Hi-Fi Clear Voice crystal sound quality, fully compliant with GB/T14471-2013 standard",
    ru: "Кристальный звук Hi-Fi Clear Voice, полное соответствие стандарту GB/T14471-2013",
  },
  "intelligent in-ear induction (qulaqdan çıxardıqda pauza, taxdıqda davam etmə)": {
    en: "Intelligent In-Ear Induction (auto-pause when removed, resume when worn)",
    ru: "Интеллектуальное автообнаружение в ухе (пауза при извлечении, воспроизведение при надевании)",
  },
  "pinch / sensor toxunma idarəetməsi (musiqi və zənglərin idarəsi)": {
    en: "Pinch / Touch sensor controls (music and call control)",
    ru: "Сенсорное управление (управление музыкой и звонками)",
  },
  "magsafe və qi simsiz şarj dəstəyi + lightning / usb şarj; qulaqlıqlar 30 mah, şarj qabı 240 mah": {
    en: "MagSafe and Qi wireless charging support + Lightning / USB charging; Earbuds 30 mAh, Case 240 mAh",
    ru: "Поддержка беспроводной зарядки MagSafe и Qi + зарядка Lightning / USB; наушники 30 мАч, кейс 240 мАч",
  },
  "tək şarjla 4 saat fasiləsiz musiqi, 3.5 saat danışıq, keys ilə birlikdə 20+ saat, 100 saat gözləmə müddəti": {
    en: "4 hours music on a single charge, 3.5 hours talk time, 20+ hours with charging case, 100 hours standby",
    ru: "4 часа непрерывной музыки от одного заряда, 3.5 часа разговора, 20+ часов с кейсом, 100 часов в режиме ожидания",
  },
  "tək şarjla 6 saat musiqi, şarj keysi ilə birlikdə ümumi 26 saat": {
    en: "6 hours music on a single charge, 26 hours total with charging case",
    ru: "6 часов музыки от одного заряда, 26 часов всего вместе с зарядным кейсом",
  },
  "bluetooth 5.3 (ultra stabil əlaqə və aşağı gecikmə)": {
    en: "Bluetooth 5.3 (ultra stable connection and low latency)",
    ru: "Bluetooth 5.3 (сверхстабильное соединение и низкая задержка)",
  },
  "13.6 mm böyük dinamik kompozit membran (dərin baslar və şəffaf yüksək tezliklər)": {
    en: "13.6 mm large dynamic composite diaphragm (deep bass and clear treble)",
    ru: "13.6 мм большой динамический композитный драйвер (глубокие басы и прозрачные высокие частоты)",
  },
  "4 ədəd daxili mikrofon və süni intellektli (ai) enc küyboğma sistemi (ətraf səs-küyünü 50% azaldır, insan səsini 150% aydınlaşdırır)": {
    en: "4 built-in microphones with AI ENC noise reduction (reduces ambient noise by 50%, enhances human voice by 150%)",
    ru: "4 встроенных микрофона с ИИ-шумоподавлением ENC (снижает фоновый шум на 50%, усиливает голос на 150%)",
  },
  "ipx5 səviyyəli su və tər qoruması": {
    en: "IPX5 water and sweat resistance",
    ru: "Защита от воды и пота по стандарту IPX5",
  },
  "usb type-c sürətli şarj (1.5 saata tam dolma)": {
    en: "USB Type-C fast charging (full charge in 1.5 hours)",
    ru: "Быстрая зарядка через USB Type-C (полная зарядка за 1.5 часа)",
  },
  "i̇ki portlu usb-c gan sürətli şəbəkə şarj adapteri (eu plug)": {
    en: "Dual-port USB-C GaN fast wall charger (EU Plug)",
    ru: "Двухпортовое сетевое зарядное GaN-устройство USB-C для быстрой зарядки (EU Plug)",
  },
  "ultra kompakt gan usb-c sürətli şəbəkə adapteri (eu plug)": {
    en: "Ultra-compact GaN USB-C fast wall charger (EU Plug)",
    ru: "Ультракомпактный сетевой адаптер быстрой зарядки GaN USB-C (EU Plug)",
  },
  "ən son nəsil ganinfinity / gan ii yarımkeçirici çipi (ənənəvi adapterlərdən 21% daha kiçik və qızmayan korpus)": {
    en: "Latest generation GaNInfinity / GaN II semiconductor chip (21% smaller than conventional chargers with cool operation)",
    ru: "Новейший полупроводниковый чип GaNInfinity / GaN II (на 21% компактнее стандартных адаптеров, корпус без перегрева)",
  },
  "gallium nitride (gan) yarımkeçirici texnologiyası (yüksək enerji səmərəliliyi və minimum qızma)": {
    en: "Gallium Nitride (GaN) semiconductor technology (high energy efficiency and minimum heat)",
    ru: "Полупроводниковая технология нитрида галлия (GaN) (высокая энергоэффективность и минимальный нагрев)",
  },
  "2× usb type-c çıxışı (iki cihazı eyni vaxtda ağıllı güc paylanması ilə sürətli şarj edir)": {
    en: "2× USB Type-C outputs (fast charges two devices simultaneously with intelligent power allocation)",
    ru: "2 выхода USB Type-C (быстрая одновременная зарядка двух устройств с интеллектуальным распределением мощности)",
  },
  "macbook air m1/m2/m3, ipad pro/air, iphone 15/14/13/12 seriyaları, samsung galaxy s24/s23 ultra 45w super fast charging 2.0, planşetlər, noutbuklar və aksesuarlar": {
    en: "MacBook Air M1/M2/M3, iPad Pro/Air, iPhone 15/14/13/12 series, Samsung Galaxy S24/S23 Ultra 45W Super Fast Charging 2.0, tablets, laptops and accessories",
    ru: "MacBook Air M1/M2/M3, iPad Pro/Air, iPhone серий 15/14/13/12, Samsung Galaxy S24/S23 Ultra (45W Super Fast Charging 2.0), планшеты, ноутбуки и аксессуары",
  },
  "iphone 15/14/13/12 seriyaları (30 dəqiqədə 60% sürətli şarj), ipad, airpods, samsung galaxy, xiaomi və s.": {
    en: "iPhone 15/14/13/12 series (60% fast charge in 30 mins), iPad, AirPods, Samsung Galaxy, Xiaomi etc.",
    ru: "iPhone серий 15/14/13/12 (быстрая зарядка до 60% за 30 минут), iPad, AirPods, Samsung Galaxy, Xiaomi и др.",
  },
  "thermal guard saniyəlik temperatur nəzarəti, yüksək gərginlikdən və qısaqapanmadan 11 səviyyəli tam qoruma": {
    en: "Thermal Guard real-time temperature control, 11-level protection against overvoltage and short circuits",
    ru: "Контроль температуры в реальном времени Thermal Guard, 11-уровневая комплексная защита от перенапряжения и короткого замыкания",
  },
  "ağıllı pwm çipi, qızmaya, yüksək gərginliyə və qısaqapanmaya qarşı çoxpilləli təhlükəsizlik sistemi": {
    en: "Smart PWM chip, multi-stage safety system against overheating, high voltage and short circuit",
    ru: "Интеллектуальный ШИМ-контроллер, многоступенчатая система защиты от перегрева, перенапряжения и короткого замыкания",
  },
  "35.9 × 36.5 × 47 mm (ultra kompakt çəki və ölçü)": {
    en: "35.9 × 36.5 × 47 mm (Ultra-compact weight and size)",
    ru: "35.9 × 36.5 × 47 мм (ультракомпактный размер и вес)",
  },
  "sony imx415 sensoru, 7 qat şüşə linza, f1.8 böyük diafraqma, 140° geniş baxış bucağı": {
    en: "Sony IMX415 sensor, 7-layer glass lens, F1.8 large aperture, 140° wide field of view",
    ru: "Сенсор Sony IMX415, 7-слойная стеклянная линза, большая диафрагма F1.8, широкий угол обзора 140°",
  },
  "3d dnr (dynamic noise reduction) və super night vision aydın gecə qeydiyyatı": {
    en: "3D DNR (Dynamic Noise Reduction) and Super Night Vision clear night recording",
    ru: "3D DNR (динамическое шумоподавление) и Super Night Vision для четкой ночной съемки",
  },
  "avtomobilin sürətini və koordinatlarını dəqiq qeyd edən daxili gps modulu, zolaqdan çıxma (ldws) və qarşıdakı maşınla toqquşma xəbərdarlığı (fcws)": {
    en: "Built-in GPS module accurately logging speed and coordinates, Lane Departure Warning (LDWS) and Forward Collision Warning (FCWS)",
    ru: "Встроенный модуль GPS с точной записью скорости и координат, системы предупреждения о сходе с полосы (LDWS) и лобовом столкновении (FCWS)",
  },
  "3.0 düym yüksək keyfiyyətli ips rəngli ekran": {
    en: "3.0-inch high-quality IPS color screen",
    ru: "3.0-дюймовый высококачественный цветной IPS-экран",
  },
  "24 saatlıq ağıllı parkinq monitorinqi (g-sensor zərbə aşkarladıqda avtomatik çəkiliş)": {
    en: "24-hour intelligent parking surveillance (auto recording upon G-Sensor impact detection)",
    ru: "Круглосуточный умный мониторинг парковки 24ч (автозапись при срабатывании G-сенсора удара)",
  },
  "arxa kamera (rc06) və daxili salon kamerası qoşulma dəstəyi": {
    en: "Rear camera (RC06) and interior cabin camera support",
    ru: "Поддержка подключения задней камеры (RC06) и салонной камеры",
  },
  "wi-fi bağlantısı, 70mai tətbiqi vasitəsilə videolara dərhal baxış və telefona yükləmə": {
    en: "Wi-Fi connection, instant video playback and phone download via 70mai app",
    ru: "Подключение по Wi-Fi, мгновенный просмотр и скачивание видео на телефон через приложение 70mai",
  },
  "256 gb-a qədər microsd (u3/class 10) dəstəyi": {
    en: "Up to 256 GB MicroSD (U3/Class 10) support",
    ru: "Поддержка карт памяти MicroSD (U3/Class 10) до 256 ГБ",
  },
  "kompakt tkl (tenkeyless 85% format - 87 düymə, rəqəm bloku olmadan masada geniş siçan hərəkəti sahəsi yaradır)": {
    en: "Compact TKL (Tenkeyless 85% format - 87 keys, no number pad for extra mouse space)",
    ru: "Компактный TKL (формат 85% без цифрового блока - 87 клавиш, оставляет больше места для мыши)",
  },
  "ultra kompakt 65% format (cəmi 68 düymə - səyahət və minimalist masa quraşdırmaları üçün ideal)": {
    en: "Ultra compact 65% format (only 68 keys - ideal for travel and minimalists)",
    ru: "Ультракомпактный формат 65% (всего 68 клавиш - идеально для путешествий и минималистов)",
  },
  "daxili taçpadlı (touchpad) yığcam simsiz ofis və smart tv klaviaturası": {
    en: "Compact wireless office and Smart TV keyboard with built-in touchpad",
    ru: "Компактная беспроводная клавиатура для офиса и Smart TV со встроенным тачпадом",
  },
  "78 düymə + multi-touch jestləri dəstəkləyən inteqrasiya olunmuş geniş taçpad (ayrıca siçana ehtiyac qalmır)": {
    en: "78 keys + integrated wide touchpad supporting multi-touch gestures (no separate mouse needed)",
    ru: "78 клавиш + встроенный широкий тачпад с поддержкой мультитач-жестов (отдельная мышь не требуется)",
  },
  "dinamik çoxrejimli rgb arxa işıqlandırma (parlaqlıq və sürət tənzimlənməsi)": {
    en: "Dynamic multi-mode RGB backlighting (brightness and speed adjustment)",
    ru: "Динамическая многорежимная RGB-подсветка (регулировка яркости и скорости)",
  },
  "çoxrəngli rainbow led arxa işıqlandırma": {
    en: "Multi-color Rainbow LED backlighting",
    ru: "Многоцветная подсветка Rainbow LED",
  },
  "parlaq led arxa işıqlandırma (simvolların və düymə ətrafının nurlanması)": {
    en: "Bright LED backlighting (illuminated characters and key edges)",
    ru: "Яркая LED-подсветка (подсветка символов и контуров клавиш)",
  },
  "3 müxtəlif ssenarili led işıqlandırma": {
    en: "3-scenario LED lighting",
    ru: "LED-подсветка с 3 различными сценариями",
  },
  "16.8 milyon rəngli parlaq rgb işıqlandırma effektləri": {
    en: "Vibrant 16.8 million color RGB lighting effects",
    ru: "Яркие эффекты RGB-подсветки (16.8 млн цветов)",
  },
  "simsiz 2.4 ghz radio kanal (usb adapter) və type-c kabel ilə simli istifadə": {
    en: "Wireless 2.4 GHz (USB adapter) and wired Type-C cable use",
    ru: "Беспроводной радиоканал 2.4 ГГц (USB-адаптер) и проводное подключение через кабель Type-C",
  },
  "2.4 ghz usb nano adapter (10 metr işləmə diapazonu)": {
    en: "2.4 GHz USB Nano adapter (10m operating range)",
    ru: "USB-наноадаптер 2.4 ГГц (радиус действия 10 м)",
  },
  "2.4 ghz simsiz rabitə (10 metr radius)": {
    en: "2.4 GHz wireless connection (10m range)",
    ru: "Беспроводная связь 2.4 ГГц (радиус 10 м)",
  },
  "2.4 ghz simsiz tezlik, 10 metr stabil ötürmə məsafəsi": {
    en: "2.4 GHz wireless frequency, 10m stable transmission range",
    ru: "Беспроводная частота 2.4 ГГц, стабильная дальность передачи 10 м",
  },
  "bluetooth 5.1 (10 metr stabil ötürmə məsafəsi)": {
    en: "Bluetooth 5.1 (10m stable transmission range)",
    ru: "Bluetooth 5.1 (стабильная дальность передачи 10 м)",
  },
  "usb 2.0 (plug & play, hər iki cihaz üçün 1.5 m kabel)": {
    en: "USB 2.0 (Plug & Play, 1.5m cable for both devices)",
    ru: "USB 2.0 (Plug & Play, кабель 1.5 м для обоих устройств)",
  },
  "1.8 metr davamlı toxunma parça kabel (usb 2.0)": {
    en: "1.8m durable braided fabric cable (USB 2.0)",
    ru: "1.8 м прочный плетёный кабель (USB 2.0)",
  },
  "1.5 metr toxunma parça kabel (usb)": {
    en: "1.5m braided fabric cable (USB)",
    ru: "1.5 м плетёный кабель (USB)",
  },
  "1.55 metr davamlı usb 2.0 kabeli": {
    en: "1.55m durable USB 2.0 cable",
    ru: "1.55 м прочный кабель USB 2.0",
  },
  "1.5 metr davamlı kabel": {
    en: "1.5m durable cable",
    ru: "1.5 м прочный кабель",
  },
  "1.5 metr usb kabel": {
    en: "1.5m USB cable",
    ru: "1.5 м кабель USB",
  },
  "100% ptfe təmiz teflon sürüşdürücü ayaqlar": {
    en: "100% pure PTFE teflon glide feet",
    ru: "100% тефлоновые ножки из чистого PTFE",
  },
  "həm sağ, həm sol əl ilə istifadə üçün tam simmetrik erqonomik forma": {
    en: "Fully symmetrical ergonomic shape for both right and left hand use",
    ru: "Полностью симметричная эргономичная форма для правой и левой руки",
  },
  "premium soft-touch mat örtük və rezinləşdirilmiş təkər": {
    en: "Premium Soft-Touch matte coating and rubberized wheel",
    ru: "Премиальное матовое покрытие Soft-Touch и прорезиненное колесо",
  },
  "möhkəm metal üst panel və dözümlü abs plastik keykaplar": {
    en: "Solid metal top plate and durable ABS keycaps",
    ru: "Прочная металлическая верхняя панель и долговечные кейкапы из ABS-пластика",
  },
  "gücləndirilmiş abs plastik korpus, sürüşməyən rezin altlıqlar": {
    en: "Reinforced ABS plastic chassis, non-slip rubber pads",
    ru: "Усиленный корпус из ABS-пластика, нескользящие резиновые накладки",
  },
  "eyni vaxtda basılan düymələrin düzgün qeydiyyatı (19 düyməyə qədər münaqişəsiz rejim)": {
    en: "Accurate simultaneous keystroke registration (up to 19 conflict-free keys)",
    ru: "Точная регистрация одновременных нажатий (до 19 клавиш без конфликтов)",
  },
  "19 əsas oyun düyməsində təsadüfi bloklanmanın qarşısının alınması": {
    en: "Anti-ghosting prevention on 19 main gaming keys",
    ru: "Предотвращение случайной блокировки на 19 основных игровых клавишах",
  },
  "noutbuk tipli qayçı (scissor-switch) mexanizmi – son dərəcə yumşaq, dəqiq və səssiz yazma təcrübəsi": {
    en: "Laptop-style scissor-switch mechanism – ultra-smooth, precise, and quiet typing experience",
    ru: "Ножничный механизм (Scissor-switch) ноутбучного типа — исключительно мягкий, точный и бесшумный набор",
  },
  "yüksək cavab sürətinə malik membran düymələr (104 ədəd düymə)": {
    en: "High-response membrane keys (104 keys)",
    ru: "Мембранные клавиши с быстрым откликом (104 клавиши)",
  },
  "bilək üçün inteqrasiya olunmuş geniş dayaq altlığı, rezinləşdirilmiş qatlanan ayaqlar (2 səviyyəli hündürlük tənzimi)": {
    en: "Integrated wide wrist rest, rubberized folding feet (2-level height adjustment)",
    ru: "Встроенная широкая подставка для запястий, прорезиненные складные ножки (2 уровня регулировки высоты)",
  },
  "104 düyməli klassik format, maye və toz sıçramasına davamlı konstruksiya, soft-touch məxməri örtük, səssiz və yumşaq düymə gedişi": {
    en: "104-key classic format, splash and dust resistant design, Soft-Touch velvet coating, quiet and soft key travel",
    ru: "Классический формат на 104 клавиши, влаго- и пылезащитная конструкция, бархатистое покрытие Soft-Touch, бесшумный и мягкий ход клавиш",
  },
  "113 düymə (əlavə 9 ədəd multimedia idarəetmə düyməsi), nəmə və təsadüfi maye dağılmasına qarşı qoruma, erqonomik korpus": {
    en: "113 keys (9 extra multimedia control keys), splash and moisture protection, ergonomic housing",
    ru: "113 клавиш (9 дополнительных клавиш мультимедиа), защита от влаги и проливания, эргономичный корпус",
  },
  "1000 dpi dəqiq optik sensor, 3 düymə, parlaq yan dekorativ xətlər, hər iki ələ uyğun simmetrik forma": {
    en: "1000 DPI precise optical sensor, 3 buttons, bright side accent lines, ambidextrous symmetrical shape",
    ru: "Точный оптический сенсор 1000 DPI, 3 кнопки, яркие боковые декоративные линии, симметричная форма для обеих рук",
  },
  "1200 dpi optik sensor, 3 düymə və diyircək, simmetrik tutuş (sol və sağ əl üçün), hamar sürüşən 4 sürüşdürücü ayaq": {
    en: "1200 DPI optical sensor, 3 buttons and scroll wheel, ambidextrous grip (for left and right hand), 4 smooth glides",
    ru: "Оптический сенсор 1200 DPI, 3 кнопки и колесо прокрутки, симметричный хват (для левой и правой руки), 4 гладкие скользящие ножки",
  },
  "323 × 106 × 35 mm, çəki: 350 q": {
    en: "323 × 106 × 35 mm, Weight: 350 g",
    ru: "323 × 106 × 35 мм, Вес: 350 г",
  },
  "dayanıqlı abs plastik, çəki: 700 q": {
    en: "Durable ABS plastic, Weight: 700 g",
    ru: "Прочный ABS-пластик, Вес: 700 г",
  },
  "111.9 × 83.5 × 69.5 mm, çəki: 112 q": {
    en: "111.9 × 83.5 × 69.5 mm, Weight: 112 g",
    ru: "111.9 × 83.5 × 69.5 мм, Вес: 112 г",
  },
  "yoxdur": {
    en: "None",
    ru: "Нет",
  },
  "var": {
    en: "Yes",
    ru: "Есть",
  },
  "parça": {
    en: "Fabric",
    ru: "Ткань",
  },
  "yalnız çap": {
    en: "Print only",
    ru: "Только печать",
  },
  "çap, surət, skan": {
    en: "Print, copy, scan",
    ru: "Печать, копирование, сканирование",
  },
  "instant on injektor, adapter və seçilmiş ap/switch psu": {
    en: "Instant On injector, adapter and selected AP/switch PSU",
    ru: "Инжектор Instant On, адаптер и блок питания выбранных точек доступа/коммутаторов",
  },
  "hp laserjet pro m254, m280, m281": {
    en: "HP LaserJet Pro M254, M280, M281",
    ru: "HP LaserJet Pro M254, M280, M281",
  },
  "i̇darə olunmayan layer 2 gigabit kommutator (hpe instant on 1430)": {
    en: "Unmanaged Layer 2 Gigabit Switch (HPE Instant On 1430)",
    ru: "Неуправляемый гигабитный коммутатор Layer 2 (HPE Instant On 1430)",
  },
  "smart/cloud idarə olunan layer 2/l3 gigabit kommutator": {
    en: "Smart/Cloud managed Layer 2/L3 Gigabit Switch",
    ru: "Гигабитный коммутатор Layer 2/L3 с управлением через Smart/Cloud",
  },
  "1g sfp optik transceiver, instant on": {
    en: "1G SFP optical transceiver, Instant On",
    ru: "Оптический трансивер 1G SFP, Instant On",
  },
  "grandstream şəbəkə avadanlığı": {
    en: "Grandstream networking equipment",
    ru: "Сетевое оборудование Grandstream",
  },
  "1g sfp optik transceiver": {
    en: "1G SFP optical transceiver",
    ru: "Оптический трансивер 1G SFP",
  },
  "10g sfp+ optik modul": {
    en: "10G SFP+ optical module",
    ru: "Оптический модуль 10G SFP+",
  },
  "sfp+ dac kabel": {
    en: "SFP+ DAC cable",
    ru: "Кабель SFP+ DAC",
  },
  "ac pluggable enerji təchizatı modulu": {
    en: "AC pluggable power supply module",
    ru: "Съемный модуль питания AC",
  },
  "25g sfp28 optik transceiver": {
    en: "25G SFP28 optical transceiver",
    ru: "Оптический трансивер 25G SFP28",
  },
  "workstation pcie qrafik kartı (hp z seriyası üçün)": {
    en: "Workstation PCIe graphics card (for HP Z series)",
    ru: "Графическая карта PCIe для рабочих станций (для серии HP Z)",
  },
  "workstation pcie qrafik kartı": {
    en: "Workstation PCIe graphics card",
    ru: "Графическая карта PCIe для рабочих станций",
  },
  "hyperx armada gaming monitor (ips, armada arm daxil)": {
    en: "HyperX Armada gaming monitor (IPS, Armada Arm included)",
    ru: "Игровой монитор HyperX Armada (IPS, кронштейн Armada Arm в комплекте)",
  },
  "naqilli oyun qulaqlığı (cloud alpha)": {
    en: "Wired gaming headset (Cloud Alpha)",
    ru: "Проводная игровая гарнитура (Cloud Alpha)",
  },
  "simsiz oyun qulaqlığı (cloud alpha wireless)": {
    en: "Wireless gaming headset (Cloud Alpha Wireless)",
    ru: "Беспроводная игровая гарнитура (Cloud Alpha Wireless)",
  },
  "oyun klaviaturası": {
    en: "Gaming keyboard",
    ru: "Игровая клавиатура",
  },
  "simsiz oyun siçanı": {
    en: "Wireless gaming mouse",
    ru: "Беспроводная игровая мышь",
  },
  "oyun siçan altlığı": {
    en: "Gaming mouse pad",
    ru: "Игровой коврик для мыши",
  },
  "oyun/noutbuk bel çantası": {
    en: "Gaming/laptop backpack",
    ru: "Рюкзак для ноутбука/гейминга",
  },
  "ps5 dualsense üçün chargeplay duo şarj stansiyası": {
    en: "ChargePlay Duo charging station for PS5 DualSense",
    ru: "Зарядная станция ChargePlay Duo для PS5 DualSense",
  },
  "ehtiyat foam (köpük) qulaqlıq yastığı": {
    en: "Replacement foam ear cushions",
    ru: "Запасные поролоновые амбушюры",
  },
  "remote control aksesuarı": {
    en: "Remote control accessory",
    ru: "Аксессуар пульта дистанционного управления",
  },
  "usb kabel": {
    en: "USB cable",
    ru: "Кабель USB",
  },
  "table stand (masa dayaqı)": {
    en: "Table stand (desk stand)",
    ru: "Настольная подставка (стойка)",
  },
  "gan divar adapteri": {
    en: "GaN wall charger",
    ru: "Сетевое зарядное GaN-устройство",
  },
  "yığılan usb-c ↔ usb-c şarj/data kabeli": {
    en: "Retractable USB-C to USB-C charging/data cable",
    ru: "Выдвижной кабель для зарядки и передачи данных USB-C — USB-C",
  },
  "over-ear simsiz qulaqlıq": {
    en: "Over-ear wireless headphones",
    ru: "Полноразмерные беспроводные наушники",
  },
  "3-in-1 maqnit simsiz şarj stansiyası": {
    en: "3-in-1 magnetic wireless charging station",
    ru: "Магнитная беспроводная зарядная станция 3-в-1",
  },
  "simsiz ofis siçanı": {
    en: "Wireless office mouse",
    ru: "Беспроводная офисная мышь",
  },
  "cat 6 u/utp lan kabel": {
    en: "Cat 6 U/UTP LAN cable",
    ru: "Сетевой кабель LAN Cat 6 U/UTP",
  },
  "ağıllı kolonka": {
    en: "Smart speaker",
    ru: "Умная колонка",
  },
  "portativ ağıllı kolonka": {
    en: "Portable smart speaker",
    ru: "Портативная умная колонка",
  },
  "ağıllı lampa": {
    en: "Smart bulb",
    ru: "Умная лампа",
  },
  "ağıllı açar": {
    en: "Smart switch",
    ru: "Умный переключатель",
  },
  "hərəkət sensoru": {
    en: "Motion sensor",
    ru: "Датчик движения",
  },
  "ağıllı rozetka": {
    en: "Smart socket / plug",
    ru: "Умная розетка",
  },
  "ağıllı ev mərkəzi": {
    en: "Smart home hub",
    ru: "Центр умного дома (хаб)",
  },
  "standart sistem fan dəsti (2 fan)": {
    en: "Standard system fan kit (2 fans)",
    ru: "Стандартный комплект системных вентиляторов (2 шт.)",
  },
  "yandex stansiya mini plus (mini 2, saatlı)": {
    en: "Yandex Station Mini Plus (Mini 2, with clock)",
    ru: "Яндекс Станция Мини Плюс (Мини 2, с часами)",
  },
};

const VALUE_TRANSLATIONS_BY_FOLD = new Map<string, { en: string; ru: string }>();
for (const [key, translated] of Object.entries({
  ...COMMON_VALUE_TRANSLATIONS,
  ...EXTRA_CATALOG_SPEC_VALUES,
  ...EXTRA_LIVE_SPEC_VALUES,
})) {
  VALUE_TRANSLATIONS_BY_FOLD.set(foldAz(key), translated);
}

export function lookupExactCatalogValue(
  value: string,
  locale: Exclude<Locale, "az">,
): string | null {
  const matched = VALUE_TRANSLATIONS_BY_FOLD.get(foldAz(value.trim()));
  return matched ? matched[locale] : null;
}

function azPhrase(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu");
}

const AZ_VALUE_FRAGMENTS: ReadonlyArray<{
  pattern: RegExp;
  en: string;
  ru: string;
}> = (
  [
    ...EXTRA_AZ_FRAGMENTS,
    ["daxili mikrofon", "built-in microphone", "встроенный микрофон"],
    ["mikrofon", "microphone", "микрофон"],
    ["konfiqurasiya oluna bilər", "can be configured", "может быть настроена"],
    ["konfiqurasiya", "configuration", "конфигурация"],
    ["video sıxışdırma", "video compression", "сжатие видео"],
    ["sıxışdırma", "compression", "сжатие"],
    ["gecə görüntüsü", "night vision", "ночное видение"],
    ["görüntüsü", "vision", "изображение"],
    ["görüntü", "image", "изображение"],
    ["qat qoruma", "layers of protection", "уровней защиты"],
    ["qoruma", "protection", "защита"],
    ["dinamik soft-düymə", "dynamic soft-key", "динамические soft-клавиши"],
    ["dinamik soft-key", "dynamic soft-key", "динамические программируемые клавиши"],
    ["daxili dinamik", "built-in speaker", "встроенный динамик"],
    ["funksiya düyməsi", "function key", "функциональная клавиша"],
    ["funksiya", "function", "функция"],
    ["iki qulaq", "both ears", "оба уха"],
    ["kondensator mikrofon", "condenser microphone", "конденсаторный микрофон"],
    ["veb-kamera", "webcam", "веб-камера"],
    ["veb kamera", "webcam", "веб-камера"],
    ["vebkamera", "webcam", "веб-камера"],
    ["oyun pultu", "gaming controller", "игровой контроллер"],
    ["oyun siçan altlığı", "gaming mouse pad", "игровой коврик для мыши"],
    ["oyun qulaqlığı", "gaming headset", "игровая гарнитура"],
    ["oyun siçanı", "gaming mouse", "игровая мышь"],
    ["oyun klaviaturası", "gaming keyboard", "игровая клавиатура"],
    ["multifunksional hub", "multifunctional hub", "многофункциональный хаб"],
    ["multifunksional", "multifunctional", "многофункциональный"],
    ["led lent", "LED strip", "светодиодная лента"],
    ["audio mikser", "audio mixer", "аудиомикшер"],
    ["ventilyator (fan) modulu", "fan module", "модуль вентилятора"],
    ["inteqrasiya olunmuş", "integrated", "интегрированный"],
    ["inteqrasiya", "integrated", "интегрированный"],
    ["geriyə uyğun", "backward compatible", "обратно совместимый"],
    ["səs-küy azaltma", "noise cancellation", "шумоподавление"],
    ["səs-küy azaldılması", "noise reduction", "снижение шума"],
    ["səs-küy azaldan", "noise-reducing", "шумоподавляющий"],
    ["əks-səda ləğvi", "echo cancellation", "эхоподавление"],
    ["akustik əks-səda", "acoustic echo", "акустическое эхо"],
    ["tam dupleks", "full duplex", "полный дуплекс"],
    ["barmaq izi oxuyucu", "fingerprint reader", "сканер отпечатков"],
    ["barmaq izi", "fingerprint", "отпечаток пальца"],
    ["işıqlı klaviatura", "backlit keyboard", "клавиатура с подсветкой"],
    ["rəqəm bloku", "numeric keypad", "цифровой блок"],
    ["divar montajı daxildir", "wall mount included", "настенный монтаж в комплекте"],
    ["divar montajı", "wall mount", "настенный монтаж"],
    ["tavan / divar", "ceiling / wall", "потолок / стена"],
    ["texniki xidmət tələb etmir", "maintenance-free", "не требует обслуживания"],
    ["hansı əvvəl dolarsa", "whichever comes first", "в зависимости от того, что наступит раньше"],
    ["idarə olunan", "managed", "управляемый"],
    ["marşrutlaşdırma", "routing", "маршрутизация"],
    ["şifrələmə", "encryption", "шифрование"],
    ["quraşdırılır", "is installed", "устанавливается"],
    ["quraşdırılmış", "installed", "установленный"],
    ["orijinal qablaşdırmada", "in original packaging", "в оригинальной упаковке"],
    ["qablaşdırmada", "in packaging", "в упаковке"],
    ["2-ci əl", "second-hand", "вторичный рынок"],
    ["tam işlək", "fully working", "полностью исправен"],
    ["test edilmiş", "tested", "проверен"],
    ["əlavə adapter yoxdur", "no extra adapter", "без дополнительного адаптера"],
    ["adapter yoxdur", "no adapter", "без адаптера"],
    ["əs yoxdur", "no OS", "без ОС"],
    ["yaddaş kartı", "memory card", "карта памяти"],
    ["flash yaddaş", "flash drive", "флеш-накопитель"],
    ["rəngli lazer", "color laser", "цветной лазерный"],
    ["genişzolaqlı", "full-range", "широкополосный"],
    ["akustik parça", "acoustic fabric", "акустическая ткань"],
    ["mobil tətbiq", "mobile app", "мобильное приложение"],
    ["tətbiq", "app", "приложение"],
    ["masaüstü", "desktop", "настольный"],
    ["noutbuk", "laptop", "ноутбук"],
    ["naqilli", "wired", "проводной"],
    ["simsiz", "wireless", "беспроводной"],
    ["işıqlı", "backlit", "с подсветкой"],
    ["işıqlandırılan", "illuminated", "подсвечиваемый"],
    ["əl ilə", "manual", "вручную"],
    ["avtomatik", "automatic", "автоматический"],
    ["çıxarılan", "detachable", "съёмный"],
    ["portativ", "portable", "портативный"],
    ["opsional", "optional", "опционально"],
    ["ayrıca", "separately", "отдельно"],
    ["məhdud", "limited", "ограниченная"],
    ["ömürlük", "lifetime", "пожизненная"],
    ["işlənmiş", "used", "б/у"],
    ["orijinal", "original", "оригинальный"],
    ["fansız", "fanless", "безвентиляторный"],
    ["hündürlük", "height", "высота"],
    ["baxış bucağı", "viewing angle", "угол обзора"],
    ["toxunuş", "touch", "сенсор"],
    ["şəbəkə", "network", "сеть"],
    ["qrafika", "graphics", "графика"],
    ["qrafik", "graphic", "графический"],
    ["keş", "cache", "кэш"],
    ["nüvə", "cores", "ядер"],
    ["axın", "threads", "потоков"],
    ["düyməsi", "button", "кнопка"],
    ["düymə", "key", "клавиша"],
    ["düym", "inch", "дюйм"],
    ["saatlı", "with clock", "с часами"],
    ["saatsız", "without clock", "без часов"],
    ["nəsil", "generation", "поколение"],
    ["komplektdə", "in the set", "в комплекте"],
    ["ağıllı kolonka", "smart speaker", "умная колонка"],
    ["ağıllı lampa", "smart lamp", "умная лампа"],
    ["ağıllı", "smart", "умный"],
    ["ekranlı", "with display", "с экраном"],
    ["fırlanan", "rotating", "поворотный"],
    ["tozkeçirməz", "dustproof", "пыленепроницаемый"],
    ["düşmə testi", "drop test", "тест на падение"],
    ["düşmə", "drop", "падение"],
    ["tax-çıxar", "plug/unplug", "подключение/отключение"],
    ["hərbi", "military", "военный"],
    ["regiona görə", "depending on region", "в зависимости от региона"],
    ["modelə görə", "depending on model", "в зависимости от модели"],
    ["tam şarj", "full charge", "полная зарядка"],
    ["tam yük", "full load", "полная нагрузка"],
    ["davamlı", "sequential", "последовательный"],
    ["lokal", "local", "локальный"],
    ["stansiya", "Station", "Станция"],
    ["və ya", "or", "или"],
    ["nöqtəyə qədər", "points", "точек"],
    ["m-ə qədər", "m", "м"],
    ["qədər", "up to", "до"],
    ["ədədə", "units", "шт."],
    ["ədəd", "pcs", "шт."],
    ["vərəq", "sheets", "листов"],
    ["səh/ay", "pages/month", "стр/мес"],
    ["səhifə", "pages", "страниц"],
    ["hüceyrəli", "-cell", "-элементный"],
    ["daxildir", "included", "в комплекте"],
    ["daxil deyil", "not included", "не входит в комплект"],
    ["daxil", "included", "в комплекте"],
    ["yoxdur", "none", "нет"],
    ["əlavə", "additional", "дополнительный"],
    ["ilə", "with", "с"],
    ["üçün", "for", "для"],
    ["və", "and", "и"],
    ["ön", "front", "передний"],
    ["yan", "side", "боковой"],
    ["üst", "top", "верхний"],
    ["arxa", "rear", "задний"],
    ["arxadan", "from the rear", "сзади"],
    ["daxili", "built-in", "встроенный"],
    ["xarici", "external", "внешний"],
    ["aktiv", "active", "активный"],
    ["passiv", "passive", "пассивный"],
    ["alüminium", "aluminum", "алюминий"],
    ["ərintisi", "alloy", "сплав"],
    ["örgülü", "braided", "оплётка"],
    ["plastik", "plastic", "пластик"],
    ["korpus", "chassis", "корпус"],
    ["parça", "fabric", "ткань"],
    ["qulaqlığı", "headset", "гарнитура"],
    ["qulaqlıq", "headset", "гарнитура"],
    ["siçanı", "mouse", "мышь"],
    ["siçan", "mouse", "мышь"],
    ["klaviaturası", "keyboard", "клавиатура"],
    ["klaviatura", "keyboard", "клавиатура"],
    ["kommutator", "switch", "коммутатор"],
    ["yuvası", "jack", "разъём"],
    ["fişi", "plug", "вилка"],
    ["fiş", "plug", "вилка"],
    ["dişi", "female", "гнездо"],
    ["taxılır", "attaches", "крепится"],
    ["dibinə", "to the bottom", "снизу"],
    ["tövsiyə", "recommended", "рекомендуется"],
    ["qutuda", "in the box", "в коробке"],
    ["tam doldurma", "full charge", "полная зарядка"],
    ["musiqi", "music", "музыки"],
    ["oxutma", "playback", "воспроизведения"],
    ["kodek", "codec", "кодек"],
    ["statik", "static", "статическая"],
    ["printer", "printer", "принтер"],
    ["sensor", "sensor", "сенсор"],
    ["soket", "socket", "сокет"],
    ["neodim", "neodymium", "неодим"],
    ["mavi", "blue", "синий"],
    ["qırmızı", "red", "красный"],
    ["rəngli", "color", "цветной"],
    ["rəng", "color", "цвет"],
    ["monoxrom", "monochrome", "монохромный"],
    ["çap", "print", "печать"],
    ["surət", "copy", "копирование"],
    ["skan", "scan", "сканирование"],
    ["faks", "fax", "факс"],
    ["lazer", "laser", "лазерный"],
    ["kartrici", "cartridge", "картридж"],
    ["kartric", "cartridge", "картридж"],
    ["batareya", "battery", "батарея"],
    ["adapter", "adapter", "адаптер"],
    ["kabeli", "cable", "кабель"],
    ["kabelli", "wired", "проводной"],
    ["kabel", "cable", "кабель"],
    ["masa dayaqı", "desk stand", "настольная подставка"],
    ["aksesuarı", "accessory", "аксессуар"],
    ["yastığı", "cushion", "амбушюр"],
    ["köpük", "foam", "поролон"],
    ["ehtiyat", "backup", "резервн."],
    ["yalnız", "only", "только"],
    ["rozetkaları", "outlets", "розетки"],
    ["rozetkalar", "outlets", "розетки"],
    ["rozetka", "outlet", "розетка"],
    ["ventilyator", "fan", "вентилятор"],
    ["modulu", "module", "модуль"],
    ["modul", "module", "модуль"],
    ["olunmuş", "built", "встроенный"],
    ["qara", "black", "чёрный"],
    ["ağ", "white", "белый"],
    ["yeni", "new", "новый"],
    ["yox", "no", "нет"],
    ["var", "yes", "есть"],
    ["bəli", "yes", "да"],
    ["xeyr", "no", "нет"],
    ["dəstəyi", "support", "поддержка"],
    ["dəstək", "support", "поддержка"],
    ["təxminən", "approximately", "примерно"],
    ["proqramlaşdırılan", "programmable", "программируемые"],
    ["rəsmi", "official", "официальный"],
    ["yüksək", "high", "высокий"],
    ["tələb edir", "requires", "требует"],
    ["tələb", "requires", "требует"],
    ["dəsti", "kit", "комплект"],
    ["dəstdə", "in the set", "в комплекте"],
    ["dəst", "set", "комплект"],
    ["başında", "per", "на"],
    ["başına", "per", "на"],
    ["səs", "audio", "звук"],
    ["zəng", "call", "вызов"],
    ["idarəetmə", "control", "управление"],
    ["genişləndirmə", "expansion", "расширение"],
    ["tənzimlənən", "adjustable", "регулируемый"],
    ["xətt", "line", "линия"],
    ["işçi", "work", "рабочий"],
    ["seriyası", "series", "серия"],
    ["çıxış", "output", "выход"],
    ["giriş", "input", "вход"],
    ["kartı", "card", "карта"],
    ["yük", "load", "нагрузка"],
    ["digər", "other", "другой"],
    ["ayrı", "separate", "отдельный"],
    ["ümumi", "total", "общий"],
    ["rəqəmsal", "digital", "цифровой"],
    ["qalınlıq", "thickness", "толщина"],
    ["cəmi", "total", "всего"],
    ["düz", "flat", "плоский"],
    ["yazı", "writing", "письмо"],
    ["bilər", "can", "может"],
    ["tək", "single", "один"],
    ["uyğun", "compatible", "совместимый"],
    ["modelləri", "models", "модели"],
    ["büdcə", "budget", "бюджет"],
    ["bölməsi", "compartment", "отсек"],
    ["qayış", "strap", "ремень"],
    ["dəliyi", "hole", "отверстие"],
    ["çantası", "bag", "сумка"],
    ["birbaşa", "direct", "прямой"],
    ["ailəsi", "family", "семейство"],
    ["maks.", "max.", "макс."],
    ["maks", "max", "макс"],
    ["tanınma", "recognition", "распознавание"],
    ["insan", "human", "человек"],
    ["aşkarlama", "detection", "обнаружение"],
    ["mərhələli", "stage", "ступенчатый"],
    ["zərbə", "impact", "удар"],
    ["qorunması", "protection", "защита"],
    ["qorunma", "protection", "защита"],
    ["silikon", "silicone", "силикон"],
    ["asqı", "suspension", "подвес"],
    ["möhkəm", "rigid", "жёсткий"],
    ["mexaniki", "mechanical", "механический"],
    ["pərdə", "shutter", "шторка"],
    ["pultun", "remote", "пульта"],
    ["içində", "inside", "внутри"],
    ["kamera", "camera", "камера"],
    ["şarj", "charging", "зарядка"],
    ["piksel", "pixels", "пикселей"],
    ["3-cü", "3rd", "3-й"],
    ["8-ci", "8th", "8-й"],
    ["1-ci", "1st", "1-й"],
    ["hər", "each", "каждый"],
    ["iş", "work", "работа"],
    ["əl", "hand", "ручной"],
    ["çəki", "weight", "вес"],
    ["yüksək", "high", "высокий"],
    ["2-xətli", "2-line", "2-линейный"],
    ["6-xətli", "6-line", "6-линейный"],
    ["təkqanadlı", "single-leaf", "одностворчатый"],
    ["idarə", "management", "управление"],
    ["mənbə", "source", "источник"],
    ["qiyməti", "price", "цена"],
    ["əyri", "curved", "изогнутый"],
    ["əsas", "main", "основной"],
    ["asılı", "dependent", "зависит"],
    ["qulaqlıqlar", "headphones", "наушники"],
    ["çəkilən", "drawn", "выдвижной"],
    ["keçirməz", "proof", "непроницаемый"],
    ["inteqrə", "integrated", "интегрированный"],
    ["platformaları", "platforms", "платформы"],
    ["ölçüsü", "size", "размер"],
    ["sistemləri", "systems", "системы"],
    ["açar", "key", "ключ"],
    ["keyfiyyətli", "high-quality", "качественный"],
    ["çıxışı", "output", "выход"],
    ["serverlər", "servers", "серверы"],
    ["çarxı", "wheel", "колесо"],
    ["kiçik", "small", "маленький"],
    ["bağlantısı", "connection", "подключение"],
    ["vasitəsilə", "via", "через"],
    ["cüt", "pair", "пара"],
    ["sürətli", "fast", "быстрый"],
    ["miniatür", "miniature", "миниатюрный"],
    ["ikili", "dual", "двойной"],
    ["kompüterlər", "computers", "компьютеры"],
    ["satılır", "sold", "продаётся"],
    ["xətti", "linear", "линейный"],
    ["şkafı", "cabinet", "шкаф"],
    ["genişlənməz", "non-expandable", "нерасширяемый"],
    ["dərinlik", "depth", "глубина"],
    ["sönülü", "off", "выключено"],
    ["nöqtəli", "dotted", "точечный"],
    ["üzərində", "on", "на"],
    ["yuvalı", "slotted", "со слотом"],
    ["yığcam", "compact", "компактный"],
    ["gündə", "per day", "в сутки"],
    ["məsafəsi", "distance", "расстояние"],
    ["qapaqsız", "lidless", "без крышки"],
    ["linzalı", "with lens", "с линзой"],
    ["proyeksiyası", "projection", "проекция"],
    ["slotu", "slot", "слот"],
    ["avtomat", "breaker", "автомат"],
    ["divar", "wall", "стена"],
    ["dirək", "pole", "столб"],
    ["üz", "face", "лицо"],
    ["dizayn", "design", "дизайн"],
    ["şüşə", "glass", "стекло"],
    ["təx.", "approx.", "прибл."],
    ["işıq", "light", "свет"],
    ["bənövşəyi", "purple", "фиолетовый"],
    ["yazma", "write", "запись"],
    ["oxuma", "read", "чтение"],
    ["qapı", "door", "дверь"],
    ["xüsusi", "special", "специальный"],
    ["stansiyası", "station", "станция"],
    ["sıxılmış", "compressed", "сжатый"],
    ["göstəricili", "with indicator", "с индикатором"],
    ["4-istiqamətli", "4-way", "4-сторонний"],
    ["düymələr", "buttons", "кнопки"],
    ["açıq", "open", "открытый"],
    ["qəbuledici", "receiver", "приёмник"],
    ["ekranı", "display", "экран"],
    ["bəzi", "some", "некоторые"],
    ["cihazın", "device", "устройства"],
    ["idarəetməsi", "management", "управление"],
    ["rejimlər", "modes", "режимы"],
    ["ölçü", "size", "размер"],
    ["sürüşən", "sliding", "скользящий"],
    ["bütün", "all", "все"],
    ["aşağı", "low", "нижний"],
    ["səsli", "voice", "голосовой"],
    ["rütubət", "humidity", "влажность"],
    ["sızma", "leak", "протечка"],
    ["hərəkət", "motion", "движение"],
    ["sənəd", "document", "документ"],
    ["yönləndirmə", "forwarding", "перенаправление"],
    ["təxm.", "approx.", "прибл."],
    ["quraşdırılıb", "installed", "установлен"],
    ["ifadələr", "expressions", "выражения"],
    ["zərbəyə", "impact", "удару"],
    ["nəzarət", "control", "контроль"],
    ["paneldə", "on the panel", "на панели"],
    ["bilən", "able", "способный"],
    ["azalması", "reduction", "снижение"],
    ["yerüstü", "desktop", "настольный"],
    ["ştepsel", "plug", "вилка"],
    ["avroştepsel", "Europlug", "евровилка"],
    ["qoşulma", "connection", "подключение"],
    ["batareyasız", "without battery", "без батареи"],
    ["tənzimlənən profil", "adjustable profiles", "регулируемых профиля"],
    ["analog kabel", "analog cable", "аналоговый кабель"],
    ["side pockets qoşa", "paired side pockets", "парные боковые карманы"],
    ["white-boz", "white-gray", "бело-серый"],
    ["black-boz", "black-gray", "чёрно-серый"],
    ["qara-boz", "black-gray", "чёрно-серый"],
    ["səh/dəq", "ppm", "стр/мин"],
    ["saniyə", "seconds", "секунд"],
    ["modellər", "models", "модели"],
    ["cəm", "total", "суммарно"],
    ["dəqiqlik", "accuracy", "точность"],
    ["cədvəl", "table", "таблица"],
    ["inteqrasiyası", "integration", "интеграция"],
    ["mobil", "mobile", "мобильный"],
    ["tərəfində", "on the", "на"],
    ["keçirməzlik", "waterproofing", "гидроизоляция"],
    ["sertifikatlı", "certified", "сертифицированный"],
    ["16-xətli", "16-line", "16-линейный"],
    ["8-xətli", "8-line", "8-линейный"],
    ["5-xətli", "5-line", "5-линейный"],
    ["4-xətli", "4-line", "4-линейный"],
    ["menecer", "manager", "менеджер"],
    ["telefonu", "phone", "телефон"],
    ["multimediya", "multimedia", "мультимедиа"],
    ["paketi", "pack", "комплект"],
    ["təsvirdə", "in the description", "в описании"],
    ["içərisində", "inside", "внутри"],
    ["nömrə", "numbers", "номеров"],
    ["şassiyə", "chassis", "шасси"],
    ["panelindəki", "on the panel", "на панели"],
    ["konsol", "console", "консоль"],
    ["kompüterə", "computer", "компьютеру"],
    ["kompüterin", "computer", "компьютера"],
    ["kompüter", "computer", "компьютер"],
    ["etmək", "to add", "добавить"],
    ["cihazlarının", "devices", "устройств"],
    ["portuna", "port", "порту"],
    ["otaq", "room", "комната"],
    ["temperaturu", "temperature", "температура"],
    ["rütubətinin", "humidity", "влажности"],
    ["ölçülməsi", "measurement", "измерение"],
    ["bölmə", "compartment", "отсек"],
    ["switch-lər", "switches", "коммутаторы"],
    ["router-lər", "routers", "маршрутизаторы"],
    ["örtüklə", "coating", "покрытием"],
    ["mikrofonlar", "microphones", "микрофоны"],
    ["səviyyəsi", "level", "уровень"],
    ["səviyyəsində", "level", "на уровне"],
    ["konfrans", "conference", "конференция"],
    ["sürəti", "speed", "скорость"],
    ["mövqeli", "position", "позиционный"],
    ["divara", "wall", "на стену"],
    ["şüalarına", "rays", "лучам"],
    ["suya", "water", "воде"],
    ["yağa", "oil", "маслу"],
    ["dəyişikliklərinə", "changes", "изменениям"],
    ["qiymətə", "at this price", "по этой цене"],
    ["platformasında", "platform", "на платформе"],
    ["mövcuddur", "is available", "доступно"],
    ["genişləndirilmiş", "extended", "расширенная"],
    ["rejimləri", "modes", "режимы"],
    ["boş", "empty", "пустой"],
    ["dayaqıdir", "is a stand", "является подставкой"],
    ["şkafıdır", "is a cabinet", "является шкафом"],
    ["dövrəli", "circuit", "контурный"],
    ["ehtiyatı", "reserve", "резерв"],
    ["gərginliyi", "voltage", "напряжение"],
    ["gəlir", "arrives", "поступает"],
    ["ilədir", "comes with", "поставляется с"],
    ["işi", "work", "работа"],
    ["kabelə", "cable", "кабелю"],
    ["kəsintisiz", "uninterrupted", "бесперебойный"],
    ["sifariş kodu", "order code", "код заказа"],
    ["sifariş", "order", "заказ"],
    ["qoruyucu ramka", "protective frame", "защитная рамка"],
    ["məhsullar", "products", "товары"],
    ["müddətini", "duration", "длительность"],
    ["mühafizə", "protection", "защита"],
    ["müştərilərimizə", "our customers", "нашим клиентам"],
    ["rezistiv yüklərdə", "on resistive loads", "на резистивной нагрузке"],
    ["telefoniyası", "telephony", "телефония"],
    ["testindən", "test", "теста"],
    ["təhsil", "education", "образование"],
    ["təqdim edirik", "we provide", "мы предоставляем"],
    ["təqdim", "offered", "предлагается"],
    ["transceiver-lər", "transceivers", "трансиверы"],
    ["UPS-lərin", "UPS units", "ИБП"],
    ["uzadır", "extends", "удлиняет"],
    ["yüklərdə", "loads", "нагрузках"],
    ["yükünü", "load", "нагрузку"],
    ["saatlıq", "hour", "часовой"],
    ["doldurma", "charge", "зарядка"],
    ["abunə olmadan", "without a subscription", "без подписки"],
    ["abunə", "subscription", "подписка"],
    ["axtarışı", "search", "поиск"],
    ["ailə", "family", "семейство"],
    ["alətləri", "tools", "инструменты"],
    ["altlığı", "base", "основание"],
    ["rezinləşdirilmiş", "rubberized", "прорезиненный"],
    ["qatlanan", "folding", "складной"],
    ["termostatlı", "with thermostat", "с термостатом"],
    ["antenlər", "antennas", "антенны"],
    ["artırılır", "is increased", "увеличивается"],
    ["asanlıqla", "easily", "легко"],
    ["qoşulur", "connects", "подключается"],
    ["ötürücü", "drive", "привод"],
    ["standartına", "standard", "стандарту"],
    ["sürüşdürücü", "slider", "ползунок"],
  ] as const
)
  .slice()
  .sort((left, right) => right[0].length - left[0].length)
  .map(([az, en, ru]) => ({ pattern: azPhrase(az), en, ru }));

const AZ_VALUE_WORD =
  /\b(və|üçün|ilə|dəst|daxil|daxildir|yoxdur|yox|var|bəli|xeyr|ehtiyat|rozetka|rozetkalar|rozetkaları|saat|dəq|dəqiqə|kq|ədəd|ədədə|naqilli|simsiz|simli|ventilyator|modulu|kabeli|kabel|qulaq|köpük|yastığı|aksesuarı|dayaqı|stansiya|yalnız|veb|multifunksional|kondensator|pultu|vərəq|səhifə|nüvə|axın|düymə|düyməsi|hüceyrəli|hüceyrə|quraşdırılır|inteqrasiya|olunmuş|geriyə|uyğun|işlənmiş|ömürlük|məhdud|orijinal|qablaşdırmada|işıqlı|genişzolaqlı|hündürlük|şəbəkə|qrafika|alüminium|keş|noutbuk|masaüstü|qulaqlıq|klaviatura|siçan|kommutator|şifrələmə|barmaq|tövsiyə|regiona|modelə|görə|qədər|aktiv|passiv|daxili|xarici|çıxarılan|portativ|opsional|ayrıca|fansız|rəngli|lazer|kartric|batareya|çap|surət|skan|faks|qara|boz|oyun|ofis|eyni|tavan|montaj|rezin|tutumu|qapaq|seqment|foto|standart|qoruyucu|milyon|yuva|qutusuz|telefon|baza|linza|yuxu|kanal|faktor|ev|qoşa|profil|ayaq|ekran|optik|mat|gümüş|qapaq|rejimi|masa|klip|diod|hava|taymer|broşura|kişi|qadın|maqnitli|tutacaq|qələm|klassik|sətir|əsaslı|seçilir|olunan|fərqli|emosiyalar|qalan|tənzimləmə|cihazları|yükdə|gündüz|müştəri|tərəfdən|sərtlik|qəbulu|paneli|yağış|performanslı|panellər|hamısı|yoxlaması|parlaqlıqda|sonra|seriyada|olunmur|radiusda|yuva|kənar|toza|açıqdırsa|künc|yaddaş|qüc|güc|sürət|qalın|işləmə|avadanlığı|girişi|məsafə|bağlantı|cərəyan|dayaqı|kabellər|kanallı|quraşdırma|məlumat|ölçülü|portları|birgə|məhsul|zalı|yastıq|dəri|daşımaq|dalğası|artırır|parkı|etmir|olur|lent|uzadıcılar|sığır|massivi|redundansiya|dayandırılıb|təsviri|modelidir|dövrə|mötərizə|qayka|incə|tutuma|dərc|əyilmə|titrəməsiz|inzibati|lisenziyası|siqnalizasiyası|təchizatçı|seçilmiş|aşınmaya|yapışqanlı|gözlətmə|ötürmə|yönləndirmə|qruplaşdırılmış|abunə|obyekt|yüksəklik|marşrut|altlıq|qələmlər|ikili|jestləri|doldurulan|sakit|membran|musiqi|rahatlıq|hermetik|yazma|oxuma|qidalanma|tipik|termal|seriya|qutu|dupleks|aparat|interfeys|mobil|tutum|tutumlu|korpus|olan|olaraq|kimi|kilidi|edir|funksiyalar|malikdir|eynidir|powerbank|adapteri|kommutatoru|spikerfon|provayzinq|oxuyucu|tələb|veb|konnektor|terminallar|siqnalizasiya|prosessor|pulti|transceivendir|hardware|kabelidir)\b/i;
const AZ_VALUE_CHAR = /[əöğşüçıƏÖĞŞÜÇİ]/;

function localizeHourCount(count: number, locale: Exclude<Locale, "az">): string {
  if (locale === "en") {
    return count === 1 ? "1 hour" : `${count} hours`;
  }
  if (count === 1) return "1 час";
  if (count >= 2 && count <= 4) return `${count} часа`;
  return `${count} часов`;
}

function localizeYearCount(count: number, locale: Exclude<Locale, "az">): string {
  if (locale === "en") {
    return count === 1 ? "1 year" : `${count} years`;
  }
  if (count === 1) return "1 год";
  if (count >= 2 && count <= 4) return `${count} года`;
  return `${count} лет`;
}

function localizeMonthCount(count: number, locale: Exclude<Locale, "az">): string {
  if (locale === "en") {
    return count === 1 ? "1 month" : `${count} months`;
  }
  if (count === 1) return "1 месяц";
  if (count >= 2 && count <= 4) return `${count} месяца`;
  return `${count} месяцев`;
}

/** Translate leftover Azerbaijani catalog wording (units + fragments). */
export function localizeAzCatalogText(value: string, locale: Locale): string {
  if (locale === "az") {
    return value;
  }
  return localizeResidualSpecValue(value, locale);
}

/**
 * Translates recurring English-source port/interface listings into Russian.
 * The storefront DB stores these values in English; RU users should see a
 * proper Russian rendering instead of the untouched Latin text.
 */
function ruLocalizePortList(value: string): string {
  let result = value;
  result = result
    .replace(/\bUSB 5Gbps\b/gi, "USB 5 Гбит/с")
    .replace(/\bUSB 10Gbps\b/gi, "USB 10 Гбит/с")
    .replace(/\bUSB 20Gbps\b/gi, "USB 20 Гбит/с")
    .replace(/\bUSB 40Gbps\b/gi, "USB 40 Гбит/с")
    .replace(/\bNo smart card reader\b/gi, "Считыватель смарт-карт отсутствует")
    .replace(/\bNo fingerprint reader\b/gi, "Сканер отпечатков пальцев отсутствует")
    .replace(/\bSmart card reader\b/gi, "считыватель смарт-карт")
    .replace(/\bSD card reader\b/gi, "слот для SD-карт")
    .replace(/\bNano-SIM card slot \(WWAN support models\)\b/gi, "слот Nano-SIM (в моделях с поддержкой WWAN)")
    .replace(/\bfingerprint reader\b/gi, "сканер отпечатков пальцев")
    .replace(
      /\bHeadphone \/ microphone combo jack\b/gi,
      "комбинированный разъём для наушников / микрофона",
    )
    .replace(/\bTouch style\b/gi, "Сенсорный")
    .replace(/\bintegrated in\b/gi, "встроенный в")
    .replace(/\bpower button\b/gi, "кнопку питания")
    .replace(/\bNVMe password\b/gi, "Пароль NVMe")
    .replace(/\bHard disk password\b/gi, "Пароль на жёсткий диск")
    .replace(/\bsupports ISO 7816 and EMV\b/gi, "поддерживает ISO 7816 и EMV")
    .replace(/\bwith\b/gi, "с")
    .replace(/\band\b/gi, "и")
    .replace(/\bup to\b/gi, "до")
    .replace(/\breader\b/gi, "считыватель")
    .replace(/\bslot\b/gi, "слот");
  return result
    .replace(/(\d+(?:[.,]\d+)?)\s*W\b/gi, "$1 Вт")
    .replace(/(\d+(?:[.,]\d+)?)\s*Hz\b/gi, "$1 Гц")
    .replace(/(\d+(?:[.,]\d+)?)\s*mm\b/gi, "$1 мм");
}

/**
 * Finishes RU localization for values that still carry Latin common words
 * (English-source specs). Lowercase-only matches avoid mangling brand names,
 * model names and standard acronyms (USB, HDMI, Wi-Fi, Bluetooth, Intel...).
 */
function ruTranslateEnglishValue(value: string): string {
  let result = value;

  if (/1x\s+USB|Thunderbolt|HDMI 2\.1|Ethernet \(RJ-45\)|USB PD/i.test(result)) {
    result = ruLocalizePortList(result);
  }

  result = result
    .replace(/\bUSB receiver\b/gi, "USB-приёмник")
    .replace(/\bWireless\s+2\.4\b/gi, "Беспроводной 2.4")
    .replace(/(\d+U)\s*rack\b/gi, "стойка $1")
    .replace(/\bRack server\b/gi, "Стоечный сервер")
    .replace(/\bdual-band concurrent\b/gi, "одновременная работа в двух диапазонах")
    .replace(/(\d+(?:[.,]\d+)?)\s*mm\s+dynamic\b/gi, "$1 мм динамический")
    .replace(/\blimited lifetime\b/gi, "ограниченная пожизненная гарантия");

  // Common units in Russian. Keep these for AZ-source values (e.g. "5 GHz üzrə").
  // NOTE: W/MB/GB/TB are intentionally left as Latin here so that English-source
  // values (e.g. "650 VA / 375 W", "16 GB DDR4") are preserved verbatim.
  result = result
    .replace(/(\d+(?:[.,]\d+)?)\s*GHz\b/gi, "$1 ГГц")
    .replace(/(\d+(?:[.,]\d+)?)\s*MHz\b/gi, "$1 МГц")
    .replace(/(\d+(?:[.,]\d+)?)\s*Hz\b/gi, "$1 Гц");

  // Lowercase Latin common words that are not proper nouns or acronyms.
  result = result
    .replace(/\bvideo\b/g, "видео")
    .replace(/\baudio\b/g, "аудио")
    .replace(/\bcloud\b/g, "облако")
    .replace(/\bserver\b/g, "сервер")
    .replace(/\bwireless\b/g, "беспроводной")
    .replace(/\bmonitor\b/g, "монитор")
    .replace(/\bmetal\b/g, "металл")
    .replace(/\bprinter\b/g, "принтер")
    .replace(/\bhub\b/g, "хаб")
    .replace(/\bslot\b/g, "слот")
    .replace(/\bstand\b/g, "подставка")
    .replace(/\bcable\b/g, "кабель")
    .replace(/\blaptop\b/g, "ноутбук")
    .replace(/\bpassword\b/g, "пароль")
    .replace(/\breceiver\b/g, "приёмник")
    .replace(/\boptical\b/g, "оптический")
    .replace(/\benterprise\b/g, "корпоративный")
    .replace(/\bconcurrent\b/g, "одновременный")
    .replace(/\bdynamic\b/g, "динамический")
    .replace(/\bworkstation\b/g, "рабочая станция")
    .replace(/\bdesktop\b/g, "настольный")
    .replace(/\bsensor\b/g, "сенсор")
    .replace(/\bhardware\b/g, "аппаратное обеспечение")
    .replace(/\blimited\b/g, "ограниченная")
    .replace(/\blifetime\b/g, "пожизненная")
    .replace(/\bsoket\b/g, "сокет")
    .replace(/\bangled\b/g, "угловой")
    .replace(/\bwatt\b/g, "ватт")
    .replace(/\baction\b/g, "экшн")
    .replace(/\bkit\b/g, "комплект")
    .replace(/\bconfig\b/g, "конфигурация");

  return result.replace(/\s{2,}/g, " ").replace(/\s+([,;:.])/g, "$1").trim();
}

function localizeResidualSpecValue(
  value: string,
  locale: Exclude<Locale, "az">,
): string {
  let result = value;

  if (/stepped approximation to a sinewave/i.test(result)) {
    return locale === "en"
      ? "Stepped approximation to a sinewave"
      : "Ступенчатая аппроксимация синусоиды";
  }

  result = result.replace(/\u0130/g, "i").replace(/i\u0307/g, "i");

  result = result.replace(
    /Dinamik\s+kontrast\s*:\s*(\d+(?:\.\d+)?)\s*m\s*:\s*1/giu,
    (_match, ratio) =>
      locale === "en"
        ? `Dynamic contrast: ${ratio}M:1`
        : `Динамический контраст: ${ratio}M:1`,
  );
  result = result.replace(
    /Dinamik\s+(\d+(?:\.\d+)?)\s*m\s*:\s*1/giu,
    (_match, ratio) =>
      locale === "en"
        ? `Dynamic ${ratio}M:1`
        : `Динамический ${ratio}M:1`,
  );
  result = result.replace(
    /(\d+(?:[.,]\d+)?)\s*W\s+dinamik(?![\p{L}\p{N}_])/giu,
    (_match, watts) =>
      locale === "en" ? `${watts} W speaker` : `${watts} Вт динамик`,
  );

  const notAzLetter = "(?![\\p{L}\\p{N}_])";

  result = result.replace(
    /(\d+)\s*[–-]\s*(\d+)\s*saat(?![\p{L}\p{N}_])/giu,
    (_match, from, to) =>
      locale === "en" ? `${from}–${to} hours` : `${from}–${to} ч`,
  );
  result = result.replace(
    /(\d+(?:\.\d+)?)\s*milyon\s*saat(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `${raw} million hours` : `${raw} млн ч`,
  );
  result = result.replace(
    /(\d+(?:\.\d+)?)\s*milyon(?![\p{L}\p{N}_])/giu,
    (_match, raw) => (locale === "en" ? `${raw} million` : `${raw} млн`),
  );
  result = result.replace(/(\d+)\s*ə(?=\s)/giu, "$1 @");
  result = result.replace(
    /(\d+)-ya qədər(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `up to ${raw}` : `до ${raw}`,
  );
  result = result.replace(
    /(\d+)\s*saat(?:a|ə)?\s*qədər(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `up to ${raw} hours` : `до ${raw} ч`,
  );
  result = result.replace(
    /(\d+)\s*saatadək(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `up to ${raw} hours` : `до ${raw} ч`,
  );
  result = result.replace(
    new RegExp(`(\\d+)\\s*saat${notAzLetter}`, "giu"),
    (_match, raw: string) => localizeHourCount(Number(raw), locale),
  );
  result = result.replace(
    /(\d+)\s*dəqiqə(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `${raw} minutes` : `${raw} мин`,
  );
  result = result.replace(
    /(\d+)\s*dəq\.?(?![\p{L}\p{N}_])/giu,
    (_match, raw) => (locale === "en" ? `${raw} min` : `${raw} мин`),
  );
  result = result.replace(
    /(\d+(?:[.,]\d+)?)\s*kq(?![\p{L}\p{N}_])/giu,
    (_match, raw) => (locale === "en" ? `${raw} kg` : `${raw} кг`),
  );
  result = result.replace(
    /(\d+)\s*il(?:ə)?\s*qədər(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `up to ${raw} years` : `до ${raw} лет`,
  );
  result = result.replace(
    /(\d+)\s*ilədək(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `up to ${raw} years` : `до ${raw} лет`,
  );
  result = result.replace(
    new RegExp(`(\\d+)\\s*il${notAzLetter}`, "giu"),
    (_match, raw: string) => localizeYearCount(Number(raw), locale),
  );
  result = result.replace(
    /(\d+)\s*ayadək(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `up to ${raw} months` : `до ${raw} мес.`,
  );
  result = result.replace(
    new RegExp(`(\\d+)\\s*ay${notAzLetter}`, "giu"),
    (_match, raw: string) => localizeMonthCount(Number(raw), locale),
  );
  result = result.replace(
    /(\d+)\s*m-ədək(?![\p{L}\p{N}_])/giu,
    (_match, raw) => (locale === "en" ? `up to ${raw} m` : `до ${raw} м`),
  );
  result = result.replace(
    /(\d+)\s*metrə\s*qədər(?![\p{L}\p{N}_])/giu,
    (_match, raw) => (locale === "en" ? `up to ${raw} m` : `до ${raw} м`),
  );
  result = result.replace(
    /(\d+)\s*q\s+sürətlənmə(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `${raw} g acceleration` : `${raw} g ускорение`,
  );
  result = result.replace(
    /(\d+)\s*q\s+(SFP|Ethernet|FC|Fibre|Fiber)\b/gi,
    "$1G $2",
  );
  result = result.replace(
    /(\d+(?:[.,]\d+)?)\s*q(?=\s*[;,]|\s*$|\s*\()/gi,
    (_match, raw) => (locale === "en" ? `${raw} g` : `${raw} г`),
  );
  result = result.replace(
    /(\d+(?:[.,]\d+)?)\s*m³\/dəq(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `${raw} m³/min` : `${raw} м³/мин`,
  );
  result = result.replace(
    /(\d+)\s*TB\/il(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `${raw} TB/year` : `${raw} ТБ/год`,
  );
  result = result.replace(
    /([\d.]+)\s*["″]-dək(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `up to ${raw}"` : `до ${raw}"`,
  );
  result = result.replace(/-dən(?![\p{L}\p{N}_])/giu, "");
  result = result.replace(/-dədir(?![\p{L}\p{N}_])/giu, "");
  result = result.replace(/-dək(?![\p{L}\p{N}_])/giu, "");
  result = result.replace(
    /(\d+)\s*nüvə\s*\/\s*(\d+)\s*axın/gi,
    (_match, cores, threads) =>
      locale === "en"
        ? `${cores} cores / ${threads} threads`
        : `${cores} ядер / ${threads} потоков`,
  );
  result = result.replace(/(\d+)\s*vərəq\b/gi, (_match, raw) =>
    locale === "en" ? `${raw} sheets` : `${raw} листов`,
  );
  result = result.replace(/(\d+)\s*səh\/ay\b/gi, (_match, raw) =>
    locale === "en" ? `${raw} pages/month` : `${raw} стр/мес`,
  );
  result = result.replace(/(\d+(?:\.\d+)?)\s*səh\/dəq\b/gi, (_match, raw) =>
    locale === "en" ? `${raw} ppm` : `${raw} стр/мин`,
  );
  result = result.replace(/(\d+)\s*səh\b(?!\/)/gi, (_match, raw) =>
    locale === "en" ? `${raw} pages` : `${raw} стр.`,
  );
  result = result.replace(/(\d+)\s*ədədə qədər\b/gi, (_match, raw) =>
    locale === "en" ? `up to ${raw} units` : `до ${raw} шт.`,
  );
  result = result.replace(/(\d+)\s*ədəd(?![\p{L}\p{N}_])/giu, (_match, raw) =>
    locale === "en" ? `${raw} pcs` : `${raw} шт.`,
  );
  result = result.replace(/(\d+)\s*əd(?![\p{L}\p{N}_])/giu, (_match, raw) =>
    locale === "en" ? `${raw} pcs` : `${raw} шт.`,
  );
  result = result.replace(/(\d+)-hüceyrəli\b/gi, (_match, raw) =>
    locale === "en" ? `${raw}-cell` : `${raw}-элементный`,
  );
  result = result.replace(/(\d+)\s*düymə\b/gi, (_match, raw) =>
    locale === "en" ? `${raw} keys` : `${raw} клавиш`,
  );
  result = result.replace(/(\d+)\s*MB keş(?![\p{L}\p{N}_])/giu, (_match, raw) =>
    locale === "en" ? `${raw} MB cache` : `${raw} МБ кэш`,
  );
  result = result.replace(/(\d[\d\s]*)\s*dövr\/dəq\b/gi, (_match, raw) =>
    locale === "en" ? `${String(raw).trim()} rpm` : `${String(raw).trim()} об/мин`,
  );
  result = result.replace(/(\d+)\s*m-ə qədər\b/gi, (_match, raw) =>
    locale === "en" ? `up to ${raw} m` : `до ${raw} м`,
  );
  result = result.replace(
    /(\d+(?:[.,]\d+)?)\s*%-ə qədər\s+səmərəlilik/giu,
    (_match, raw) =>
      locale === "en"
        ? `efficiency of up to ${raw}%`
        : `КПД до ${raw}%`,
  );
  result = result.replace(
    /(\d+(?:[.,]\d+)?)\s*%-ə qədər(?![\p{L}\p{N}_])/giu,
    (_match, raw) =>
      locale === "en" ? `up to ${raw}%` : `до ${raw}%`,
  );

  const outletOnly = result.match(/^(\d+)\s*rozetka$/i);
  if (outletOnly) {
    return locale === "en"
      ? `${outletOnly[1]} outlets`
      : `${outletOnly[1]} розетки`;
  }

  if (
    !AZ_VALUE_CHAR.test(result) &&
    !AZ_VALUE_WORD.test(result) &&
    !AZ_VALUE_FRAGMENTS.some((fragment) => {
      const probe = new RegExp(fragment.pattern.source, fragment.pattern.flags);
      return probe.test(result);
    })
  ) {
    return locale === "ru" ? ruTranslateEnglishValue(result) : result;
  }

  for (const fragment of AZ_VALUE_FRAGMENTS) {
    const replacement = locale === "en" ? fragment.en : fragment.ru;
    result = result.replace(fragment.pattern, replacement);
  }

  result = result.replace(/-yə(?![\p{L}\p{N}_])/giu, "");
  result = result.replace(/-ya(?![\p{L}\p{N}_])/giu, "");
  result = result.replace(/-ə(?![\p{L}\p{N}_])/giu, "");
  result = result.replace(/-(?:i)?(?:dır|dir|dur|dür)\b/giu, "");
  result = result.replace(/-s[iuüı]d[iuüı]r\b/giu, "");
  // Strip Azerbaijani locative suffix appended to Latin tokens, e.g.
  // "Sport Combo-da" → "Sport Combo", "4K-da" → "4K", "SKU-da" → "SKU".
  result = result.replace(/(?<=[A-Za-z0-9])-(?:da|də)(?![\p{L}\p{N}_])/giu, "");
  result = result.replace(/(?<=\s)də(?=[\s.,!?]|$)/giu, locale === "en" ? "also" : "также");

  if (locale === "ru") {
    result = ruTranslateEnglishValue(result);
  }

  return result.replace(/\s{2,}/g, " ").replace(/\s+([,;:.])/g, "$1").trim();
}

export function localizeProductAttributeValue(
  label: string,
  value: string,
  locale: Locale,
): string {
  if (isColorAttributeLabel(label)) {
    return localizeCatalogColor(value, locale);
  }
  if (locale === "az") {
    return value;
  }
  const trimmed = value.trim();
  const lower = foldAz(trimmed);

  const matchedVal = VALUE_TRANSLATIONS_BY_FOLD.get(lower);
  if (matchedVal) {
    return matchedVal[locale];
  }

  // Boolean / availability translations
  if (lower === "bəli" || lower === "beli" || lower === "yes" || lower === "да") {
    return locale === "en" ? "Yes" : "Да";
  }
  if (lower === "xeyr" || lower === "yox" || lower === "no" || lower === "нет") {
    return locale === "en" ? "No" : "Нет";
  }

  // Warranty translations e.g. "2 il", "3 il", "1 il", "24 ay"
  const yearMatch = trimmed.match(/^(\d+)\s*il$/i);
  if (yearMatch) {
    const count = Number(yearMatch[1]);
    if (locale === "en") {
      return count === 1 ? "1 year" : `${count} years`;
    }
    if (locale === "ru") {
      if (count === 1) return "1 год";
      if (count >= 2 && count <= 4) return `${count} года`;
      return `${count} лет`;
    }
  }

  const monthMatch = trimmed.match(/^(\d+)\s*ay$/i);
  if (monthMatch) {
    const count = Number(monthMatch[1]);
    if (locale === "en") {
      return count === 1 ? "1 month" : `${count} months`;
    }
    if (locale === "ru") {
      if (count === 1) return "1 месяц";
      if (count >= 2 && count <= 4) return `${count} месяца`;
      return `${count} месяцев`;
    }
  }

  if (lower.includes("kompakt tkl") || lower.includes("tenkeyless")) {
    if (locale === "en") {
      return "Compact TKL (Tenkeyless 85% format - 87 keys, no number pad, takes up little desk space)";
    }
    if (locale === "ru") {
      return "Компактный TKL (формат 85% без цифрового блока - 87 клавиш, занимает мало места на столе)";
    }
  }

  if (
    lower.includes("ultra kompakt 65%") ||
    lower.includes("ultra compact 65%") ||
    lower.includes("68 düymə") ||
    lower.includes("68 duyme") ||
    lower.includes("68 keys")
  ) {
    if (locale === "en") {
      return "Ultra compact 65% format (only 68 keys - ideal for travel and minimalists)";
    }
    if (locale === "ru") {
      return "Ультракомпактный формат 65% (всего 68 клавиш - идеально для путешествий и минималистов)";
    }
  }

  if (lower.includes("tam ölçülü") && lower.includes("oyun klaviaturası")) {
    if (locale === "en") {
      return "Full-size (100%) gaming keyboard";
    }
    if (locale === "ru") {
      return "Полноразмерная (100%) игровая клавиатура";
    }
  }

  if (lower.includes("simsiz 2.4 ghz") && lower.includes("type-c")) {
    if (locale === "en") {
      return "Wireless 2.4 GHz (USB adapter) and wired Type-C cable use";
    }
    if (locale === "ru") {
      return "Беспроводной радиоканал 2.4 ГГц (USB-адаптер) и проводное подключение через кабель Type-C";
    }
  }

  if (lower.includes("1000 mah") && (lower.includes("batareya") || lower.includes("akkumulyator"))) {
    if (locale === "en") {
      return "Built-in 1000 mAh rechargeable battery";
    }
    if (locale === "ru") {
      return "Встроенный перезаряжаемый аккумулятор 1000 мАч";
    }
  }

  if (lower.includes("çoxrejimli rgb") || lower.includes("dinamik çoxrejimli rgb")) {
    if (locale === "en") {
      return "Dynamic multi-mode RGB backlighting (brightness and speed adjustment)";
    }
    if (locale === "ru") {
      return "Динамическая многорежимная RGB-подсветка (регулировка яркости и скорости)";
    }
  }

  if (lower.includes("10 milyon klik") && lower.includes("anti-ghosting")) {
    if (locale === "en") {
      return "10 million clicks, 19-key Anti-Ghosting";
    }
    if (locale === "ru") {
      return "10 миллионов кликов, 19-клавишный Anti-Ghosting";
    }
  }

  if (lower.includes("nəmə qarşı daxili qoruyucu")) {
    if (locale === "en") {
      return "Internal moisture-resistant protective layer";
    }
    if (locale === "ru") {
      return "Внутренний влагозащитный слой";
    }
  }

  if (lower.includes("şaquli") || lower.includes("vertikal")) {
    if (locale === "en") {
      return "Vertical ergonomic silent wireless mouse (prevents carpal tunnel syndrome and wrist fatigue)";
    }
    if (locale === "ru") {
      return "Вертикальная эргономичная бесшумная беспроводная мышь (предотвращает туннельный синдром и усталость запястья)";
    }
  }

  if (lower.includes("scissor-switch") || lower.includes("qayçı")) {
    if (locale === "en") {
      return "Laptop-style scissor-switch mechanism – ultra-smooth, precise, and quiet typing experience";
    }
    if (locale === "ru") {
      return "Ножничный механизм (Scissor-switch) ноутбучного типа — исключительно мягкий, точный и бесшумный набор";
    }
  }

  // Weight & dimension substitutions
  if (/çəki:\s*\d+\s*q/i.test(value)) {
    if (locale === "en") {
      return value
        .replace(/çəki:\s*/gi, "Weight: ")
        .replace(/(\d+)\s*q\b/gi, "$1 g");
    }
    if (locale === "ru") {
      return value
        .replace(/çəki:\s*/gi, "Вес: ")
        .replace(/(\d+)\s*q\b/gi, "$1 г");
    }
  }

  // Standalone grams substitution (e.g., "350 q", "650 q", "700 q", "130 q")
  const gramMatch = trimmed.match(/^(\d+)\s*q$/i);
  if (gramMatch) {
    return locale === "en" ? `${gramMatch[1]} g` : `${gramMatch[1]} г`;
  }

  // Standalone kg substitution (e.g., "7.5 kq")
  const kgMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*kq$/i);
  if (kgMatch) {
    return locale === "en" ? `${kgMatch[1]} kg` : `${kgMatch[1]} кг`;
  }

  // Print yield substitution (e.g., "1300 səhifə", "10000 səhifə", "1300 sehife")
  const pageMatch = trimmed.match(/^(\d+)\s*s[əe]hif[əe]$/i);
  if (pageMatch) {
    return locale === "en" ? `${pageMatch[1]} pages` : `${pageMatch[1]} страниц`;
  }

  // Print speed substitution (e.g., "7.5 səh/dəq", "20 səh/dəq")
  const speedMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*s[əe]h\/d[əe]q$/i);
  if (speedMatch) {
    return locale === "en" ? `${speedMatch[1]} ppm` : `${speedMatch[1]} стр/мин`;
  }

  // CPU cores/threads substitution (e.g., "12 nüvə / 24 axın", "8 nüvə / 16 axın")
  const cpuCoreMatch = trimmed.match(/^(\d+)\s*nüvə\s*\/\s*(\d+)\s*axın$/i);
  if (cpuCoreMatch) {
    return locale === "en"
      ? `${cpuCoreMatch[1]} cores / ${cpuCoreMatch[2]} threads`
      : `${cpuCoreMatch[1]} ядер / ${cpuCoreMatch[2]} потоков`;
  }

  // Memory channels substitution (e.g., "DDR4-3200, 8 kanal")
  const ramChannelMatch = trimmed.match(/^(.*?),\s*(\d+)\s*kanal$/i);
  if (ramChannelMatch) {
    return locale === "en"
      ? `${ramChannelMatch[1]}, ${ramChannelMatch[2]}-channel`
      : `${ramChannelMatch[1]}, ${ramChannelMatch[2]} канала`;
  }

  return localizeResidualSpecValue(trimmed, locale);
}

export function localizeProductSpecEntries(
  entries: ReadonlyArray<readonly [string, string]>,
  locale: Locale,
  messages: StorefrontMessages,
  storedSpecs?: ReadonlyArray<{
    label: string;
    value: string;
    labelRu?: string;
    valueRu?: string;
    labelEn?: string;
    valueEn?: string;
  }>,
): Array<[string, string]> {
  return entries.map(([label, value]) => {
    if (locale !== "az" && storedSpecs && storedSpecs.length > 0) {
      const stored = storedSpecs.find(
        (spec) =>
          spec.label.trim().toLocaleLowerCase("az") ===
            label.trim().toLocaleLowerCase("az") &&
          spec.value.trim().toLocaleLowerCase("az") ===
            value.trim().toLocaleLowerCase("az"),
      );
      if (stored !== undefined) {
        const storedLabel = locale === "en" ? stored.labelEn : stored.labelRu;
        const storedValue = locale === "en" ? stored.valueEn : stored.valueRu;
        if (storedLabel && storedValue) {
          return [storedLabel, storedValue];
        }
      }
    }

    const localizedLabel = localizeProductAttributeLabel(label, messages);
    const localizedValue = localizeProductAttributeValue(
      label,
      value,
      locale,
    );
    return [localizedLabel, localizedValue];
  });
}
