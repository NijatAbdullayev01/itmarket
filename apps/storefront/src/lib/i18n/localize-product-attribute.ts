import type { Locale } from "./locales";
import type { StorefrontMessages } from "./messages";

const COLOR_KEYS = new Set(
  ["rəng", "reng", "color", "renk", "цвет"].map((label) =>
    label.toLocaleLowerCase("az"),
  ),
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
  "Dərin bənövşəyi": { en: "Deep Purple", ru: "Тёмно-фиолетовый" },
  Gümüşü: { en: "Silver", ru: "Серебристый" },
  "Kosmik Boz": { en: "Space Gray", ru: "Космический серый" },
  "Kosmik Boz (Space Gray)": { en: "Space Gray", ru: "Космический серый" },
  "Kosmik Boz / Ağ": { en: "Space Gray / White", ru: "Космический серый / Белый" },
  "Kosmik narıncı": { en: "Cosmic Orange", ru: "Космический оранжевый" },
  Mavi: { en: "Blue", ru: "Синий" },
  Narıncı: { en: "Orange", ru: "Оранжевый" },
  Qara: { en: "Black", ru: "Чёрный" },
  "Qara (Black)": { en: "Black", ru: "Чёрный" },
  "Qara / Ağ vurğularla": { en: "Black with white accents", ru: "Чёрный с белыми акцентами" },
  "Qara / Qırmızı": { en: "Black / Red", ru: "Чёрно-красный" },
  "Qara / Qırmızı (Black-Red)": { en: "Black / Red", ru: "Чёрно-красный" },
  Qırmızı: { en: "Red", ru: "Красный" },
  Qızılı: { en: "Gold", ru: "Золотой" },
  Sarı: { en: "Yellow", ru: "Жёлтый" },
  "Space Gray": { en: "Space Gray", ru: "Space Gray" },
  Şəffaf: { en: "Transparent", ru: "Прозрачный" },
  Titan: { en: "Titanium", ru: "Титан" },
  "Titan Ağ": { en: "White Titanium", ru: "Белый титан" },
  "Titan Bənövşəyi": { en: "Purple Titanium", ru: "Фиолетовый титан" },
  "Titan Gümüşü": { en: "Natural Titanium", ru: "Натуральный титан" },
  "Titan Mavi": { en: "Blue Titanium", ru: "Синий титан" },
  "Titan Qara": { en: "Black Titanium", ru: "Чёрный титан" },
  "Tünd boz": { en: "Dark Gray", ru: "Тёмно-серый" },
  "Tünd mavi": { en: "Deep Blue", ru: "Тёмно-синий" },
  Ultramarin: { en: "Ultramarine", ru: "Ультрамарин" },
  "Ultramarin mavi": { en: "Ultramarine Blue", ru: "Ультрамариновый синий" },
  Yaşıl: { en: "Green", ru: "Зелёный" },
  "Zərif Çəhrayı": { en: "Mallow Pink", ru: "Нежно-розовый" },
  "Zərif Çəhrayı (Mallow Pink)": { en: "Mallow Pink", ru: "Нежно-розовый (Mallow Pink)" },
};

function normalizeKey(label: string): string {
  return label.trim().toLocaleLowerCase("az");
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
  if (lower.startsWith("qara")) {
    return locale === "en" ? "Black" : "Чёрный";
  }
  if (lower.startsWith("ağ") || lower.startsWith("ag")) {
    return locale === "en" ? "White" : "Белый";
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
  "approksimasiya olunmuş sinus": {
    en: "Stepped approximation to a sinewave",
    ru: "Аппроксимированная синусоида",
  },
  "stepped approximation (line-interactive)": {
    en: "Stepped approximation (line-interactive)",
    ru: "Ступенчатая аппроксимация (линейно-интерактивный)",
  },
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
  "2× aaa batareya (uzunmüddətli enerji qənaət rejimi)": {
    en: "2× AAA batteries (long-term energy saving mode)",
    ru: "2× батарейки AAA (режим длительного энергосбережения)",
  },
  "aa tipli batareyalar": {
    en: "AA type batteries",
    ru: "Батарейки типа AA",
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
};

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
  const lower = trimmed.toLowerCase();

  const matchedVal = COMMON_VALUE_TRANSLATIONS[lower];
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

  return value;
}

export function localizeProductSpecEntries(
  entries: ReadonlyArray<readonly [string, string]>,
  locale: Locale,
  messages: StorefrontMessages,
): Array<[string, string]> {
  return entries.map(([label, value]) => {
    const localizedLabel = localizeProductAttributeLabel(label, messages);
    const localizedValue = localizeProductAttributeValue(
      label,
      value,
      locale,
    );
    return [localizedLabel, localizedValue];
  });
}
