/** Extra catalog spec value translations (AZ source → EN/RU). Keys are matched case-insensitively. */

export const EXTRA_CATALOG_SPEC_VALUES: Record<string, { en: string; ru: string }> = {
  "alisa ilə ev": { en: "Alice Smart Home", ru: "Умный дом Алисы" },
  "freedos 3.0 (əs yoxdur — windows ayrıca quraşdırılır)": {
    en: "FreeDOS 3.0 (No OS — Windows installed separately)",
    ru: "FreeDOS 3.0 (без ОС — Windows устанавливается отдельно)",
  },
  "işlənmiş": { en: "Used", ru: "Б/у" },
  "işlənmiş (2-ci əl)": { en: "Used (second-hand)", ru: "Б/у (вторичный рынок)" },
  "işlənmiş (tam işlək)": { en: "Used (fully working)", ru: "Б/у (полностью исправен)" },
  "işlənmiş (test edilmiş, tam işlək)": {
    en: "Used (tested, fully working)",
    ru: "Б/у (проверен, полностью исправен)",
  },
  "yeni (orijinal qablaşdırmada)": {
    en: "New (in original packaging)",
    ru: "Новый (в оригинальной упаковке)",
  },
  "1 ədəd": { en: "1 pc", ru: "1 шт." },
  "ömürlük (kingston limited lifetime)": {
    en: "Lifetime (Kingston Limited Lifetime)",
    ru: "Пожизненная (Kingston Limited Lifetime)",
  },
  "ömürlük": { en: "Lifetime", ru: "Пожизненная" },
  "802.11 b/g/n/ac (2,4 və 5 ghz)": {
    en: "802.11 b/g/n/ac (2.4 and 5 GHz)",
    ru: "802.11 b/g/n/ac (2,4 и 5 ГГц)",
  },
  "ieee 802.11 b/g/n/ac (2,4 və 5 ghz)": {
    en: "IEEE 802.11 b/g/n/ac (2.4 and 5 GHz)",
    ru: "IEEE 802.11 b/g/n/ac (2,4 и 5 ГГц)",
  },
  "ieee 802.11 a/b/g/n/ac (2,4 və 5 ghz)": {
    en: "IEEE 802.11 a/b/g/n/ac (2.4 and 5 GHz)",
    ru: "IEEE 802.11 a/b/g/n/ac (2,4 и 5 ГГц)",
  },
  "ieee 802.11 b/g/n/ac/ax (wi-fi 6, 2,4 və 5 ghz)": {
    en: "IEEE 802.11 b/g/n/ac/ax (Wi-Fi 6, 2.4 and 5 GHz)",
    ru: "IEEE 802.11 b/g/n/ac/ax (Wi-Fi 6, 2,4 и 5 ГГц)",
  },
  "802.11 a/b/g/n/ac (2,4 və 5 ghz)": {
    en: "802.11 a/b/g/n/ac (2.4 and 5 GHz)",
    ru: "802.11 a/b/g/n/ac (2,4 и 5 ГГц)",
  },
  "qapalı, over-ear": { en: "Closed-back, over-ear", ru: "Закрытые, охватывающие (over-ear)" },
  "usb 3.2 gen 1 (5 gbps), usb 2.0 geriyə uyğun": {
    en: "USB 3.2 Gen 1 (5 Gbps), USB 2.0 backward compatible",
    ru: "USB 3.2 Gen 1 (5 Гбит/с), обратная совместимость с USB 2.0",
  },
  "usb bus (əlavə adapter yoxdur)": {
    en: "USB bus powered (no extra adapter)",
    ru: "Питание от USB (дополнительный адаптер не требуется)",
  },
  '3.5" (hündürlük 26.1 mm)': {
    en: '3.5" (height 26.1 mm)',
    ru: '3.5" (высота 26.1 мм)',
  },
  '2.5" (7 mm hündürlük)': {
    en: '2.5" (7 mm height)',
    ru: '2.5" (высота 7 мм)',
  },
  "fortilink (fortigate) və ya standalone fortiswitchos / web gui / cli": {
    en: "FortiLink (FortiGate) or standalone FortiSwitchOS / Web GUI / CLI",
    ru: "FortiLink (FortiGate) или автономный FortiSwitchOS / Web GUI / CLI",
  },
  "usb type-a dişi, 10 000 plug/unplug testi": {
    en: "USB Type-A female, 10,000 plug/unplug cycles",
    ru: "USB Type-A гнездо, ресурс 10 000 подключений",
  },
  "bəli (jedec)": { en: "Yes (JEDEC)", ru: "Да (JEDEC)" },
  "bəli (disk və psu)": { en: "Yes (drive and PSU)", ru: "Да (диск и БП)" },
  "bəli (iki layt 2)": { en: "Yes (two Light 2)", ru: "Да (две Лайт 2)" },
  "bəli (iki mini 2)": { en: "Yes (two Mini 2)", ru: "Да (две Мини 2)" },
  "bəli (iki mini 3)": { en: "Yes (two Mini 3)", ru: "Да (две Мини 3)" },
  "bəli (iki mini 3 pro)": { en: "Yes (two Mini 3 Pro)", ru: "Да (две Мини 3 Pro)" },
  "bəli (iki strit)": { en: "Yes (two Street)", ru: "Да (две Стрит)" },
  "bəli (iki stansiya 2)": { en: "Yes (two Station 2)", ru: "Да (две Станции 2)" },
  "bəli (iki layt 1-ci nəsil)": {
    en: "Yes (two 1st-gen Light)",
    ru: "Да (две Лайт 1-го поколения)",
  },
  "bəli (power loss protection)": {
    en: "Yes (Power Loss Protection)",
    ru: "Да (защита от потери питания)",
  },
  "bəli (ekran mövqeyinə görə də)": {
    en: "Yes (also by screen position)",
    ru: "Да (также в зависимости от положения экрана)",
  },
  "bəli (səssiz ssenarilər üçün)": {
    en: "Yes (for quiet scenarios)",
    ru: "Да (для тихих сценариев)",
  },
  "inteqrasiya olunmuş qrafika (uma)": {
    en: "Integrated graphics (UMA)",
    ru: "Интегрированная графика (UMA)",
  },
  "inteqrasiya olunmuş qrafika": {
    en: "Integrated graphics",
    ru: "Интегрированная графика",
  },
  "naqilli oyun qulaqlığı": {
    en: "Wired gaming headset",
    ru: "Проводная игровая гарнитура",
  },
  "simsiz oyun qulaqlığı": {
    en: "Wireless gaming headset",
    ru: "Беспроводная игровая гарнитура",
  },
  "oyun qulaqlığı": { en: "Gaming headset", ru: "Игровая гарнитура" },
  "1 genişzolaqlı, 44,5 mm": {
    en: "1 full-range, 44.5 mm",
    ru: "1 широкополосный, 44,5 мм",
  },
  "1 genişzolaqlı, 42 mm": {
    en: "1 full-range, 42 mm",
    ru: "1 широкополосный, 42 мм",
  },
  "çap, surət, skan, faks": {
    en: "Print, copy, scan, fax",
    ru: "Печать, копирование, сканирование, факс",
  },
  "işıqlı (backlit)": { en: "Backlit", ru: "С подсветкой" },
  "işıqlı": { en: "Backlit", ru: "С подсветкой" },
  "intel arc / intel graphics (inteqrasiya olunmuş)": {
    en: "Intel Arc / Intel Graphics (integrated)",
    ru: "Intel Arc / Intel Graphics (интегрированная)",
  },
  "intel iris xe / uhd (inteqrasiya olunmuş)": {
    en: "Intel Iris Xe / UHD (integrated)",
    ru: "Intel Iris Xe / UHD (интегрированная)",
  },
  "əl ilə": { en: "Manual", ru: "Вручную" },
  "avtomatik": { en: "Automatic", ru: "Автоматический" },
  "microsd yaddaş kartı": { en: "microSD memory card", ru: "Карта памяти microSD" },
  "usb flash yaddaş": { en: "USB flash drive", ru: "USB флеш-накопитель" },
  "masaüstü pc": { en: "Desktop PC", ru: "Настольный ПК" },
  "masaüstü / gaming pc": { en: "Desktop / gaming PC", ru: "Настольный / игровой ПК" },
  "masaüstü": { en: "Desktop", ru: "Настольный" },
  "rəngli lazer mfp": { en: "Color laser MFP", ru: "Цветной лазерный МФУ" },
  "rəngli lazer printer": { en: "Color laser printer", ru: "Цветной лазерный принтер" },
  "4 ədəd, aktiv səs-küy azaltma": {
    en: "4 pcs, active noise cancellation",
    ru: "4 шт., активное шумоподавление",
  },
  "2 ədəd, aktiv səs-küy azaltma": {
    en: "2 pcs, active noise cancellation",
    ru: "2 шт., активное шумоподавление",
  },
  "3 ədəd, aktiv səs-küy azaltma": {
    en: "3 pcs, active noise cancellation",
    ru: "3 шт., активное шумоподавление",
  },
  "8 ədəd, aktiv səs-küy azaltma": {
    en: "8 pcs, active noise cancellation",
    ru: "8 шт., активное шумоподавление",
  },
  "2 × 2.5gbe; 10gbe pcie ilə opsional": {
    en: "2 × 2.5GbE; 10GbE optional via PCIe",
    ru: "2 × 2.5GbE; 10GbE опционально через PCIe",
  },
  "ayrıca portativ batareya (dibinə taxılır)": {
    en: "Optional portable battery (attaches to the bottom)",
    ru: "Отдельная портативная батарея (крепится снизу)",
  },
  "yandex hub və ya zigbee-li stansiya": {
    en: "Yandex Hub or a Station with Zigbee",
    ru: "Yandex Hub или станция с Zigbee",
  },
  "yandex stansiya və ya hub": {
    en: "Yandex Station or Hub",
    ru: "Яндекс Станция или хаб",
  },
  "3-hüceyrəli": { en: "3-cell", ru: "3-элементный" },
  "4-hüceyrəli": { en: "4-cell", ru: "4-элементный" },
  "ikili rəng: usb 3.x mavi / usb 2.0 qırmızı": {
    en: "Dual color: USB 3.x blue / USB 2.0 red",
    ru: "Двухцветный: USB 3.x синий / USB 2.0 красный",
  },
  "copilot düyməsi": { en: "Copilot key", ru: "Клавиша Copilot" },
  "dni — duplex + şəbəkə + wi-fi": {
    en: "DNI — duplex + network + Wi-Fi",
    ru: "DNI — дуплекс + сеть + Wi-Fi",
  },
  "simsiz (2.4 q / bluetooth — modelə görə)": {
    en: "Wireless (2.4 G / Bluetooth — depending on model)",
    ru: "Беспроводной (2.4 G / Bluetooth — в зависимости от модели)",
  },
  "vsf, 8 ədədə qədər": { en: "VSF, up to 8 units", ru: "VSF, до 8 устройств" },
  "akustik parça": { en: "Acoustic fabric", ru: "Акустическая ткань" },
  "fansız": { en: "Fanless", ru: "Безвентиляторный" },
  "daxili (avtomatik və əl ilə)": {
    en: "Built-in (automatic and manual)",
    ru: "Встроенный (автоматический и ручной)",
  },
  "dəyirmi": { en: "Round", ru: "Круглый" },
  "full-size 104 düymə": {
    en: "Full-size 104 keys",
    ru: "Полноразмерная, 104 клавиши",
  },
  "gaming siçan altlığı (pro speed)": {
    en: "Gaming mouse pad (PRO Speed)",
    ru: "Игровой коврик для мыши (PRO Speed)",
  },
  "rgb oyun siçan altlığı": {
    en: "RGB gaming mouse pad",
    ru: "Игровой коврик для мыши RGB",
  },
  "qalın parça oyun siçan altlığı": {
    en: "Thick cloth gaming mouse pad",
    ru: "Толстый тканевый игровой коврик",
  },
  "mikro-toxunmuş parça": {
    en: "Micro-woven fabric",
    ru: "Микротканое полотно",
  },
  "iec 60309 sənaye fişi": {
    en: "IEC 60309 industrial plug",
    ru: "Промышленный разъём IEC 60309",
  },
  "işıqlı, rəqəm bloku": {
    en: "Backlit, numeric keypad",
    ru: "С подсветкой, цифровой блок",
  },
  "rəqəm bloku": { en: "Numeric keypad", ru: "Цифровой блок" },
  "mexaniki oyun klaviaturası": {
    en: "Mechanical gaming keyboard",
    ru: "Механическая игровая клавиатура",
  },
  "analog optik oyun klaviaturası": {
    en: "Analog optical gaming keyboard",
    ru: "Аналоговая оптическая игровая клавиатура",
  },
  "naqilli oyun siçanı": {
    en: "Wired gaming mouse",
    ru: "Проводная игровая мышь",
  },
  "rj-9 qulaqlıq yuvası": { en: "RJ-9 headset jack", ru: "Разъём гарнитуры RJ-9" },
  "ssd opal şifrələmə": { en: "SSD Opal encryption", ru: "Шифрование SSD Opal" },
  "yandex stansiya layt 2 (saatsız)": {
    en: "Yandex Station Light 2 (no clock)",
    ru: "Яндекс Станция Лайт 2 (без часов)",
  },
  "yandex stansiya layt 2 (saatlı)": {
    en: "Yandex Station Light 2 (with clock)",
    ru: "Яндекс Станция Лайт 2 (с часами)",
  },
  "yandex stansiya layt (1-ci nəsil, 2021)": {
    en: "Yandex Station Light (1st generation, 2021)",
    ru: "Яндекс Станция Лайт (1-е поколение, 2021)",
  },
  "yandex stansiya maks zigbee ilə (yndx-00053)": {
    en: "Yandex Station Max with Zigbee (YNDX-00053)",
    ru: "Яндекс Станция Макс с Zigbee (YNDX-00053)",
  },
  "yndx-00402 komplektdə": {
    en: "YNDX-00402 in the set",
    ru: "YNDX-00402 в комплекте",
  },
  "monoxrom led (saat, animasiya, alisa emosiyaları)": {
    en: "Monochrome LED (clock, animation, Alice emotions)",
    ru: "Монохромный LED (часы, анимация, эмоции Алисы)",
  },
  "monoxrom led, 45 seqment (saat və emosiyalar)": {
    en: "Monochrome LED, 45 segments (clock and emotions)",
    ru: "Монохромный LED, 45 сегментов (часы и эмоции)",
  },
  "simsiz esports qulaqlığı": {
    en: "Wireless esports headset",
    ru: "Беспроводная киберспортивная гарнитура",
  },
  "simsiz esports siçan": {
    en: "Wireless esports mouse",
    ru: "Беспроводная киберспортивная мышь",
  },
  "3.5 mm esports qulaqlığı": {
    en: "3.5 mm esports headset",
    ru: "Киберспортивная гарнитура 3.5 мм",
  },
  "3.5 mm oyun qulaqlığı": {
    en: "3.5 mm gaming headset",
    ru: "Игровая гарнитура 3.5 мм",
  },
  "usb-c–usb-c və usb-c–usb-a": {
    en: "USB-C to USB-C and USB-C to USB-A",
    ru: "USB-C — USB-C и USB-C — USB-A",
  },
  "üst paneldə 16 mln rəng kontur işığı": {
    en: "16 million color edge lighting on the top panel",
    ru: "Контурная подсветка 16 млн цветов на верхней панели",
  },
  "vertiv rəsmi zəmanət": {
    en: "Official Vertiv warranty",
    ru: "Официальная гарантия Vertiv",
  },
  "ağıllı led lampa": { en: "Smart LED lamp", ru: "Умная светодиодная лампа" },
  "ekranlı ağıllı kolonka": {
    en: "Smart speaker with display",
    ru: "Умная колонка с экраном",
  },
  "alüminium ərintisi": { en: "Aluminum alloy", ru: "Алюминиевый сплав" },
  "alüminium korpus, örgülü": {
    en: "Aluminum body, braided",
    ru: "Алюминиевый корпус, оплётка",
  },
  "alüminium": { en: "Aluminum", ru: "Алюминий" },
  "alüminium, plastik": { en: "Aluminum, plastic", ru: "Алюминий, пластик" },
  "alüminium ərintisi + silikon": {
    en: "Aluminum alloy + silicone",
    ru: "Алюминиевый сплав + силикон",
  },
  "aşağı": { en: "Low", ru: "Низкий" },
  "daxili dinamiklər": { en: "Built-in speakers", ru: "Встроенные динамики" },
  "davamlı plastik (plastic tape)": {
    en: "Durable plastic (plastic tape)",
    ru: "Прочный пластик (Plastic Tape)",
  },
  "döner qapaq (swivel)": { en: "Swivel lid", ru: "Поворотная крышка (swivel)" },
  "əyilən cardioid": { en: "Tilting cardioid", ru: "Наклоняемый кардиоидный" },
  "hermetik, texniki xidmət tələb etmir": {
    en: "Sealed, maintenance-free",
    ru: "Герметичный, не требует обслуживания",
  },
  "hyperclear (çıxarılan)": {
    en: "HyperClear (detachable)",
    ru: "HyperClear (съёмный)",
  },
  "hyperclear cardioid (çıxarılan)": {
    en: "HyperClear Cardioid (detachable)",
    ru: "HyperClear Cardioid (съёмный)",
  },
  "ieee 802.3af poe (class 3) və cisco inline power": {
    en: "IEEE 802.3af PoE (Class 3) and Cisco Inline Power",
    ru: "IEEE 802.3af PoE (Class 3) и Cisco Inline Power",
  },
  "kabel, karabinli kəmər (adapter yoxdur)": {
    en: "Cable, carabiner strap (no adapter)",
    ru: "Кабель, ремень с карабином (без адаптера)",
  },
  "led displey (saat və məlumat)": {
    en: "LED display (clock and info)",
    ru: "LED-дисплей (часы и информация)",
  },
  "multifunksiyalı lcd": { en: "Multifunction LCD", ru: "Многофункциональный ЖК" },
  "otaq / küçə, avtomatik keçid": {
    en: "Indoor / outdoor, automatic switching",
    ru: "Помещение / улица, автоматическое переключение",
  },
  "usb-c ↔ usb-c pd şarj/data kabeli": {
    en: "USB-C to USB-C PD charging/data cable",
    ru: "Кабель зарядки/данных USB-C — USB-C PD",
  },
  "usb-a + bluetooth (wl variantında 2.4 ghz)": {
    en: "USB-A + Bluetooth (2.4 GHz on WL variant)",
    ru: "USB-A + Bluetooth (2.4 ГГц в варианте WL)",
  },
  "bənövşəyi (magenta)": { en: "Purple (Magenta)", ru: "Пурпурный (Magenta)" },
  "boom microphone, səs-küy azaldan, çıxarılan": {
    en: "Boom microphone, noise-reducing, detachable",
    ru: "Микрофон на штанге, шумоподавляющий, съёмный",
  },
  "çıxarılan boom, səs-küy azaldan": {
    en: "Detachable boom, noise-reducing",
    ru: "Съёмная штанга, шумоподавление",
  },
  "aşırı gərginlik / cərəyan / istilik / qısaqapanma": {
    en: "Overvoltage / overcurrent / overheating / short circuit",
    ru: "Защита от перенапряжения / тока / перегрева / короткого замыкания",
  },
  "plastik": { en: "Plastic", ru: "Пластик" },
  "soft-touch plastik": { en: "Soft-touch plastic", ru: "Пластик Soft-touch" },
  "tavan / divar": { en: "Ceiling / wall", ru: "Потолок / стена" },
  "orijinal hp toner kartrici": {
    en: "Original HP toner cartridge",
    ru: "Оригинальный картридж HP",
  },
  "orijinal xerox toner kartrici (standard capacity, dmo)": {
    en: "Original Xerox toner cartridge (Standard Capacity, DMO)",
    ru: "Оригинальный картридж Xerox (стандартная ёмкость, DMO)",
  },
  "standart tutum": { en: "Standard capacity", ru: "Стандартная ёмкость" },
  "var (hi-speed usb 2.0)": {
    en: "Yes (Hi-Speed USB 2.0)",
    ru: "Есть (Hi-Speed USB 2.0)",
  },
  "hd (720p) veb-kamera": { en: "HD (720p) webcam", ru: "HD (720p) веб-камера" },
  "1080p fhd veb-kamera": { en: "1080p FHD webcam", ru: "Веб-камера 1080p FHD" },
  "5 mp + ir veb-kamera": { en: "5 MP + IR webcam", ru: "Веб-камера 5 Мп + ИК" },
  "ecc yox (non-ecc)": { en: "No (Non-ECC)", ru: "Нет (Non-ECC)" },
  "yox (non-ecc)": { en: "No (Non-ECC)", ru: "Нет (Non-ECC)" },
  "pc / noutbuk": { en: "PC / laptop", ru: "ПК / ноутбук" },
  "n-key rollover / 100% anti-ghosting": {
    en: "N-key rollover / 100% anti-ghosting",
    ru: "N-key rollover / 100% anti-ghosting",
  },
  "sd adapter daxildir": { en: "SD adapter included", ru: "SD-адаптер в комплекте" },
  "daxil": { en: "Included", ru: "В комплекте" },
  "daxil deyil": { en: "Not included", ru: "Не входит в комплект" },
  "anti-glare, anti-fingerprint, 9h": {
    en: "Anti-glare, anti-fingerprint, 9H",
    ru: "Антибликовое, антиотпечатки, 9H",
  },
  "150 vərəq": { en: "150 sheets", ru: "150 листов" },
  "100 vərəq": { en: "100 sheets", ru: "100 листов" },
  "50 vərəq": { en: "50 sheets", ru: "50 листов" },
  "250 vərəq": { en: "250 sheets", ru: "250 листов" },
  "350 vərəq": { en: "350 sheets", ru: "350 листов" },
  "30 vərəq": { en: "30 sheets", ru: "30 листов" },
  "35 vərəq": { en: "35 sheets", ru: "35 листов" },
  "300 vərəq": { en: "300 sheets", ru: "300 листов" },
  "os yoxdur (freedos/no os)": {
    en: "No OS (FreeDOS/No OS)",
    ru: "Без ОС (FreeDOS/No OS)",
  },
  "tam yeni (istifadə olunmamış, orijinal qablaşdırmada)": {
    en: "Brand new (unused, in original packaging)",
    ru: "Новый (неиспользованный, в оригинальной упаковке)",
  },
  "işlənmiş (hərtərəfli texniki test edilmiş, tam saz vəziyyətdə)": {
    en: "Used (fully tested, in perfect working order)",
    ru: "Б/у (полностью протестирован, исправен)",
  },
  "işlənmiş (əla texniki vəziyyətdə, tam test olunmuş)": {
    en: "Used (excellent technical condition, fully tested)",
    ru: "Б/у (отличное техническое состояние, полностью проверен)",
  },
  "ddm / dom dəstəyi": {
    en: "DDM / DOM support",
    ru: "Поддержка DDM / DOM",
  },
  "optik modul": {
    en: "optical module",
    ru: "оптический модуль",
  },
};
