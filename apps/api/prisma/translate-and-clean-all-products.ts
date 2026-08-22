import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnvironment } from 'dotenv';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client';

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
loadEnvironment({ path: path.join(WORKSPACE_ROOT, '.env'), quiet: true });
loadEnvironment({ path: path.join(__dirname, '../.env'), quiet: true });

const PHRASE_REPLACEMENTS: Array<[RegExp | string, string]> = [
  // Full text replacement for 2E KS120
  [
    /klaviatura\s+iдeaльнo[^\n\r"]+/gi,
    'Klaviatura ev və ofis istifadəsi üçün idealdır; ağ yumşaq arxa işıqlandırma sayəsində gecə və gündüz rahat iş təmin edir. 12 multimedia düyməsi film və musiqi zamanı əlavə rahatlıq verir, erqonomik düymə forması isə uzunmüddətli yazı üçün hazırlanıb.'
  ],
  [
    /36\s+нaпiвпpo[^\n\r"]+/gi,
    '36 ədəd yüksək fotosintetik effektivliyə malik yarımkeçirici işıqdiodu'
  ],
  [
    /USB\s*\(живлeння\s*5В\)/gi,
    'USB (qidalanma 5V)'
  ],
  [
    /живлeння\s*5В/gi,
    'qidalanma 5V'
  ],
  [
    /живлення\s*5В/gi,
    'qidalanma 5V'
  ],
  [
    /Adapter\s+нa\s+1\/4"/gi,
    '1/4" adapter'
  ],
  [
    /нa\s+Windows\s+тa\s+Mac/gi,
    'Windows və Mac üçün'
  ],
  [
    /пpи\s+1\s*кГц/gi,
    '1 kHz-də'
  ],
  [
    /при\s+1\s*кГц/gi,
    '1 kHz-də'
  ],
  [
    /євpoştepsel/gi,
    'avroştepsel'
  ],
  [
    /євровилка/gi,
    'avroştepsel'
  ],
  [
    /євророзетка/gi,
    'avrorozetka'
  ],

  // Specific unit replacements (handling mixed cyrillic/latin)
  [/(\d+(?:\.\d+)?)\s*[хХx]\s*(\d+(?:\.\d+)?)\s*[хХx]\s*(\d+(?:\.\d+)?)\s*([cс]м|mm|sm|мм)/gi, '$1x$2x$3 $4'],
  [/(\d+(?:\.\d+)?)\s*[хХ]\s*(\d+(?:\.\d+)?)/g, '$1x$2'],
  [/(\d+(?:\.\d+)?)\s*(?:мм|mm)\b/gi, '$1 mm'],
  [/(\d+(?:\.\d+)?)\s*(?:[cс]м|sm)\b/gi, '$1 sm'],
  [/(\d+(?:\.\d+)?)\s*(?:[cс]м\s*[cс]м|sm\s*sm)\b/gi, '$1 sm'],
  [/(\d+(?:\.\d+)?)\s*(?:м|m)\b(?!\w)/gi, '$1 m'],
  [/(\d+(?:\.\d+)?)\s*(?:Гц|Hz)\b/gi, '$1 Hz'],
  [/(\d+(?:\.\d+)?)\s*(?:кГц|kHz)\b/gi, '$1 kHz'],
  [/(\d+(?:\.\d+)?)\s*(?:дБ|dB)\b/gi, '$1 dB'],
  [/(\d+(?:\.\d+)?)\s*(?:Вт|W)\b/gi, '$1 W'],
  [/(\d+(?:\.\d+)?)\s*(?:В|V)\b(?!\w)/gi, '$1 V'],
  [/(\d+(?:\.\d+)?)\s*(?:Па|Pa)\b/gi, '$1 Pa'],
  [/(\d+(?:\.\d+)?)\s*(?:кг|kq|kg)\b/gi, '$1 kq'],
  [/(\d+(?:\.\d+)?)\s*(?:г|q|g)\b(?!\w)/gi, '$1 q'],
  [/1,2м/gi, '1.2 m'],
  [/140мл/gi, '140 ml'],
  [/20x20cм/gi, '20x20 sm'],
  [/cтp/gi, 'səh.'],
  [/мaкc/gi, 'maks.'],
  [/макс/gi, 'maks.'],
  [/Пa/g, 'Pa'],
  [/Па/g, 'Pa'],
  [/\bВ\b(?!\w)/g, 'V'],
  [/\bВт\b/g, 'W'],
  [/\bГц\b/g, 'Hz'],
  [/\bкГц\b/g, 'kHz'],
  [/\bдБ\b/g, 'dB'],
  [/\bмм\b/g, 'mm'],
  [/\bсм\b/g, 'sm'],
  [/\bcм\b/g, 'sm'],
  [/\bТВ\b/g, 'TV'],

  // Ukrainian & Russian phrases
  [/gray\s+космічний/gi, 'kosmik boz'],
  [/космічний\s+сірий/gi, 'kosmik boz'],
  [/космічний/gi, 'kosmik'],
  [/без\s+батарейки/gi, 'batareyasız'],
  [/без\s+коробки/gi, 'qutusuz'],
  [/і\s+більш\s+ранні\s+версії/gi, 'və daha əvvəlki versiyalar'],
  [/і\s+попередні\s+версії/gi, 'və əvvəlki versiyalar'],
  [/і\s+старі\s+версії/gi, 'və köhnə versiyalar'],
  [/знаходиться\s+під\s+верхньою\s+кришкою\s+мишки/gi, 'siçanın üst qapağının altında yerləşir'],
  [/мультимедійних\s+клавіш/gi, 'multimedia düyməsi'],
  [/клавіатура\s+і\s+миша/gi, 'klaviatura və siçan'],
  [/клавіатура/gi, 'klaviatura'],
  [/мишка/gi, 'siçan'],
  [/миша/gi, 'siçan'],
  [/без\s+погіршення\s+характеристик/gi, 'xarakteristikalar pisləşmədən'],
  [/лінійне\s+зниження\s+характеристик\s+між\s+50%\s+та\s+100%\s+навантаження/gi, '50% və 100% yük arasında xarakteristikaların xətti azalması'],
  [/зниження\s+номінальних\s+характеристик\s+50%/gi, 'nominal xarakteristikaların 50% azalması'],
  [/автоматичне\s+визначення/gi, 'avtomatik təyinetmə'],
  [/розеток/gi, 'rozetka'],
  [/розетки/gi, 'rozetka'],
  [/Типу\s+F/gi, 'Tip F'],
  [/Тип\s+F/gi, 'Tip F'],
  [/Типу/gi, 'Tip'],
  [/євророзетка\s+із\s+заземленням/gi, 'torpaqlama ilə avrorozetka'],
  [/євророзетка\s+з\s+заземленням/gi, 'torpaqlama ilə avrorozetka'],
  [/євророзетка/gi, 'avrorozetka'],
  [/із\s+заземленням/gi, 'torpaqlama ilə'],
  [/з\s+заземленням/gi, 'torpaqlama ilə'],
  [/вилка\s+Типу\s+F/gi, 'Tip F ştepsel'],
  [/вилка\s+Тип\s+F/gi, 'Tip F ştepsel'],
  [/вилка/gi, 'ştepsel'],
  [/євровилка\s+із\s+заземленням/gi, 'torpaqlama ilə avroştepsel'],
  [/євровилка/gi, 'avroştepsel'],
  [/бокові\s+вставки/gi, 'yan əlavələr'],
  [/ліва\s+і\s+права/gi, 'sol və sağ'],
  [/дозволить\s+розмістити:\s*блок\s+живлення\s+і\s+мишку,\s*письмове\s+приладдя,\s*блокнот,\s*тощо/gi, 'qida bloku və siçan, yazı ləvazimatı, qeyd dəftəri və s. yerləşdirməyə imkan verir'],
  [/дозволить\s+розмістити:\s*блок\s+живлення\s+і\s+мишку,\s*авторучки,\s*блокнот/gi, 'qida bloku və siçan, qələmlər, qeyd dəftəri yerləşdirməyə imkan verir'],
  [/дозволить\s+розмістити/gi, 'yerləşdirməyə imkan verir'],
  [/блок\s+живлення/gi, 'qida bloku'],
  [/письмове\s+приладдя/gi, 'yazı ləvazimatı'],
  [/блокнот/gi, 'qeyd dəftəri'],
  [/авторучки/gi, 'qələmlər'],
  [/тощо/gi, 'və s.'],
  [/сдвоенных/gi, 'qoşa'],
  [/с\s+резиново-пластиковой\s+накладкой/gi, 'rezin-plastik örtüklə'],
  [/матовий\s+з\s+адаптером/gi, 'adapterli mat'],
  [/матовий/gi, 'mat'],
  [/з\s+адаптером/gi, 'adapterlə'],
  [/цифрових\s+дзеркальних\s+фотоапаратів/gi, 'rəqəmsal güzgülü fotoaparatlar üçün'],
  [/электретный/gi, 'elektret'],
  [/електретний/gi, 'elektret'],
  [/у\s+комплекті/gi, 'dəstdə'],
  [/роки/gi, 'il'],
  [/рік/gi, 'il'],
  [/розмір\s+юніта/gi, 'unit ölçüsü'],
  [/від\s+5V/gi, '5V-dan'],
  [/від/gi, '-dən'],
  [/настільна/gi, 'masaüstü'],
  [/з\s+підтримкою\s+функції/gi, 'funksiya dəstəyi ilə'],
  [/телевізор/gi, 'televizor'],
  [/кріплення\s+для\s+телевізорів/gi, 'televizor üçün bərkitmə'],
  [/для\s+заряджання\s+пристроїв/gi, 'cihazların şarj edilməsi üçün'],
  [/тільки\s+для\s+заряджання/gi, 'yalnız şarj üçün'],
  [/варистор/gi, 'varistor'],
  [/оргтехніки/gi, 'ofis texnikası üçün'],
  [/дрібнотекстурований/gi, 'incə teksturalı'],
  [/Управління\s+кабелями/gi, 'Kabel idarəetməsi'],
  [/біло-блакитний/gi, 'ağ-mavi'],
  [/біло-сірий/gi, 'ağ-boz'],
  [/навушників/gi, 'qulaqlıqlar üçün'],
  [/монітори/gi, 'monitorlar'],
  [/телефони/gi, 'telefonlar'],
  [/камери/gi, 'kameralar'],
  [/чистячий\s+олівець/gi, 'təmizləyici qələm'],
  [/металевий\s+накінечник/gi, 'metal ucluq'],
  [/м['’]яка\s+щітка/gi, 'yumşaq fırça'],
  [/ворсиста\s+фібра/gi, 'tüklü mikrofiş'],
  [/Номінальна\s+потужність\s+пристрою/gi, 'Cihazın nominal gücü'],
  [/мониторов,\s*ноутбуков,\s*ТВ,\s*техники/gi, 'monitorlar, noutbuklar, TV texnikası'],
  [/висота\s+стовпа/gi, 'dirək hündürlüyü'],
  [/перевірки\s+вентилятора/gi, 'ventilyator yoxlaması'],
  [/\bдля\b/gi, 'üçün'],
  [/\bз\b/gi, 'ilə'],
  [/\bта\b/gi, 'və'],
  [/\bі\b(?!\w)/g, 'və'],
];

const CYRILLIC_TO_LATIN_CHAR_MAP: Record<string, string> = {
  'а': 'a', 'А': 'A',
  'б': 'b', 'Б': 'B',
  'в': 'v', 'В': 'V',
  'г': 'q', 'Г': 'Q',
  'д': 'd', 'Д': 'D',
  'е': 'e', 'Е': 'E',
  'ё': 'yo', 'Ё': 'Yo',
  'ж': 'j', 'Ж': 'J',
  'з': 'z', 'З': 'Z',
  'и': 'i', 'И': 'I',
  'й': 'y', 'Й': 'Y',
  'к': 'k', 'К': 'K',
  'л': 'l', 'Л': 'L',
  'м': 'm', 'М': 'M',
  'н': 'n', 'Н': 'N',
  'о': 'o', 'О': 'O',
  'п': 'p', 'П': 'P',
  'р': 'r', 'Р': 'R',
  'с': 's', 'С': 'S',
  'т': 't', 'Т': 'T',
  'у': 'u', 'У': 'U',
  'ф': 'f', 'Ф': 'F',
  'х': 'x', 'Х': 'X',
  'ц': 'ts', 'Ц': 'Ts',
  'ч': 'c', 'Ч': 'C',
  'ш': 's', 'Ш': 'S',
  'щ': 'sc', 'Щ': 'Sc',
  'ъ': '', 'Ъ': '',
  'ы': 'i', 'Ы': 'I',
  'ь': '', 'Ь': '',
  'э': 'e', 'Э': 'E',
  'ю': 'yu', 'Ю': 'Yu',
  'я': 'ya', 'Я': 'Ya',
  'є': 'ye', 'Є': 'Ye',
  'і': 'i', 'І': 'I',
  'ї': 'yi', 'Ї': 'Yi',
  'ґ': 'q', 'Ґ': 'Q',
};

export function cleanText(input: string): string {
  if (!input) return input;
  let text = input;
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  // Any remaining Cyrillic character fallback
  text = text.replace(/[\u0400-\u04FF]/g, (char) => CYRILLIC_TO_LATIN_CHAR_MAP[char] ?? char);

  return text;
}

export function cleanJson(obj: any): any {
  if (typeof obj === 'string') {
    return cleanText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanJson(item));
  }
  if (obj && typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanKey = cleanText(k);
      res[cleanKey] = cleanJson(v);
    }
    return res;
  }
  return obj;
}

async function main() {
  const url = process.env.DATABASE_URL || 'postgresql://itmarket_local:local_itmarket_postgres_only@localhost:5433/itmarket_local?schema=public';
  console.log('Connecting to database...');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const products = await prisma.product.findMany({
    include: {
      variants: true,
      brand: true,
      category: true,
    }
  });

  console.log(`Reviewing ${products.length} products...`);

  let updatedProductsCount = 0;
  let updatedVariantsCount = 0;

  for (const product of products) {
    let name = cleanText(product.name);
    let description = product.description ? cleanText(product.description) : product.description;
    let seoTitle = product.seoTitle ? cleanText(product.seoTitle) : product.seoTitle;
    let seoDescription = product.seoDescription ? cleanText(product.seoDescription) : product.seoDescription;
    let requiredSpecs = product.requiredSpecs ? cleanJson(product.requiredSpecs) : product.requiredSpecs;

    const productChanged =
      name !== product.name ||
      description !== product.description ||
      seoTitle !== product.seoTitle ||
      seoDescription !== product.seoDescription ||
      JSON.stringify(requiredSpecs) !== JSON.stringify(product.requiredSpecs);

    if (productChanged) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          name,
          description,
          seoTitle,
          seoDescription,
          requiredSpecs: requiredSpecs as any,
        },
      });
      updatedProductsCount++;
    }

    for (const variant of product.variants) {
      let variantName = cleanText(variant.name);
      let variantAttributes = cleanJson(variant.attributes);

      const variantChanged =
        variantName !== variant.name ||
        JSON.stringify(variantAttributes) !== JSON.stringify(variant.attributes);

      if (variantChanged) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            name: variantName,
            attributes: variantAttributes as any,
          },
        });
        updatedVariantsCount++;
      }
    }
  }

  console.log(`Updated ${updatedProductsCount} products and ${updatedVariantsCount} variants.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
