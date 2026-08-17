/**
 * Hand-crafted HDD catalog SEO from qnaphdds.xlsx (Azerbaijani SERP).
 * Titles stay under the storefront suffix budget; meta descriptions target 140–155 chars.
 */
import {
  SEO_DESCRIPTION_SOFT_MAX,
  SEO_TITLE_SOFT_MAX,
  clampSeoText,
} from '../seo-ai/seo-heuristic';
import {
  normalizeQnaphddsSku,
  resolveQnaphddsBrand,
} from './qnaphdds-product-name';

export type QnaphddsSeoSpec = {
  label: string;
  value: string;
};

export type QnaphddsSeoCopy = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

export type QnaphddsSeoInput = {
  sku: string;
  title: string;
  specs: readonly QnaphddsSeoSpec[];
  subcategorySlug: string;
};

type QnaphddsSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  pageIntro: string;
};

const HANDCRAFTED_QNAPHDD_SEO: Record<string, QnaphddsSeoDraft> = {
  ST1000VX013: {
    seoTitle: 'Seagate SkyHawk ST1000VX013 1TB nəzarət HDD',
    seoDescription:
      'Seagate SkyHawk ST1000VX013: 1TB 3.5" nəzarət HDD, SATA 6 Gb/s, 5400 rpm və 256 MB keş. NVR üçün orijinal Seagate, 3 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate SkyHawk ST1000VX013 (ST1000VX013) 1 TB 3.5" nəzarət HDD-dir. ImagePerfect, SATA 6 Gb/s, 5400 rpm AgileSpin, 256 MB keş və 180 TB/il iş yükü 24/7 NVR yazması üçündür. 64 HD kameraya qədər, 8 yuvaya qədər və SkyHawk Health Management. İncə 20.20 mm korpus; orijinal Seagate modelidir, 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST4000VN006: {
    seoTitle: 'Seagate IronWolf ST4000VN006 4TB NAS HDD',
    seoDescription:
      'Seagate IronWolf ST4000VN006: 4TB NAS HDD, SATA 6 Gb/s, 5400 rpm və RV sensor. 1–8 yuvalı NAS üçün orijinal Seagate, 3 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate IronWolf ST4000VN006 (ST4000VN006) 4 TB 3.5" NAS HDD-dir. SATA 6 Gb/s, 5400 rpm, 256 MB keş, CMR və RV sensor 1–8 yuvalı NAS üçün nəzərdə tutulub. Dual-Plane Balance, Error Recovery Control, IronWolf Health Management və Rescue 3 il. Orijinal Seagate NAS diskidir; 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST4000NM024B: {
    seoTitle: 'Seagate Exos 7E10 ST4000NM024B 4TB server HDD',
    seoDescription:
      'Seagate Exos 7E10 ST4000NM024B: 4TB server HDD, 7200 rpm, FastFormat və 550 TB/il. Data-center üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos 7E10 ST4000NM024B (ST4000NM024B) 4 TB 3.5" enterprise HDD-dir. SATA 6 Gb/s, 7200 rpm, 256 MB keş + 8 MB NOR, FastFormat 512e/4Kn və 550 TB/il iş yükü 24/7 server massivi üçündür. SuperParity, PowerChoice, 2 000 000 saat MTBF. Orijinal Seagate Exos modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST6000VX009: {
    seoTitle: 'Seagate SkyHawk ST6000VX009 6TB nəzarət HDD',
    seoDescription:
      'Seagate SkyHawk ST6000VX009: 6TB nəzarət HDD, 5400 rpm AgileSpin və 64 HD kamera. 24/7 NVR üçün orijinal Seagate, 3 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate SkyHawk ST6000VX009 (ST6000VX009) 6 TB 3.5" nəzarət HDD-dir. ImagePerfect, SATA 6 Gb/s, 5400 rpm AgileSpin, 256 MB keş və RV sensor 24/7 NVR üçün nəzərdə tutulub. 64 HD kamera, 8 yuvaya qədər, SkyHawk Health Management və Rescue 3 il. Orijinal Seagate modelidir; 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST8000VX010: {
    seoTitle: 'Seagate SkyHawk ST8000VX010 8TB nəzarət HDD',
    seoDescription:
      'Seagate SkyHawk ST8000VX010: 8TB 3.5" nəzarət HDD, ImagePerfect və 180 TB/il. Kamera arxivi üçün orijinal Seagate, 3 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate SkyHawk ST8000VX010 (ST8000VX010) 8 TB 3.5" nəzarət HDD-dir. ImagePerfect, SATA 6 Gb/s, 5400 rpm AgileSpin, 256 MB keş və 180 TB/il iş yükü kamera arxivi üçündür. 64 HD kamera, 8 yuvaya qədər və SkyHawk Health Management. Orijinal Seagate nəzarət diskidir; 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST8000NM017B: {
    seoTitle: 'Seagate Exos 7E10 ST8000NM017B 8TB server HDD',
    seoDescription:
      'Seagate Exos 7E10 ST8000NM017B: 8TB enterprise HDD, 7200 rpm, SuperParity və PowerChoice. Server üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos 7E10 ST8000NM017B (ST8000NM017B) 8 TB 3.5" enterprise HDD-dir. SATA 6 Gb/s, 7200 rpm, 256 MB keş, FastFormat 512e/4Kn və 550 TB/il 24/7 server yaddaşı üçündür. SuperParity, RV sensor, PowerChoice və 2 000 000 saat MTBF. Orijinal Seagate Exos 7E10 modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST8000VN004: {
    seoTitle: 'Seagate IronWolf ST8000VN004 8TB NAS HDD',
    seoDescription:
      'Seagate IronWolf ST8000VN004: 8TB NAS HDD, 7200 rpm, 256 MB keş və Dual-Plane Balance. Ofis NAS üçün orijinal Seagate, 3 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate IronWolf ST8000VN004 (ST8000VN004) 8 TB 3.5" NAS HDD-dir. SATA 6 Gb/s, 7200 rpm, 256 MB keş, CMR və RV sensor 1–8 yuvalı ofis NAS üçündür. Dual-Plane Balance, Error Recovery Control, IronWolf Health Management və Rescue 3 il. Orijinal Seagate NAS diskidir; 3 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST10000NM017B: {
    seoTitle: 'Seagate Exos 7E10 ST10000NM017B 10TB server HDD',
    seoDescription:
      'Seagate Exos 7E10 ST10000NM017B: 10TB server HDD, 7200 rpm, 256 MB keş və 2 mln saat MTBF. Rack üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos 7E10 ST10000NM017B (ST10000NM017B) 10 TB 3.5" enterprise HDD-dir. SATA 6 Gb/s, 7200 rpm, 256 MB keş, FastFormat 512e/4Kn və 550 TB/il rack server massivi üçündür. SuperParity, PowerChoice və 2 000 000 saat MTBF. Orijinal Seagate Exos 7E10 modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST10000VE001: {
    seoTitle: 'Seagate SkyHawk AI ST10000VE001 10TB nəzarət HDD',
    seoDescription:
      'Seagate SkyHawk AI ST10000VE001: 10TB nəzarət HDD, 7200 rpm, 550 TB/il və 16+ NVR. AI kamera üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate SkyHawk AI ST10000VE001 (ST10000VE001) 10 TB 3.5" nəzarət HDD-dir. ImagePerfect AI, SATA 6 Gb/s, 7200 rpm, 256 MB keş və 550 TB/il 16+ yuvalı NVR və AI analitika üçündür. 64 HD kamera + 32 AI axını, RAID RapidRebuild və SkyHawk Health Management. Orijinal Seagate SkyHawk AI modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST12000NM000J: {
    seoTitle: 'Seagate Exos X18 ST12000NM000J 12TB server HDD',
    seoDescription:
      'Seagate Exos X18 ST12000NM000J: 12TB helium server HDD, 7200 rpm və 270 MB/s. Data-center üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos X18 ST12000NM000J (ST12000NM000J) 12 TB 3.5" helium enterprise HDD-dir. SATA 6 Gb/s, 7200 rpm, rəsmi 256 MB keş, FastFormat 512e/4Kn və 550 TB/il data-center yaddaşı üçündür. PowerChoice / PowerBalance, hot-plug, SuperParity və 2 500 000 saat MTBF. Orijinal Seagate Exos X18 modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST16000NM002H: {
    seoTitle: 'Seagate Exos X24 ST16000NM002H 16TB server HDD',
    seoDescription:
      'Seagate Exos X24 ST16000NM002H: 16TB helium HDD, 7200 rpm, ISE və 512 MB keş. Enterprise üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos X24 ST16000NM002H (ST16000NM002H) 16 TB 3.5" helium enterprise HDD-dir. SATA 6 Gb/s, 7200 rpm, 512 MB keş, FastFormat 512e/4Kn ISE və 550 TB/il 24/7 server massivi üçündür. SuperParity, PowerChoice / PowerBalance, hot-plug və 2 500 000 saat MTBF. Orijinal Seagate Exos X24 modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST16000NT001: {
    seoTitle: 'Seagate IronWolf Pro ST16000NT001 16TB NAS HDD',
    seoDescription:
      'Seagate IronWolf Pro ST16000NT001: 16TB NAS HDD, 7200 rpm və 1–24 yuva. Rescue bərpa ilə orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate IronWolf Pro ST16000NT001 (ST16000NT001) 16 TB 3.5" NAS HDD-dir. SATA 6 Gb/s, 7200 rpm, 256 MB keş, helium CMR və 550 TB/il 1–24 yuvalı NAS üçündür. IronWolf Health Management, RV sensor və Rescue Data Recovery. Orijinal Seagate IronWolf Pro modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  WUH722016CLE6: {
    seoTitle: 'WD Ultrastar DC HC555 16TB server HDD',
    seoDescription:
      'WD Ultrastar DC HC555 WUH722016CLE6: 16TB server HDD, HelioSeal, ePMR və 7200 rpm. Data-center üçün orijinal WD, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'WD Ultrastar DC HC555 WUH722016CLE6 (WUH722016CLE6) 16 TB 3.5" data-center HDD-dir. SATA 6 Gb/s, 7200 rpm, 512 MB keş, HelioSeal helium, ePMR və 550 TB/il 24/7 rack massivi üçündür. RVS iki sensor, Triple-Stage Micro Actuator, Base SE (OEM 0B48722) və 2 500 000 saat MTBF. Orijinal WD Ultrastar modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  MG09ACA18TE: {
    seoTitle: 'Toshiba MG09ACA18TE 18TB server HDD',
    seoDescription:
      'Toshiba MG09ACA18TE: 18TB server HDD, FC-MAMR, 9 disk helium və 7200 rpm. Enterprise üçün orijinal Toshiba, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Toshiba MG09ACA18TE (MG09ACA18TE) 18 TB 3.5" enterprise HDD-dir. SATA 6.0 Gbit/s, 7200 rpm, 512 MiB keş, FC-MAMR CMR və 9 disk helium 24/7 data-center yaddaşı üçündür. 550 TB/il iş yükü, Persistent Write Cache (512e) və 2 500 000 saat MTTF. Orijinal Toshiba MG09 modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST20000NT001: {
    seoTitle: 'Seagate IronWolf Pro ST20000NT001 20TB NAS HDD',
    seoDescription:
      'Seagate IronWolf Pro ST20000NT001: 20TB NAS HDD, helium, 285 MiB/s və 550 TB/il. Böyük NAS üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate IronWolf Pro ST20000NT001 (ST20000NT001) 20 TB 3.5" NAS HDD-dir. SATA 6 Gb/s, 7200 rpm, 256 MB keş, helium CMR və 285 MiB/s 1–24 yuvalı böyük NAS üçündür. 550 TB/il, IronWolf Health Management və Rescue Data Recovery. Orijinal Seagate IronWolf Pro modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  MG10ACA20TE: {
    seoTitle: 'Toshiba MG10ACA20TE 20TB server HDD',
    seoDescription:
      'Toshiba MG10ACA20TE: 20TB server HDD, FC-MAMR, 10 disk helium və 512 MiB keş. Rack yaddaş üçün orijinal Toshiba, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Toshiba MG10ACA20TE (MG10ACA20TE) 20 TB 3.5" enterprise HDD-dir. SATA 6.0 Gbit/s, 7200 rpm, 512 MiB keş, FC-MAMR CMR və 10 disk helium tutumlu rack yaddaşı üçündür. 550 TB/il, Persistent Write Cache və 2 500 000 saat MTTF. Orijinal Toshiba MG10 modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST20000NM007D: {
    seoTitle: 'Seagate Exos X20 ST20000NM007D 20TB server HDD',
    seoDescription:
      'Seagate Exos X20 ST20000NM007D: 20TB helium HDD, 7200 rpm və PowerBalance. Tutumlu server üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos X20 ST20000NM007D (ST20000NM007D) 20 TB 3.5" helium enterprise HDD-dir. SATA 6 Gb/s, 7200 rpm, rəsmi 256 MB keş, FastFormat 512e/4Kn və 550 TB/il tutumlu server massivi üçündür. PowerChoice / PowerBalance, hot-plug və 2 500 000 saat MTBF. Orijinal Seagate Exos X20 modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST20000NM002H: {
    seoTitle: 'Seagate Exos X24 ST20000NM002H 20TB server HDD',
    seoDescription:
      'Seagate Exos X24 ST20000NM002H: 20TB ISE server HDD, 7200 rpm və 285 MB/s. 24/7 massiv üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos X24 ST20000NM002H (ST20000NM002H) 20 TB 3.5" helium enterprise HDD-dir. SATA 6 Gb/s, 7200 rpm, 512 MB keş, FastFormat ISE və 285 MB/s 24/7 server massivi üçündür. SuperParity, PowerChoice / PowerBalance, hot-plug və 2 500 000 saat MTBF. Orijinal Seagate Exos X24 20 TB modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST24000NM002H: {
    seoTitle: 'Seagate Exos X24 ST24000NM002H 24TB server HDD',
    seoDescription:
      'Seagate Exos X24 ST24000NM002H: 24TB helium HDD, 7200 rpm, ISE və hot-plug. Yüksək tutum üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos X24 ST24000NM002H (ST24000NM002H) 24 TB 3.5" helium enterprise HDD-dir. SATA 6 Gb/s, 7200 rpm, 512 MB keş, FastFormat ISE və 550 TB/il yüksək tutumlu data-center üçündür. SuperParity, PowerChoice / PowerBalance, hot-plug və 2 500 000 saat MTBF. Orijinal Seagate Exos X24 24 TB modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST28000NM003K: {
    seoTitle: 'Seagate Exos M ST28000NM003K 28TB server HDD',
    seoDescription:
      'Seagate Exos M ST28000NM003K: 28TB HAMR server HDD, Mozaic 3+ və 7200 rpm. Yeni nəsil yaddaş üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos M ST28000NM003K (ST28000NM003K) 28 TB 3.5" HAMR enterprise HDD-dir. Mozaic 3+ helium, host CMR (SMR deyil), SATA 6 Gb/s, 7200 rpm, 512 MB keş və 512e ISE yeni nəsil data-center yaddaşı üçündür. 550 TB/il, FastFormat 512e→4Kn, hot-plug. Orijinal Seagate Exos M modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST30000NM004K: {
    seoTitle: 'Seagate Exos M ST30000NM004K 30TB server HDD',
    seoDescription:
      'Seagate Exos M ST30000NM004K: 30TB HAMR HDD, 512e ISE, 275 MB/s və 7200 rpm. Data-center üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos M ST30000NM004K (ST30000NM004K) 30 TB 3.5" HAMR enterprise HDD-dir. Mozaic 3+, SATA 6 Gb/s, 7200 rpm, 512 MB keş, 512e ISE və 275 MB/s tutumlu data-center massivi üçündür. 550 TB/il, FastFormat 512e→4Kn və 2 500 000 saat MTBF. Orijinal Seagate Exos M 30 TB modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
  ST32000NM004K: {
    seoTitle: 'Seagate Exos M ST32000NM004K 32TB server HDD',
    seoDescription:
      'Seagate Exos M ST32000NM004K: 32TB HAMR server HDD, Mozaic 3+ və 285 MB/s. Maksimum tutum üçün orijinal Seagate, 5 il rəsmi zəmanət və çatdırılma.',
    pageIntro:
      'Seagate Exos M ST32000NM004K (ST32000NM004K) 32 TB 3.5" HAMR enterprise HDD-dir. Mozaic 3+ helium, host CMR, SATA 6 Gb/s, 7200 rpm, 512 MB keş və 512e ISE maksimum tutumlu rack yaddaşı üçündür. 550 TB/il, FastFormat 512e→4Kn və hot-plug. Orijinal Seagate Exos M 32 TB modelidir; 5 il rəsmi zəmanət və çatdırılma ilə.',
  },
};

function specValue(
  specs: readonly QnaphddsSeoSpec[],
  matcher: (label: string) => boolean,
): string | null {
  const found = specs.find((entry) =>
    matcher(entry.label.toLocaleLowerCase('az')),
  );
  if (found === undefined || found.value.trim() === '') {
    return null;
  }
  return found.value.trim();
}

function kindLabel(subcategorySlug: string): string {
  if (subcategorySlug === 'hdd-nas') {
    return 'NAS HDD';
  }
  if (subcategorySlug === 'hdd-nezaret') {
    return 'nəzarət HDD';
  }
  return 'server HDD';
}

function fallbackSeoCopy(input: QnaphddsSeoInput): QnaphddsSeoCopy {
  const sku = normalizeQnaphddsSku(input.sku);
  const brand = resolveQnaphddsBrand(sku).name;
  const kind = kindLabel(input.subcategorySlug);
  const capacity = specValue(input.specs, (label) => label === 'tutum');

  const seoTitle = clampSeoText(
    input.title.trim() || `${brand} ${sku} ${kind}`,
    SEO_TITLE_SOFT_MAX,
  );

  const parts = [
    `${input.title.trim()} (${sku}) — orijinal ${brand} ${kind}.`,
    capacity ? `Tutum: ${capacity}.` : null,
    'Rəsmi zəmanət və çatdırılma.',
  ].filter((part): part is string => part !== null);

  return {
    seoTitle,
    seoDescription: clampSeoText(parts.join(' '), SEO_DESCRIPTION_SOFT_MAX),
    pageIntro: clampSeoText(parts.join(' '), 700),
  };
}

export function resolveQnaphddsProductSeo(
  input: QnaphddsSeoInput,
): QnaphddsSeoCopy {
  const sku = normalizeQnaphddsSku(input.sku);
  const crafted = HANDCRAFTED_QNAPHDD_SEO[sku];
  if (crafted === undefined) {
    return fallbackSeoCopy(input);
  }
  return {
    seoTitle: crafted.seoTitle,
    seoDescription: crafted.seoDescription,
    pageIntro: crafted.pageIntro,
  };
}

export function buildQnaphddsProductDescription(
  pageIntro: string,
  specs: readonly QnaphddsSeoSpec[],
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

export function listHandcraftedQnaphddsSkus(): string[] {
  return Object.keys(HANDCRAFTED_QNAPHDD_SEO);
}
