import { describe, expect, it } from "vitest";

import { CATALOG_INTRO_TRANSLATIONS } from "./catalog-intro-translations";
import { localizeCatalogIntro } from "./localize-product-description";

const CATEGORY_AZ =
  "Şəbəkə avadanlıqları kateqoriyası üzrə məhsulları IT Market-də tapın. Brendləri və modelləri müqayisə edin, ehtiyacınıza uyğun konfiqurasiyanı seçin. Orijinal texnika, rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil seçimləri təqdim olunur.";

const BRAND_AZ =
  "HP brendinin rəsmi məhsullarını IT Market vitrinində kəşf edin. Kataloqda smartfon, noutbuk və digər texnika modellərini müqayisə edin, uyğun konfiqurasiyanı seçin. Orijinal məhsul, rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil seçimləri ilə alış-veriş edin.";

const SUBCATEGORY_AZ =
  "Səs avadanlıqları kateqoriyasında Qulaqlıqlar seçimləri — IT Market-də brend, model və əsas xüsusiyyətlərə görə müqayisə edin. Orijinal texnika, rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil ilə alış-veriş edin. Kataloqda filtr və çeşidləmə ilə uyğun məhsulu tez tapın.";

const KOMMUTATOR_AZ =
  "Şəbəkə avadanlıqları kateqoriyasının ən vacib elementlərindən olan kommutator modelləri, şəbəkə daxilində cihazların sürətli və təhlükəsiz məlumat mübadiləsini təmin edir. IT Market platformasında müxtəlif ehtiyaclara uyğun gələn, fərqli port sayına və ötürmə qabiliyyətinə malik kommutator seçimləri təqdim olunur. Kataloqumuzda mövcud olan filtrləmə və çeşidləmə funksiyaları vasitəsilə tələblərinizə ən uyğun modeli asanlıqla müəyyənləşdirə bilərsiniz. Hər bir məhsul rəsmi zəmanətlə təmin olunur və orijinal texniki keyfiyyəti ilə seçilir. Şəbəkə infrastrukturunuzu daha səmərəli və dayanıqlı etmək üçün təklif olunan fərqli modelləri müqayisə edərək doğru qərarı rahatlıqla verə bilərsiniz.";

const SECURITY_CATEGORY_AZ =
  "Təhlükəsizlik avadanlıqları kateqoriyası üzrə məhsulları IT Market-də tapın. Brendləri və modelləri müqayisə edin, ehtiyacınıza uyğun konfiqurasiyanı seçin. Orijinal texnika, rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil seçimləri təqdim olunur.";

const SECURITY_SUBCATEGORY_AZ =
  "Təhlükəsizlik avadanlıqları kateqoriyasında IP kamera seçimləri — IT Market-də brend, model və əsas xüsusiyyətlərə görə müqayisə edin. Orijinal texnika, rəsmi zəmanət, peşəkar dəstək və rahat çatdırılma / mağazadan təhvil ilə alış-veriş edin. Kataloqda filtr və çeşidləmə ilə uyğun məhsulu tez tapın.";

const WIFI_KAMERALAR_AZ =
  "Müşahidə kameraları obyektlərinizin və evinizin təhlükəsizliyini təmin etmək üçün ən vacib təhlükəsizlik avadanlıqları sırasındadır. Geniş çeşidli Wi-Fi kameralar müxtəlif məkanların fasiləsiz və rahat nəzarətdə saxlanılmasına imkan yaradır. Ehtiyaclarınıza uyğun müasir müşahidə sistemləri ilə ərazinizi etibarlı şəkildə qoruyun.";

