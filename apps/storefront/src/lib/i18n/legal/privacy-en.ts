import type { PrivacyPageContent } from "./privacy-types";

export const privacyEn: PrivacyPageContent = {
  title: "Privacy policy",
  meta: "Last updated: 26 July 2026 · Effective date: 26 July 2026",
  description:
    "Rules for the collection, use, and protection of personal data on the IT Market website.",
  contact: {
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    address: "28 May Street 69C, Baku, Azerbaijan",
  },
  sections: [
    {
      title: "1. General provisions",
      blocks: [
        {
          type: "p",
          text: "This Privacy Policy explains how personal data is collected, used, and protected on the official website of the “IT Market” online store (hereinafter — “we”, “our”). By using the Site, you accept the terms of this policy.",
        },
      ],
    },
    {
      title: "2. Information we collect",
      blocks: [
        {
          type: "p",
          text: "We may collect information in the following categories:",
        },
        {
          type: "ul",
          items: [
            {
              text: "Account and contact details (first name, last name, email, phone);",
            },
            {
              text: "Delivery address and order details;",
            },
            {
              text: "Technical data necessary for the payment process (processed by the payment provider);",
            },
            {
              text: "Technical data related to Site use (browser type, device, IP address, cookies).",
            },
          ],
        },
      ],
    },
    {
      title: "3. Use of information",
      blocks: [
        {
          type: "p",
          text: "Personal data is used for the following purposes:",
        },
        {
          type: "ul",
          items: [
            { text: "Fulfilling orders and customer support;" },
            { text: "Account management and security;" },
            { text: "Complying with legal obligations;" },
            {
              text: "Improving service quality and providing information where consent has been given.",
            },
          ],
        },
      ],
    },
    {
      title: "4. Sharing and third parties",
      blocks: [
        {
          type: "p",
          text: "We do not sell personal data. Data may be shared with third parties only when necessary to fulfill an order (for example, delivery and payment services) and when required by law.",
        },
      ],
    },
    {
      title: "5. Cookies",
      blocks: [
        {
          type: "p",
          text: "The Site uses cookies and similar technologies to provide the cart, session, and user experience. You can manage cookies in your browser settings; some features may be limited.",
        },
      ],
    },
    {
      title: "6. Retention period",
      blocks: [
        {
          type: "p",
          text: "Data is retained for the period necessary to provide the service and meet legal obligations, after which it is deleted or anonymized.",
        },
      ],
    },
    {
      title: "7. Your rights",
      blocks: [
        {
          type: "p",
          text: "In accordance with applicable law, you may request access to, correction of, or deletion of your data. Please contact us for this purpose.",
        },
      ],
    },
    {
      title: "8. Contact",
      blocks: [],
    },
  ],
};
