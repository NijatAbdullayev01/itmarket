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

export function IconDelivery(props: IconProps) {
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
      <path d="M3 7h11v8H3z" />
      <path d="M14 10h4l3 4v1h-7v-5z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
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

export function IconStore(props: IconProps) {
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
      <path d="M3 9l1-5h16l1 5" />
      <path d="M4 9h16v11H4z" />
      <path d="M9 14h6" />
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
