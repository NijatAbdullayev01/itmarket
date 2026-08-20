import type { FaqPageContent } from "./faq-types";

export const faqAz: FaqPageContent = {
  title: "Tez-tez verilən suallar",
  meta: "IT Market · Sifariş, çatdırılma, ödəniş və zəmanət",
  description:
    "IT Market haqqında tez-tez verilən suallar — sifariş, çatdırılma, ödəniş, taksit, qaytarma və zəmanət barədə qısa və aydın cavablar.",
  lead:
    "Alışdan əvvəl və sonra ən çox soruşulan suallar burada toplanıb. Qısa cavablar; ətraflı şərtlər üçün müvafiq səhifələrə keçid də göstərilir. Cavabı tapmasanız, bizimlə birbaşa əlaqə saxlayın.",
  contact: {
    emailLabel: "E-poçt",
    phoneLabel: "Mobil",
    addressLabel: "Ünvan",
    address: "28 may küçəsi 69C, Bakı, Azərbaycan",
  },
  sections: [
    {
      title: "Necə sifariş verə bilərəm?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Kataloqdan seçin.",
              text: "Məhsulu tapın, rəng və ya yaddaş variantını seçin və səbətə əlavə edin.",
            },
            {
              label: "Səbəti yoxlayın.",
              text: "Miqdar və məbləği nəzərdən keçirin; sonra checkout-a keçin.",
            },
            {
              label: "Məlumatları doldurun.",
              text: "Çatdırılma və ya mağazadan götürməni seçin, əlaqə və ünvan məlumatlarını düzgün yazın, ödəniş üsulunu təsdiqləyin.",
            },
          ],
        },
        {
          type: "p",
          text: "Sifariş qəbul olunandan sonra təsdiq və status yeniləmələri əlaqə məlumatlarınıza göndərilir. Hesabınız varsa, sifarişləri «Hesabım» bölməsindən də izləyə bilərsiniz.",
        },
      ],
    },
    {
      title: "Çatdırılma haraya və nə qədər vaxta edilir?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Bakı və ətraf.",
              text: "Standart çatdırılma adətən 2–5 iş günü ərzindədir. Mümkün olduqda təcili rejimdə 2 saat içində çatdırırıq.",
            },
            {
              label: "Digər şəhər və rayonlar.",
              text: "Respublika üzrə çatdırılma mövcuddur; müddət və haqq ünvana görə dəyişir və checkout-da göstərilir.",
            },
          ],
        },
        {
          type: "p",
          text: "Müddətlər təxminidir — stok, hava və logistika şəraiti təsir edə bilər. Ətraflı: «Çatdırılma və ödəmə» səhifəsi.",
        },
      ],
    },
    {
      title: "Çatdırılma haqqı necə hesablanır?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Bakı — pulsuz hədd.",
              text: "1500 AZN-dən yuxarı sifarişlərdə Bakı üzrə standart çatdırılma ödənişsizdir.",
            },
            {
              label: "Bakı — həddən aşağı.",
              text: "1500 AZN-dən aşağı sifarişlərdə zona üzrə haqq tətbiq olunur; dəqiq məbləğ sifariş zamanı görünür.",
            },
            {
              label: "Mağazadan götürmə.",
              text: "Filialdan təhvil alarkən çatdırılma haqqı yoxdur.",
            },
          ],
        },
        {
          type: "p",
          text: "Kampaniyalar müvəqqəti olaraq haqqı dəyişə bilər. Sifarişi təsdiqləməzdən əvvəl səbətdəki yekun məbləği yoxlayın.",
        },
      ],
    },
    {
      title: "Mağazadan götürmə mümkündürmü?",
      blocks: [
        {
          type: "p",
          text: "Bəli. Checkout-da «Mağazadan götürmə»ni seçin. Stok təsdiqlənəndən və sifariş hazır olandan sonra sizi məlumatlandırırıq. Ünvan: 28 may küçəsi 69C, Bakı. Şəxsiyyət vəsiqəsi və ya sifariş nömrəsi ilə təhvil almağı asanlaşdırır.",
        },
      ],
    },
    {
      title: "Hansı ödəniş üsulları var?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Nağd.",
              text: "Yalnız mağazadan götürmə zamanı — uyğun sifarişlərdə. Çatdırılmada nağd yoxdur.",
            },
            {
              label: "Bank kartı.",
              text: "Visa və Mastercard ilə onlayn ödəniş.",
            },
            {
              label: "Taksit / hissə-hissə.",
              text: "Tərəfdaş bank kartları və hissə-hissə planlar — məhsul səhifəsində və checkout-da aktiv variantlar göstərilir.",
            },
          ],
        },
      ],
    },
    {
      title: "Onlayn ödəniş təhlükəsizdirmi?",
      blocks: [
        {
          type: "p",
          text: "Bəli. Kart məlumatlarınızı biz saxlamırıq; ödəniş təhlükəsiz ödəniş provayderi vasitəsilə emal olunur. Yalnız rəsmi it-market.org domenindən və ya təsdiqlənmiş ödəniş səhifəsindən ödəyin. Şübhəli keçidlərdə ödəniş etməyin — birbaşa bizimlə yoxlayın.",
        },
      ],
    },
    {
      title: "Taksit və hissə-hissə ödəniş necə işləyir?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Taksitlə al.",
              text: "Birbank, Tam Kart və ya Leobank taksit kartı ilə məbləği seçdiyiniz müddətə bölürsünüz.",
            },
            {
              label: "Hissə-hissə al.",
              text: "Planı öz büdcənizə uyğun qurursunuz; ilkin ödəniş məcburi deyil.",
            },
          ],
        },
        {
          type: "p",
          text: "Faiz, komissiya və müddətlər bankın və konkret məhsulun şərtlərinə tabedir. Ətraflı: «Hissə-hissə ödəniş» səhifəsi.",
        },
      ],
    },
    {
      title: "Məhsulu qaytara və ya dəyişə bilərəmmi?",
      blocks: [
        {
          type: "p",
          text: "Texniki cəhətdən qüsursuz məhsulu təhvil aldığınız gündən 14 təqvim günü ərzində qaytara və ya dəyişə bilərsiniz — orijinal qablaşdırma, etiketlər və komplekt saxlanılmaqla. Gigiyena məhsulları, açılmış proqram lisenziyaları və bəzi digər kateqoriyalar istisna ola bilər.",
        },
        {
          type: "p",
          text: "Ətraflı şərtlər və addımlar «Geri qaytarma» səhifəsindədir. Qüsurlu məhsul üçün isə zəmanət və qanuni hüquqlarınız ayrıca tətbiq olunur.",
        },
      ],
    },
    {
      title: "Zəmanət necə işləyir?",
      blocks: [
        {
          type: "p",
          text: "Satılan məhsullara rəsmi distribütor və ya istehsalçı zəmanəti tətbiq olunur. Müddət və şərtlər məhsul kateqoriyasına görə dəyişir — məhsul səhifəsində və zəmanət sənədlərində göstərilir. Mexaniki zədə, maye düşməsi və ya qeyri-peşəkar təmir adətən zəmanətə daxil deyil.",
        },
        {
          type: "p",
          text: "Ətraflı şərtlər, istisnalar və müraciət addımları «Zəmanət» səhifəsindədir. Qısa yol: qəbz, sifariş nömrəsi və ya zəmanət talonu ilə dəstək komandamıza yazın.",
        },
      ],
    },
    {
      title: "Sifarişimin statusunu necə izləyə bilərəm?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Bildirişlər.",
              text: "Status dəyişiklikləri SMS, e-poçt və ya digər əlaqə kanalları ilə göndərilə bilər.",
            },
            {
              label: "Hesab.",
              text: "Qeydiyyatlı müştərilər sifarişləri «Hesabım» bölməsindən izləyə bilər.",
            },
            {
              label: "Dəstək.",
              text: "Sifariş nömrənizi və əlaqə telefonunuzu deyin — operativ yoxlayırıq.",
            },
          ],
        },
      ],
    },
    {
      title: "Stokda görünməyən məhsulu ala bilərəmmi?",
      blocks: [
        {
          type: "p",
          text: "Kataloqda stok vəziyyəti real vaxtda yenilənir. Məhsul müvəqqəti bitibsə, sifariş mümkün olmaya bilər. Ehtiyacınız kritikdirsə, eyni kateqoriyada alternativlərə baxın və ya stokun yenilənməsi barədə bizimlə danışın — mümkün olduqda sizi məlumatlandırırıq.",
        },
      ],
    },
    {
      title: "Sualınız cavabsız qaldı?",
      blocks: [
        {
          type: "p",
          text: "Komandamız sifariş, çatdırılma, ödəniş və zəmanət məsələlərində kömək etməyə hazırdır. Aşağıdakı kanallardan yazın və ya zəng edin — mümkün qədər tez cavab veririk.",
        },
      ],
    },
  ],
};
