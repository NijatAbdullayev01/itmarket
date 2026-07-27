export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
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
  readingMinutes: number;
  category: string;
  tags: string[];
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
  posts: BlogPost[];
};
