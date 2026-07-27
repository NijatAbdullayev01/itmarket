export type InstallmentListItem = {
  /** Optional bold lead-in. */
  label?: string;
  text: string;
};

export type InstallmentBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: InstallmentListItem[] };

export type InstallmentSection = {
  title: string;
  blocks: InstallmentBlock[];
};

export type InstallmentPageContent = {
  title: string;
  meta: string;
  description: string;
  lead: string;
  sections: InstallmentSection[];
  contact: {
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    address: string;
  };
};
