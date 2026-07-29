export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string };

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
  meta: string;
  description: string;
  lead: string;
  readingTimeLabel: (minutes: number) => string;
  readMore: string;
  backToBlog: string;
  relatedTitle: string;
  /** Label for the featured/latest post card on the index page. */
  featuredLabel: string;
  posts: BlogPost[];
};
