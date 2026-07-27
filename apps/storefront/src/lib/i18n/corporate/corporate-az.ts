import type { CorporatePageContent } from "./corporate-types";

export const corporateAz: CorporatePageContent = {
  title: "Korporativ satışlar",
  meta: "IT Market · Biznes və təşkilatlar üçün",
  description:
    "IT Market korporativ satışlar — şirkət və təşkilatlar üçün toplu texnologiya təchizatı, hesab-faktura və fərdi şərtlər.",
  lead:
    "Ofis, komanda və ya layihə üçün texnologiya lazımdırsa, IT Market korporativ satışlarla prosesi sadələşdirir: uyğun məhsul seçimi, şəffaf qiymət, rəsmi sənədləşmə və razılaşdırılmış çatdırılma — bir əlaqə nöqtəsindən.",
  benefitsTitle: "Korporativ müştərilər üçün üstünlüklər",
  benefits: [
    {
      icon: "price",
      title: "Toplu və razılaşdırılmış qiymət",
      text: "Həcmə və ehtiyaca uyğun kommersiya təklifi hazırlayırıq — sürprizsiz, AZN ilə aydın məbləğlər.",
    },
    {
      icon: "invoice",
      title: "Rəsmi hesab-faktura",
      text: "Hüquqi şəxslər üçün lazımi sənədləşmə və ödəniş prosesini rahat şəkildə təşkil edirik.",
    },
    {
      icon: "delivery",
      title: "Çatdırılma və təhvil",
      text: "Ünvana çatdırma və ya mağazadan götürmə — böyük sifarişlərdə də razılaşdırılmış qrafikə uyğun.",
    },
    {
      icon: "support",
      title: "Fərdi dəstək",
      text: "Korporativ sorğular üçün birbaşa əlaqə: məhsul seçimi, stok və zəmanət məsələlərində komandamız yanınızdadır.",
    },
  ],
  audience: {
    title: "Kimlər üçün uyğundur?",
    blocks: [
      {
        type: "ul",
        items: [
          {
            label: "Şirkətlər və startaplar.",
            text: "Komanda üçün noutbuk, telefon, monitor və periferiya təchizatı.",
          },
          {
            label: "Ofis və filiallar.",
            text: "İş yerlərinin eyni standartla təchizatı və ehtiyat aksesuar ehtiyatı.",
          },
          {
            label: "Təhsil və təşkilatlar.",
            text: "Layihə və sinif otaqları üçün cihaz dəstləri — ehtiyaca uyğun seçimlə.",
          },
          {
            label: "Daimi təchizat ehtiyacı olanlar.",
            text: "Təkrar sifariş və yenilənmə dövrləri üçün sabit əməkdaşlıq.",
          },
        ],
      },
    ],
  },
  processTitle: "Necə işləyir?",
  steps: [
    {
      title: "1. Sorğu göndərin",
      text: "Lazım olan məhsulları, miqdarı və təhvil müddətini qısa şəkildə yazın — və ya zəng edin.",
    },
    {
      title: "2. Təklif alın",
      text: "Stok və alternativləri yoxlayıb sizə kommersiya təklifi və şərtləri təqdim edirik.",
    },
    {
      title: "3. Təsdiq və sənədləşmə",
      text: "Razılaşmadan sonra hesab-faktura və ödəniş prosesini rəsmiləşdiririk.",
    },
    {
      title: "4. Təhvil",
      text: "Sifarişi ünvanınıza çatdırırıq və ya mağazamızdan təhvil veririk — yoxlama ilə birlikdə.",
    },
  ],
  ctaTitle: "Korporativ təklif istəyin",
  ctaText:
    "Ehtiyac siyahınızı bizə göndərin. 1–2 iş günü ərzində (stok və həcmdən asılı olaraq) cavab veririk.",
  ctaButton: "E-poçt göndər",
  ctaMailtoSubject: "Korporativ satış sorğusu",
  contact: {
    emailLabel: "E-poçt",
    phoneLabel: "Mobil",
    addressLabel: "Ünvan",
    address: "28 may küçəsi 69C, Bakı, Azərbaycan",
  },
};
