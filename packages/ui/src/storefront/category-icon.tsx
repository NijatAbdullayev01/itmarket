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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M2 19h20" />
    </svg>
  );
}

function PhoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function GamerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 11h4v4H6z" />
      <path d="M8 13v0" />
      <path d="M14 10h.01" />
      <path d="M16 12h.01" />
      <path d="M18 10h.01" />
      <rect x="2" y="8" width="20" height="8" rx="4" />
    </svg>
  );
}

function AppleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.7 13.2c-.1-2.1 1.7-3.1 1.8-3.2-1-.1-2-.6-2.6-1.4-.6-.8-1-1.9-.9-3 1-.1 2 .6 2.5 1.5.5-.9 1.5-1.5 2.4-1.4-.1 1-.6 1.9-1.3 2.5-.5.5-1.1.9-1.8 1.1.1.6.4 1.2.9 1.9zM12.2 21c-1.1 0-2.1-.6-2.7-.6-.7 0-1.7.6-2.8.6-1.4 0-2.7-1.3-3.8-3.2C1.2 15.2 2.2 10.8 4.8 8.4c1.3-1.2 2.9-1.9 4.5-1.9.9 0 1.8.6 2.7.6.8 0 1.6-.5 2.8-.5 1.1 0 2.3.6 3.1 1.6-2.7 1.5-2.3 5.4.5 6.5-.6 1.5-1.4 3-2.4 4.1-.9 1-1.9 2-3.2 2z" />
    </svg>
  );
}

function MonitorIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 17v3" />
    </svg>
  );
}

function TvIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M8 19h8" />
    </svg>
  );
}

function ApplianceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M9 6h6" />
      <path d="M9 10h6" />
      <path d="M9 18h6" />
    </svg>
  );
}

function AccessoryIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 14a4 4 0 0 1 4-4h1" />
      <path d="M8 10a4 4 0 0 1 4-4h1" />
      <path d="M12 6a4 4 0 0 1 4 4v1" />
      <path d="M16 11a4 4 0 0 1-4 4h-1" />
      <path d="M8 14a4 4 0 0 1-4-4v-1" />
    </svg>
  );
}

function PrinterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="8" rx="2" />
      <path d="M6 17h12v4H6z" />
    </svg>
  );
}

function CameraIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 8h4l2-2h4l2 2h4v11H4z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function CoffeeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function AudioIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
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

function DefaultIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
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
  const classes = ["ui-category-icon", `ui-category-icon--${kind}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <Icon width={18} height={18} />
    </span>
  );
}
