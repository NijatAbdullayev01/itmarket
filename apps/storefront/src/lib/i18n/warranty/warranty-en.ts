import type { WarrantyPageContent } from "./warranty-types";

export const warrantyEn: WarrantyPageContent = {
  title: "Warranty",
  meta: "IT Market · Official distributor and manufacturer warranty",
  description:
    "How warranty works at IT Market — coverage, exclusions, claim steps, and documents you need.",
  lead:
    "Products purchased from IT Market carry an official manufacturer or authorized distributor warranty. This page explains what is covered, what is not, and how to open a claim if something goes wrong. Your rights are also protected under Azerbaijan’s Law on the Protection of Consumer Rights.",
  contact: {
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    address: "28 May Street 69C, Baku, Azerbaijan",
  },
  sections: [
    {
      title: "What warranty means",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Official warranty.",
              text: "If a product fails due to a factory or material defect, the manufacturer or authorized service network offers repair, replacement, or another remedy.",
            },
            {
              label: "Where to find details.",
              text: "Duration, terms, and service centers appear on the product page, the warranty card in the box, or the product documents.",
            },
            {
              label: "Who fulfills it.",
              text: "The manufacturer or authorized distributor usually carries the warranty obligation; IT Market accepts your request, routes it, and supports you through the process.",
            },
          ],
        },
        {
          type: "p",
          text: "Warranty length varies by category and brand — check the product card before you buy. If anything is unclear, contact us first.",
        },
      ],
    },
    {
      title: "What is covered?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Manufacturing defects.",
              text: "Factory, assembly, or material faults that appear during normal use.",
            },
            {
              label: "Electronics and function.",
              text: "Failure of advertised features within the limits set in the warranty documents.",
            },
            {
              label: "Authorized service path.",
              text: "Diagnostics, repair, or replacement follow an authorized service center or an agreed procedure.",
            },
          ],
        },
        {
          type: "p",
          text: "Coverage for a specific product always follows that brand’s warranty rules. Some categories have separate periods for batteries, chargers, or accessories.",
        },
      ],
    },
    {
      title: "What is not covered",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Mechanical damage.",
              text: "Drops, dents, scratches, breaks, and other physical damage — unless the defect existed before use.",
            },
            {
              label: "Liquid and moisture.",
              text: "Spills, water ingress, high humidity, or corrosion marks.",
            },
            {
              label: "Misuse.",
              text: "Use against the manual, unsuitable adapters/cables, overload, or non-professional installation.",
            },
            {
              label: "Unauthorized intervention.",
              text: "Broken seals, unofficial repair, illegal software modification, or tampering with locks.",
            },
            {
              label: "Normal wear.",
              text: "Expected wear over time, natural battery capacity loss, and cosmetic changes from use — as defined by brand rules.",
            },
          ],
        },
        {
          type: "p",
          text: "In these cases we may offer paid repair or another commercial option. Diagnostics are confirmed by an authorized service report.",
        },
      ],
    },
    {
      title: "How to make a warranty claim",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "1. Contact us.",
              text: "Email or call with your order number, product name, and a short description of the fault.",
            },
            {
              label: "2. Documents.",
              text: "Have your receipt, online order confirmation, or warranty card ready — they speed up the request.",
            },
            {
              label: "3. Handover.",
              text: "Bring or deliver the product as agreed. Bring the original box and accessories when possible.",
            },
            {
              label: "4. Diagnostics.",
              text: "Authorized service inspects the unit. You are informed about repair, replacement, refusal, or another outcome.",
            },
            {
              label: "5. Result.",
              text: "We notify you when the work is done. Turnaround depends on the fault and spare-part availability.",
            },
          ],
        },
        {
          type: "p",
          text: "If the box or product shows visible damage on delivery, note it with the courier and tell us immediately — those cases are reviewed separately.",
        },
      ],
    },
    {
      title: "Which documents do you need?",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Proof of purchase.",
              text: "Paper receipt, fiscal receipt, or online order number.",
            },
            {
              label: "Warranty card.",
              text: "The filled-in or included warranty document — if provided.",
            },
            {
              label: "The product.",
              text: "The faulty device and, when possible, original packaging, cables, and other kit parts.",
            },
          ],
        },
        {
          type: "p",
          text: "If a document is missing, write to us with the order date and your contact details — if the purchase appears in our system, we can help verify the claim.",
        },
      ],
    },
    {
      title: "Warranty vs the 14-day return",
      blocks: [
        {
          type: "ul",
          items: [
            {
              label: "Voluntary return.",
              text: "You can return or exchange a technically sound product within 14 days of receipt — full rules are on the Returns page.",
            },
            {
              label: "Warranty.",
              text: "Defective or faulty goods follow manufacturer/distributor warranty and legal protection timelines separately; those rights remain even after the 14-day window.",
            },
          ],
        },
        {
          type: "p",
          text: "In short: change of mind — return; factory or material defect — warranty. If you are unsure which path applies, contact us first.",
        },
      ],
    },
    {
      title: "Still have questions?",
      blocks: [
        {
          type: "p",
          text: "If you need clarity on duration, a service center, or a specific model, email or call us. Have your order number and product name ready — replies are faster that way.",
        },
      ],
    },
  ],
};
