import type { Metadata } from "next";
import { IconInfo } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import {
  FAQ_CONTACT_EMAIL,
  FAQ_CONTACT_PHONES,
  getFaqJsonLdItems,
  getFaqPageContent,
  type FaqBlock,
} from "@/lib/i18n/faq/faq";
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildLegalPageMetadata,
  toJsonLd,
} from "@/lib/seo";

function FaqBlockView({ block }: { block: FaqBlock }) {
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
  const content = getFaqPageContent(DEFAULT_LOCALE);
  return buildLegalPageMetadata({
    title: content.title,
    description: content.description,
    path: "/faq",
  });
}

export default async function FaqPage() {
  const locale = await getRequestLocale();
  const content = getFaqPageContent(locale);
  const contactSection = content.sections[content.sections.length - 1];
  const bodySections = content.sections.slice(0, -1);
  const azFaqItems = getFaqJsonLdItems(getFaqPageContent(DEFAULT_LOCALE));

  return (
    <div className="ui-container ui-legal-page ui-faq-page">
      <div className="ui-legal-page__card">
        <header className="ui-legal-page__header">
          <div className="ui-legal-page__header-icon" aria-hidden="true">
            <IconInfo width={28} height={28} />
          </div>
          <div className="ui-legal-page__header-body">
            <h1 className="ui-page-title">{content.title}</h1>
            <p className="ui-legal-page__meta">{content.meta}</p>
          </div>
        </header>

        <article className="ui-legal-content">
          <p className="ui-about-page__lead">{content.lead}</p>

          {bodySections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.blocks.map((block, index) => (
                <FaqBlockView
                  key={`${section.title}-${index}`}
                  block={block}
                />
              ))}
            </section>
          ))}

          <section>
            <h2>{contactSection.title}</h2>
            {contactSection.blocks.map((block, index) => (
              <FaqBlockView key={`contact-intro-${index}`} block={block} />
            ))}
            <ul>
              <li>
                {content.contact.emailLabel}:{" "}
                <a href={`mailto:${FAQ_CONTACT_EMAIL}`}>{FAQ_CONTACT_EMAIL}</a>
              </li>
              <li>
                {content.contact.phoneLabel}:{" "}
                {FAQ_CONTACT_PHONES.map((phone, index) => (
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
      {azFaqItems.length > 0 ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: toJsonLd(buildFaqPageJsonLd(azFaqItems)),
          }}
        />
      ) : null}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            buildBreadcrumbListJsonLd([
              { name: getFaqPageContent(DEFAULT_LOCALE).title, path: "/faq" },
            ]),
          ),
        }}
      />
    </div>
  );
}
