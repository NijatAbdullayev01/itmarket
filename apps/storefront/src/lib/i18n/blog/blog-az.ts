import type { BlogPageContent } from "./blog-types";

export const blogAz: BlogPageContent = {
  title: "Bloq",
  meta: "IT Market · Bakıda texnologiya bələdçisi",
  description:
    "Bakıda smartfon, noutbuk və aksesuar seçimi: praktik bələdçilər, müqayisə məsləhətləri, taksit və batareya qulluğu. IT Market bloqu — düzgün alış üçün.",
  lead:
    "Kataloqda itib-batmamaq üçün yazırıq. Hər məqalə mağazada tez-tez eşitdiyimiz suallardan çıxır: hansı telefon kifayət edir, noutbukda nəyə baxmaq lazımdır, taksit nə vaxt məntiqlidir. Qısa marketinq yox — real ssenari və aydın növbəti addım.",
  readingTimeLabel: (minutes) => `${minutes} dəq oxuma`,
  readMore: "Məqaləni oxu",
  backToBlog: "Bloqa qayıt",
  relatedTitle: "Oxşar yazılar",
  featuredLabel: "Seçilmiş yazı",
  posts: [
    {
      slug: "smartfon-secimi-2026",
      title: "2026-cı ildə smartfon necə seçilir: büdcəyə görə aydın bələdçi",
      excerpt:
        "Flagship lazımdırmı, yoxsa orta seqment kifayət edir? Əvvəl ehtiyacı yazın, sonra kamera, batareya və yaddaşı sıralayın — qiymət ən sonda gəlir.",
      description:
        "Bakıda smartfon seçimi 2026: büdcə, kamera, batareya və yaddaş prioriteti. IT Market praktik bələdçisi — flagship və ya orta seqment?",
      publishedAt: "2026-07-20",
      updatedAt: "2026-07-29",
      readingMinutes: 11,
      category: "Smartfonlar",
      tags: ["smartfon", "müqayisə", "büdcə", "Bakı"],
      imagePath: "/images/blog/smartfon-secimi-2026.jpg",
      cta: { label: "Smartfonlara bax", href: "/categories/smartfonlar" },
      blocks: [
        {
          type: "p",
          text: "Keçən həftə mağazada eyni dialoqu üçüncü dəfə eşitdik: «Ən yaxşı telefon hansıdır?» Cavab həmişə eynidir — «Sizin üçün ən yaxşı». Çünki 1200 AZN-lik flagship bir nəfərə artıqdır, digərinə isə 550 AZN-lik model illərlə rahat işləyir. Fərq reklamda yox, gündəlik ssenaridədir.",
        },
        {
          type: "p",
          text: "Bu yazını IT Market-də müştərilərə verdiyimiz eyni sual siyahısından yığdıq. Məqsəd satmaq deyil: kataloqda filtr açanda nəyə baxacağınızı əvvəlcədən bilməkdir. Oxuyub bitirdikdən sonra 3–4 real namizəd qalmalıdır — yüz model yox.",
        },
        {
          type: "h2",
          text: "1. Əvvəlcə büdcəni, sonra «arzunu» yazın",
        },
        {
          type: "p",
          text: "«Təxminən 700–800» demək müqayisəni sonsuz edir. Daha yaxşı yanaşma: maksimum məbləği və rahat zonanı ayrı yazmaqdır. Məsələn, maksimum 900 AZN, rahat zona 650–750 AZN. Bu iki rəqəm sizi həm həddən ucuz, həm də lazımsız bahalı modellərdən qoruyur.",
        },
        {
          type: "ul",
          items: [
            "Gündəlik zəng, mesaj, sosial şəbəkə və naviqasiya — orta seqment adətən kifayət edir.",
            "Gecə foto, 4K video, uzun oyun seansları — daha güclü çip və soyutma axtarın.",
            "2–3 il istifadə planı varsa, proqram yeniləməsi və təhlükəsizlik yamaları vacibdir.",
          ],
        },
        {
          type: "h2",
          text: "2. Kamera: meqapiksel yox, real ssenari",
        },
        {
          type: "p",
          text: "«108 MP» etiketi gözəl səslənir, amma gündəlik fotoda işıq, stabilizasiya və emal alqoritmi daha çox fərq yaradır. Özünüzə sual verin: əsasən gündüz şəhər fotoları, yoxsa axşam restoran və konsert? Uşaq və ya pet fotoları varmı? Video çəkirsinizmi?",
        },
        {
          type: "p",
          text: "Əgər foto sizin üçün «yaxşı olsun kifayət edir» səviyyəsindədirsə, orta seqmentin əsas kamerası çox vaxt gözləntiləri ödəyir. Sosial media üçün məzmun yaradırsınızsa, ultrawide və gecə rejiminə ayrıca baxın — tək rəqəm kifayət etmir.",
        },
        {
          type: "h2",
          text: "3. Batareya və şarj: günü necə keçirirsiniz?",
        },
        {
          type: "p",
          text: "Böyük mAh rəqəmi həmişə «bütün gün» demək deyil. Parlaq ekran, 5G və oyun batareyanı tez yeyir. Praktik yoxlama: səhər işə və ya məktəbə çıxıb axşam evə qayıdana qədər telefonu nə qədər istifadə edirsiniz?",
        },
        {
          type: "ol",
          items: [
            "Gündə 3–4 saat ekran vaxtı: orta batareya + normal şarj kifayət edə bilər.",
            "Gündə 6+ saat və naviqasiya/oyun: yüksək tutum və sürətli şarj üstünlükdür.",
            "Gündə bir neçə dəfə «tez doldurum» ehtiyacı varsa, şarj gücü və adapterin dəstə də olub-olmamasına baxın.",
          ],
        },
        {
          type: "h2",
          text: "4. Yaddaş: 128 GB hələ də yetərlidirmi?",
        },
        {
          type: "p",
          text: "Foto, video, offline xəritə və tətbiq keşi sürətlə yer tutur. 128 GB bir çox istifadəçi üçün hələ də işləyir; çoxlu 4K video və ya böyük oyunlar yükləyirsinizsə, 256 GB daha rahatdır. Bulud yaddaşına güvənirsinizsə, kiçik yaddaş da idarəolunan ola bilər — amma internet və abunə haqqını unutmayın.",
        },
        {
          type: "callout",
          text: "IT Market məsləhəti: eyni modelin 128 və 256 GB variantlarını müqayisə edin. Qiymət fərqi kiçikdirsə, 2–3 il rahatlıq üçün böyük yaddaşı seçmək çox vaxt özünü doğruldur.",
        },
        {
          type: "h2",
          text: "5. Mağazada və onlayn eyni yoxlama siyahısı",
        },
        {
          type: "ul",
          items: [
            "Ekranı günəş işığında oxunaqlılığa görə yoxlayın (və ya etibarlı rəylərə baxın).",
            "Əl rahatlığı: bir əllə istifadə və çəki sizin üçün vacibdirsə, tutun və ya ölçülərə baxın.",
            "Zəmanət və qaytarma şərtlərini alışdan əvvəl oxuyun.",
            "Kredit və ya taksit düşünürsünüzsə, aylıq ödənişi ümumi büdcənizə uyğunlaşdırın.",
          ],
        },
        {
          type: "p",
          text: "Nəticə: əvvəl ehtiyacı, sonra texniki vərəqi oxuyun. Bakıda smartfon seçərkən qiymət filtrindən əvvəl istifadə ssenarinizi (kamera, batareya, yaddaş) qeyd edin. Beləliklə, «bütün modellərə baxım» yorğunluğu əvəzinə aydın namizədlər qalır — və seçim sadələşir.",
        },
      ],
    },
    {
      slug: "noutbuk-is-tehsil-secimi",
      title: "İş və təhsil üçün noutbuk: ultrabook, ofis, yoxsa oyun noutbuku?",
      excerpt:
        "Tələbə, ofis işçisi və freelancer üçün prioritetlər fərqlidir. RAM, SSD, ekran və batareyanı ehtiyaca görə seçin — marketinq adlarına uyub getməyin.",
      description:
        "İş və təhsil üçün noutbuk seçimi Bakıda: RAM, SSD, ekran tipi və batareya. Ultrabook, ofis və ya oyun noutbuku — hansı sizin üçündür?",
      publishedAt: "2026-07-14",
      updatedAt: "2026-07-29",
      readingMinutes: 12,
      category: "Noutbuklar",
      tags: ["noutbuk", "təhsil", "iş", "RAM"],
      imagePath: "/images/blog/noutbuk-is-tehsil-secimi.jpg",
      cta: { label: "Noutbuklara bax", href: "/categories/noutbuklar" },
      blocks: [
        {
          type: "p",
          text: "Noutbuk elanı oxuyanda hər şey «güclü», «yüngül» və «ideal» görünür. Real həyatda isə bir model metroda batareya saxlayır, digəri Excel və 20 Chrome tabında boğulur. Fərq çipin adından çox, konfiqurasiya və istifadə ssenarisindədir — bunu mağazada demək olar ki, hər gün izah edirik.",
        },
        {
          type: "h2",
          text: "Kim nə üçün alır?",
        },
        {
          type: "ul",
          items: [
            "Təhsil: Word/PDF, Zoom, brauzer, bəzən yüngül dizayn və ya kod.",
            "Ofis: çoxsaylı sənəd, cədvəl, videokonfrans, bütün gün batareya.",
            "Yaradıcı iş: foto/video redaktə, böyük fayllar, yaxşı ekran.",
            "Oyun / 3D: ayrıca qrafika kartı, soyutma, yüksək enerji istehlakı.",
          ],
        },
        {
          type: "p",
          text: "Oyun noutbukunu «gələcəyə ehtiyat» deyə ofis üçün almaq tez-tez səhv olur: ağırdır, səs-küylü ola bilər, batareya isə zəifdir. Əksinə, nazik ultrabook-da ağır video render gözləmək də eyni dərəcədə yanlışdır.",
        },
        {
          type: "h2",
          text: "RAM və SSD: iki rəqəm ki, həyatı dəyişir",
        },
        {
          type: "p",
          text: "2026-cı ildə 8 GB RAM bir çox yüngül iş üçün hələ də «açılır», amma rahat çoxtasking üçün 16 GB daha təhlükəsiz seçimdir. SSD həcmi isə: 256 GB tez dolur (Windows + Office + fayllar). 512 GB gündəlik iş və təhsil üçün daha rahat başlanğıcdır.",
        },
        {
          type: "callout",
          text: "Mümkünsə, RAM-in lehimli (sonradan artırılmayan) olub-olmamasını yoxlayın. Gələcəkdə yeniləmək istəyirsinizsə, bu detal bu günün qiymətindən vacib ola bilər.",
        },
        {
          type: "h2",
          text: "Ekran: göz yorğunluğu real problemdir",
        },
        {
          type: "p",
          text: "Full HD (1920×1080) əksər iş və təhsil üçün kifayətdir. Mat (anti-glare) panel ofis və gün işığı olan otaqlarda daha rahatdır. Dizayn və rəng dəqiqliyi lazımdırsa, IPS və yüksək rəng əhatəsi axtarın. Parlaq «güzgü» ekranlar gözəl görünür, amma günəşdə əks etdirir.",
        },
        {
          type: "h2",
          text: "Batareya və portlar — mağazada unudulanlar",
        },
        {
          type: "ol",
          items: [
            "Gündə neçə saat rozetkasız işləyəcəksiniz?",
            "HDMI, USB-A, SD kart lazımdırmı, yoxsa hub alacaqsınız?",
            "Çəki: hər gün çanta ilə daşıyırsınızsa, 1.5–1.8 kq fərqi hiss olunur.",
            "Klaviatura və touchpad: uzun yazı yazırsınızsa, rahatlıq performansa bərabər əhəmiyyətlidir.",
          ],
        },
        {
          type: "p",
          text: "Praktik yol: ehtiyac siyahınızı 5 maddeyə endirin (məsələn: 16 GB RAM, 512 GB SSD, Full HD, HDMI, 1.6 kq-dan yüngül). Sonra IT Market kataloqunda bu meyarlara uyğun 3 model seçib qiymət, zəmanət və stok müqayisəsi edin. Belə müqayisə «bütün noutbuklar» siyahısından qat-qat sürətlidir.",
        },
      ],
    },
    {
      slug: "kredit-taksit-texnologiya",
      title: "Texnologiyanı kredit və ya taksitle almaq: ağıllı qərar necə verilir?",
      excerpt:
        "Aylıq ödəniş rahat görünə bilər, amma ümumi dəyəri unutmaq asandır. Büdcə, müddət və məhsul ömrünü birlikdə hesablayın — sonra imzalayın.",
      description:
        "Smartfon və noutbuku taksit və ya kreditlə almaq: aylıq ödəniş, ümumi məbləğ və məhsul ömrü. IT Market praktik məsləhətləri.",
      publishedAt: "2026-07-08",
      updatedAt: "2026-07-29",
      readingMinutes: 9,
      category: "Ödəniş",
      tags: ["kredit", "taksit", "büdcə", "ödəniş"],
      imagePath: "/images/blog/kredit-taksit-texnologiya.jpg",
      cta: { label: "Taksit şərtlərinə bax", href: "/installment" },
      blocks: [
        {
          type: "p",
          text: "Böyük alışlarda taksit cəlbedicidir: bu gün ehtiyacınız olan cihazı sabaha saxlamadan götürürsünüz. Amma «aylıq 80 AZN asandır» düşüncəsi bəzən ümumi xərci və digər öhdəlikləri kölgədə qoyur. Bu yazı bank məsləhəti deyil — mağazada eşiddiyimiz eyni suallara praktik cavabdır.",
        },
        {
          type: "h2",
          text: "Əvvəl ehtiyac, sonra ödəniş forması",
        },
        {
          type: "p",
          text: "Kredit və ya taksit yalnız o zaman məntiqlidir ki, məhsul həqiqətən lazımdır və nağd/kartla ödəmək hazırkı büdcəni pozur. «Kampaniya var, götürüm» impulsu isə tez-tez istifadə olunmayan cihaz və uzun ödəniş cədvəli ilə bitir.",
        },
        {
          type: "ul",
          items: [
            "Cihaz iş və ya təhsil üçün kritikdirsə — planlı taksit məqsədəuyğun ola bilər.",
            "Sadəcə «yeniləmək istəyirəm»dirsə — daha ucuz, ehtiyaca uyğun model + qısa müddət düşünün.",
            "Köhnə telefonunuz hələ işləyirsə və alış təcili deyilsə — 1–2 ay yığım da seçimdir.",
          ],
        },
        {
          type: "h2",
          text: "Aylıq ödənişi ümumi büdcəyə oturdun",
        },
        {
          type: "p",
          text: "Sadə yoxlama: aylıq ödəniş sabit gəlirinizin kiçik, rahat hissəsi olmalıdır — digər kreditlər, kirayə və gündəlik xərclərdən sonra. İki-üç taksit eyni anda yığılanda «kiçik» rəqəmlər böyük yükə çevrilir.",
        },
        {
          type: "callout",
          text: "Alışdan əvvəl: ümumi ödəniləcək məbləği, müddəti və ilkin ödənişi eyni qeyddə yazın. Yalnız «aylıq» rəqəminə baxmayın — ümumi dəyər qərarı dəyişdirir.",
        },
        {
          type: "h2",
          text: "Məhsul ömrü ilə ödəniş müddətini uyğunlaşdırın",
        },
        {
          type: "p",
          text: "2 il taksitlə alınan telefondan 1 ildən sonra narazı qalıb yenisini almaq istəmək — ən bahalı ssenarilərdən biridir. Ona görə də müddəti cihazı real istifadə edəcəyiniz müddətlə uyğun seçin. Orta seqment + ağlabatan müddət çox vaxt flagship + uzun taksitdən daha sağlamdır.",
        },
        {
          type: "ol",
          items: [
            "Məhsulu seçin və nağd qiyməti qeyd edin.",
            "Kredit/taksit şərtlərini oxuyun (ümumi ödəniş, cərimə, erkən bağlama).",
            "Aylıq ödənişi digər öhdəliklərlə birlikdə yoxlayın.",
            "Hələ tərəddüdlüsünüzsə — bir gün gözləyin; impuls azalır, qərar aydınlaşır.",
          ],
        },
        {
          type: "p",
          text: "IT Market-də məqsədimiz şəffaf seçimdir: kataloqda məhsulu anlayın, ehtiyaca uyğun model seçin, sonra ödəniş formasını öz büdcənizə görə qərarlaşdırın. Düzgün cihaz + ağıllı ödəniş = alışdan sonra da rahatlıq.",
        },
      ],
    },
    {
      slug: "aksesuarlar-vacib-olanlar",
      title: "Hansı aksesuarlar həqiqətən lazımdır (hansılar isə marketinq şoudur)?",
      excerpt:
        "Çexol, şüşə, şarj, qulaqlıq, hub… Hamısını almaq lazım deyil. Cihazı qoruyan və gündəliyi asanlaşdıranlara fokuslanın — qalanını sonra.",
      description:
        "Smartfon və noutbuk aksesuarları: çexol, şüşə, kabel, hub — hansıları almaq dəyər? IT Market prioritet siyahısı.",
      publishedAt: "2026-06-30",
      updatedAt: "2026-07-29",
      readingMinutes: 8,
      category: "Aksesuarlar",
      tags: ["aksesuar", "çexol", "şarj", "qoruyucu"],
      imagePath: "/images/blog/aksesuarlar-vacib-olanlar.jpg",
      cta: { label: "Aksesuarlara bax", href: "/categories/smartfonlar" },
      blocks: [
        {
          type: "p",
          text: "Yeni telefon və ya noutbukla kassaya yaxınlaşanda aksesuar rəfi göz qamaşdırır. Bir hissəsi həqiqətən cihazı qoruyur və rahatlıq artırır; digər hissəsi isə «olmasa da olar» kateqoriyasına düşür. Büdcəni qorumaq üçün əvvəl prioritet, sonra əlavə.",
        },
        {
          type: "h2",
          text: "Smartfon: demək olar ki, həmişə dəyər",
        },
        {
          type: "ul",
          items: [
            "Keyfiyyətli şüşə (ekran qoruyucu) — kiçik xərc, böyük təmirdən qoruya bilər.",
            "Uyğun çexol — düşmə və cızıqlara qarşı ilk müdafiə.",
            "Etibarlı şarj kabeli — ucuz, tez xarab olan kabellər uzunmüddətdə bahadır.",
          ],
        },
        {
          type: "h2",
          text: "Noutbuk: iş axınına görə",
        },
        {
          type: "ul",
          items: [
            "Çanta və ya sleeve — hər gün daşıyırsınızsa, demək olar ki, mütləqdir.",
            "USB-C hub — port azdırsa və HDMI/USB-A lazımdırsa, çox faydalıdır.",
            "Xarici SSD — böyük layihə və ya ehtiyat nüsxə üçün ağıllı investisiya.",
            "Soyuducu altlıq — ağır oyun/render yoxdursa, çox vaxt vacib deyil.",
          ],
        },
        {
          type: "callout",
          text: "«Premium» etiketi həmişə keyfiyyət demək deyil. Material, modelə uyğunluq və qaytarma şərtlərinə baxın. Uyğunsuz çexol və ya şüşə ən bahalı aksesuardır — çünki işləmir.",
        },
        {
          type: "h2",
          text: "Sonra ala biləcəyinizlər",
        },
        {
          type: "p",
          text: "Simsiz qulaqlıq, smartwatch, əlavə powerbank, dekorativ stikerlər… Bunlar faydalı ola bilər, amma cihazın özünü təhlükəsiz və işlək saxlayan əsaslardan sonra gəlməlidir. Əvvəl qoruma və enerji, sonra rahatlıq və əlavələr.",
        },
        {
          type: "p",
          text: "Praktik paket: yeni telefon alırsınızsa — şüşə + çexol + yaxşı kabel. Noutbuk alırsınızsa — çanta + (lazımsa) hub. Qalanını bir həftə istifadə edib ehtiyacı hiss etdikdən sonra alın. Bu yanaşma impuls xərclərini kəskin azaldır.",
        },
      ],
    },
    {
      slug: "onlayn-magaza-alis-beli",
      title: "Onlayn sifariş, yoxsa mağazaya gəlmək? Bakıda texnologiya alışı üçün praktik müqayisə",
      excerpt:
        "Vaxt, toxunaraq yoxlamaq, stok və çatdırılma — hər ssenarinin öz üstünlüyü var. Hansını nə vaxt seçməli olduğunuzu aydınlaşdırırıq.",
      description:
        "Bakıda onlayn sifariş və mağazadan texnologiya alışı: IT Market-də nə vaxt hansını seçmək daha rahatdır? Çatdırılma, stok və toxunma.",
      publishedAt: "2026-06-22",
      updatedAt: "2026-07-29",
      readingMinutes: 9,
      category: "Alış bələdçisi",
      tags: ["onlayn", "mağaza", "çatdırılma", "Bakı"],
      imagePath: "/images/blog/onlayn-magaza-alis-beli.jpg",
      cta: { label: "Çatdırılma və ödəniş", href: "/delivery-payment" },
      blocks: [
        {
          type: "p",
          text: "Bəzi insanlar yalnız vitrinə toxunanda qərar verir; digərləri isə axşam evdə filtr açıb səhər sifarişi tamamlayır. Hər iki yol düzgündür — vacib olan ssenariyə uyğun seçməkdir. IT Market həm onlayn, həm də 28 May küçəsi 69C ünvanında eyni məhsul məntiqi ilə işləyir.",
        },
        {
          type: "h2",
          text: "Onlayn sifariş nə vaxt qalib gəlir?",
        },
        {
          type: "ul",
          items: [
            "Nə istədiyinizi bilirsiniz (model, yaddaş, rəng).",
            "Vaxtınız azdır və çatdırılma və ya mağazadan götürmə rahatdır.",
            "Qiymət və spesifikasiyanı sakit mühitdə müqayisə etmək istəyirsiniz.",
            "Eyni anda bir neçə modeli tab-larda açıb müqayisə edirsiniz.",
          ],
        },
        {
          type: "h2",
          text: "Mağazaya gəlmək nə vaxt daha yaxşıdır?",
        },
        {
          type: "ul",
          items: [
            "Çəki, ölçü və klaviatura/ekran hissi sizin üçün kritikdir.",
            "Suallarınız var və canlı məsləhət istəyirsiniz.",
            "Eyni gün götürüb istifadəyə başlamaq istəyirsiniz.",
            "Aksesuar uyğunluğunu yerində yoxlamaq lazımdır.",
          ],
        },
        {
          type: "callout",
          text: "Hibrid yol çox vaxt ən rahatıdır: onlayn araşdırın, 2–3 namizəd seçin, sonra ya sifariş verin, ya da mağazada son toxunuşu edin. Beləliklə, nə «bütün rəfi gəzmək», nə də «kor-koranə klik» olur.",
        },
        {
          type: "h2",
          text: "Alışdan əvvəl eyni yoxlamalar",
        },
        {
          type: "ol",
          items: [
            "Stok və çatdırılma/götürmə seçimini yoxlayın.",
            "Qiymətin AZN ilə şəffaf göstərildiyinə əmin olun.",
            "Zəmanət və qaytarma qaydalarına nəzər yetirin.",
            "Ödəniş üsulunu (kart, taksit və s.) əvvəlcədən düşünün.",
          ],
        },
        {
          type: "p",
          text: "Nəticə: yaxşı alış kanal seçimindən çox, aydın ehtiyac və şəffaf şərtlərdən asılıdır. Onlayn sürət verir; mağaza isə toxunma və canlı sual-cavab. İkisi birlikdə isə Bakıda rahat müştəri yolu yaradır.",
        },
      ],
    },
    {
      slug: "batareya-omru-uzatmaq",
      title: "Telefon və noutbuk batareyasını daha uzun saxlamaq: real tövsiyələr",
      excerpt:
        "Mifləri kənara qoyaq. İstilik, parlaqlıq, fon tətbiqləri və şarj vərdişləri batareya ömrünə ən çox təsir edir — gündəlik kiçik dəyişikliklər kifayətdir.",
      description:
        "Smartfon və noutbuk batareyasının ömrünü uzatmaq: istilik, parlaqlıq və şarj vərdişləri. IT Market praktik məsləhətləri.",
      publishedAt: "2026-06-12",
      updatedAt: "2026-07-29",
      readingMinutes: 8,
      category: "Qulluq",
      tags: ["batareya", "qulluq", "şarj", "məsləhət"],
      imagePath: "/images/blog/batareya-omru-uzatmaq.jpg",
      cta: { label: "Kataloqa keç", href: "/" },
      blocks: [
        {
          type: "p",
          text: "«Batareyanı 0-a qəd boşaldın» və ya «gecə heç vaxt şarj etməyin» kimi ümumi məsləhətlər çox vaxt yarımçıqdır. Müasir litium batareyalar ağıllı şarj idarəetməsi ilə gəlir; ən böyük düşmənlər isə daimi yüksək istilik, maksimum parlaqlıq və ağır fon yükləridir.",
        },
        {
          type: "h2",
          text: "Smartfon üçün gündəlik vərdişlər",
        },
        {
          type: "ul",
          items: [
            "Ekran parlaqlığını avtomatik və ya orta səviyyədə saxlayın.",
            "Lazımsız yüksək yenilənmə tezliyini (120 Hz) batareya rejimində azaldın.",
            "İstilik yaradan qalın çexol + oyun/şarj kombinasiyasından çəkinin.",
            "Arxa fonda işləyən lazımsız tətbiqləri bağlayın və icazələri nəzərdən keçirin.",
          ],
        },
        {
          type: "h2",
          text: "Noutbuk üçün",
        },
        {
          type: "ul",
          items: [
            "Ventilyasiya dəliklərini bağlayan yumşaq səthlərdə (yorğan) uzun işlətməyin.",
            "Ofis işində «Balanced» enerji planı çox vaxt kifayətdir.",
            "Yüksək performans rejimini yalnız ağır işdə açın.",
            "Batareya sağlamlığı funksiyası varsa (şarj limiti), stolüstü istifadədə aktivləşdirin.",
          ],
        },
        {
          type: "callout",
          text: "Orijinal və ya keyfiyyətli şarj adapteri istifadə edin. Ucuz, naməlum adapterlər həm cihaz, həm də batareya üçün risk yarada bilər.",
        },
        {
          type: "p",
          text: "Batareya təbii olaraq yaşlanır — bu normaldır. Amma istiliyi və yükü idarə etməklə 1–2 il sonra da «günü çıxaran» cihaz ehtimalını artırırsınız. Yeni cihaz alarkən isə batareya tutumu və sürətli şarjı ehtiyac siyahınıza daxil edin; bu, sonradan peşmançılığın qarşısını alır.",
        },
      ],
    },
  ],
};
