/**
 * Reusable Azerbaijani product-description phrases (AZ source → EN/RU).
 * Matched case-insensitively, longest key first. Future catalog copy that
 * reuses these sentences is translated without per-SKU entries.
 */

export type CatalogPhraseTranslation = { en: string; ru: string };

/** Full sentences / headings that appear in “Məhsul haqqında”. */
export const CATALOG_DESCRIPTION_PHRASES: Record<
  string,
  CatalogPhraseTranslation
> = {
  "Əsas texniki göstəricilər və xüsusiyyətlər:": {
    en: "Key technical specifications:",
    ru: "Основные технические характеристики:",
  },
  "Əsas göstəricilər və xüsusiyyətlər:": {
    en: "Key specifications and features:",
    ru: "Основные показатели и характеристики:",
  },
  "Əsas xüsusiyyətlər:": {
    en: "Key features:",
    ru: "Основные особенности:",
  },
  "IT Market olaraq bütün məhsullara rəsmi keyfiyyət zəmanəti, Bakı daxilində və bölgələrə operativ çatdırılma, eləcə də peşəkar texniki dəstək təqdim edirik.":
    {
      en: "IT Market provides official quality warranty, fast delivery in Baku and the regions, and professional technical support on all products.",
      ru: "IT Market предоставляет официальную гарантию качества, оперативную доставку по Баку и регионам, а также профессиональную техническую поддержку на все товары.",
    },
  "IT Market olaraq bütün təqdim olunan şəbəkə və rabitə avadanlıqlarına texniki keyfiyyət zəmanəti, operativ çatdırılma və peşəkar müştəri dəstəyi təqdim edirik.":
    {
      en: "IT Market provides technical quality warranty, fast delivery, and professional customer support on all listed networking and communications equipment.",
      ru: "IT Market предоставляет гарантию технического качества, оперативную доставку и профессиональную поддержку клиентов на всё представленное сетевое и коммуникационное оборудование.",
    },
  "IT Market olaraq bütün məhsullara texniki keyfiyyət zəmanəti, operativ çatdırılma və peşəkar servis dəstəyi təqdim edirik.":
    {
      en: "IT Market provides technical quality warranty, fast delivery, and professional service support on all products.",
      ru: "IT Market предоставляет гарантию технического качества, оперативную доставку и профессиональную сервисную поддержку на все товары.",
    },
  "Müasir ofis, korporativ şəbəkə və zəng mərkəzləri üçün ideal səs keyfiyyəti, zəng idarəetməsi və şəbəkə sabitliyi təmin edir.":
    {
      en: "It delivers the voice quality, call control, and network stability needed for modern offices, corporate networks, and call centres.",
      ru: "Обеспечивает качество связи, управление вызовами и стабильность сети для современного офиса, корпоративной сети и колл-центров.",
    },
  "Konfiqurasiyanı müqayisə edib rəsmi zəmanət və çatdırılma ilə sifariş edə bilərsiniz.":
    {
      en: "You can compare the configuration and order with official warranty and delivery.",
      ru: "Вы можете сравнить конфигурацию и оформить заказ с официальной гарантией и доставкой.",
    },
  "Orijinal məhsul, peşəkar dəstək və mağazadan təhvil.": {
    en: "Original product, professional support, and in-store pickup.",
    ru: "Оригинальный товар, профессиональная поддержка и самовывоз из магазина.",
  },
  "Bakı anbarından çatdırılma mümkündür.": {
    en: "Delivery from the Baku warehouse is available.",
    ru: "Доступна доставка со склада в Баку.",
  },
  "Bakıda təhvil və rəsmi servis dəstəği.": {
    en: "Pickup in Baku and official service support.",
    ru: "Самовывоз в Баку и официальная сервисная поддержка.",
  },
  "Kataloqda orijinal model, rəsmi zəmanətlə satılır.": {
    en: "The original model is sold in the catalog with official warranty.",
    ru: "В каталоге продаётся оригинальная модель с официальной гарантией.",
  },
  "Rəsmi zəmanət və çatdırılma ilə təqdim olunur.": {
    en: "Offered with official warranty and delivery.",
    ru: "Предлагается с официальной гарантией и доставкой.",
  },
  "Rəsmi zəmanət və çatdırılma.": {
    en: "Official warranty and delivery.",
    ru: "Официальная гарантия и доставка.",
  },
  "Alisa ilə evdə musiqi, hava, taymer və ağıllı ev idarəsi üçün nəzərdə tutulub.":
    {
      en: "Designed for music, weather, timers, and smart-home control with Alice at home.",
      ru: "Предназначена для музыки, погоды, таймеров и управления умным домом с Алисой дома.",
    },
  "Yolda, bağda və açıq havada Alisa ilə musiqi üçün nəzərdə tutulub.": {
    en: "Designed for music with Alice on the go, in the garden, and outdoors.",
    ru: "Предназначена для музыки с Алисой в дороге, в саду и на улице.",
  },
  "Alisa ilə Ev tətbiqi üzərindən işıq səhnələri üçün nəzərdə tutulub.": {
    en: "Designed for lighting scenes via the Alice Smart Home app.",
    ru: "Предназначена для световых сценариев через приложение «Алиса с умным домом».",
  },
  "Divar açarını Alisa və ağıllı ev ssenarilərinə qoşmaq üçün nəzərdə tutulub.":
    {
      en: "Designed to connect a wall switch to Alice and smart-home scenes.",
      ru: "Предназначен для подключения настенного выключателя к Алисе и сценариям умного дома.",
    },
  "Evdə hərəkət, qapı və ya iqlim hadisələrini Alisa-ya ötürmək üçün nəzərdə tutulub.":
    {
      en: "Designed to report motion, door, or climate events at home to Alice.",
      ru: "Предназначен для передачи событий движения, двери или климата дома Алисе.",
    },
  "Rozetkadakı cihazları Alisa ilə yandırmaq və söndürmək üçün nəzərdə tutulub.":
    {
      en: "Designed to switch plugged-in devices on and off with Alice.",
      ru: "Предназначена для включения и выключения устройств в розетке с помощью Алисы.",
    },
  "TV və audio avadanlığını Alisa ağıllı evə bağlamaq üçün nəzərdə tutulub.": {
    en: "Designed to connect TV and audio equipment to the Alice smart home.",
    ru: "Предназначен для подключения ТВ и аудиотехники к умному дому Алисы.",
  },
  "Alisa ilə Ev ağıllı ev ekosistemi üçün nəzərdə tutulub.": {
    en: "Designed for the Alice Smart Home ecosystem.",
    ru: "Предназначен для экосистемы умного дома Алисы.",
  },
  "Oyun və e-sports üçün yüksək yenilənmə tezlikli monitordur.": {
    en: "It is a high-refresh-rate monitor for gaming and e-sports.",
    ru: "Это монитор с высокой частотой обновления для игр и киберспорта.",
  },
  "Kompüter, konsol və mobil oyun üçün nəzərdə tutulub.": {
    en: "Designed for PC, console, and mobile gaming.",
    ru: "Предназначена для игр на ПК, консоли и смартфоне.",
  },
  "Oyun və gündəlik yazı üçün nəzərdə tutulub.": {
    en: "Designed for gaming and everyday typing.",
    ru: "Предназначена для игр и повседневного набора текста.",
  },
  "FPS və gündəlik oyun üçün nəzərdə tutulub.": {
    en: "Designed for FPS and everyday gaming.",
    ru: "Предназначена для FPS и повседневных игр.",
  },
  "Strim, podcast və Discord üçün nəzərdə tutulub.": {
    en: "Designed for streaming, podcasts, and Discord.",
    ru: "Предназначен для стримов, подкастов и Discord.",
  },
  "Strim, Discord və səsyazma üçün nəzərdə tutulub.": {
    en: "Designed for streaming, Discord, and recording.",
    ru: "Предназначен для стримов, Discord и записи звука.",
  },
  "Strim və videozənglər üçün nəzərdə tutulub.": {
    en: "Designed for streaming and video calls.",
    ru: "Предназначена для стримов и видеозвонков.",
  },
  "Xbox və PC oyunları üçün nəzərdə tutulub.": {
    en: "Designed for Xbox and PC gaming.",
    ru: "Предназначен для игр на Xbox и ПК.",
  },
  "PC və konsol oyunları üçün nəzərdə tutulub.": {
    en: "Designed for PC and console gaming.",
    ru: "Предназначен для игр на ПК и консоли.",
  },
  "Masaüstü oyun səsi üçün nəzərdə tutulub.": {
    en: "Designed for desktop gaming audio.",
    ru: "Предназначена для игрового звука на рабочем столе.",
  },
  "Oyun və gündəlik istifadə üçün nəzərdə tutulub.": {
    en: "Designed for gaming and everyday use.",
    ru: "Предназначен для игр и повседневного использования.",
  },
  "Oyun, zəng və gündəlik dinləmə üçün nəzərdə tutulub.": {
    en: "Designed for gaming, calls, and everyday listening.",
    ru: "Предназначена для игр, звонков и повседневного прослушивания.",
  },
  "Ofis və oyun üçün nəzərdə tutulub.": {
    en: "Designed for office use and gaming.",
    ru: "Предназначена для офиса и игр.",
  },
  "Uzun oyun sessiyaları üçün nəzərdə tutulub.": {
    en: "Designed for long gaming sessions.",
    ru: "Предназначено для длинных игровых сессий.",
  },
  "Ev, ofis və açıq hava üçün nəzərdə tutulub.": {
    en: "Designed for home, office, and outdoor use.",
    ru: "Предназначена для дома, офиса и улицы.",
  },
  "Kompüter və ofis avadanlığının qısa fasilələrdə qorunması üçündür.": {
    en: "It protects computers and office equipment during short outages.",
    ru: "Защищает компьютер и офисную технику при коротких перебоях питания.",
  },
  "İş və əyləncə üçün nəzərdə tutulub.": {
    en: "Designed for work and entertainment.",
    ru: "Предназначен для работы и развлечений.",
  },
  "Noutbukun daşınması və qorunması üçündür.": {
    en: "It is for carrying and protecting a laptop.",
    ru: "Предназначена для переноски и защиты ноутбука.",
  },
  "Noutbuk və oyun aksesuarlarının daşınması üçündür.": {
    en: "It is for carrying laptops and gaming accessories.",
    ru: "Предназначена для переноски ноутбуков и игровых аксессуаров.",
  },
  "Gündəlik istifadə üçün nəzərdə tutulub.": {
    en: "Designed for everyday use.",
    ru: "Предназначен для повседневного использования.",
  },
  "Masaüstü və noutbuk üçün JEDEC DDR4 moduludur.": {
    en: "It is a JEDEC DDR4 module for desktops and laptops.",
    ru: "Это модуль JEDEC DDR4 для настольных ПК и ноутбуков.",
  },
  "Masaüstü və noutbuk üçün JEDEC DDR5 moduludur.": {
    en: "It is a JEDEC DDR5 module for desktops and laptops.",
    ru: "Это модуль JEDEC DDR5 для настольных ПК и ноутбуков.",
  },
  "Masaüstü və noutbuk üçün JEDEC ValueRAM moduludur.": {
    en: "It is a JEDEC ValueRAM module for desktops and laptops.",
    ru: "Это модуль JEDEC ValueRAM для настольных ПК и ноутбуков.",
  },
  "Noutbuk üçün SODIMM DDR4 moduludur.": {
    en: "It is a SODIMM DDR4 module for laptops.",
    ru: "Это модуль SODIMM DDR4 для ноутбуков.",
  },
  "Intel XMP oyun və overclock üçün nəzərdə tutulub.": {
    en: "Designed for Intel XMP gaming and overclocking.",
    ru: "Предназначена для игр и разгона с Intel XMP.",
  },
  "Intel XMP 3.0 oyun və overclock üçün nəzərdə tutulub.": {
    en: "Designed for Intel XMP 3.0 gaming and overclocking.",
    ru: "Предназначена для игр и разгона с Intel XMP 3.0.",
  },
  'PC və noutbuk üçün 2.5" SATA SSD-dir.': {
    en: 'It is a 2.5" SATA SSD for PCs and laptops.',
    ru: 'Это 2.5" SATA SSD для ПК и ноутбуков.',
  },
  "NAS və server mixed-use yaddaşı üçündür.": {
    en: "It is mixed-use storage for NAS and servers.",
    ru: "Это накопитель смешанной нагрузки для NAS и серверов.",
  },
  "PCIe NVMe M.2 2280 sistem yaddaşı üçündür.": {
    en: "It is PCIe NVMe M.2 2280 system storage.",
    ru: "Это системный накопитель PCIe NVMe M.2 2280.",
  },
  "PCIe Gen4 NVMe M.2 2280 sistem yaddaşı üçündür.": {
    en: "It is PCIe Gen4 NVMe M.2 2280 system storage.",
    ru: "Это системный накопитель PCIe Gen4 NVMe M.2 2280.",
  },
  "Gaming PC və PS5 üçün yüksək sürətli NVMe SSD-dir.": {
    en: "It is a high-speed NVMe SSD for gaming PCs and PS5.",
    ru: "Это высокоскоростной NVMe SSD для игровых ПК и PS5.",
  },
  "PS5 və gaming PC üçün heatsink-li yüksək sürətli NVMe SSD-dir.": {
    en: "It is a high-speed NVMe SSD with heatsink for PS5 and gaming PCs.",
    ru: "Это высокоскоростной NVMe SSD с радиатором для PS5 и игровых ПК.",
  },
  "Telefon, kamera və oyun konsolu üçün microSD kartdır.": {
    en: "It is a microSD card for phones, cameras, and game consoles.",
    ru: "Это карта microSD для телефонов, камер и игровых консолей.",
  },
  "Telefon, kamera və dron üçün microSD kartdır.": {
    en: "It is a microSD card for phones, cameras, and drones.",
    ru: "Это карта microSD для телефонов, камер и дронов.",
  },
  "Noutbuk və konsol yedəkləməsi üçündür.": {
    en: "It is for laptop and console backups.",
    ru: "Предназначена для резервного копирования ноутбуков и консолей.",
  },
  "Noutbuk, telefon və konsol yedəkləməsi üçündür.": {
    en: "It is for laptop, phone, and console backups.",
    ru: "Предназначена для резервного копирования ноутбуков, телефонов и консолей.",
  },
  "Fayl köçürmə və gündəlik yedək üçündür.": {
    en: "It is for file transfers and everyday backups.",
    ru: "Предназначена для переноса файлов и повседневного резервного копирования.",
  },
  "Portativ yedəkləmə və arxiv saxlama üçündür.": {
    en: "It is for portable backup and archive storage.",
    ru: "Предназначена для портативного резервного копирования и архивного хранения.",
  },
  "Telefon, noutbuk və qulaqlıq üçün gündəlik şarj üçün nəzərdə tutulub.": {
    en: "Designed for everyday charging of phones, laptops, and headphones.",
    ru: "Предназначено для повседневной зарядки телефонов, ноутбуков и наушников.",
  },
  "Avtomobildə telefon şarjı və istifadəsi üçün nəzərdə tutulub.": {
    en: "Designed for charging and using a phone in the car.",
    ru: "Предназначено для зарядки и использования телефона в автомобиле.",
  },
  "Yolda və ofisdə əlavə enerji üçün nəzərdə tutulub.": {
    en: "Designed for extra power on the go and in the office.",
    ru: "Предназначен для дополнительного питания в дороге и в офисе.",
  },
  "Gündəlik şarj, data və audio bağlantısı üçün nəzərdə tutulub.": {
    en: "Designed for everyday charging, data, and audio connections.",
    ru: "Предназначен для повседневной зарядки, передачи данных и аудио.",
  },
  "Musiqi, zəng və gündəlik istifadə üçün nəzərdə tutulub.": {
    en: "Designed for music, calls, and everyday use.",
    ru: "Предназначены для музыки, звонков и повседневного использования.",
  },
  "Noutbuk və USB-C host üçün əlavə portlar təmin edir.": {
    en: "It adds extra ports for laptops and USB-C hosts.",
    ru: "Добавляет дополнительные порты для ноутбуков и USB-C хостов.",
  },
  "Ofis və gündəlik kompüter işi üçün nəzərdə tutulub.": {
    en: "Designed for office and everyday computer work.",
    ru: "Предназначена для офисной и повседневной работы за компьютером.",
  },
  "Ev və ofis şəbəkə bağlantısı üçün nəzərdə tutulub.": {
    en: "Designed for home and office network connections.",
    ru: "Предназначен для домашнего и офисного сетевого подключения.",
  },
  "Ev, ofis və gündəlik IT istifadəsi üçün nəzərdə tutulub.": {
    en: "Designed for home, office, and everyday IT use.",
    ru: "Предназначен для дома, офиса и повседневного IT-использования.",
  },
  "Kiçik və orta meeting otaqları üçün nəzərdə tutulub.": {
    en: "Designed for small and medium meeting rooms.",
    ru: "Предназначена для малых и средних переговорных.",
  },
  "Ofis, hybrid iş və kiçik iclaslar üçün nəzərdə tutulub.": {
    en: "Designed for office, hybrid work, and small meetings.",
    ru: "Предназначена для офиса, гибридной работы и небольших совещаний.",
  },
  "Jabra ofis qulaqlıqları üçün ehtiyat hissə və aksesuardır.": {
    en: "It is a spare part and accessory for Jabra office headsets.",
    ru: "Это запасная часть и аксессуар для офисных гарнитур Jabra.",
  },
  "Ofis, call-center və Microsoft Teams üçün nəzərdə tutulub.": {
    en: "Designed for office, call-centre, and Microsoft Teams use.",
    ru: "Предназначена для офиса, колл-центра и Microsoft Teams.",
  },
  "Tam yeni (istifadə olunmamış, orijinal rəsmi qablaşdırmada)": {
    en: "Brand new (unused, in original retail packaging)",
    ru: "Новый (неиспользованный, в оригинальной розничной упаковке)",
  },
  "Tam yeni (istifadə olunmamış, orijinal qablaşdırmada)": {
    en: "Brand new (unused, in original packaging)",
    ru: "Новый (неиспользованный, в оригинальной упаковке)",
  },
  "İşlənmiş (hərtərəfli texniki test edilmiş, tam saz vəziyyətdə)": {
    en: "Used (fully technically tested, in perfect working order)",
    ru: "Б/у (полностью технически проверен, исправен)",
  },
  "İşlənmiş (əla texniki vəziyyətdə, tam test olunmuş)": {
    en: "Used (excellent technical condition, fully tested)",
    ru: "Б/у (отличное техническое состояние, полностью проверен)",
  },
  "İşlənmiş (tam test edilmiş və saz vəziyyətdə)": {
    en: "Used (fully tested and in working condition)",
    ru: "Б/у (полностью протестирован, в рабочем состоянии)",
  },
};

