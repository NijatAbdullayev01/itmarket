export type CorporateListItem = {
  label?: string;
  text: string;
};

export type CorporateBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: CorporateListItem[] };

export type CorporateSection = {
  title: string;
  blocks: CorporateBlock[];
};

export type CorporateBenefit = {
  /** Maps to a storefront icon in the page. */
  icon: "price" | "invoice" | "delivery" | "support";
  title: string;
  text: string;
};

export type CorporateStep = {
  title: string;
  text: string;
};

export type CorporatePageContent = {
  title: string;
  meta: string;
  description: string;
  lead: string;
  benefitsTitle: string;
  benefits: CorporateBenefit[];
  audience: CorporateSection;
  processTitle: string;
  steps: CorporateStep[];
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
  ctaMailtoSubject: string;
  contact: {
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    address: string;
  };
};