const DVR_AZ =
  "Təhlükəsizlik sistemlərinin qurulmasında mühüm rol oynayan DVR cihazları video nəzarət prosesinin fasiləsiz və etibarlı şəkildə həyata keçirilməsini təmin edir. IT Market platformasında təqdim olunan təhlükəsizlik avadanlıqları kateqoriyasında müxtəlif kanal sayına və texniki göstəricilərə malik DVR modellərini asanlıqla tapa bilərsiniz. Kataloqumuzda yer alan funksional filtrlər və çeşidləmə imkanları sayəsində tələblərinizə uyğun gələn orijinal texnikanı tez bir zamanda seçib müqayisə etmək mümkündür. Rəsmi zəmanətli məhsullarımız təhlükəsizlik sisteminizin uzunömürlü və effektiv işləməsinə zəmanət verir. Ehtiyaclarınıza uyğun ən optimal DVR modelini müəyyənləşdirərək təhlükəsizliyinizi peşəkar səviyyədə təmin edin.";

const NVR_AZ =
  "Təhlükəsizlik avadanlıqları sahəsində mühüm rol oynayan NVR (Network Video Recorder) şəbəkə video qeydediciləri video-müşahidə sistemlərinin əsasını təşkil edir. IT Market platformasında müxtəlif ehtiyaclara və texniki tələblərə uyğun gələn geniş çeşiddə NVR modelləri təqdim olunur. Burada siz fərqli brendlərin təklif etdiyi cihazları asanlıqla müqayisə edə, layihəniz və ya eviniz üçün ən uyğun konfiqurasiyanı rahatlıqla seçə bilərsiniz. Təqdim olunan bütün məhsullar orijinal texnika olub, rəsmi zəmanətlə təmin edilir. Peşəkar dəstək xidmətimiz seçim zamanı sizə kömək etməyə hazırdır, həmçinin rahat çatdırılma və mağazadan təhvil alma seçimləri ilə alış-verişinizi daha asan edə bilərsiniz. Təhlükəsizliyinizi etibarlı NVR sistemləri ilə təmin edin.";

const NOUTBUKLAR_AZ =
  "İş, təhsil və oyun üçün ideal noutbuklar indi bir məkanda! Geniş çeşidli noutbuklar kataloqumuzda hər büdcəyə və tələbə uyğun orijinal modelləri asanlıqla müqayisə edə bilərsiniz. Rəsmi zəmanət, sürətli çatdırılma və mağazadan təhvil alma imkanı ilə seçiminizi rahatlıqla edin.";

const NOUTBUK_AZ =
  "Noutbuklar kateqoriyasında müxtəlif tələblərə uyğun fərqli texniki göstəricilərə malik noutbuk modelləri təqdim olunur. İş, təhsil və gündəlik istifadə üçün ən uyğun cihazları burada kəşf edə bilərsiniz. Ehtiyacınıza və büdcənizə görə düzgün seçim edərək işlərinizi daha rahat icra edin. Geniş çeşidli modellər arasından özünüzə uyğun noutbuk seçin.";

const TWO_IN_ONE_NOUTBUK_AZ =
  "2-in-1 noutbuk modelləri Noutbuklar kateqoriyasında həm planşet, həm də kompüter kimi istifadə imkanı təqdim edən çevik cihazlardır. Toxunmatik ekran dəstəyi və fırlanan menteşə mexanizmi sayəsində gündəlik tapşırıqları yerinə yetirmək və təqdimatlar hazırlamaq daha rahat olur. Geniş çeşidli bu cihazlar səyyar iş rejimində olanlar üçün funksional alternativ təqdim edir.";

const MOBIL_WORKSTATION_AZ =
  "Mobil workstation noutbuklar mühəndislik, 3D vizualizasiya, qrafik dizayn və mürəkkəb hesablamalar aparan peşəkarlar üçün xüsusi olaraq hazırlanmışdır. Ən tələbkar iş yüklərinin öhdəsindən gəlmək üçün yüksək hesablama gücü və etibarlı performans təqdim edən bu kateqoriya, səyyar iş rejimində belə iş stansiyası gücünü təmin edir. Geniş texniki imkanları və möhkəm korpus quruluşu ilə fərqlənən mobil iş stansiyaları iş axınınızı optimallaşdırmağa kömək edir.";

