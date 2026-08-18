export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "faq"; items: Array<{ question: string; answer: string }> };

export type BlogInlinePart =
  | { type: "text"; text: string }
  | { type: "link"; label: string; href: string };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  description: string;
  /** ISO calendar date YYYY-MM-DD (displayed as DD.MM.YYYY). */
  publishedAt: string;
  /** Optional ISO calendar date when the article was last revised (SEO dateModified). */
  updatedAt?: string;
  readingMinutes: number;
  category: string;
  /** Optional catalog landing this category label should link to. */
  categoryHref?: string;
  tags: string[];
  /**
   * Public storefront path for OG / BlogPosting / RSS (AZ-primary SEO).
   * Prefer `/images/...` assets under `apps/storefront/public`.
   */
  imagePath?: string;
  /** Optional catalog CTA after the article. */
  cta?: {
    label: string;
    href: string;
  };
  blocks: BlogBlock[];
};

export type BlogPageContent = {
  title: string;
  /** Visible H1; falls back to `title` when omitted. */
  heading?: string;
  meta: string;
  description: string;
  lead: string;
  readingTimeLabel: (minutes: number) => string;
  readMore: string;
  backToBlog: string;
  relatedTitle: string;
  tocTitle: string;
  guidesTitle: string;
  /** Label for the featured/latest post card on the index page. */
  featuredLabel: string;
  posts: BlogPost[];
};
