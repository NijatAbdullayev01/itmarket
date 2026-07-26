export type TermsListItem = {
  /** Optional bold lead-in (e.g. defined term). */
  label?: string;
  text: string;
};

export type TermsBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: TermsListItem[] };

export type TermsSection = {
  title: string;
  blocks: TermsBlock[];
};

export type TermsPageContent = {
  title: string;
  meta: string;
  description: string;
  sections: TermsSection[];
  contact: {
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    address: string;
  };
};