const NOUTBUK_CANTASI_AZ =
  "Noutbuk çantası gündəlik istifadədə və səfərlərdə cihazınızı etibarlı qorumaq üçün vacib aksesuardır. Noutbuklar kateqoriyasına uyğun müxtəlif ölçü, dizayn və bölmə seçimlərinə malik çanta modelləri ilə tanış ola bilərsiniz. Erqonomik kəmərlər və möhkəm materiallar daşıma zamanı rahatlığı və təhlükəsizliyi təmin edir. Ehtiyacınıza uyğun doğru modeli seçərək cihazınızı rahatlıqla qoruya bilərsiniz.";

const ENERJI_ADAPTERI_AZ =
  "Noutbuklar üçün nəzərdə tutulmuş keyfiyyətli enerji adapteri modelləri cihazınızın fasiləsiz və təhlükəsiz qidalanmasını təmin edir. Müxtəlif texniki göstəricilərə və güc seçimlərinə malik enerji adapteri variantları gündəlik istifadə üçün ideal uyğunluq yaradır. Düzgün qidalanma blokunun seçilməsi noutbukun batareya ömrünü qorumağa və sabit iş reytinqini saxlamağa kömək edir. Geniş çeşidli noutbuk aksesuarları arasında ehtiyacınıza uyğun məhsulu rahatlıqla tapa bilərsiniz.";

const NOUTBUK_AKSESUARLARI_AZ =
  "Noutbuk aksesuarları kateqoriyası gündəlik istifadə və iş prosesinizi daha rahat və məhsuldar etmək üçün lazım olan əlavə avadanlıqları bir araya gətirir. Noutbuklar üçün nəzərdə tutulmuş müxtəlif qoruyucu çantalar, dayaqlar, soyutma sistemləri və digər zəruri vasitələr cihazınızın ömrünü uzatmağa kömək edir. Geniş çeşidimiz sayəsində ehtiyacınıza uyğun aksesuarları asanlıqla tapa bilərsiniz. Keyfiyyətli məhsullarla iş mühitinizi təkmilləşdirin.";

