import type { Metadata } from "next";
import type { ComponentType, SVGProps } from "react";
import {
  IconBestPrice,
  IconDelivery,
  IconDocument,
  IconStore,
} from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import {
  buildCorporateInquiryHref,
  CORPORATE_CONTACT_EMAIL,
  CORPORATE_CONTACT_PHONES,
  getCorporatePageContent,
  type CorporateBenefit,
  type CorporateBlock,
} from "@/lib/i18n/corporate/corporate";
import { buildLegalPageMetadata } from "@/lib/seo";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const BENEFIT_ICONS: Record<CorporateBenefit["icon"], IconComponent> = {
  price: IconBestPrice,
  invoice: IconDocument,
  delivery: IconDelivery,
  support: IconStore,
};

function CorporateBlockView({ block }: { block: CorporateBlock }) {
  if (block.type === "p") {
    return <p>{block.text}</p>;
  }

  return (
    <ul>
      {block.items.map((item) => (
        <li key={`${item.label ?? ""}${item.text}`}>
          {item.label ? <strong>{item.label}</strong> : null} {item.text}
        </li>
      ))}
    </ul>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const content = getCorporatePageContent(DEFAULT_LOCALE);
  return buildLegalPageMetadata({
    title: content.title,
    description: content.description,
    path: "/corporate",
  });
}

export default async function CorporatePage() {
  const locale = await getRequestLocale();
  const content = getCorporatePageContent(locale);
  const inquiryHref = buildCorporateInquiryHref(
    CORPORATE_CONTACT_EMAIL,
    content.ctaMailtoSubject,
  );

  return (
    <div className="ui-container ui-legal-page ui-corporate-page">
      <div className="ui-legal-page__card">
        <header className="ui-legal-page__header">
          <div className="ui-legal-page__header-icon" aria-hidden="true">
            <IconStore width={28} height={28} />
          </div>
          <div className="ui-legal-page__header-body">
            <h1 className="ui-page-title">{content.title}</h1>
            <p className="ui-legal-page__meta">{content.meta}</p>
          </div>
        </header>

        <article className="ui-legal-content">
          <p className="ui-about-page__lead">{content.lead}</p>

          <section>
            <h2>{content.benefitsTitle}</h2>
            <div className="ui-corporate-benefits">
              {content.benefits.map((benefit) => {
                const Icon = BENEFIT_ICONS[benefit.icon];
                return (
                  <article key={benefit.title} className="ui-corporate-benefit">
                    <div
                      className="ui-corporate-benefit__icon"
                      aria-hidden="true"
                    >
                      <Icon width={22} height={22} />
                    </div>
                    <h3 className="ui-corporate-benefit__title">
                      {benefit.title}
                    </h3>
                    <p className="ui-corporate-benefit__text">{benefit.text}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section>
            <h2>{content.audience.title}</h2>
            {content.audience.blocks.map((block, index) => (
              <CorporateBlockView key={`audience-${index}`} block={block} />
            ))}
          </section>

          <section>
            <h2>{content.processTitle}</h2>
            <ol className="ui-corporate-steps">
              {content.steps.map((step) => (
                <li key={step.title} className="ui-corporate-step">
                  <h3 className="ui-corporate-step__title">{step.title}</h3>
                  <p className="ui-corporate-step__text">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="ui-corporate-cta">
            <h2>{content.ctaTitle}</h2>
            <p>{content.ctaText}</p>
            <a className="ui-corporate-cta__button" href={inquiryHref}>
              {content.ctaButton}
            </a>
            <ul>
              <li>
                {content.contact.emailLabel}:{" "}
                <a href={`mailto:${CORPORATE_CONTACT_EMAIL}`}>
                  {CORPORATE_CONTACT_EMAIL}
                </a>
              </li>
              <li>
                {content.contact.phoneLabel}:{" "}
                {CORPORATE_CONTACT_PHONES.map((phone, index) => (
                  <span key={phone.href}>
                    {index > 0 ? " · " : null}
                    <a href={phone.href}>{phone.label}</a>
                  </span>
                ))}
              </li>
              <li>
                {content.contact.addressLabel}: {content.contact.address}
              </li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
