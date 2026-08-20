import type { FaqPageContent } from "./faq-types";

export const faqEn: FaqPageContent = {
  title: "Frequently asked questions",
  meta: "IT Market · Orders, delivery, payment, and warranty",
  description:
    "IT Market FAQ — clear answers on ordering, delivery, payment, installment plans, returns, and warranty.",
  lead:
    "The questions customers ask most — before and after a purchase — are collected here. Short answers first; linked pages cover the full rules. If you still need help, contact us directly.",
  contact: {
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    address: "28 May Street 69C, Baku, Azerbaijan",
  },
  sections: [
    {
      title: "How do I place an order?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Choose from the catalog.",
              text: "Find the product, pick color or storage if needed, and add it to the cart.",
            },
            {
              label: "Review the cart.",
              text: "Check quantities and totals, then continue to checkout.",
            },
            {
              label: "Enter your details.",
              text: "Choose delivery or store pickup, fill in contact and address correctly, and confirm payment.",
            },
          ],
        },
        {
          type: "p",
          text: "After we accept the order, confirmations and status updates go to your contact details. With an account, you can also track orders under “My account”.",
        },
      ],
    },
    {
      title: "Where and how fast do you deliver?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Baku and nearby.",
              text: "Standard delivery usually takes 2–5 business days. When available, express delivery can arrive within 2 hours.",
            },
            {
              label: "Other cities and regions.",
              text: "Nationwide delivery is available; timing and fees depend on the address and appear at checkout.",
            },
          ],
        },
        {
          type: "p",
          text: "Timelines are estimates — stock, weather, and logistics can affect them. Details: “Delivery and payment”.",
        },
      ],
    },
    {
      title: "How is delivery fee calculated?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Baku — free threshold.",
              text: "Orders over 1500 AZN get free standard delivery within Baku.",
            },
            {
              label: "Baku — below threshold.",
              text: "Orders under 1500 AZN include a zone-based fee shown at checkout.",
            },
            {
              label: "Store pickup.",
              text: "No delivery fee when you collect at the branch.",
            },
          ],
        },
        {
          type: "p",
          text: "Promotions may temporarily change fees. Always check the cart total before confirming.",
        },
      ],
    },
    {
      title: "Can I pick up in store?",
      blocks: [
        {
          type: "p",
          text: "Yes. Choose “Store pickup” at checkout. We notify you once stock is confirmed and the order is ready. Address: 28 May Street 69C, Baku. Bring ID or your order number to speed up handover.",
        },
      ],
    },
    {
      title: "What payment methods do you accept?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Cash.",
              text: "At store pickup only — when available for that order. Cash on delivery is not offered.",
            },
            {
              label: "Bank card.",
              text: "Visa and Mastercard online.",
            },
            {
              label: "Installment / pay in parts.",
              text: "Partner bank cards and installment plans — active options appear on the product page and at checkout.",
            },
          ],
        },
      ],
    },
    {
      title: "Is online payment safe?",
      blocks: [
        {
          type: "p",
          text: "Yes. We do not store your card details; payment is processed by a secure payment provider. Pay only on the official it-market.org domain or a verified payment page. If a link looks suspicious, stop and contact us first.",
        },
      ],
    },
    {
      title: "How do installment and pay-in-parts work?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Buy with installment.",
              text: "Split the amount over your chosen term with Birbank, Tam Kart, or Leobank installment cards.",
            },
            {
              label: "Pay in parts.",
              text: "Build a plan around your budget; an upfront payment is optional, not required.",
            },
          ],
        },
        {
          type: "p",
          text: "Interest, fees, and terms follow the bank and the specific product. Details: “Installment payment”.",
        },
      ],
    },
    {
      title: "Can I return or exchange a product?",
      blocks: [
        {
          type: "p",
          text: "You can return or exchange a technically sound product within 14 calendar days of receipt — with original packaging, labels, and full accessories. Hygiene items, opened software licenses, and some other categories may be excluded.",
        },
        {
          type: "p",
          text: "Full rules and steps are on the “Returns” page. Defective goods follow warranty and legal protection separately.",
        },
      ],
    },
    {
      title: "How does warranty work?",
      blocks: [
        {
          type: "p",
          text: "Products carry official distributor or manufacturer warranty. Duration and terms vary by category — see the product page and warranty documents. Mechanical damage, liquid damage, or unauthorized repair are usually not covered.",
        },
        {
          type: "p",
          text: "Full rules, exclusions, and claim steps are on the Warranty page. Keep your receipt, order number, or warranty card — then contact support to start a request.",
        },
      ],
    },
    {
      title: "How can I track my order?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Notifications.",
              text: "Status updates may arrive by SMS, email, or other channels you provided.",
            },
            {
              label: "Account.",
              text: "Registered customers can track orders under “My account”.",
            },
            {
              label: "Support.",
              text: "Share your order number and phone — we check it promptly.",
            },
          ],
        },
      ],
    },
    {
      title: "Can I buy a product that is out of stock?",
      blocks: [
        {
          type: "p",
          text: "Catalog stock updates in near real time. If an item is temporarily unavailable, ordering may not be possible. Browse alternatives in the same category or ask us about restock — we will update you when we can.",
        },
      ],
    },
    {
      title: "Still need help?",
      blocks: [
        {
          type: "p",
          text: "Our team can help with orders, delivery, payment, and warranty. Write or call using the contacts below — we reply as soon as we can.",
        },
      ],
    },
  ],
};