/** Medium fragments applied after full sentences (longest first). */
export const CATALOG_DESCRIPTION_FRAGMENTS: ReadonlyArray<
  [string, string, string]
> = [
  ["rəsmi zəmanət və çatdırılma ilə təqdim olunur", "offered with official warranty and delivery", "предлагается с официальной гарантией и доставкой"],
  ["rəsmi zəmanət və çatdırılma ilə", "with official warranty and delivery", "с официальной гарантией и доставкой"],
  ["rəsmi zəmanət və çatdırılma", "official warranty and delivery", "официальная гарантия и доставка"],
  ["üçün nəzərdə tutulub", "is designed for", "предназначен для"],
  ["nəzərdə tutulub", "is designed for", "предназначен"],
  ["idarə olunan", "managed", "управляемый"],
  ["idarə olunur", "is managed", "управляется"],
  ["təqdim olunur", "is offered", "предлагается"],
  ["cüt istifadə olunur", "used as a pair", "используется в паре"],
  ["real vaxtda", "real-time", "в реальном времени"],
  ["modulu ilə", "with the module", "с модулем"],
  ["peşəkar dəstək", "professional support", "профессиональная поддержка"],
  ["mağazadan təhvil", "in-store pickup", "самовывоз из магазина"],
  ["rəsmi zəmanətlə", "with official warranty", "с официальной гарантией"],
  ["rəsmi zəmanət", "official warranty", "официальная гарантия"],
  ["texniki xidmət tələb etmir", "maintenance-free", "не требует обслуживания"],
  ["inteqrasiya olunmuş qrafika yoxdur", "no integrated graphics", "без встроенной графики"],
  ["inteqrasiya olunmuş", "integrated", "интегрированный"],
  ["yüksək sıxlıqlı", "high-density", "высокой плотности"],
  ["kiçik ofis", "small office", "малый офис"],
  ["böyük ofis", "large office", "большой офис"],
  ["dok stansiyası", "docking station", "док-станция"],
  ["masaüstü kompüter", "desktop computer", "настольный компьютер"],
  ["enerji adapteri", "power adapter", "блок питания"],
  ["şəbəkə adapteri", "network adapter", "сетевой адаптер"],
  ["noutbuk çantası", "laptop bag", "сумка для ноутбука"],
  ["klaviatura və siçan dəsti", "keyboard and mouse kit", "комплект клавиатуры и мыши"],
  ["oyun siçan altlığı", "gaming mouse pad", "игровой коврик для мыши"],
  ["siçan altlığı", "mouse pad", "коврик для мыши"],
  ["oyun klaviaturası", "gaming keyboard", "игровая клавиатура"],
  ["Gaming oyun", "Gaming", "Gaming"],
  ["oyun qulaqlığı", "gaming headset", "игровая гарнитура"],
  ["oyun siçanı", "gaming mouse", "игровая мышь"],
  ["oyun monitoru", "gaming monitor", "игровой монитор"],
  ["oyun aksesuarı", "gaming accessory", "игровой аксессуар"],
  ["oyun kreslosu", "gaming chair", "игровое кресло"],
  ["oyun dinamiki", "gaming speaker", "игровая колонка"],
  ["oyun mikrofonu", "gaming microphone", "игровой микрофон"],
  ["oyun pultu", "gaming controller", "игровой контроллер"],
  ["oyun çantası", "gaming bag", "игровая сумка"],
  ["simsiz oyun qulaqlığı", "wireless gaming headset", "беспроводная игровая гарнитура"],
  ["simsiz oyun klaviaturası", "wireless gaming keyboard", "беспроводная игровая клавиатура"],
  ["simsiz oyun siçanı", "wireless gaming mouse", "беспроводная игровая мышь"],
  ["simsiz klaviatura", "wireless keyboard", "беспроводная клавиатура"],
  ["simsiz siçan", "wireless mouse", "беспроводная мышь"],
  ["PC korpusu", "PC case", "корпус ПК"],
  ["optik transceivər", "optical transceiver", "оптический трансивер"],
  ["optik modul", "optical module", "оптический модуль"],
  ["SFP modul", "SFP module", "SFP-модуль"],
  ["optik", "optical", "оптический"],
  ["istifadə olunur", "is used", "используется"],
  ["modul", "module", "модуль"],
  ["zəmanət və çatdırılma", "warranty and delivery", "гарантия и доставка"],
  ["operativ çatdırılma", "fast delivery", "оперативная доставка"],
  ["çatdırılma", "delivery", "доставка"],
  ["zəmanət", "warranty", "гарантия"],
  ["orijinal", "original", "оригинальный"],
  ["uyğundur", "is suitable", "подходит"],
  ["üçündür", "is for", "предназначен для"],
  ["satılır", "is sold", "продаётся"],
  ["portlu", "with ports", "с портами"],
  ["büdcəli", "budget", "с бюджетом"],
  ["büdcəsi", "budget", "бюджет"],
  ["korpusudur", "is a case", "является корпусом"],
  ["korpusu", "case", "корпус"],
];