describe("localizeCatalogIntro", () => {
  it("keeps Azerbaijani copy on az locale", () => {
    expect(localizeCatalogIntro(CATEGORY_AZ, "az")).toBe(CATEGORY_AZ);
  });

  it("returns an empty string for nullish input", () => {
    expect(localizeCatalogIntro(null, "en")).toBe("");
    expect(localizeCatalogIntro(undefined, "ru")).toBe("");
  });

  it("translates the generated category description to English with a localized name", () => {
    const localized = localizeCatalogIntro(CATEGORY_AZ, "en", "network equipment");
    expect(localized).toBe(
      "Find products in the network equipment category at IT Market. Compare brands and models and choose the configuration that suits your needs. Original equipment, official warranty, professional support, and convenient delivery / in-store pickup options are provided.",
    );
    expect(localized).not.toMatch(/kateqoriyası|üzrə|tapın|müqayisə|ehtiyacınıza/);
  });

  it("translates the generated category description to Russian with a localized name", () => {
    const localized = localizeCatalogIntro(
      CATEGORY_AZ,
      "ru",
      "сетевое оборудование",
    );
    expect(localized).toBe(
      "Найдите товары в категории «сетевое оборудование» в IT Market. Сравните бренды и модели и выберите конфигурацию под ваши задачи. Предлагаются оригинальная техника, официальная гарантия, профессиональная поддержка и удобная доставка / самовывоз из магазина.",
    );
    expect(localized).not.toMatch(/kateqoriyası|üzrə|tapın|müqayisə/);
  });

  it("translates the generated brand description to English", () => {
    const localized = localizeCatalogIntro(BRAND_AZ, "en");
    expect(localized).toBe(
      "Discover the official HP products in the IT Market storefront. Compare smartphone, laptop, and other tech models in the catalog and choose the right configuration. Shop with original products, official warranty, professional support, and convenient delivery / in-store pickup options.",
    );
    expect(localized).not.toMatch(/brendinin|kəşf|müqayisə|alış-veriş/);
  });

  it("translates the generated brand description to Russian", () => {
    const localized = localizeCatalogIntro(BRAND_AZ, "ru");
    expect(localized).toContain(
      "Откройте официальные товары бренда HP в витрине IT Market.",
    );
    expect(localized).not.toMatch(/brendinin|kəşf|müqayisə/);
  });

  it("translates the generated subcategory description to English", () => {
    const localized = localizeCatalogIntro(SUBCATEGORY_AZ, "en");
    expect(localized.toLowerCase()).toContain("options in the");
    expect(localized.toLowerCase()).toContain("category — compare by brand");
    expect(localized).not.toMatch(/kateqoriyasında|seçimləri|çeşidləmə/);
  });

  it("uses the curated networking category override for English", () => {
    const localized = localizeCatalogIntro(CATEGORY_AZ, "en", "ignored", "sebeke-avadanliqlari");
    expect(localized).toBe(CATALOG_INTRO_TRANSLATIONS["sebeke-avadanliqlari"].en);
    expect(localized).not.toMatch(/kateqoriyası|üzrə|tapın|müqayisə|ehtiyacınıza/);
  });

  it("uses the curated networking category override for Russian", () => {
    const localized = localizeCatalogIntro(CATEGORY_AZ, "ru", "ignored", "sebeke-avadanliqlari");
    expect(localized).toBe(CATALOG_INTRO_TRANSLATIONS["sebeke-avadanliqlari"].ru);
    expect(localized).not.toMatch(/kateqoriyası|üzrə|tapın|müqayisə/);
  });

  it("translates a long hand-written subcategory intro without garbling", () => {
    const en = localizeCatalogIntro(KOMMUTATOR_AZ, "en", "Switch", "kommutator");
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS.kommutator.en);
    expect(en).toMatch(/Switch models/);
    expect(en).not.toMatch(/kateqoriyasının|təmin|modelləri|seçimləri/);

    const ru = localizeCatalogIntro(KOMMUTATOR_AZ, "ru", "Коммутатор", "kommutator");
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS.kommutator.ru);
    expect(ru).toMatch(/Коммутаторы/);
    expect(ru).not.toMatch(/kateqoriyasının|təmin|modelləri|seçimləri/);
  });

  it("keeps Azerbaijani copy for a curated slug on az locale", () => {
    expect(localizeCatalogIntro(KOMMUTATOR_AZ, "az", "Switch", "kommutator")).toBe(
      KOMMUTATOR_AZ,
    );
  });

  it("uses the curated security equipment category override", () => {
    const en = localizeCatalogIntro(
      SECURITY_CATEGORY_AZ,
      "en",
      "ignored",
      "tehlukesizlik-avadanliqlari",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS["tehlukesizlik-avadanliqlari"].en);
    expect(en).toMatch(/Security equipment category/);
    expect(en).not.toMatch(/kateqoriyası|üzrə|tapın|müqayisə/);

    const ru = localizeCatalogIntro(
      SECURITY_CATEGORY_AZ,
      "ru",
      "ignored",
      "tehlukesizlik-avadanliqlari",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS["tehlukesizlik-avadanliqlari"].ru);
    expect(ru).toMatch(/«Оборудование безопасности»/);
    expect(ru).not.toMatch(/kateqoriyası|üzrə|tapın|müqayisə/);
  });

  it("uses the curated IP camera subcategory override", () => {
    const en = localizeCatalogIntro(
      SECURITY_SUBCATEGORY_AZ,
      "en",
      "IP camera",
      "ip-kamera",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS["ip-kamera"].en);
    expect(en).toMatch(/IP camera options/);
    expect(en).not.toMatch(/kateqoriyasında|seçimləri|çeşidləmə/);

    const ru = localizeCatalogIntro(
      SECURITY_SUBCATEGORY_AZ,
      "ru",
      "IP-камера",
      "ip-kamera",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS["ip-kamera"].ru);
    expect(ru).toMatch(/Варианты IP-камер/);
    expect(ru).not.toMatch(/kateqoriyasında|seçimləri|çeşidləmə/);
  });

  it("uses the curated Wi-Fi cameras override without garbling", () => {
    const en = localizeCatalogIntro(
      WIFI_KAMERALAR_AZ,
      "en",
      "Wi-Fi cameras",
      "wi-fi-kameralar",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS["wi-fi-kameralar"].en);
    expect(en).toMatch(/Surveillance cameras/);
    expect(en).not.toMatch(/obyektlərinizin|təmin|kameraları|nəzarətdə/);

    const ru = localizeCatalogIntro(
      WIFI_KAMERALAR_AZ,
      "ru",
      "Wi-Fi камеры",
      "wi-fi-kameralar",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS["wi-fi-kameralar"].ru);
    expect(ru).toMatch(/Камеры видеонаблюдения/);
    expect(ru).not.toMatch(/obyektlərinizin|təmin|kameraları|nəzarətdə/);
  });

  it("uses the curated DVR override without garbling", () => {
    const en = localizeCatalogIntro(DVR_AZ, "en", "DVR", "dvr");
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS.dvr.en);
    expect(en).toMatch(/DVR devices/);
    expect(en).not.toMatch(/qurulmasında|təmin|modelləri|göstəricilərə/);

    const ru = localizeCatalogIntro(DVR_AZ, "ru", "Видеорегистратор", "dvr");
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS.dvr.ru);
    expect(ru).toMatch(/Видеорегистраторы/);
    expect(ru).not.toMatch(/qurulmasında|təmin|modelləri|göstəricilərə/);
  });

  it("uses the curated NVR override without garbling", () => {
    const en = localizeCatalogIntro(NVR_AZ, "en", "NVR", "nvr");
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS.nvr.en);
    expect(en).toMatch(/Network Video Recorder/);
    expect(en).not.toMatch(/sahəsində|təşkil|modelləri|qeydediciləri/);

    const ru = localizeCatalogIntro(NVR_AZ, "ru", "Сетевой видеорегистратор", "nvr");
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS.nvr.ru);
    expect(ru).toMatch(/Сетевые видеорегистраторы/);
    expect(ru).not.toMatch(/sahəsində|təşkil|modelləri|qeydediciləri/);
  });

  it("uses the curated Laptops category override without garbling", () => {
    const en = localizeCatalogIntro(
      NOUTBUKLAR_AZ,
      "en",
      "ignored",
      "noutbuklar",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS.noutbuklar.en);
    expect(en).toMatch(/laptops for work/);
    expect(en).not.toMatch(/təhsil|məkanda|müqayisə|edə/);

    const ru = localizeCatalogIntro(
      NOUTBUKLAR_AZ,
      "ru",
      "ignored",
      "noutbuklar",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS.noutbuklar.ru);
    expect(ru).toMatch(/Идеальные ноутбуки/);
    expect(ru).not.toMatch(/təhsil|məkanda|müqayisə/);
  });

  it("uses the curated Noutbuk subcategory override without garbling", () => {
    const en = localizeCatalogIntro(NOUTBUK_AZ, "en", "Laptop", "noutbuk");
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS.noutbuk.en);
    expect(en).toMatch(/Laptops category/);
    expect(en).not.toMatch(/kateqoriyasında|göstəricilərə|kəşf/);

    const ru = localizeCatalogIntro(NOUTBUK_AZ, "ru", "Ноутбук", "noutbuk");
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS.noutbuk.ru);
    expect(ru).toMatch(/«Ноутбуки»/);
    expect(ru).not.toMatch(/kateqoriyasında|göstəricilərə|kəşf/);
  });

  it("uses the curated 2-in-1 laptop override without garbling", () => {
    const en = localizeCatalogIntro(
      TWO_IN_ONE_NOUTBUK_AZ,
      "en",
      "2-in-1 laptop",
      "2-in-1-noutbuk",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS["2-in-1-noutbuk"].en);
    expect(en).toMatch(/2-in-1 laptop models/);
    expect(en).not.toMatch(/kateqoriyasında|çevik|təqdim/);

    const ru = localizeCatalogIntro(
      TWO_IN_ONE_NOUTBUK_AZ,
      "ru",
      "Ноутбук 2-в-1",
      "2-in-1-noutbuk",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS["2-in-1-noutbuk"].ru);
    expect(ru).toMatch(/2-в-1/);
    expect(ru).not.toMatch(/kateqoriyasında|çevik|təqdim/);
  });

  it("uses the curated mobile workstation override without garbling", () => {
    const en = localizeCatalogIntro(
      MOBIL_WORKSTATION_AZ,
      "en",
      "Mobile workstation",
      "mobil-workstation",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS["mobil-workstation"].en);
    expect(en).toMatch(/Mobile workstation laptops/);
    expect(en).not.toMatch(/hazırlanmışdır|tələbkar|təmin/);

    const ru = localizeCatalogIntro(
      MOBIL_WORKSTATION_AZ,
      "ru",
      "Мобильная рабочая станция",
      "mobil-workstation",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS["mobil-workstation"].ru);
    expect(ru).toMatch(/Мобильные рабочие станции/);
    expect(ru).not.toMatch(/hazırlanmışdır|tələbkar|təmin/);
  });

  it("uses the curated laptop bag override without garbling", () => {
    const en = localizeCatalogIntro(
      NOUTBUK_CANTASI_AZ,
      "en",
      "Laptop bag",
      "noutbuk-cantasi",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS["noutbuk-cantasi"].en);
    expect(en).toMatch(/A laptop bag is an essential accessory/);
    expect(en).not.toMatch(/qorumaq|aksesuardır|kəmərlər/);

    const ru = localizeCatalogIntro(
      NOUTBUK_CANTASI_AZ,
      "ru",
      "Сумка для ноутбука",
      "noutbuk-cantasi",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS["noutbuk-cantasi"].ru);
    expect(ru).toMatch(/Сумка для ноутбука/);
    expect(ru).not.toMatch(/qorumaq|aksesuardır|kəmərlər/);
  });

  it("uses the curated laptop power adapter override without garbling", () => {
    const en = localizeCatalogIntro(
      ENERJI_ADAPTERI_AZ,
      "en",
      "Power adapter",
      "enerji-adapteri",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS["enerji-adapteri"].en);
    expect(en).toMatch(/power adapter models/);
    expect(en).not.toMatch(/nəzərdə|qidalanmasını|variantları/);

    const ru = localizeCatalogIntro(
      ENERJI_ADAPTERI_AZ,
      "ru",
      "Блок питания",
      "enerji-adapteri",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS["enerji-adapteri"].ru);
    expect(ru).toMatch(/блоков питания/);
    expect(ru).not.toMatch(/nəzərdə|qidalanmasını|variantları/);
  });

  it("uses the curated laptop accessories override without garbling", () => {
    const en = localizeCatalogIntro(
      NOUTBUK_AKSESUARLARI_AZ,
      "en",
      "Laptop accessories",
      "noutbuk-aksesuarlari",
    );
    expect(en).toBe(CATALOG_INTRO_TRANSLATIONS["noutbuk-aksesuarlari"].en);
    expect(en).toMatch(/Laptop accessories category/);
    expect(en).not.toMatch(/kateqoriyası|avadanlıqları|vasitələr/);

    const ru = localizeCatalogIntro(
      NOUTBUK_AKSESUARLARI_AZ,
      "ru",
      "Аксессуары для ноутбуков",
      "noutbuk-aksesuarlari",
    );
    expect(ru).toBe(CATALOG_INTRO_TRANSLATIONS["noutbuk-aksesuarlari"].ru);
    expect(ru).toMatch(/«Аксессуары для ноутбуков»/);
    expect(ru).not.toMatch(/kateqoriyası|avadanlıqları|vasitələr/);
  });
});
