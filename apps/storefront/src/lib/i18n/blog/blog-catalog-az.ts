import type { BlogPost } from "./blog-types";

export const blogCatalogAz: BlogPost[] = [
  {
    slug: "monitor-secimi-is-oyun",
    title: "İş və oyun üçün monitor: ölçüsü, Hz və panel tipi",
    excerpt:
      "24, 27 yoxsa 32 düym? 60 Hz kifayətdir, yoxsa 144 Hz lazımdır? Əvvəl məsafə və ssenari, sonra IPS/VA və qətnasə.",
    description:
      "Bakıda monitor seçimi: 27 düym, IPS, 144 Hz və USB-C. İş, dizayn və oyun üçün IT Market bələdçisi.",
    publishedAt: "2026-08-18",
    updatedAt: "2026-08-18",
    readingMinutes: 12,
    category: "Monitor",
    categoryHref: "/categories/monitor",
    tags: ["monitor", "IPS", "oyun", "ofis", "Bakı"],
    imagePath: "/images/blog/monitor-secimi-is-oyun.jpg",
    cta: { label: "Monitorlara bax", href: "/categories/monitor" },
    blocks: [
      {
        type: "p",
        text: "Yanlış monitor bir noutbuku «ucuz», düzgün monitor isə orta seqment PC-ni rahat iş stansiyasına çevirir. IT Market-də ən çox eşidilən sual: «27 düym götürüm?» Cavab yenə eynidir — masanızın dərinliyi, göz məsafəsi və nə iş gördüyünüzdən asılıdır. Bu yazı [monitor kataloqu](/categories/monitor) üçün eyni yoxlama siyahısıdır.",
      },
      {
        type: "h2",
        text: "Ölçü: 24, 27 və 32 düym nə vaxt məntiqlidir?",
      },
      {
        type: "p",
        text: "Gözdən ekrana 50–60 sm varsa, 24–25 düym Full HD ofis üçün hələ də rahatdır. 70 sm və daha çox məsafə, iki pəncərə yan-yana — 27 düym QHD (2560×1440) çox vaxt «şirin nöqtə»dir. 32 düym isə ya 4K, ya da qol məsafəsi tələb edir; əks halda başınızı çevirməyə başlayırsınız.",
      },
      {
        type: "ul",
        items: [
          "Excel, brauzer, videokonfrans: 27 düym IPS, 60–75 Hz kifayət edir.",
          "Foto/UI dizayn: rəng əhatəsi (sRGB/Adobe RGB) və vahid işıqlandırma önəmlidir.",
          "FPS oyun: ölçü deyil, Hertz və reaksiya müddəti qalib gəlir.",
        ],
      },
      {
        type: "h2",
        text: "Panel: IPS, VA, OLED — marketinq yox, ssenari",
      },
      {
        type: "p",
        text: "IPS geniş baxış bucağı və sabit rəng verir — ofis və dizayn üçün default. VA daha dərin qara və ucuz «kino» hissi verir, amma bucağı dəyişəndə rəng sürüşür. OLED kontrastda qalibdir, amma ofisdə statik Excel üçün yanma riskini düşünmək lazımdır. «QN» və «nano» etiketləri əvvəl ehtiyacı əvəz etmir.",
      },
      {
        type: "h2",
        text: "Hertz və qətnasə: 60, 144, 180 — kimə lazımdır?",
      },
      {
        type: "p",
        text: "Mətn və cədvəl üçün 60 Hz yetərlidir. Kursorun «yumşaqlığı» 75–120 Hz-də hiss olunur, amma bu, iş üçün mütləq deyil. 144 Hz və yuxarı oyun siçanında fərq yaradır — əgər videokartınız o kadrı verə bilirsə. Qətnasə: Full HD 24 düymdə sıx görünür; 27 düymdə QHD daha kəskin mətn verir. 4K yalnız GPU və miqyaslandırma (125–150%) ilə rahatdır.",
      },
      {
        type: "callout",
        text: "Oyun noutbuku alırsınızsa, xarici monitor Hertz-i HDMI 1.4 ilə kəsə bilər. DisplayPort və ya USB-C DP Alt Mode yoxlayın. Ətraflı: [oyun PC, yoxsa noutbuk](/blog/oyun-pc-yoxsa-noutbuk).",
      },
      {
        type: "h2",
        text: "Portlar, USB-C və göz rahatlığı",
      },
      {
        type: "ol",
        items: [
          "HDMI + DisplayPort: iki cihaz (noutbuk və mini PC) üçün ehtiyat.",
          "USB-C 65W+: noutbuku bir kabellə şarj + şəkil — masanı təmiz saxlayır.",
          "Height/tilt: çiyin ağrısını azaldır; [monitor stendi](/categories/monitor-stendi) bəzən monitorun özündən vacibdir.",
          "Flicker-free və aşağı mavi işıq: bütün gün iş üçün real fərq.",
        ],
      },
      {
        type: "p",
        text: "Mini PC və ya noutbuk + monitor cütlüyü Bakıda getdikcə populyardır: kiçik korpus, böyük ekran. Bu yola baxırsınızsa, [mini PC bələdçisi](/blog/mini-pc-secimi) ilə birlikdə oxuyun. Nəticə: əvvəl məsafə və iş növü, sonra düym və Hz. Kataloqda 2–3 namizəd saxlayın — bütün rəfi yox.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Ofis üçün 144 Hz monitor lazımdırmı?",
            answer:
              "Xeyr. Mətn və videokonfrans üçün 60–75 Hz IPS kifayətdir. 144 Hz-i oyun və ya çox sürətli kursor hissi istəyənlərə saxlayın.",
          },
          {
            question: "27 düym Full HD kəskin görünürmü?",
            answer:
              "Çoxlarına «yumşaq» gəlir. 27 düym üçün QHD daha yaxşı sıxlıq verir. Full HD-ni 24 düymdə saxlamaq adətən daha rahatdır.",
          },
          {
            question: "USB-C monitor noutbukla işləyirmi?",
            answer:
              "Yalnız noutbukun USB-C portu DisplayPort Alt Mode və kifayət qədər şarj gücü dəstəkləyirsə. Spesifikasiyada «DP Alt Mode» və watt-a baxın.",
          },
        ],
      },
    ],
  },
  {
    slug: "wifi-router-secimi",
    title: "Ev və ofis üçün Wi-Fi router: mesh, Wi-Fi 6 və sürət",
    excerpt:
      "«3000 Mbps» etiketi divardan keçmir. Mərtəbə, cihaz sayı və mesh ehtiyacını əvvəl yazın — sonra Wi-Fi 6 və WAN portuna baxın.",
    description:
      "Bakıda Wi-Fi router seçimi: Wi-Fi 6, mesh, gigabit WAN. Ev və kiçik ofis üçün IT Market bələdçisi.",
    publishedAt: "2026-08-16",
    updatedAt: "2026-08-16",
    readingMinutes: 11,
    category: "Şəbəkə",
    categoryHref: "/categories/router",
    tags: ["Wi-Fi", "router", "mesh", "şəbəkə", "Bakı"],
    imagePath: "/images/blog/wifi-router-secimi.jpg",
    cta: { label: "Routerlərə bax", href: "/categories/router" },
    blocks: [
      {
        type: "p",
        text: "Provayder 200 Mbps verir, amma otaqda 12 Mbps görürsünüzsə, problem çox vaxt kabeldə yox, qutuda və divardadır. Bakı mənzillərində dəmir-beton və qonşu şəbəkə sıxlığı Wi-Fi-ı «kağız sürətindən» ayırır. Bu bələdçi [router](/categories/router) və [access point](/categories/access-point) seçimini eyni sual siyahısına salır.",
      },
      {
        type: "h2",
        text: "Əvvəl evin xəritəsi, sonra «AX3000» yazısı",
      },
      {
        type: "p",
        text: "Bir otaqlı mənzil + 8–10 cihaz: tək yaxşı Wi-Fi 6 router kifayət edə bilər. 3 otaq, iki mərtəbə, dəmir qapı — mesh və ya ayrıca access point düşünün. «Wi-Fi 7» etiketi otaq sayını əvəz etmir. Əvvəl ölü zonanı tapın (telefonun sürət testi ilə), sonra qutu seçin.",
      },
      {
        type: "ul",
        items: [
          "Cihaz sayı: 15+ eyni vaxtda (kamera, TV, noutbuk) — Wi-Fi 6 və güclü CPU.",
          "IPTV / VLAN: provayder tələb edirsə, firmware-də IPTV dəstəyinə baxın.",
          "VPN və ya ev ofisi: routerin CPU-su ucuz modeldə tez tıxanır.",
        ],
      },
      {
        type: "h2",
        text: "Wi-Fi 5, 6, 6E — nəyi almaq dəyər?",
      },
      {
        type: "p",
        text: "2026-cı ildə yeni alış üçün Wi-Fi 6 (802.11ax) ağlabatan minimumdur: daha yaxşı sıxlıq, OFDMA, daha az gecikmə. Wi-Fi 6E 6 GHz əlavə edir — yalnız telefon və noutbukunuz dəstəkləyirsə və qısa məsafədə. Köhnə smart-TV-lər yenə 5 GHz/2.4 GHz-də qalacaq. «AX1800 vs AX3000» marketinq rəqəmləridir; real fərq antena, CPU və mesh uyğunluğundadır.",
      },
      {
        type: "h2",
        text: "Mesh, repeater, yoxsa access point?",
      },
      {
        type: "ol",
        items: [
          "Repeater (təkrarlayıcı): ucuzdur, amma sürəti yarıya sala bilər — müvəqqəti həll.",
          "Mesh: eyni SSID, avtomatik keçid; iki-üç node ilə mənzili örtmək asandır.",
          "Access Point: kabel çəkə bilirsinizsə, ən sabit nəticə — [AP kataloqu](/categories/access-point).",
        ],
      },
      {
        type: "callout",
        text: "Routeri televizor arxasına və ya metal şkafa qoymaq «sürəti öldürür». Ortada, yerdən 1–1.5 m hündürlük, açıq rəf — pulsuz təkmilləşdirmədir.",
      },
      {
        type: "h2",
        text: "WAN, gigabit və ofis ehtiyatı",
      },
      {
        type: "p",
        text: "Provayder 500 Mbps+ verirsə, WAN və LAN gigabit (və ya 2.5G) olmalıdır. Kiçik ofisdə [kommutator](/categories/kommutator) ilə kabel paylanması Wi-Fi-dan sabitdir: mühasibat, printer, NAS. Evdə NAS düşünürsünüzsə, routerin USB-si əvəzinə ayrıca [NAS](/categories/nas) daha düzgün yoldur.",
      },
      {
        type: "p",
        text: "Nəticə: divar və cihaz sayını yazın, sonra Wi-Fi 6 router və ya mesh seçin. Kataloqda 2 namizəd saxlayın — «ən bahalı qutu» avtomatik qalib deyil. Təhlükəsizlik üçün standart parolu dəyişin və WPA3 mümkün olduqda açın.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Provayderin modem-routerini saxlayım?",
            answer:
              "Çox vaxt körpü (bridge) rejimində saxlayıb öz routerinizi önə qoyun. İki NAT bir-birinin üstündə oyun və VPN-i pozur.",
          },
          {
            question: "Mesh-ə keçmək üçün bütün qutuları eyni brend etmək lazımdır?",
            answer:
              "Bəli, rahat roaming üçün eyni ekosistem daha az baş ağrısıdır. Qarışıq brendlər işləyə bilər, amma keçid (handoff) zəif ola bilər.",
          },
          {
            question: "Wi-Fi 7 indi almağa dəyərmi?",
            answer:
              "Yalnız cihazlarınız dəstəkləyirsə və büdcə rahatdırsa. Əksər ev üçün Wi-Fi 6 + düzgün yerləşdirmə daha çox fərq verir.",
          },
        ],
      },
    ],
  },
  {
    slug: "printer-secimi-ofis-ev",
    title: "Ev və ofis printeri: inkjet, lazer və MFP fərqi",
    excerpt:
      "Səhifə dəyəri bəzən cihaz qiymətindən vacibdir. Aylıq səhifə, rəng ehtiyacı və skan — sonra inkjet və ya lazer.",
    description:
      "Bakıda printer seçimi: inkjet, lazer və MFP. Səhifə dəyəri, kartric və ev/ofis ssenarisi — IT Market bələdçisi.",
    publishedAt: "2026-08-14",
    updatedAt: "2026-08-14",
    readingMinutes: 11,
    category: "Lazer printer",
    categoryHref: "/categories/lazer-printer",
    tags: ["printer", "lazer", "inkjet", "MFP", "ofis"],
    imagePath: "/images/blog/printer-secimi-ofis-ev.jpg",
    cta: { label: "Lazer printerlərə bax", href: "/categories/lazer-printer" },
    blocks: [
      {
        type: "p",
        text: "Ucuz printerin «hiyləsi» kartricdədir: cihaz 90 AZN, boya isə ildə cihazı keçə bilər. Ona görə də IT Market-də printeri qiymətə görə yox, aylıq səhifə və səhifə dəyərinə görə seçməyi məsləhət görürük. [Inkjet MFP](/categories/inkjet-mfp), [lazer printer](/categories/lazer-printer) və [lazer MFP](/categories/lazer-mfp) ayrı rəflərdir — bu yazı hansına getməli olduğunuzu deyir.",
      },
      {
        type: "h2",
        text: "Inkjet, yoxsa lazer?",
      },
      {
        type: "ul",
        items: [
          "Inkjet: rəngli foto, məktəb layihəsi, az səhifə. Uzun müddət istifadə olunmasa, başlıq quruya bilər.",
          "Lazer: müqavilə, hesab-faktura, çox səhifə. Səhifə dəyəri adətən aşağıdır, ilk çıxış bir az gözləyə bilər.",
          "Rəngli lazer: brend materialı və rəngli hesabat — bahalıdır, amma ofis həcmində özünü doğruldur.",
        ],
      },
      {
        type: "h2",
        text: "MFP: skan və surət çıxarma kimə lazımdır?",
      },
      {
        type: "p",
        text: "Ev ofisi və mühasibat üçün MFP (print+scan+copy) tək cihaz yerinə üç qutu alır. [Inkjet MFP](/categories/inkjet-mfp) rəngli ev üçün, [lazer MFP](/categories/lazer-mfp) sənəd axını üçün. ADF (avtomatik sənəd verici) çoxsəhifəli skan edir — ildə bir dəfə pasport skan edənlərə lazım deyil.",
      },
      {
        type: "h2",
        text: "Səhifə dəyəri və kartric",
      },
      {
        type: "p",
        text: "İki eyni «lazer»in fərqi tez-tez toner resursundadır: 1 000 səhifəlik starter vs 3 000 səhifəlik standart. [Kartric](/categories/kartric) qiymətini alışdan əvvəl yazın. Tank (ITS) inkjet-lər az səhifə dəyəri verir, amma ilk qiymət yüksəkdir — məktəbli ailəsi üçün çox vaxt qalibdir.",
      },
      {
        type: "callout",
        text: "«Uyğun» kartric ucuzdur, amma zəmanəti poza bilər. Orijinal və ya istehsalçının icazə verdiyi kanalı seçin — təmir bir kartricdən baha olur.",
      },
      {
        type: "h2",
        text: "Wi-Fi, duplex və ofis növbəsi",
      },
      {
        type: "ol",
        items: [
          "Wi-Fi / AirPrint: evdə kabelsiz çap üçün.",
          "Duplex (ikiüzlü): kağızı yarıya salır — ofisdə tez ödəyir.",
          "Ethernet: bir neçə nəfər eyni printerə — Wi-Fi-dan sabit.",
          "Aylıq dövr (duty cycle): «20 000 səhifə/ay» yazısı ev üçün lazım deyil, amma ofis növbəsində əhəmiyyətlidir.",
        ],
      },
      {
        type: "p",
        text: "Nəticə: aylıq səhifəni təxmin edin, rəng lazımdırmı deyin, sonra inkjet və ya lazer seçin. Səhifə dəyərini cihaz qiymətinə əlavə edin — 3 illik rəqəm qərarı dəyişdirir. [Skaner](/categories/skaner) ayrıca yalnız yüksək həcmli arxiv üçün məntiqlidir.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Ayda 50 səhifə üçün lazer lazımdırmı?",
            answer:
              "Adətən yox. Az həcm + rəng = tank inkjet və ya sadə MFP. Lazer az istifadədə də «səhifə başına» ucuz qala bilər, amma ilk qiymət yüksəkdir.",
          },
          {
            question: "Nə üçün ucuz inkjet bir aydan sonra zolaq salır?",
            answer:
              "Başlığın quruması. Həftədə bir rəngli səhifə çap etmək və ya tank sistem seçmək bu riski azaldır.",
          },
          {
            question: "Ofis üçün rəngli lazer, yoxsa rəngli inkjet?",
            answer:
              "Gündə onlarla rəngli hesabat varsa, rəngli lazer. Ayda bir neçə broşür varsa, tank inkjet daha ucuz ola bilər.",
          },
        ],
      },
    ],
  },
  {
    slug: "oyun-pc-yoxsa-noutbuk",
    title: "Oyun PC, yoxsa oyun noutbuku: hansını almaq daha ağıllıdır?",
    excerpt:
      "Eyni pula stolüstü adətən daha güclü olur; noutbuk isə daşınır. Soyutma, yüksəltmə və monitoru birlikdə hesablayın.",
    description:
      "Oyun PC vs oyun noutbuku Bakıda: qiymət/performans, soyutma, RAM/SSD yüksəltmə. IT Market müqayisə bələdçisi.",
    publishedAt: "2026-08-12",
    updatedAt: "2026-08-12",
    readingMinutes: 12,
    category: "Noutbuk",
    categoryHref: "/categories/noutbuk",
    tags: ["oyun", "PC", "noutbuk", "GPU", "Bakı"],
    imagePath: "/images/blog/oyun-pc-yoxsa-noutbuk.jpg",
    cta: { label: "Noutbuklara bax", href: "/categories/noutbuk" },
    blocks: [
      {
        type: "p",
        text: "Eyni büdcədə stolüstü oyun PC adətən daha güclü GPU verir; oyun noutbuku isə «götür-get» azadlığı. Yanlış seçim: yataqxanada 3.5 kq noutbuk + zəif batareya, ya da daim səyahət edib tower daşımaq. [Noutbuk](/categories/noutbuk) və [masaüstü](/categories/masaustu) ayrı rəflərdir — bu yazı hansına getməli olduğunuzu ayırır.",
      },
      {
        type: "h2",
        text: "Stolüstü PC nə vaxt qalib gəlir?",
      },
      {
        type: "ul",
        items: [
          "Eyni AZN-ə daha yüksək GPU sinfi.",
          "Soyutma: böyük korpus, daha az throttling, daha uzun ömür.",
          "Yüksəltmə: [RAM](/categories/ram) və [SSD](/categories/ssd) sonra əlavə etmək asandır — bax: [SSD və RAM yüksəltmə](/blog/ssd-ram-yukseltme).",
          "Xarici [oyun monitoru](/categories/gaming-monitor), [klaviatura](/categories/gaming-klaviatura) və [siçan](/categories/gaming-sican) ilə tam stansiya.",
        ],
      },
      {
        type: "h2",
        text: "Oyun noutbuku nə vaxt məntiqlidir?",
      },
      {
        type: "p",
        text: "Həftədə iki yerdə oynayırsınız, universitet və ev, ya da otaqda daimi masa yoxdur. O zaman noutbukun «vergi»sini (daha zəif GPU, fan səsi, batareya) qəbul edirsiniz. 16 GB RAM və 512 GB SSD 2026-cı ildə oyun üçün minimum rahat zonadır; 32 GB və 1 TB gələcək yeniləmələri azaldır.",
      },
      {
        type: "callout",
        text: "Oyun noutbukunu ofis/təhsil üçün «ehtiyat» almaq çox vaxt səhvdir: ağır, səs-küylü, batareya zəif. İş üçün ayrıca [noutbuk bələdçisinə](/blog/noutbuk-is-tehsil-secimi) baxın.",
      },
      {
        type: "h2",
        text: "GPU, watt və «1080 vs 1440»",
      },
      {
        type: "p",
        text: "Marketinq «RTX» yazır, rəqəm isə fərqlidir. Noutbuk GPU-ları stolüstü adlarından zəif ola bilər (daha aşağı TGP). 1080p 144 Hz üçün orta-yuxarı seqment yetər; 1440p ultra üçün stolüstü qalib gəlir. Monitor Hertz-ini GPU-ya uyğun seçin — 240 Hz ekran + zəif kart mənasızdır. Ətraflı: [monitor bələdçisi](/blog/monitor-secimi-is-oyun).",
      },
      {
        type: "h2",
        text: "Periferiya: siçan, klaviatura, qulaqlıq",
      },
      {
        type: "p",
        text: "Stolüstü yolda [gaming siçan](/categories/gaming-sican), [klaviatura](/categories/gaming-klaviatura) və [qulaqlıq](/categories/gaming-qulaqliq) ayrıca büdcədir — bunu PC qiymətinə əlavə edin. Noutbukda klaviatura daxil gəlir, amma uzun sessiyada xarici siçan yenə dəyər.",
      },
      {
        type: "p",
        text: "Nəticə: evdə sabit masa varsa — PC + monitor. Hər həftə daşıyırsınızsa — oyun noutbuku. Qarışıq ssenari üçün mini PC oyun üçün zəif qalır; onu ofisə saxlayın ([mini PC bələdçisi](/blog/mini-pc-secimi)).",
      },
      {
        type: "faq",
        items: [
          {
            question: "Oyun noutbuku stolüstü qədər yüksəldilirmi?",
            answer:
              "RAM və SSD bəzən bəli, GPU adətən xeyr. Stolüstü 3 ildən sonra kart dəyişməyə imkan verir.",
          },
          {
            question: "Eyni model noutbukda 8 GB kifayətdirmi?",
            answer:
              "2026 oyunları üçün yox. 16 GB minimum, 32 GB rahat zonadır — xüsusən fonunda Discord və brauzer açıqdırsa.",
          },
          {
            question: "İstilik noutbukda performansı nə qədər kəsir?",
            answer:
              "Düzgün stend və təmiz ventilyasiya olmadan 10–20% throttling adi haldır. Yorğan üzərində oyun session-u ən pis ssenaridir.",
          },
        ],
      },
    ],
  },
  {
    slug: "ssd-ram-yukseltme",
    title: "Kompüteri sürətləndirmək: SSD və RAM yüksəltməsi",
    excerpt:
      "Köhnə HDD-ni NVMe ilə əvəz etmək çox vaxt yeni noutbukdan ucuzdur. Əvvəl uyğunluğu, sonra həcm və DDR nəslini yoxlayın.",
    description:
      "Bakıda SSD və RAM yüksəltməsi: NVMe, DDR4/DDR5, uyğunluq. Köhnə PC və noutbuk üçün IT Market bələdçisi.",
    publishedAt: "2026-08-10",
    updatedAt: "2026-08-10",
    readingMinutes: 11,
    category: "SSD",
    categoryHref: "/categories/ssd",
    tags: ["SSD", "RAM", "NVMe", "yüksəltmə", "PC"],
    imagePath: "/images/blog/ssd-ram-yukseltme.jpg",
    cta: { label: "SSD və RAM-a bax", href: "/categories/ssd" },
    blocks: [
      {
        type: "p",
        text: "«Kompüter yavaşdır» deyəndə üç səbəb üstünlük təşkil edir: HDD, dolu disk və az RAM. Yeni noutbuk almaqdan əvvəl yüksəltməyə baxmaq IT Market-də ən çox qənaət edən məsləhətdir. [SSD](/categories/ssd), [M.2 NVMe](/categories/m2-nvme-ssd) və [RAM](/categories/ram) kataloqu bu yazının praktik davamıdır.",
      },
      {
        type: "h2",
        text: "SSD: SATA, yoxsa NVMe?",
      },
      {
        type: "p",
        text: "HDD-dən SATA SSD-yə keçid artıq «gecə-gündüz» fərqidir: açılış, brauzer, Office. NVMe (M.2) daha yüksək ardıcıl sürət verir — böyük fayl, oyun yükləməsi, video. Noutbukda yalnız bir M.2 yeri varsa, NVMe seçin. Stolüstü PC-də həm SATA, həm M.2 ola bilər: sistemi NVMe-yə, arxivi SATA-ya qoyun.",
      },
      {
        type: "ul",
        items: [
          "256 GB: yalnız OS + bir neçə proqram — tez dolur.",
          "512 GB: gündəlik iş və təhsil üçün rahat başlanğıc.",
          "1 TB: oyun və foto/video üçün ağlabatan.",
        ],
      },
      {
        type: "h2",
        text: "RAM: DDR4 və DDR5 qarışmaz",
      },
      {
        type: "p",
        text: "Anakart nəsli qərarı verir: DDR4 lövhəyə DDR5 taxmaq olmaz. [DDR4](/categories/ddr4-ram) və [DDR5](/categories/ddr5-ram) ayrı rəflərdir. 8 GB 2026-cı ildə brauzer+Zoom-da sıxılır; 16 GB ofis/təhsil üçün təhlükəsiz zona, 32 GB foto/video və ağır çoxtasking üçündür. İki eyni modul (dual channel) bir böyük moduldan çox vaxt sürətlidir.",
      },
      {
        type: "callout",
        text: "Noutbukda RAM lehimli ola bilər — «boş slot» yoxdur. Alışdan əvvəl modelin xidmət təlimatına və ya bizə model adını deyin. Əks halda yalnız SSD qalır.",
      },
      {
        type: "h2",
        text: "Köçürmə, klon və ehtiyat",
      },
      {
        type: "ol",
        items: [
          "Vacib faylları əvvəl [xarici SSD](/categories/xarici-ssd) və ya buluda kopyalayın.",
          "Klon (disk copy) Windows-u olduğu kimi köçürür; təmiz quraşdırma daha «təmiz», amma vaxt aparır.",
          "Köhnə HDD-ni ehtiyat disk kimi saxlamaq olar — amma yeganə nüsxə olmasın.",
        ],
      },
      {
        type: "h2",
        text: "Oyun və ofis: eyni yüksəltmə, fərqli hədəf",
      },
      {
        type: "p",
        text: "Oyun PC-də RAM 16→32 və NVMe 1 TB tez-tez FPS-dən çox «stutter»i azaldır. Ofis mini PC-də isə 16 GB + 512 GB NVMe kifayət edə bilər. Oyun qurğusu qurursunuzsa, [oyun PC vs noutbuk](/blog/oyun-pc-yoxsa-noutbuk) ilə birlikdə oxuyun.",
      },
      {
        type: "p",
        text: "Nəticə: əvvəl yuvanı (M.2 ölçüsü, DDR nəsli) təsdiqləyin, sonra həcm seçin. Yanlış nəsil RAM qutuda qalır — uyğunluq qiymətdən əvvəl gəlir.",
      },
      {
        type: "faq",
        items: [
          {
            question: "NVMe noutbuku çox qızdırırmı?",
            answer:
              "Bəzi nazik modellərdə DRAM-sız ucuz NVMe istilənə bilər. Keyfiyyətli SSD və mövcud heat sticker/heatsink kifayət edir. DRAM cache olan modellər daha sabitdir.",
          },
          {
            question: "16 GB-dan 32 GB-a keçmək Office-i sürətləndirirmi?",
            answer:
              "20 Chrome tabı və Excel varsa — bəli. 3 tab və Word üçün 16 GB yetər; pulü SSD-yə yönəldin.",
          },
          {
            question: "Quraşdırmanı özüm edə bilərəm?",
            answer:
              "M.2 vida və antistatik vərdişlə bəli. Noutbuk zəmanəti açılışa bağlıdırsa, servis və ya mağaza köməyi daha təhlükəsizdir.",
          },
        ],
      },
    ],
  },
  {
    slug: "mini-pc-secimi",
    title: "Mini PC kimə uyğundur: noutbuka ucuz alternativ?",
    excerpt:
      "Kiçik korpus, böyük monitor. Ofis, rəqəmsal lövhə və ev kinoteatrı üçün güclüdür; ağır oyun və daşınma üçün yox.",
    description:
      "Mini PC seçimi Bakıda: ofis, HDMI, RAM/SSD. Noutbuk alternativi və IT Market bələdçisi.",
    publishedAt: "2026-08-08",
    updatedAt: "2026-08-08",
    readingMinutes: 10,
    category: "Mini PC",
    categoryHref: "/categories/mini-pc",
    tags: ["mini PC", "ofis", "HDMI", "nəzərə", "Bakı"],
    imagePath: "/images/blog/mini-pc-secimi.jpg",
    cta: { label: "Mini PC-lərə bax", href: "/categories/mini-pc" },
    blocks: [
      {
        type: "p",
        text: "Mini PC masanın arxasında yox olur, amma tam Windows ofis komputeri kimi işləyir. Noutbukdan ucuz ola bilər — çünki ekran, klaviatura və batareya yoxdur. Ona görə də qiyməti [monitor](/categories/monitor) + [siçan](/categories/sican) ilə birlikdə hesablayın. [Mini PC](/categories/mini-pc) rəfi məhz bu ssenari üçündür.",
      },
      {
        type: "h2",
        text: "Kimə uyğundur, kimə yox?",
      },
      {
        type: "ul",
        items: [
          "Uyğundur: mühasibat, kargüzarlıq, qəbul masası, rəqəmsal lövhə/HDMI player, ev TV-si arxası.",
          "Uyğun deyil: ağır 3D oyun, daim daşınma, batareya ilə metro.",
          "Qarışıq: tələbə evdə monitor + mini PC, yolda isə ucuz noutbuk — iki cihaz bəzən bir «oyun noutbukundan» ağıllıdır.",
        ],
      },
      {
        type: "h2",
        text: "Nəyə baxmalı: CPU, RAM, SSD, portlar",
      },
      {
        type: "p",
        text: "Ofis üçün müasir i3/Ryzen 3 sinfi + 16 GB RAM + 512 GB SSD rahat zonadır. 8 GB yalnız kiosk/rəqəmsal lövhə üçündür. HDMI (və ya USB-C DP) [monitor bələdçisində](/blog/monitor-secimi-is-oyun) seçdiyiniz Hertz ilə uyğun olmalıdır. İki monitor lazımdırsa, iki video çıxışı yoxlayın.",
      },
      {
        type: "callout",
        text: "Bəzi mini PC-lərdə RAM və SSD dəyişir — bu, 2 il sonra [yüksəltmə](/blog/ssd-ram-yukseltme) deməkdir. Lehimli RAM-i ucuz qiymətə alıb sonra peşman olmamaq üçün spek-i oxuyun.",
      },
      {
        type: "h2",
        text: "Səs, toz və VESA",
      },
      {
        type: "p",
        text: "Kiçik korpus = kiçik fan. Keyfiyyətli model ofisdə eşidilmir; ucuz model «fısıldaya» bilər. VESA montajı monitorun arxasına taxmağa imkan verir — qəbul masasında kabel xəosunu azaldır. Tozlu mühitdə filter və yerləşdirmə (xalçaüstü yox) ömrü uzadır.",
      },
      {
        type: "h2",
        text: "Noutbukla müqayisə — dürüst hesab",
      },
      {
        type: "ol",
        items: [
          "Mini PC + 27 düym monitor ≈ rahat ofis, sıfır daşınma.",
          "Ultrabook ≈ yolda batareya, kiçik ekran, daha yüksək qiymət.",
          "Eyni işi görürsünüzsə və masadan tərpənmirsinizsə, mini PC tez-tez qalib gəlir. Yolda yazı yazırsınızsa — [noutbuk bələdçisi](/blog/noutbuk-is-tehsil-secimi).",
        ],
      },
      {
        type: "p",
        text: "Nəticə: mini PC «kiçik noutbuk» deyil, «kiçik stolüstü»dür. Monitor və klaviatura ilə tam paket kimi düşünün. Kataloqda 16 GB / 512 GB / HDMI-lı 2–3 model seçib müqayisə edin.",
      },
      {
        type: "faq",
        items: [
          {
            question: "Mini PC-də oyun olarmı?",
            answer:
              "Yüngül və bulud oyun bəli. AAA 1440p üçün ayrıca GPU-lu stolüstü və ya oyun noutbuku seçin.",
          },
          {
            question: "Wi-Fi kifayətdirmi, yoxsa kabel lazımdır?",
            answer:
              "Videokonfrans üçün 5 GHz Wi-Fi adətən yetər. Mühasibat və printer növbəsi üçün ethernet daha az sürprizdir. Router zəifdirsə, əvvəl [Wi-Fi bələdçisinə](/blog/wifi-router-secimi) baxın.",
          },
          {
            question: "Windows lisenziyası daxildir?",
            answer:
              "Modeldən asılıdır. «No OS» daha ucuz ola bilər, amma quraşdırma vaxtı və lisenziya ayrıca gəlir. Spek-də OS sətrinə baxın.",
          },
        ],
      },
    ],
  },
];
