import type { InstallmentPageContent } from "./installment-types";

export const installmentEn: InstallmentPageContent = {
  title: "Installment payments",
  meta: "IT Market · Installment and split payments",
  description:
    "IT Market installment and split payments — partner bank cards, terms, initial payment, and a clear ordering process.",
  lead:
    "A larger purchase should not strain your budget all at once. At IT Market you can pay for eligible products with an installment card over several months — or split the cost — with plans shown clearly on the product page and at checkout.",
  contact: {
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    address: "28 May Street 69C, Baku, Azerbaijan",
  },
  sections: [
    {
      title: "Two convenient options",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Buy with installment.",
              text: "Split the amount over your chosen term with a Birbank, Tam Kart, or Leobank installment card. Monthly and total amounts are calculated on the product page.",
            },
            {
              label: "Buy in parts.",
              text: "Pay for the product in parts. An initial payment is optional — you build a plan that fits your budget.",
            },
          ],
        },
        {
          type: "p",
          text: "Both options share one goal: get the technology you need without disrupting your current cash flow. Whichever mode is available appears clearly on the product card and during checkout.",
        },
      ],
    },
    {
      title: "Partner banks and terms",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Birbank.",
              text: "Typically 3, 6, 12, 18, and 24 months — may vary by product and campaign.",
            },
            {
              label: "Tam Kart.",
              text: "Typically 6, 12, 18, and 24 months.",
            },
            {
              label: "Leobank.",
              text: "Typically 6, 12, 18, and 24 months.",
            },
          ],
        },
        {
          type: "p",
          text: "These terms are a general offer. Only options allowed by the bank and stock stay active for a given product. Interest, fees, and early repayment follow your bank’s rules — read the final schedule carefully before ordering.",
        },
      ],
    },
    {
      title: "How to order",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "1. Choose a product.",
              text: "Find the right device in the catalog or via search.",
            },
            {
              label: "2. Build your plan.",
              text: "On the product page select “Buy in installments” or “Buy in parts”; pick the bank and term (and an initial payment if you want).",
            },
            {
              label: "3. Complete checkout.",
              text: "Choose delivery or store pickup and confirm your details. An installment application may be reviewed — your order is prepared after confirmation.",
            },
          ],
        },
        {
          type: "p",
          text: "Installments may be limited for some products or amounts — for security and partner bank rules. Checkout only shows methods valid for your order.",
        },
      ],
    },
    {
      title: "Check before you buy",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Monthly load.",
              text: "Make sure the monthly payment stays comfortable after your other obligations. Several “small” installments can stack into a heavy load.",
            },
            {
              label: "Term vs. use.",
              text: "Think how long you will keep the device. A long term for short use is rarely a good deal.",
            },
            {
              label: "Total payable.",
              text: "Do not look only at the monthly figure — compare the initial payment, interest, and total together.",
            },
            {
              label: "Bank terms.",
              text: "Early payoff, late fees, and returns follow your bank’s agreement. If unsure, clarify with us or your bank before buying.",
            },
          ],
        },
      ],
    },
    {
      title: "Returns and support",
      blocks: [
        {
          type: "p",
          text: "Returns of installment or split-payment purchases follow our return policy and the partner bank’s rules. Remaining balance, fees, and card payments are governed by your bank — see the Returns page and our terms for details.",
        },
      ],
    },
    {
      title: "Still have questions?",
      blocks: [
        {
          type: "p",
          text: "Not sure which bank fits you, whether installments are open for a product, or how to set an initial payment? Call or message us — we help before and after you buy.",
        },
      ],
    },
  ],
};
