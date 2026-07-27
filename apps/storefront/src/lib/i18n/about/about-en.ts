import type { AboutPageContent } from "./about-types";

export const aboutEn: AboutPageContent = {
  title: "About us",
  meta: "IT Market · Baku, Azerbaijan",
  description:
    "IT Market — a technology store in Baku with clear advice, transparent prices, and reliable service.",
  lead:
    "Choosing technology should not feel like a puzzle. At IT Market, every product comes with clear guidance, honest pricing, and support that continues after the purchase — whether you visit our store or order online.",
  contact: {
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    address: "28 May Street 69C, Baku, Azerbaijan",
  },
  sections: [
    {
      title: "Who we are",
      blocks: [
        {
          type: "p",
          text: "IT Market is a technology retailer in Azerbaijan. We bring smartphones, laptops, accessories, and other digital products together in one place — and give customers more than a catalog: the information they need to choose well.",
        },
        {
          type: "p",
          text: "Our store is at 28 May Street 69C in Baku. Our online storefront runs to the same standard: transparent prices in AZN and an order journey you can follow at every step.",
        },
      ],
    },
    {
      title: "Our mission",
      blocks: [
        {
          type: "p",
          text: "Our mission is simple: make technology accessible in a way that feels clear, reliable, and human. We work to help people choose right — not just buy fast — because a good purchase proves itself long after checkout.",
        },
      ],
    },
    {
      title: "What we offer",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "A focused assortment.",
              text: "From everyday needs to professional work — phones, computers, peripherals, and accessories.",
            },
            {
              label: "Clear product information.",
              text: "We explain what matters for comparison and choice, without hiding behind jargon.",
            },
            {
              label: "Delivery and store pickup.",
              text: "Have your order delivered to your address, or collect it conveniently from our store.",
            },
            {
              label: "Installment and credit options.",
              text: "Plan larger purchases with the payment and credit options available on the site.",
            },
            {
              label: "After-sales support.",
              text: "Warranty, returns, and service questions stay open and reachable — rules are clear, contact is easy.",
            },
          ],
        },
      ],
    },
    {
      title: "Why IT Market",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Honest communication.",
              text: "We are clear about price, stock, and terms — so shopping stays free of surprises.",
            },
            {
              label: "Local presence.",
              text: "We have an address in Baku; you can call, message, or visit when you need us.",
            },
            {
              label: "Careful selection.",
              text: "We do not fill the catalog at random — we prefer products that genuinely serve customers.",
            },
            {
              label: "Secure payments.",
              text: "Online payments are protected with recognized card networks; cash and other suitable methods are also available.",
            },
          ],
        },
      ],
    },
    {
      title: "Come say hello",
      blocks: [
        {
          type: "p",
          text: "Visit our store, browse products in person, or explore the online catalog. If you have a question — call or write; our team is ready to listen.",
        },
      ],
    },
  ],
};
