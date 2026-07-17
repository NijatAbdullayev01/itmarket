import { useId, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const ICON_CLICK_MASK_SRC =
  "data:image/png;base64,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";

export function IconSearch(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function IconCart(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 6h15l-1.4 9.8a2 2 0 0 1-2 1.7H8.2a2 2 0 0 1-2-1.7L5 6z" />
      <path d="M9 6V4.5a3 3 0 0 1 6 0V6" />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20v-1.5a7 7 0 0 1 14 0V20" />
    </svg>
  );
}

export function IconCompare(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3v15" />
      <path d="M5 7h14" />
      <path d="M5 7 3 12" />
      <path d="M8 7 6 12" />
      <path d="M3 12h6" />
      <path d="M19 7 21 12" />
      <path d="M16 7 18 12" />
      <path d="M15 12h6" />
      <path d="M9 21h6" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5V7" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconDocument(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-1.9 5.4 8.5 8.5 0 0 1-6.6 3.3 8.4 8.4 0 0 1-3.9-.9L3 21l1.7-5.6A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 11.5 3 8.5 8.5 0 0 1 21 11.5z" />
    </svg>
  );
}

export function IconDoorPayment(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 10V20h16V10" />
      <path d="M8 20v-6h8v6" />
      <path d="M12 4v6" />
      <path d="M9 7h6" />
    </svg>
  );
}

export function IconWarranty(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3l8 4v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

const ICON_DELIVERY_MASK_SRC =
  "data:image/png;base64,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";

export function IconDelivery(props: IconProps) {
  const maskId = `icon-delivery-${useId().replace(/:/g, "")}`;

  return (
    <svg viewBox="0 0 128 128" aria-hidden="true" {...props}>
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          maskType="alpha"
          x="0"
          y="0"
          width="128"
          height="128"
        >
          <image href={ICON_DELIVERY_MASK_SRC} width="128" height="128" />
        </mask>
      </defs>
      <rect width="128" height="128" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function IconBestPrice(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 17.8 5.7 21l2.3-7.2-6-4.6h7.6L12 2z" />
    </svg>
  );
}

const ICON_STORE_MASK_SRC =
  "data:image/png;base64,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";

export function IconStore(props: IconProps) {
  const maskId = `icon-store-${useId().replace(/:/g, "")}`;

  return (
    <svg viewBox="0 0 128 128" aria-hidden="true" {...props}>
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          maskType="alpha"
          x="0"
          y="0"
          width="128"
          height="128"
        >
          <image href={ICON_STORE_MASK_SRC} width="128" height="128" />
        </mask>
      </defs>
      <rect width="128" height="128" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M10.7 10.7a3 3 0 0 0 4.2 4.2" />
      <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.6 4.8" />
      <path d="M6.1 6.1A17.5 17.5 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.1-.2" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

export function IconReturn(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.2 2.4L3 13" />
    </svg>
  );
}

export function IconDiscount(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClick(props: IconProps) {
  const maskId = `icon-click-${useId().replace(/:/g, "")}`;

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="48"
          height="48"
        >
          <image href={ICON_CLICK_MASK_SRC} width="48" height="48" />
        </mask>
      </defs>
      <rect width="48" height="48" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
