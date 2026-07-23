import type { ImgHTMLAttributes, SVGProps } from "react";

export type BoIconProps = SVGProps<SVGSVGElement>;

const iconAttrs = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  "aria-hidden": true,
} as const;

function iconClassName(className?: string) {
  return className ? `bo-icon ${className}` : "bo-icon";
}

export function IconCategories({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
    </svg>
  );
}

export function IconMedia({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <circle cx="7" cy="9" r="1.5" />
      <path d="M17.5 13.5 13 9.5 9.5 12.5 7 10.5 2.5 14.5" />
    </svg>
  );
}

export function IconInventory({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M10 2.5 3.5 6v8L10 17.5 16.5 14V6L10 2.5Z" />
      <path d="M10 10 16.5 6" />
      <path d="M10 10v7.5" />
      <path d="M10 10 3.5 6" />
    </svg>
  );
}

/** Anbar / stok məntəqəsi — sidebar «Anbar» qrupu */
export function IconWarehouse({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M2.5 8 10 3.5 17.5 8" />
      <path d="M4 8v8.5h12V8" />
      <path d="M7.5 16.5V11h5v5.5" />
      <path d="M7.5 11h5M7.5 13h5M7.5 15h5" />
    </svg>
  );
}

export function IconTransfer({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M3.5 6.5h11l-2.5-2.5M16.5 13.5h-11l2.5 2.5" />
    </svg>
  );
}

export function IconOrders({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M5.5 3.5h9l1.5 3.5v9.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V7l1.5-3.5Z" />
      <path d="M7.5 10.5h5M7.5 13.5h3.5" />
    </svg>
  );
}

export function IconDelivery({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M2.5 12.5V6.5h8v6" />
      <path d="M10.5 8.5h3l2 2.5v1.5h-5" />
      <circle cx="5.5" cy="14" r="1.5" />
      <circle cx="14" cy="14" r="1.5" />
    </svg>
  );
}

export function IconPos({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M2.5 8.5h15" />
      <path d="M6 12.5h3" />
    </svg>
  );
}

const POS_CASH_SALE_ICON_SRC = "/images/pos-cash-sale-icon.png";

type BoImageIconProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt"
>;

/** Qaytarma — POS refund düyməsi */
export function IconReturn({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M4 6.5v3h3" />
      <path d="M4 9.5a6 6 0 0 1 10.2-4.2L16 7" />
      <path d="M16 13.5v-3h-3" />
      <path d="M16 10.5a6 6 0 0 1-10.2 4.2L4 13" />
    </svg>
  );
}

/** Bank kartı — POS kartla ödəniş düyməsi */
export function IconCard({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <rect x="2" y="5" width="16" height="10" rx="2" />
      <path d="M2 9h16" />
      <path d="M5 13.5h5" />
    </svg>
  );
}

/** Nağd pul / banknot — POS nağd satış düyməsi */
export function IconCash({ className, style, ...props }: BoImageIconProps) {
  return (
    <img
      src={POS_CASH_SALE_ICON_SRC}
      alt=""
      className={iconClassName(className)}
      style={{
        display: "block",
        maxWidth: "100%",
        height: "auto",
        objectFit: "contain",
        filter: "brightness(0) invert(1)",
        ...style,
      }}
      {...props}
    />
  );
}

export function IconReports({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M4 16.5V9.5M8 16.5V5.5M12 16.5v-4M16 16.5V3.5" />
      <path d="M3 16.5h14" />
    </svg>
  );
}

export function IconAdministration({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <circle cx="10" cy="6.5" r="2.5" />
      <path d="M4.5 16.5v-1a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1" />
      <path d="M14.5 8.5 16 7l1.5 1.5" />
    </svg>
  );
}

/** Qeydiyyatlı müştərilər — sidebar «Müştərilər» qrupu */
export function IconCustomers({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <circle cx="7" cy="6.5" r="2.2" />
      <path d="M2.5 16v-0.8a3.5 3.5 0 0 1 3.5-3.5h2a3.5 3.5 0 0 1 3.5 3.5V16" />
      <circle cx="14" cy="7.5" r="1.8" />
      <path d="M12.2 16v-0.6a2.8 2.8 0 0 1 2-2.7 2.8 2.8 0 0 1 3.3 2.7V16" />
    </svg>
  );
}

export function IconBrand({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M4 5.5h4.5l8.5 8.5-4.5 4.5-8.5-8.5V5.5Z" />
      <circle cx="6.25" cy="7.75" r="1" />
    </svg>
  );
}

export function IconProduct({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M3.5 6.5 10 3l6.5 3.5L10 10 3.5 6.5Z" />
      <path d="M3.5 6.5V14l6.5 3.5L16.5 14V6.5" />
      <path d="M10 10v7.5" />
    </svg>
  );
}

export function IconSku({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M4 5.5h12v9H4z" />
      <path d="M6.5 9h7M6.5 11.5h4.5" />
    </svg>
  );
}

export function IconSearch({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <circle cx="9" cy="9" r="4.5" />
      <path d="m13.5 13.5 3 3" />
    </svg>
  );
}

/** Kameranın barkod skanı — POS məhsul axtarışı */
export function IconBarcodeScan({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M3.5 6.5V4.5h2" />
      <path d="M16.5 6.5V4.5h-2" />
      <path d="M3.5 13.5v2h2" />
      <path d="M16.5 13.5v2h-2" />
      <path d="M6 7.5v5M8 7.5v5M10 7.5v5M12.5 7.5v5M14.5 7.5v5" />
    </svg>
  );
}

export function IconFilter({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M3.5 5.5h13" />
      <circle cx="6.5" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M3.5 10h13" />
      <circle cx="13.5" cy="10" r="1.4" fill="currentColor" stroke="none" />
      <path d="M3.5 14.5h13" />
      <circle cx="9" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconGrip({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M7 4.5v11M13 4.5v11" />
    </svg>
  );
}

export function IconMenu({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
    </svg>
  );
}

export function IconChevronDown({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="m5 8 5 5 5-5" />
    </svg>
  );
}

export function IconChevronLeft({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="m8 5-5 5 5 5" />
    </svg>
  );
}

export function IconClose({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

export function IconPlus({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}

export function IconMinus({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M4.5 10h11" />
    </svg>
  );
}

/** Uğur / təsdiq — POS qaytarma tamamlandı */
export function IconCheck({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path
        d="M5 10.5 8.5 14 15 6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Sənəd / PDF etiketi — sifariş sətiri çatdırılma etiketi düyməsi */
export function IconDocument({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M6 3.5h5.5L15.5 7.5V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M11.5 3.5V7.5h4" />
      <path d="M7.5 11h5M7.5 13.5h3.5" />
    </svg>
  );
}

/** Açıq qutu — sifariş sətiri qutuya əlavə et düyməsi */
export function IconOpenBox({ className, ...props }: BoIconProps) {
  return (
    <svg className={iconClassName(className)} {...iconAttrs} {...props}>
      <path d="M3 8.5 6.5 3.5 10 6.5" />
      <path d="M17 8.5 13.5 3.5 10 6.5" />
      <path d="M3.5 8.5 10 12l6.5-3.5" />
      <path d="M3.5 8.5v6.5L10 18.5" />
      <path d="M16.5 8.5v6.5L10 18.5" />
      <path d="M10 12v6.5" />
    </svg>
  );
}
