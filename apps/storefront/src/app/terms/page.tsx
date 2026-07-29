import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IconDocument } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import {
  getTermsPageContent,
  TERMS_CONTACT_EMAIL,
  TERMS_CONTACT_PHONES,
  type TermsBlock,
} from "@/lib/i18n/legal/terms";
import {
  buildBreadcrumbListJsonLd,
  buildLegalPageMetadata,
  toJsonLd,
} from "@/lib/seo";

function renderTextWithEmail(text: string): ReactNode {
  const marker = "{email}";
  const index = text.indexOf(marker);
  if (index === -1) {
    return text;
  }
  const before = text.slice(0, index);
  const after = text.slice(index + marker.length);
  return (
    <>
      {before}
      <a href={`mailto:${TERMS_CONTACT_EMAIL}`}>{TERMS_CONTACT_EMAIL}</a>
      {after}
    </>
  );
}

function TermsBlockView({ block }: { block: TermsBlock }) {
  if (block.type === "p") {
    return <p>{renderTextWithEmail(block.text)}</p>;
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
  const content = getTermsPageContent(DEFAULT_LOCALE);
  return buildLegalPageMetadata({
    title: content.title,
    description: content.description,
    path: "/terms",
  });
}

export default async function TermsPage() {
  const locale = await getRequestLocale();
  const content = getTermsPageContent(locale);
  const contactSection = content.sections[content.sections.length - 1];
  const bodySections = content.sections.slice(0, -1);
  const azContent = getTermsPageContent(DEFAULT_LOCALE);

  return (
    <div className="ui-container ui-legal-page">
      <div className="ui-legal-page__card">
        <header className="ui-legal-page__header">
          <div className="ui-legal-page__header-icon" aria-hidden="true">
            <IconDocument width={28} height={28} />
          </div>
          <div className="ui-legal-page__header-body">
            <h1 className="ui-page-title">{content.title}</h1>
            <p className="ui-legal-page__meta">{content.meta}</p>
          </div>
        </header>

        <article className="ui-legal-content">
          {bodySections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.blocks.map((block, index) => (
                <TermsBlockView key={`${section.title}-${index}`} block={block} />
              ))}
            </section>
          ))}

          <section>
            <h2>{contactSection.title}</h2>
            {contactSection.blocks.map((block, index) => (
              <TermsBlockView key={`contact-${index}`} block={block} />
            ))}
            <ul>
              <li>
                {content.contact.emailLabel}:{" "}
                <a href={`mailto:${TERMS_CONTACT_EMAIL}`}>{TERMS_CONTACT_EMAIL}</a>
              </li>
              <li>
                {content.contact.phoneLabel}:{" "}
                {TERMS_CONTACT_PHONES.map((phone, index) => (
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
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            buildBreadcrumbListJsonLd([
              { name: azContent.title, path: "/terms" },
            ]),
          ),
        }}
      />
    </div>
  );
}
