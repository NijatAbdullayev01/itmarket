export type AboutListItem = {
  /** Optional bold lead-in. */
  label?: string;
  text: string;
};

export type AboutBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: AboutListItem[] };

export type AboutSection = {
  title: string;
  blocks: AboutBlock[];
};

export type AboutPageContent = {
  title: string;
  meta: string;
  description: string;
  lead: string;
  sections: AboutSection[];
  contact: {
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    address: string;
  };
};
