import type { Metadata } from "next";
import { IconDelivery } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import {
  DELIVERY_PAYMENT_CONTACT_EMAIL,
  DELIVERY_PAYMENT_CONTACT_PHONES,
  getDeliveryPaymentPageContent,
  type DeliveryPaymentBlock,
} from "@/lib/i18n/delivery-payment/delivery-payment";
import { buildLegalPageMetadata } from "@/lib/seo";

function DeliveryPaymentBlockView({ block }: { block: DeliveryPaymentBlock }) {
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
  const content = getDeliveryPaymentPageContent(DEFAULT_LOCALE);
  return buildLegalPageMetadata({
    title: content.title,
    description: content.description,
    path: "/delivery-payment",
  });
}

export default async function DeliveryPaymentPage() {
  const locale = await getRequestLocale();
  const content = getDeliveryPaymentPageContent(locale);
  const contactSection = content.sections[content.sections.length - 1];
  const bodySections = content.sections.slice(0, -1);

  return (
    <div className="ui-container ui-legal-page ui-delivery-payment-page">
      <div className="ui-legal-page__card">
        <header className="ui-legal-page__header">
          <div className="ui-legal-page__header-icon" aria-hidden="true">
            <IconDelivery width={28} height={28} />
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
                <DeliveryPaymentBlockView
                  key={`${section.title}-${index}`}
                  block={block}
                />
              ))}
            </section>
          ))}

          <section>
            <h2>{contactSection.title}</h2>
            {contactSection.blocks.map((block, index) => (
              <DeliveryPaymentBlockView
                key={`contact-intro-${index}`}
                block={block}
              />
            ))}
            <ul>
              <li>
                {content.contact.emailLabel}:{" "}
                <a href={`mailto:${DELIVERY_PAYMENT_CONTACT_EMAIL}`}>
                  {DELIVERY_PAYMENT_CONTACT_EMAIL}
                </a>
              </li>
              <li>
                {content.contact.phoneLabel}:{" "}
                {DELIVERY_PAYMENT_CONTACT_PHONES.map((phone, index) => (
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
