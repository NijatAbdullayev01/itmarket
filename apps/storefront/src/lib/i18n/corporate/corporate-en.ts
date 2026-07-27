import type { CorporatePageContent } from "./corporate-types";

export const corporateEn: CorporatePageContent = {
  title: "Corporate sales",
  meta: "IT Market · For businesses and organizations",
  description:
    "IT Market corporate sales — bulk technology supply, invoicing, and tailored terms for companies and organizations.",
  lead:
    "When your office, team, or project needs technology, IT Market corporate sales keeps it simple: the right product mix, transparent pricing, formal paperwork, and agreed delivery — through one point of contact.",
  benefitsTitle: "Benefits for corporate customers",
  benefits: [
    {
      icon: "price",
      title: "Volume and agreed pricing",
      text: "We prepare a commercial offer that fits volume and need — clear amounts in AZN, no surprises.",
    },
    {
      icon: "invoice",
      title: "Formal invoicing",
      text: "We organize the documentation and payment flow legal entities typically need.",
    },
    {
      icon: "delivery",
      title: "Delivery and handover",
      text: "Address delivery or store pickup — including larger orders on an agreed schedule.",
    },
    {
      icon: "support",
      title: "Dedicated support",
      text: "Direct contact for corporate requests: product choice, stock, and warranty questions.",
    },
  ],
  audience: {
    title: "Who it is for",
    blocks: [
      {
        type: "ul",
        items: [
          {
            label: "Companies and startups.",
            text: "Laptops, phones, monitors, and peripherals for teams.",
          },
          {
            label: "Offices and branches.",
            text: "Equipping workplaces to one standard, plus spare accessories.",
          },
          {
            label: "Education and organizations.",
            text: "Device sets for projects and classrooms, matched to the need.",
          },
          {
            label: "Ongoing supply needs.",
            text: "Stable partnership for repeat orders and refresh cycles.",
          },
        ],
      },
    ],
  },
  processTitle: "How it works",
  steps: [
    {
      title: "1. Send a request",
      text: "Share the products, quantities, and handover timeline — or call us.",
    },
    {
      title: "2. Get an offer",
      text: "We check stock and alternatives, then send a commercial offer and terms.",
    },
    {
      title: "3. Confirm and document",
      text: "After agreement we issue the invoice and formalize payment.",
    },
    {
      title: "4. Handover",
      text: "We deliver to your address or hand over at our store — with a check on receipt.",
    },
  ],
  ctaTitle: "Request a corporate offer",
  ctaText:
    "Send us your needs list. We reply within 1–2 business days (depending on stock and volume).",
  ctaButton: "Send email",
  ctaMailtoSubject: "Corporate sales inquiry",
  contact: {
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    address: "28 May Street 69C, Baku, Azerbaijan",
  },
};
