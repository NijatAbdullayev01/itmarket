import type { DeliveryPaymentPageContent } from "./delivery-payment-types";

export const deliveryPaymentAz: DeliveryPaymentPageContent = {
  title: "Çatdırılma və ödəmə",
  meta: "IT Market · Bakı və ətraf ərazilər",
  description:
    "IT Market-də ünvana çatdırılma, mağazadan götürmə və ödəniş üsulları — müddətlər, haqlar və təhlükəsiz ödəniş haqqında aydın məlumat.",
  lead:
    "Sifarişi verməzdən əvvəl bilmək istədiyiniz hər şey burada: haraya çatdırırıq, nə qədər gözləyəcəksiniz, nə ödəyəcəksiniz və ödənişi necə edə bilərsiniz. Şərtlər açıqdır — checkout-da isə sizin ünvanınıza uyğun dəqiq məbləğ göstərilir.",
  contact: {
    emailLabel: "E-poçt",
    phoneLabel: "Mobil",
    addressLabel: "Ünvan",
    address: "28 may küçəsi 69C, Bakı, Azərbaycan",
  },
  sections: [
    {
      title: "Təhvil seçimləri",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Ünvana çatdırılma.",
              text: "Sifarişi göstərdiyiniz ünvana kuryer çatdırır. Ünvan, əlaqə nömrəsi və şəhər/rayon məlumatlarını düzgün doldurun — gecikmələrin böyük hissəsi yanlış məlumatdan yaranır.",
            },
            {
              label: "Mağazadan götürmə.",
              text: "Sifarişi Bakıdakı filialımızdan — 28 may küçəsi 69C — özünüz təhvil ala bilərsiniz. Stok təsdiqlənəndən sonra hazır olduqda sizi məlumatlandırırıq.",
            },
          ],
        },
      ],
    },
    {
      title: "Çatdırılma müddətləri",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Standart.",
              text: "Adətən 2–5 iş günü ərzində. Dəqiq interval seçdiyiniz zonaya və stoka görə dəyişə bilər.",
            },
            {
              label: "Təcili.",
              text: "Mümkün olduqda 2 saat içində çatdırılma. Təcili rejim üçün əlavə haqq tətbiq oluna bilər; məbləğ checkout-da göstərilir.",
            },
          ],
        },
        {
          type: "p",
          text: "Müddətlər təxminidir. Hava şəraiti, sıx trafik, logistika partnyorunun gecikməsi və ya ünvanın çətin çatımlı olması sifarişi uzada bilər. Böyük və ya xüsusi sifarişlərdə komandamız sizinlə əvvəlcədən razılaşdırır.",
        },
      ],
    },
    {
      title: "Çatdırılma haqqı",
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
              text: "1500 AZN-dən aşağı sifarişlərdə zona üzrə çatdırılma haqqı tətbiq olunur; dəqiq məbləğ sifariş zamanı görünür.",
            },
            {
              label: "Digər şəhər və rayonlar.",
              text: "Respublika ərazilərinə çatdırılma əlavə ödənişlidir. Bəzi ünvanlarda çatdırılma mövcud olmaya bilər — bu halda checkout sizə bildiriş göstərir.",
            },
            {
              label: "Mağazadan götürmə.",
              text: "Filialdan təhvil alarkən çatdırılma haqqı yoxdur.",
            },
          ],
        },
        {
          type: "p",
          text: "Kampaniya və xüsusi təkliflər müvəqqəti olaraq haqqı dəyişə bilər. Sifarişi təsdiqləməzdən əvvəl səbətdə və checkout-da yekun məbləği yoxlayın.",
        },
      ],
    },
    {
      title: "Ödəniş üsulları",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Nağd ödəniş.",
              text: "Yalnız mağazadan götürmə zamanı nağd ödəyə bilərsiniz — uyğun sifarişlərdə. Çatdırılmada nağd yoxdur; kart və ya taksit seçin.",
            },
            {
              label: "Bank kartı.",
              text: "Visa və Mastercard ilə onlayn ödəniş. Kart məlumatlarınızı biz saxlamırıq; ödəniş təhlükəsiz ödəniş provayderi vasitəsilə emal olunur.",
            },
            {
              label: "Taksit / hissə-hissə.",
              text: "Tərəfdaş bankların taksit kartları ilə aylara bölünmüş ödəniş. Mövcudluq məbləğdən, məhsuldan və seçilmiş bankın şərtlərindən asılıdır.",
            },
          ],
        },
        {
          type: "p",
          text: "Hansı üsulun aktiv olduğunu checkout-da görürsünüz. Bəzi məhsul və ya məbləğlər üçün nağd və ya taksit məhdudlaşdırıla bilər — bu, təhlükəsizlik və partnyor qaydalarına görədir.",
        },
      ],
    },
    {
      title: "Təhvil zamanı nəyə diqqət edin",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Qablaşdırma.",
              text: "Qutunun bütövlüyünü və möhürləri kuryerin yanında yoxlayın.",
            },
            {
              label: "Komplekt.",
              text: "Məhsul, aksesuarlar və sənədlərin tam olduğunu nəzərdən keçirin.",
            },
            {
              label: "Görünən zədə.",
              text: "Zədə və ya çatışmazlıq varsa, dərhal qeyd etdirin və bizimlə əlaqə saxlayın — sonradan sübut etmək çətinləşir.",
            },
          ],
        },
      ],
    },
    {
      title: "Suallarınız qalıbsa",
      blocks: [
        {
          type: "p",
          text: "Ünvanınızın əhatə olunub-olunmadığını, təcili çatdırılmanın mümkünlüyünü və ya ödəniş üsulunu aydınlaşdırmaq üçün bizə yazın və ya zəng edin. Sifarişdən əvvəl də, sonra da kömək etməyə hazırıq.",
        },
      ],
    },
  ],
};
