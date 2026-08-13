"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type ReactNode,
  type SVGProps,
  type SyntheticEvent,
} from "react";

import {
  defaultStorefrontChromeCopy,
  formatChromeMessage,
  type StorefrontChromeCopy,
} from "./chrome-copy";
import { IconChevronDown } from "./icons";

const ADDRESS_MAP_HREF =
  "https://maps.google.com/?q=28+may+k%C3%BC%C3%A7%C9%99si+69C,+Bak%C4%B1,+Az%C9%99rbaycan";

const SOCIAL_HREFS = {
  facebook: "https://www.facebook.com/itmarketltdbaku/",
  instagram: "https://www.instagram.com/itmarket.ltd/",
  whatsapp: "https://wa.me/994512509586",
  tiktok: "https://www.tiktok.com/@itmarket.ltd",
} as const;

type IconProps = SVGProps<SVGSVGElement>;

/** Intrinsic size before CSS — avoids 300×150 FOUC on refresh. */
function footerIconProps(props: IconProps, defaultSize = 24): IconProps {
  return { width: defaultSize, height: defaultSize, ...props };
}

function SocialIconFacebook(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...footerIconProps(props)}>
      <path
        fill="currentColor"
        d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0"
      />
    </svg>
  );
}

function SocialIconInstagram(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...footerIconProps(props)}>
      <path
        fill="currentColor"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"
      />
    </svg>
  );
}

function SocialIconWhatsapp(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...footerIconProps(props)}>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982 1.001-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"
      />
    </svg>
  );
}

function SocialIconTiktok(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...footerIconProps(props)}>
      <path
        fill="currentColor"
        d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12.98 2.6 1.54 4.08 1.58v3.06c-1.44.05-2.88-.31-4.14-1.08-.23-.14-.45-.3-.66-.47v6.98c-.02 2.55-1.07 4.91-2.91 6.5-2.18 1.94-5.18 2.76-8.06 2.16-2.46-.53-4.59-2.26-5.74-4.52-1.23-2.37-1.16-5.23.17-7.53 1.28-2.28 3.65-3.8 6.24-3.96.02 1.09-.01 2.18 0 3.27-.85.08-1.7.28-2.47.69-.94.5-1.68 1.33-2.06 2.32-.55 1.39-.3 3.04.61 4.16.85 1.08 2.21 1.69 3.58 1.59 1.66-.15 3.12-1.23 3.67-2.79.19-.56.29-1.15.29-1.74V.02z"
      />
    </svg>
  );
}

function PaymentLogoMastercard(props: IconProps) {
  return (
    <svg viewBox="0 0 48 32" width={48} height={32} aria-hidden="true" {...props}>
      <circle cx="18.5" cy="16" r="9" fill="#EB001B" />
      <circle cx="29.5" cy="16" r="9" fill="#F79E1B" />
      <path
        fill="#FF5F00"
        d="M24 9.3a9 9 0 0 1 0 13.4 9 9 0 0 1 0-13.4Z"
      />
    </svg>
  );
}

type FooterNavItem = {
  label: string;
  href?: string;
};

type SiteFooterProps = {
  chromeCopy?: StorefrontChromeCopy;
};

function useFooterAccordionOpen() {
  /* Default closed for mobile (and SSR). Desktop (≥769px) keeps sections
     expanded via CSS (::details-content) and opens them after mount. */
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setOpen(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (!window.matchMedia("(max-width: 768px)").matches) {
      setOpen(true);
      return;
    }
    setOpen(event.currentTarget.open);
  };

  return { open, onToggle };
}

function FooterAccordion({
  heading,
  className,
  children,
}: {
  heading: string;
  className?: string;
  children: ReactNode;
}) {
  const { open, onToggle } = useFooterAccordionOpen();
  const classes = ["ui-site-footer__nav", className].filter(Boolean).join(" ");

  return (
    <details className={classes} open={open} onToggle={onToggle}>
      <summary className="ui-site-footer__nav-summary">
        <span className="ui-site-footer__nav-title">{heading}</span>
        <span className="ui-site-footer__nav-chevron" aria-hidden="true">
          <IconChevronDown width={14} height={14} />
        </span>
      </summary>
      <div className="ui-site-footer__nav-body">{children}</div>
    </details>
  );
}

function FooterNavList({
  heading,
  items,
}: {
  heading: string;
  items: FooterNavItem[];
}) {
  return (
    <FooterAccordion heading={heading}>
      <nav aria-label={heading}>
        <ul className="ui-site-footer__nav-list">
          {items.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                item.label
              )}
            </li>
          ))}
        </ul>
      </nav>
    </FooterAccordion>
  );
}

