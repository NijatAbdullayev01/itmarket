export type WarrantyListItem = {
  /** Optional bold lead-in. */
  label?: string;
  text: string;
};

export type WarrantyBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: WarrantyListItem[] };

export type WarrantySection = {
  title: string;
  blocks: WarrantyBlock[];
};

export type WarrantyPageContent = {
  title: string;
  meta: string;
  description: string;
  lead: string;
  sections: WarrantySection[];
  contact: {
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    address: string;
  };
};