/**
 * Product-type nouns for Azerbaijani copula “…dir/dır/dur/dür”
 * (e.g. “monitordir” → “is a monitor”).
 */
export const CATALOG_PRODUCT_TYPE_NOUNS: Record<
  string,
  CatalogPhraseTranslation
> = {
  kommutator: { en: "switch", ru: "коммутатором" },
  monitor: { en: "monitor", ru: "монитором" },
  noutbuk: { en: "laptop", ru: "ноутбуком" },
  siçan: { en: "mouse", ru: "мышью" },
  klaviatura: { en: "keyboard", ru: "клавиатурой" },
  qulaqlıq: { en: "headset", ru: "гарнитурой" },
  qulaqlığı: { en: "headset", ru: "гарнитурой" },
  modul: { en: "module", ru: "модулем" },
  modulu: { en: "module", ru: "модулем" },
  aksesuar: { en: "accessory", ru: "аксессуаром" },
  aksesuarı: { en: "accessory", ru: "аксессуаром" },
  məhsul: { en: "product", ru: "продуктом" },
  məhsulu: { en: "product", ru: "продуктом" },
  printer: { en: "printer", ru: "принтером" },
  skaner: { en: "scanner", ru: "сканером" },
  server: { en: "server", ru: "сервером" },
  adapter: { en: "adapter", ru: "адаптером" },
  kabel: { en: "cable", ru: "кабелем" },
  korpus: { en: "case", ru: "корпусом" },
  dinamik: { en: "speaker", ru: "колонкой" },
  kreslo: { en: "chair", ru: "креслом" },
  kolonka: { en: "speaker", ru: "колонкой" },
  stansiya: { en: "station", ru: "станцией" },
  transceivər: { en: "transceiver", ru: "трансивером" },
  batareya: { en: "battery", ru: "аккумулятором" },
  kartric: { en: "cartridge", ru: "картриджем" },
  kartrici: { en: "cartridge", ru: "картриджем" },
  UPS: { en: "UPS", ru: "ИБП" },
  HDD: { en: "HDD", ru: "HDD" },
  SSD: { en: "SSD", ru: "SSD" },
  "Access Point": { en: "access point", ru: "точкой доступа" },
  "access point": { en: "access point", ru: "точкой доступа" },
  monoblok: { en: "all-in-one PC", ru: "моноблоком" },
  televizor: { en: "television", ru: "телевизором" },
  mikrofon: { en: "microphone", ru: "микрофоном" },
  hub: { en: "hub", ru: "хабом" },
  model: { en: "model", ru: "моделью" },
  modeli: { en: "model", ru: "моделью" },
};
