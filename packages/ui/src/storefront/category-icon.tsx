import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export type CategoryIconKind =
  | "laptop"
  | "phone"
  | "gamer"
  | "apple"
  | "monitor"
  | "tv"
  | "appliance"
  | "accessory"
  | "printer"
  | "camera"
  | "coffee"
  | "tablet"
  | "audio"
  | "network"
  | "security"
  | "default";

const CATEGORY_ICON_RULES: { kind: CategoryIconKind; patterns: string[] }[] = [
  { kind: "gamer", patterns: ["gamer", "oyun", "game", "konsol", "playstation", "xbox"] },
  { kind: "apple", patterns: ["apple", "iphone", "ipad", "macbook", "airpods"] },
  { kind: "phone", patterns: ["smartfon", "telefon", "phone", "mobil", "sims kart"] },
  { kind: "laptop", patterns: ["noutbuk", "laptop", "notebook", "komputer", "pc"] },
  { kind: "monitor", patterns: ["monitor", "ekran", "display"] },
  { kind: "tv", patterns: ["tv", "televizor", "televiziya", "projektor"] },
  { kind: "appliance", patterns: ["soyuducu", "paltaryuyan", "meiset", "məişət", "kondisioner", "aspirator", "bişirici", "qabyuyan", "yay"] },
  { kind: "coffee", patterns: ["coffee", "qəhvə", "qehve", "kofe"] },
  { kind: "printer", patterns: ["printer", "printer", "skaner", "çoxfunksiyalı"] },
  { kind: "camera", patterns: ["kamera", "foto", "video", "linza"] },
  { kind: "accessory", patterns: ["aksesuar", "qulaqliq", "klaviatura", "siçan", "mouse", "kabel", "adapter"] },
  { kind: "tablet", patterns: ["planşet", "planset", "tablet"] },
  { kind: "audio", patterns: ["audio", "səs", "akustik", "dinamik", "mikrofon"] },
  { kind: "network", patterns: ["şəbəkə", "sebeke", "router", "modem", "wifi"] },
  { kind: "security", patterns: ["təhlükəsizlik", "tehlukesizlik", "security", "siqnalizasiya", "domofon"] },
];

export function resolveCategoryIconKind(name: string, slug: string): CategoryIconKind {
  const haystack = `${name} ${slug}`.toLowerCase();
  for (const rule of CATEGORY_ICON_RULES) {
    if (rule.patterns.some((pattern) => haystack.includes(pattern))) {
      return rule.kind;
    }
  }
  return "default";
}

function LaptopIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M2 19h20" />
    </svg>
  );
}

function PhoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function GamerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8 11h3" />
      <path d="M9.5 9.5v3" />
      <circle cx="15" cy="11" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="9.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </svg>
  );
}

function AppleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function MonitorIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 17v3" />
    </svg>
  );
}

function TvIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M8 19h8" />
    </svg>
  );
}

function ApplianceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M9 6h6" />
      <path d="M9 10h6" />
      <path d="M9 18h6" />
    </svg>
  );
}

function AccessoryIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 14h3a2 2 0 0 0 2-2V9a7 7 0 0 1 14 0v3a2 2 0 0 0 2 2h3" />
      <path d="M6 14v2a3 3 0 0 0 3 3" />
      <path d="M18 14v2a3 3 0 0 1-3 3" />
    </svg>
  );
}

function PrinterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="8" rx="2" />
      <path d="M6 17h12v4H6z" />
    </svg>
  );
}

function CameraIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 8h4l2-2h4l2 2h4v11H4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function CoffeeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
      <path d="M16 10h2a2 2 0 0 1 0 4h-2" />
      <path d="M6 4v2" />
      <path d="M10 4v2" />
      <path d="M14 4v2" />
    </svg>
  );
}

function TabletIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function AudioIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 10v4" />
      <path d="M8 8v8" />
      <path d="M12 6v12" />
      <path d="M16 8v8" />
      <path d="M20 10v4" />
    </svg>
  );
}

function NetworkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.9 4.9l2.8 2.8" />
      <path d="M16.3 16.3l2.8 2.8" />
      <path d="M4.9 19.1l2.8-2.8" />
      <path d="M16.3 7.7l2.8-2.8" />
    </svg>
  );
}

function SecurityIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function DefaultIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

const ICON_COMPONENTS: Record<CategoryIconKind, (props: IconProps) => ReactElement> = {
  laptop: LaptopIcon,
  phone: PhoneIcon,
  gamer: GamerIcon,
  apple: AppleIcon,
  monitor: MonitorIcon,
  tv: TvIcon,
  appliance: ApplianceIcon,
  accessory: AccessoryIcon,
  printer: PrinterIcon,
  camera: CameraIcon,
  coffee: CoffeeIcon,
  tablet: TabletIcon,
  audio: AudioIcon,
  network: NetworkIcon,
  security: SecurityIcon,
  default: DefaultIcon,
};

type CategoryIconProps = {
  name: string;
  slug: string;
  className?: string;
};

export function CategoryIcon({ name, slug, className }: CategoryIconProps) {
  const kind = resolveCategoryIconKind(name, slug);
  const Icon = ICON_COMPONENTS[kind];
  const classes = ["ui-category-icon", className].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <Icon width={20} height={20} />
    </span>
  );
}
