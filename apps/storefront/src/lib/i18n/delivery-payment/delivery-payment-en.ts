import type { DeliveryPaymentPageContent } from "./delivery-payment-types";

export const deliveryPaymentEn: DeliveryPaymentPageContent = {
  title: "Delivery and payment",
  meta: "IT Market · Baku and surrounding areas",
  description:
    "IT Market delivery, store pickup, and payment options — clear information on timelines, fees, and secure checkout.",
  lead:
    "Everything you need before you order: where we deliver, how long it takes, what you pay for shipping, and how you can pay. The rules are straightforward — and checkout shows the exact amount for your address.",
  contact: {
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    address: "28 May Street 69C, Baku, Azerbaijan",
  },
  sections: [
    {
      title: "Fulfillment options",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Home delivery.",
              text: "A courier brings your order to the address you provide. Enter your address, phone number, and city/district correctly — most delays come from incomplete details.",
            },
            {
              label: "Store pickup.",
              text: "Collect your order at our Baku branch — 28 May Street 69C. We notify you when the order is ready after stock is confirmed.",
            },
          ],
        },
      ],
    },
    {
      title: "Delivery timelines",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Standard.",
              text: "Usually within 2–5 business days. The exact window depends on your zone and stock.",
            },
            {
              label: "Express.",
              text: "When available, delivery within 2 hours. An extra fee may apply; the amount is shown at checkout.",
            },
          ],
        },
        {
          type: "p",
          text: "Timelines are estimates. Weather, traffic, logistics partner delays, or hard-to-reach addresses can extend delivery. For large or special orders, our team agrees the schedule with you in advance.",
        },
      ],
    },
    {
      title: "Delivery fees",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Baku — free threshold.",
              text: "Orders over 99 AZN qualify for free standard delivery within Baku.",
            },
            {
              label: "Baku — below threshold.",
              text: "Orders under 99 AZN incur a zone-based delivery fee; the exact amount appears at checkout.",
            },
            {
              label: "Other cities and districts.",
              text: "Delivery to republic regions may include an extra charge. Some addresses may not be covered — checkout will notify you in that case.",
            },
            {
              label: "Store pickup.",
              text: "No delivery fee when you collect at the branch.",
            },
          ],
        },
        {
          type: "p",
          text: "Campaigns and special offers may temporarily change fees. Always check the cart and checkout totals before confirming.",
        },
      ],
    },
    {
      title: "Payment methods",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Cash.",
              text: "Pay in cash on delivery or at store pickup when the option is available for your order.",
            },
            {
              label: "Bank card.",
              text: "Online payment with Visa and Mastercard. We do not store your card details; payment is processed through a secure payment provider.",
            },
            {
              label: "Installments.",
              text: "Split payments with partner bank installment cards. Availability depends on the amount, product, and the selected bank’s terms.",
            },
          ],
        },
        {
          type: "p",
          text: "Checkout shows which methods are active for your order. Cash or installments may be limited for some products or amounts — for security and partner rules.",
        },
      ],
    },
    {
      title: "What to check on handover",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Packaging.",
              text: "Check that the box and seals are intact while the courier is present.",
            },
            {
              label: "Contents.",
              text: "Confirm the product, accessories, and documents are complete.",
            },
            {
              label: "Visible damage.",
              text: "If anything is damaged or missing, note it immediately and contact us — it is harder to prove later.",
            },
          ],
        },
      ],
    },
    {
      title: "Still have questions?",
      blocks: [
        {
          type: "p",
          text: "Need to know if your address is covered, whether express is available, or which payment method fits? Call or message us — we help before and after you order.",
        },
      ],
    },
  ],
};
