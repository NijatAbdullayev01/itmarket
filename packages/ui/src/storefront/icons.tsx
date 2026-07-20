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

export function IconProduct(props: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3.5 6.5 10 3l6.5 3.5L10 10 3.5 6.5Z" />
      <path d="M3.5 6.5V14l6.5 3.5L16.5 14V6.5" />
      <path d="M10 10v7.5" />
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

export function IconAlertCircle(props: IconProps) {
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
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
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

export function IconLogout(props: IconProps) {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
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

const ICON_INSTALLMENT_PAYMENT_MASK_SRC =
  "data:image/png;base64,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";

export function IconInstallmentPayment(props: IconProps) {
  const maskId = `icon-installment-payment-${useId().replace(/:/g, "")}`;

  return (
    <svg viewBox="0 0 512 563" aria-hidden="true" {...props}>
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
          maskType="alpha"
          x="0"
          y="0"
          width="512"
          height="563"
        >
          <image href={ICON_INSTALLMENT_PAYMENT_MASK_SRC} width="512" height="563" />
        </mask>
      </defs>
      <rect width="512" height="563" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

export function IconCreditCard(props: IconProps) {
  return (
    <svg
      viewBox="0 0 32 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="1.25" y="1.25" width="29.5" height="17.5" rx="2.5" />
      <path d="M1.25 6.75h29.5" />
      <rect x="4.5" y="9" width="5.25" height="4" rx="0.75" />
      <path d="M4.5 15.75h4.25M10.25 15.75h4.25M16 15.75h4.25" />
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
