export type ReturnsListItem = {
  /** Optional bold lead-in. */
  label?: string;
  text: string;
};

export type ReturnsBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: ReturnsListItem[] };

export type ReturnsSection = {
  title: string;
  blocks: ReturnsBlock[];
};

export type ReturnsPageContent = {
  title: string;
  meta: string;
  description: string;
  lead: string;
  sections: ReturnsSection[];
  contact: {
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    address: string;
  };
};
