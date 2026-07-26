import Link from "next/link";

import { BrandLogo } from "./brand-logo";
import {
  defaultStorefrontChromeCopy,
  formatChromeMessage,
  type StorefrontChromeCopy,
} from "./chrome-copy";

type SiteFooterProps = {
  chromeCopy?: StorefrontChromeCopy;
};

export function SiteFooter({
  chromeCopy = defaultStorefrontChromeCopy,
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="ui-site-footer">
      <div className="ui-container ui-site-footer__grid">
        <div className="ui-site-footer__brand">
          <Link className="ui-brand" href="/" aria-label={chromeCopy.homeAria}>
            <BrandLogo />
          </Link>
          <p>{chromeCopy.footerBrandBlurb}</p>
        </div>
        <div className="ui-site-footer__column">
          <h3>{chromeCopy.footerShop}</h3>
          <ul>
            <li>
              <Link href="/">{chromeCopy.footerCatalog}</Link>
            </li>
            <li>
              <Link href="/cart">{chromeCopy.footerCart}</Link>
            </li>
            <li>
              <Link href="/terms">{chromeCopy.footerTerms}</Link>
            </li>
            <li>
              <Link href="/privacy">{chromeCopy.footerPrivacy}</Link>
            </li>
          </ul>
        </div>
        <div className="ui-site-footer__column">
          <h3>{chromeCopy.footerDelivery}</h3>
          <ul>
            <li>{chromeCopy.footerDeliveryBaku}</li>
            <li>{chromeCopy.footerDeliveryRegions}</li>
            <li>{chromeCopy.footerDeliveryPickup}</li>
          </ul>
        </div>
        <div className="ui-site-footer__column">
          <h3>{chromeCopy.footerContact}</h3>
          <ul>
            <li>
              <a href="tel:+994512509585">+994 51 250 95 85</a>
              {" · "}
              <a href="tel:+994512509586">+994 51 250 95 86</a>
            </li>
            <li>
              <a href="mailto:info@it-market.org">info@it-market.org</a>
            </li>
            <li>{chromeCopy.footerAddress}</li>
          </ul>
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
