export type FaqListItem = {
  /** Optional bold lead-in. */
  label?: string;
  text: string;
};

export type FaqBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: FaqListItem[] };

/** Each section title is the FAQ question. */
export type FaqSection = {
  title: string;
  blocks: FaqBlock[];
};

export type FaqPageContent = {
  title: string;
  meta: string;
  description: string;
  lead: string;
  sections: FaqSection[];
  contact: {
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    address: string;
  };
};
