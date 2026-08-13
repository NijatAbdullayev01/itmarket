/**
 * Hand-crafted APC catalog SEO (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';

export type ApcSeoSpec = {
  label: string;
  value: string;
};

export type ApcSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type ApcSeoInput = {
  sku: string;
  title: string;
  specs: readonly ApcSeoSpec[];
  subcategorySlug: string;
};

type ApcSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_APC_SEO: Record<string, ApcSeoDraft> = {
  'BE650G2-GR': {
    seoTitle: 'APC Back-UPS 650VA USB UPS',
    seoDescription:
      'APC Back-UPS 650VA USB UPS (BE650G2-GR): 650 VA/400 W, 8 Schuko, USB doldurma və Ethernet qorunması. Ev-ofis üçün orijinal APC, rəsmi 3 il zəmanət.',
    pageIntro:
      'APC Back-UPS 650VA (BE650G2-GR) kompüter, modem və USB cihazlarını qəfil elektrik kəsilməsindən qoruyan fasiləsiz qida mənbəyidir. 650 VA / 400 W güc, 8 Schuko rozetka (6 ehtiyat + 2 yalnız surge), USB Type-A 2,4 A və RJ-45 Ethernet qorunması ev və kiçik ofis üçün kifayət edir. Standby topologiya, dəyişdirilə bilən APCRBC110 batareya və kompakt korpusla orijinal APC həllidir. Rəsmi 3 il zəmanət və çatdırılma ilə təqdim olunur.',
  },
  'BX750MI-GR': {
    seoTitle: 'APC Back-UPS 750VA AVR UPS',
    seoDescription:
      'APC Back-UPS 750VA AVR (BX750MI-GR) line-interactive UPS. 750 VA/410 W, 4 Schuko, 140–300 V giriş və RJ45 qorunması. Orijinal APC, rəsmi zəmanət.',
    pageIntro:
      'APC Back-UPS 750VA (BX750MI-GR) AVR-li line-interactive UPS-dir: qeyri-sabit şəbəkədə gərginliyi tənzimləyir, kəsilmədə isə 750 VA / 410 W ehtiyat verir. 4 Schuko rozetka, 140–300 V giriş diapazonu və təxminən 6 ms keçid vaxtı PC və ofis avadanlığı üçün nəzərdə tutulub. Dəyişdirilə bilən RBC17 batareya, RJ45 data qorunması və 5,4 kq tower korpusu ilə orijinal APC modelidir.',
  },
  'BE850G2-GR': {
    seoTitle: 'APC Back-UPS 850VA USB-C UPS',
    seoDescription:
      'APC Back-UPS 850VA USB-C UPS (BE850G2-GR): 850 VA/520 W, USB-C + USB-A, 8 Schuko və Ethernet qorunması. Ev-ofis üçün orijinal, rəsmi 3 il zəmanət.',
    pageIntro:
      'APC Back-UPS 850VA (BE850G2-GR) USB-C və USB-A doldurma portlu fasiləsiz qida mənbəyidir. 850 VA / 520 W, 8 Schuko rozetka, 310 J surge və RJ-45 Ethernet qorunması noutbuk, telefon və şəbəkə avadanlığını eyni vaxtda qorumağa kömək edir. Standby topologiya, APCRBC17 / RBC17 əvəzedici batareya və 3 il rəsmi zəmanətlə orijinal APC UPS-dir.',
  },
  'BX950MI-GR': {
    seoTitle: 'APC Back-UPS 950VA AVR UPS',
    seoDescription:
      'APC Back-UPS 950VA AVR (BX950MI-GR): 950 VA/520 W line-interactive UPS, 4 Schuko və 140–300 V giriş. AVR ilə gərginlik qorunması, rəsmi zəmanət.',
    pageIntro:
      'APC Back-UPS 950VA (BX950MI-GR) 950 VA / 520 W line-interactive UPS-dir və AVR ilə gərginlik dalğalanmalarını batareyaya keçmədən tənzimləyir. 4 Schuko çıxış, 140–300 V giriş və RBC17 əvəzedici batareya ofis kompüteri və periferiya üçün uyğundur. Tower korpus, təxminən 6 ms keçid və orijinal APC keyfiyyəti ilə təqdim olunur.',
  },
  'BV650I-GR': {
    seoTitle: 'APC Easy UPS BV 650VA AVR',
    seoDescription:
      'APC Easy UPS BV 650VA (BV650I-GR) kompakt AVR UPS: 650 VA/375 W, 4 Schuko, 170–280 V. Ev və kiçik ofis üçün orijinal APC, rəsmi 2 il zəmanət.',
    pageIntro:
      'APC Easy UPS BV 650VA (BV650I-GR) ev və kiçik ofis üçün kompakt line-interactive UPS-dir. 650 VA / 375 W, AVR, 4 Schuko rozetka və 170–280 V giriş diapazonu gündəlik kompüter dəstini qorumaq üçündür. 12 V / 7 Ah batareya, 6–8 saatlıq doldurma və 2 il rəsmi zəmanətlə orijinal APC Easy UPS seriyasına aiddir.',
  },
  'BV800I-GR': {
    seoTitle: 'APC Easy UPS BV 800VA AVR',
    seoDescription:
      'APC Easy UPS BV 800VA AVR (BV800I-GR): 800 VA/450 W, 4 Schuko, 170–280 V giriş. Kompakt line-interactive UPS, orijinal APC, rəsmi 2 il zəmanət.',
    pageIntro:
      'APC Easy UPS BV 800VA (BV800I-GR) 800 VA / 450 W AVR-li line-interactive UPS-dir. 4 Schuko çıxış və 170–280 V giriş diapazonu printer, monitor və sistem blokunu eyni vaxtda qorumağa imkan verir. Kompakt korpus, 12 V / 7 Ah batareya və 2 il zəmanətlə orijinal APC modelidir.',
  },
  'BV1000I-GR': {
    seoTitle: 'APC Easy UPS BV 1000VA AVR',
    seoDescription:
      'APC Easy UPS BV 1000VA (BV1000I-GR) 1 kVA/600 W line-interactive UPS. AVR, 4 Schuko rozetka. PC və ofis üçün orijinal APC UPS, 2 il zəmanət.',
    pageIntro:
      'APC Easy UPS BV 1000VA (BV1000I-GR) 1.000 VA / 600 W gücündə line-interactive UPS-dir. AVR, 4 Schuko rozetka və 170–280 V giriş ofis kompüteri və şəbəkə avadanlığı üçün ehtiyat qida verir. 12 V / 9 Ah batareya, 6–8 saat doldurma və 2 il rəsmi zəmanətlə orijinal APC Easy UPS BV seriyasındandır.',
  },
  'BVX1200LI-GR': {
    seoTitle: 'APC Easy UPS 1200VA AVR',
    seoDescription:
      'APC Easy UPS 1200VA AVR (BVX1200LI-GR): 1.200 VA/650 W, 4 Schuko, 140–300 V. Line-interactive qoruma, orijinal APC UPS və rəsmi 2 il zəmanət.',
    pageIntro:
      'APC Easy UPS 1200VA (BVX1200LI-GR) 1.200 VA / 650 W line-interactive UPS-dir. AVR, 4 Schuko rozetka və 140–300 V giriş diapazonu qeyri-sabit şəbəkədə ofis yükünü qoruyur. APCRBC175 əvəzedici batareya, 273 J surge və 2 il zəmanətlə orijinal APC Easy UPS modelidir.',
  },
  'BVX1600LI-GR': {
    seoTitle: 'APC Easy UPS 1600VA AVR',
    seoDescription:
      'APC Easy UPS 1600VA (BVX1600LI-GR) 1.600 VA/900 W AVR UPS. 4 Schuko, 24 V batareya, ofis yükü üçün ehtiyat qida. Orijinal APC UPS, 2 il zəmanət.',
    pageIntro:
      'APC Easy UPS 1600VA (BVX1600LI-GR) daha ağır ofis yükü üçün 1.600 VA / 900 W AVR-li line-interactive UPS-dir. 4 Schuko çıxış, 24 V / 7 Ah batareya və 140–300 V giriş diapazonu iş stansiyası və kiçik server avadanlığını qorumağa kömək edir. APCRBC176 əvəzedici batareya və 2 il rəsmi zəmanətlə orijinal APC-dir.',
  },
  'BVX2200LI-GR': {
    seoTitle: 'APC Easy UPS 2200VA AVR',
    seoDescription:
      'APC Easy UPS 2200VA AVR (BVX2200LI-GR): 2.200 VA/1.200 W, 4 Schuko, line-interactive. Ağır ofis yükü üçün orijinal APC UPS, rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'APC Easy UPS 2200VA (BVX2200LI-GR) 2.200 VA / 1.200 W line-interactive UPS-dir və AVR ilə gərginliyi tənzimləyir. 4 Schuko rozetka, 24 V / 9 Ah batareya və 140–300 V giriş daha çox enerji tələb edən ofis dəstləri üçündür. Tower korpus və orijinal APC keyfiyyəti ilə rəsmi zəmanətlə təqdim olunur.',
  },
  SRV2KI: {
    seoTitle: 'APC Easy UPS SRV 2000VA',
    seoDescription:
      'APC Easy UPS SRV 2000VA (SRV2KI) On-Line UPS: 2.000 VA/1.600 W, təmiz sinus, LCD və tower korpus. Server və şəbəkə üçün orijinal, rəsmi zəmanət.',
    pageIntro:
      'APC Easy UPS SRV 2000VA (SRV2KI) double conversion On-Line UPS-dir: 2.000 VA / 1.600 W, təmiz sinus dalğası və tower korpus. 4 × IEC C13 çıxış, multifunksiyalı LCD, Intelligent Card Slot və ECO rejim server, NAS və şəbəkə avadanlığı üçün sabit qida verir. Orijinal APC Easy UPS SRV seriyası, rəsmi zəmanətlə.',
  },
  SRV10KI: {
    seoTitle: 'APC Easy UPS SRV 10kVA On-Line',
    seoDescription:
      'APC Easy UPS SRV 10kVA (SRV10KI) tower On-Line UPS. 10 kVA/10 kW, təmiz sinus, daxili bypass və LCD. Kritik yük üçün orijinal APC, rəsmi zəmanət.',
    pageIntro:
      'APC Easy UPS SRV 10kVA (SRV10KI) 10.000 VA / 10.000 W double conversion On-Line tower UPS-dir. Təmiz sinus, hard-wire 3-wire çıxış, avtomatik və əl bypass, 94% səmərəlilik və multifunksiyalı LCD kritik IT yükü üçün nəzərdə tutulub. Intelligent Card Slot ilə idarəetmə genişlənir. Orijinal APC, rəsmi zəmanətlə.',
  },
  'SRV3KRIRK-E': {
    seoTitle: 'APC Easy UPS SRV 3kVA RM',
    seoDescription:
      'APC Easy UPS SRV 3kVA RM (SRV3KRIRK-E): 3.000 VA/2.700 W On-Line rack UPS, rail kit, təmiz sinus, LCD. 2U şkaf üçün orijinal APC, rəsmi zəmanət.',
    pageIntro:
      'APC Easy UPS SRV 3kVA RM (SRV3KRIRK-E) 3.000 VA / 2.700 W double conversion On-Line rack UPS-dir. 2U form faktor, daxil edilən rail kit, təmiz sinus, 6 × IEC C13 + 1 × IEC C19 və multifunksiyalı LCD server şkafı üçün uyğundur. Intelligent Card Slot və dəyişdirilə bilən batareya ilə orijinal APC həllidir.',
  },
  'SRV3KRILRK-E': {
    seoTitle: 'APC Easy UPS SRV 3kVA RM EBP',
    seoDescription:
      'APC Easy UPS SRV 3kVA RM EBP (SRV3KRILRK-E): 3 kVA On-Line rack UPS, extended battery pack və rail kit. Uzun runtime, təmiz sinus, orijinal APC.',
    pageIntro:
      'APC Easy UPS SRV 3kVA RM EBP (SRV3KRILRK-E) 3.000 VA / 2.700 W On-Line rack UPS-dir və extended runtime battery pack plus rail kit ilə gəlir. 4U form faktor, təmiz sinus, 6 × IEC C13 + 1 × IEC C19 və xarici batareya paketləri ilə runtime artırmaq olar. LCD idarəetmə və Intelligent Card Slot ilə orijinal APC rack həllidir.',
  },
  SRV6KRIRK: {
    seoTitle: 'APC Easy UPS SRV 6kVA RM',
    seoDescription:
      'APC Easy UPS SRV 6kVA RM (SRV6KRIRK): 6 kVA/6 kW On-Line rack UPS, rail kit və xarici batareya. Double conversion, orijinal APC, 2 il zəmanət.',
    pageIntro:
      'APC Easy UPS SRV 6kVA RM (SRV6KRIRK) 6.000 VA / 6.000 W double conversion On-Line rack UPS-dir. 4U korpus, rail kit, xarici batareya paketi, hard-wire 3-wire bağlantı, daxili bypass və 94% səmərəlilik orta tutumlu server otağı üçündür. USB, EPO və 2 il rəsmi zəmanətlə orijinal APC modelidir.',
  },
  SRV10KRIRK: {
    seoTitle: 'APC Easy UPS SRV 10kVA RM',
    seoDescription:
      'APC Easy UPS SRV 10kVA RM (SRV10KRIRK): 10 kVA On-Line rack UPS, rail kit və xarici batareya. 94% səmərəlilik, hard-wire, orijinal, 2 il zəmanət.',
    pageIntro:
      'APC Easy UPS SRV 10kVA RM (SRV10KRIRK) 10.000 VA / 10.000 W On-Line rackmount UPS-dir. Rail kit, xarici batareya paketi, hard-wire 3-wire, daxili bypass, 94% səmərəlilik və 1% harmonik təhrif kritik IT infrastrukturu üçün nəzərdə tutulub. 4U korpus, USB, EPO və 2 il zəmanətlə orijinal APC Easy UPS SRV-dir.',
  },
  SMC1500IC: {
    seoTitle: 'APC Smart-UPS C 1500VA LCD',
    seoDescription:
      'APC Smart-UPS C 1500VA (SMC1500IC) sine-wave UPS, LCD və SmartConnect. 1.500 VA/900 W, AVR, 8× IEC C13. Ofis üçün orijinal APC, rəsmi 2 il zəmanət.',
    pageIntro:
      'APC Smart-UPS C 1500VA LCD SmartConnect (SMC1500IC) sine-wave çıxışlı line-interactive UPS-dir. 1.500 VA / 900 W, AVR, qrafik LCD, USB/Serial və SmartConnect Ethernet portu uzaqdan izləməyə imkan verir. 8 × IEC C13 + 2 jumper, RBC6 əvəzedici batareya və 2 il zəmanətlə ofis və kiçik server üçün orijinal APC Smart-UPS-dir.',
  },
  SRTG5KXLI: {
    seoTitle: 'APC Smart-UPS RT 5kVA',
    seoDescription:
      'APC Smart-UPS RT 5kVA (SRTG5KXLI) unity PF On-Line UPS. 5 kVA/5 kW, rack/tower 4U, NMC daxil. Kritik avadanlıq üçün orijinal APC, rəsmi zəmanət.',
    pageIntro:
      'APC Smart-UPS RT 5kVA (SRTG5KXLI) 5.000 VA / 5.000 W unity power factor On-Line UPS-dir. Rack/tower 4U, təmiz sinus, hard-wire giriş/çıxış, quraşdırılmış Network Management Card və xarici batareya ilə runtime genişlənməsi kritik avadanlıq üçündür. USB + Serial bağlantı və orijinal APC Smart-UPS RT seriyası, rəsmi zəmanətlə.',
  },
  SRTG10KXLI: {
    seoTitle: 'APC Smart-UPS RT 10kVA',
    seoDescription:
      'APC Smart-UPS RT 10kVA (SRTG10KXLI): 10 kVA/10 kW unity PF On-Line UPS, NMC3 daxil, rack/tower 5U. Server otağı üçün orijinal, rəsmi zəmanət.',
    pageIntro:
      'APC Smart-UPS RT 10kVA (SRTG10KXLI) 10.000 VA / 10.000 W unity PF double conversion UPS-dir. Rack/tower 5U, quraşdırılmış Network Management Card 3 (environmental monitoring), daxili bypass və xarici batareya genişlənməsi server otağı üçün nəzərdə tutulub. Təmiz sinus, 93,5% səmərəlilik və orijinal APC Smart-UPS RT keyfiyyəti ilə təqdim olunur.',
  },
  SRT10KRMXLI: {
    seoTitle: 'APC Smart-UPS SRT 10kVA RM',
    seoDescription:
      'APC Smart-UPS SRT 10kVA RM (SRT10KRMXLI): 10 kVA/10 kW On-Line rackmount UPS. Double conversion, yüksək güc sıxlığı. Kritik IT üçün orijinal APC.',
    pageIntro:
      'APC Smart-UPS SRT 10kVA RM (SRT10KRMXLI) 10.000 VA / 10.000 W double conversion On-Line rackmount UPS-dir. Yüksək güc sıxlığı, təmiz sinus və rack form faktor data mərkəzi və server şkafı üçün nəzərdə tutulub. Orijinal APC Smart-UPS SRT seriyası, rəsmi zəmanət və çatdırılma ilə.',
  },
  SRT3000RMXLI: {
    seoTitle: 'APC Smart-UPS SRT 3000VA RM',
    seoDescription:
      'APC Smart-UPS SRT 3000VA RM (SRT3000RMXLI) 3 kVA/2.7 kW On-Line rack UPS. 8× IEC C13 + 2× C19, daxili bypass. Orijinal APC, rəsmi zəmanətlə.',
    pageIntro:
      'APC Smart-UPS SRT 3000VA RM (SRT3000RMXLI) 3.000 VA / 2.700 W On-Line rack UPS-dir. 8 × IEC C13 + 2 × IEC C19 çıxış, daxili bypass, USB/Serial/SmartSlot və APCRBC152 əvəzedici batareya server şkafında kritik yükləri qoruyur. Double conversion, təmiz sinus və orijinal APC Smart-UPS SRT seriyası.',
  },
  AP9641: {
    seoTitle: 'APC AP9641 NMC3 şəbəkə kartı',
    seoDescription:
      'APC AP9641 NMC3 şəbəkə kartı: Gigabit Ethernet, SNMPv3 və temperatur monitorinqi. Smart-UPS SmartSlot üçün uzaqdan idarəetmə, orijinal aksesuar.',
    pageIntro:
      'APC AP9641 Network Management Card 3 Smart-UPS SmartSlot modellərində UPS-i şəbəkə üzərindən izləmək və idarə etmək üçündür. Gigabit Ethernet, HTTPS/SSL, SSH, SNMPv3 və daxil olan temperatur sensoru ilə environmental monitoring təqdim edir. EcoStruxure IT, web UI və event/data log inteqrasiyası ilə orijinal APC aksesuarıdır; 2 il rəsmi zəmanətlə.',
  },
  AP9544: {
    seoTitle: 'APC AP9544 Easy UPS NMC',
    seoDescription:
      'APC AP9544 Easy UPS On-Line şəbəkə kartı: Gigabit Ethernet, SNMPv3, HTTPS. Intelligent Card Slot üçün uzaqdan monitorinq, orijinal APC aksesuar.',
    pageIntro:
      'APC AP9544 Easy UPS On-Line (1-Phase) modellərinin Intelligent Card Slot-u üçün Network Management Card-dır. Gigabit Ethernet, SNMPv1/v3, Modbus TCP, HTTPS və SSH ilə uzaqdan monitorinq və idarəetmə verir. Smart-UPS SmartSlot kartı deyil — Easy UPS üçün nəzərdə tutulub. EcoStruxure IT və PowerChute ilə orijinal APC aksesuarıdır.',
  },
};

function specValue(
  specs: readonly ApcSeoSpec[],
  matcher: (label: string) => boolean,
): string | null {
  const found = specs.find((entry) => matcher(entry.label.toLocaleLowerCase('az')));
  if (found === undefined || found.value.trim() === '') {
    return null;
  }
  return found.value.trim();
}

function fallbackSeoCopy(input: ApcSeoInput): ApcSeoCopy {
  const power = specValue(input.specs, (label) => label === 'güc');
  const topology = specValue(input.specs, (label) => label.startsWith('topolog'));
  const isAccessory = input.subcategorySlug === 'ups-aksesuarlari';
  const sku = input.sku.trim().toUpperCase();
  const productType = isAccessory ? 'APC UPS aksesuarı' : 'orijinal APC UPS';

  const seoTitle = clampSeoText(
    `APC ${sku}`.replace(/\s+/g, ' ').trim(),
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — ${productType}.`,
    power ? `Güc: ${power}.` : null,
    topology ? `${topology} topologiya.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveApcProductSeo(input: ApcSeoInput): ApcSeoCopy {
  const sku = input.sku.trim().toUpperCase();
  const crafted = HANDCRAFTED_APC_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildApcProductDescription(
  pageIntro: string,
  specs: readonly ApcSeoSpec[],
): string {
  const specLines: string[] = [];
  for (const entry of specs) {
    const label = entry.label.trim();
    const value = entry.value.trim();
    if (label === '' || value === '') {
      continue;
    }
    specLines.push(`${label}: ${value}`);
  }
  if (specLines.length === 0) {
    return pageIntro.trim();
  }
  return `${pageIntro.trim()}\n\n${specLines.join('\n')}`;
}

export function listHandcraftedApcSkus(): string[] {
  return Object.keys(HANDCRAFTED_APC_SEO);
}