export function SiteFooter({
  chromeCopy = defaultStorefrontChromeCopy,
}: SiteFooterProps) {
  const year = new Date().getFullYear();
  const hotlines = [
    {
      display: chromeCopy.footerHotline,
      href: chromeCopy.footerHotlineHref,
    },
    {
      display: chromeCopy.footerHotlineSecondary,
      href: chromeCopy.footerHotlineSecondaryHref,
    },
    {
      display: chromeCopy.footerEmail,
      href: chromeCopy.footerEmailHref,
    },
  ];

  const companyItems: FooterNavItem[] = [
    { label: chromeCopy.footerAbout, href: "/about" },
    { label: chromeCopy.footerBlog, href: "/blog" },
    { label: chromeCopy.footerCorporate, href: "/corporate" },
  ];

  const supportItems: FooterNavItem[] = [
    { label: chromeCopy.footerDeliveryPayment, href: "/delivery-payment" },
    { label: chromeCopy.footerReturns, href: "/returns" },
    { label: chromeCopy.footerInstallment, href: "/installment" },
    { label: chromeCopy.footerFaq, href: "/faq" },
  ];

  const legalItems: FooterNavItem[] = [
    { label: chromeCopy.footerTerms, href: "/terms" },
    { label: chromeCopy.footerPrivacy, href: "/privacy" },
    { label: chromeCopy.footerWarranty, href: "/warranty" },
  ];

  const socialLinks = [
    {
      href: SOCIAL_HREFS.facebook,
      label: chromeCopy.footerSocialFacebook,
      Icon: SocialIconFacebook,
    },
    {
      href: SOCIAL_HREFS.instagram,
      label: chromeCopy.footerSocialInstagram,
      Icon: SocialIconInstagram,
    },
    {
      href: SOCIAL_HREFS.whatsapp,
      label: chromeCopy.footerSocialWhatsapp,
      Icon: SocialIconWhatsapp,
    },
    {
      href: SOCIAL_HREFS.tiktok,
      label: chromeCopy.footerSocialTiktok,
      Icon: SocialIconTiktok,
    },
  ] as const;

  return (
    <footer className="ui-site-footer">
      <div className="ui-container ui-site-footer__grid">
        <FooterNavList heading={chromeCopy.footerCompany} items={companyItems} />
        <FooterNavList heading={chromeCopy.footerSupport} items={supportItems} />
        <FooterNavList heading={chromeCopy.footerLegalNav} items={legalItems} />

        <FooterAccordion
          heading={chromeCopy.footerContact}
          className="ui-site-footer__nav--contact"
        >
          <div className="ui-site-footer__hotline-row">
            <div className="ui-site-footer__hotlines">
              {hotlines.map(({ display, href }) => {
                const accentMatch = display.match(/^([*+])(.*)$/);
                const accent = accentMatch?.[1] ?? null;
                const rest = accentMatch?.[2] ?? display;
                return (
                  <a key={href} className="ui-site-footer__hotline" href={href}>
                    {accent ? (
                      <span
                        className="ui-site-footer__hotline-accent"
                        aria-hidden="true"
                      >
                        {accent}
                      </span>
                    ) : null}
                    {rest}
                  </a>
                );
              })}
              <a
                className="ui-site-footer__hotline"
                href={ADDRESS_MAP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={chromeCopy.footerAddressMapAria}
              >
                {chromeCopy.footerMapHint}
              </a>
            </div>
          </div>
        </FooterAccordion>

        <div className="ui-site-footer__column ui-site-footer__column--aside">
          <div className="ui-site-footer__social-block">
            <h4>{chromeCopy.footerSocialHeading}</h4>
            <ul className="ui-site-footer__social-list">
              {socialLinks.map(({ href, label, Icon }) => {
                const isExternal = href.startsWith("http");
                return (
                  <li key={label}>
                    <a
                      className="ui-site-footer__social-link"
                      href={href}
                      {...(isExternal
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      aria-label={label}
                    >
                      <Icon />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="ui-site-footer__payments-block">
            <h4>{chromeCopy.footerSafeShopping}</h4>
            <ul className="ui-site-footer__payments">
              <li>
                <span
                  className="ui-site-footer__payment-badge ui-site-footer__payment-badge--visa"
                  role="img"
                  aria-label={chromeCopy.footerPaymentVisa}
                >
                  <img
                    className="ui-site-footer__payment-visa"
                    src="/images/visa-logo.png"
                    alt=""
                    width={200}
                    height={65}
                    decoding="async"
                  />
                </span>
              </li>
              <li>
                <span
                  className="ui-site-footer__payment-badge ui-site-footer__payment-badge--mastercard"
                  role="img"
                  aria-label={chromeCopy.footerPaymentMastercard}
                >
                  <PaymentLogoMastercard />
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="ui-container ui-site-footer__bottom">
        <span>
          {formatChromeMessage(chromeCopy.footerCopyright, { year })}
        </span>
      </div>
    </footer>
  );
}
