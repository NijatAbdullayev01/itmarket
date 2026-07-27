import type { ReturnsPageContent } from "./returns-types";

export const returnsEn: ReturnsPageContent = {
  title: "Returns",
  meta: "IT Market · Return or exchange within 14 days",
  description:
    "When and how to return a product at IT Market — the 14-day window, conditions, exceptions, and refund rules.",
  lead:
    "Second thoughts after a purchase are normal. You can return or exchange a technically sound product within 14 days of receiving it. Below are the conditions, steps, and exceptions in plain language. Your consumer rights are also protected under Azerbaijan’s Law on the Protection of Consumer Rights.",
  contact: {
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    address: "28 May Street 69C, Baku, Azerbaijan",
  },
  sections: [
    {
      title: "14-day return window",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Deadline.",
              text: "You may request a return or exchange within 14 calendar days from the day you received the product.",
            },
            {
              label: "What qualifies.",
              text: "Technically sound, unused (or still sellable) products — with original packaging, labels, and full accessories.",
            },
            {
              label: "What you get.",
              text: "An exchange for the same model, a swap for another product (price difference applied), or a refund of the amount you paid.",
            },
          ],
        },
        {
          type: "p",
          text: "If the window has passed and the product is not defective, we may decline the return. Defective goods follow warranty and legal protection timelines — see “Defective products” below.",
        },
      ],
    },
    {
      title: "Return conditions",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Condition.",
              text: "No scratches, dents, broken seals, or signs of use.",
            },
            {
              label: "Completeness.",
              text: "Box, cables, adapters, protective films, documents, and accessories must be complete.",
            },
            {
              label: "Proof of purchase.",
              text: "Receipt, online order number, or warranty card speeds up the request.",
            },
            {
              label: "Software and accounts.",
              text: "Devices must be factory-reset and personal accounts/locks removed (iCloud, Google, Find My, and similar).",
            },
          ],
        },
        {
          type: "p",
          text: "If conditions are not met, we may refuse the return or redirect you to warranty service. When in doubt, contact us before sending the product back.",
        },
      ],
    },
    {
      title: "Non-returnable or limited cases",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Hygiene and personal use.",
              text: "Earphones, grooming items, and other personal-hygiene goods, or opened used accessories, may be restricted by law and hygiene rules.",
            },
            {
              label: "Opened software.",
              text: "Software or licenses with broken seals or already activated cannot be returned.",
            },
            {
              label: "Custom orders.",
              text: "Products specially ordered or configured for you — except where otherwise agreed.",
            },
            {
              label: "Bundles and gifts.",
              text: "Gift sets and promo bundles can usually only be returned in full; partial returns may not be possible.",
            },
          ],
        },
        {
          type: "p",
          text: "Extra limits may apply by category. Check product-page notes and warranty terms before you buy.",
        },
      ],
    },
    {
      title: "How to request a return",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "1. Contact us.",
              text: "Email or call with your order number, product name, and reason for return.",
            },
            {
              label: "2. Confirmation.",
              text: "We check eligibility and agree on how to hand over the item: bring it to the store or another arranged handover.",
            },
            {
              label: "3. Inspection.",
              text: "We receive the product and documents and inspect condition. A technical check may follow if needed.",
            },
            {
              label: "4. Outcome.",
              text: "We confirm an exchange, refund, or — if it does not qualify — a reasoned refusal.",
            },
          ],
        },
        {
          type: "p",
          text: "To cancel an online order before it ships, check the order status in your account or message us — that is a different process from returning a product you already received.",
        },
      ],
    },
    {
      title: "Refunds",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Card payments.",
              text: "The amount is returned to the same card. Bank processing usually takes several business days after IT Market confirms the refund.",
            },
            {
              label: "Cash.",
              text: "Cash refunds may be issued in store under the agreed procedure.",
            },
            {
              label: "Installments.",
              text: "Returns of installment purchases follow bank and installment terms; remaining balance and fees are governed by the partner bank’s rules.",
            },
          ],
        },
        {
          type: "p",
          text: "Delivery fees are refunded only when the Store is at fault or the delivery was defective. For voluntary returns of sound products, delivery fees are usually not refunded — as shown at checkout.",
        },
      ],
    },
    {
      title: "Defective products and warranty",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Damage on delivery.",
              text: "If the box or product shows visible damage, note it with the courier and contact us immediately.",
            },
            {
              label: "Fault during use.",
              text: "Within the warranty period, repair, replacement, or another remedy follows manufacturer or authorized service rules.",
            },
            {
              label: "Not covered by warranty.",
              text: "Mechanical damage, liquid damage, unauthorized repair, or misuse may fall outside warranty.",
            },
          ],
        },
        {
          type: "p",
          text: "The 14-day voluntary return is not the same as warranty. Even after that window, defective goods keep their legal and warranty protections — see the Warranty page and product documents.",
        },
      ],
    },
    {
      title: "Still have questions?",
      blocks: [
        {
          type: "p",
          text: "If you need clarity on deadlines, documents, or a specific product category, email or call us. Have your order number ready — answers are faster that way.",
        },
      ],
    },
  ],
};
