export type DeliveryPaymentListItem = {
  /** Optional bold lead-in. */
  label?: string;
  text: string;
};

export type DeliveryPaymentBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: DeliveryPaymentListItem[] };

export type DeliveryPaymentSection = {
  title: string;
  blocks: DeliveryPaymentBlock[];
};

export type DeliveryPaymentPageContent = {
  title: string;
  meta: string;
  description: string;
  lead: string;
  sections: DeliveryPaymentSection[];
  contact: {
    emailLabel: string;
    phoneLabel: string;
    addressLabel: string;
    address: string;
  };
};
