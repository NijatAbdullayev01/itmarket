import type { Metadata } from "next";
import Link from "next/link";
import { IconDocument, formatAzDate } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { getBlogPageContent, type BlogPost } from "@/lib/i18n/blog/blog";
import { buildLegalPageMetadata } from "@/lib/seo";

function BlogPostCard({
  post,
  readingTimeLabel,
  readMore,
}: {
  post: BlogPost;
  readingTimeLabel: string;
  readMore: string;
}) {
  return (
    <article className="ui-blog-card">
      <div className="ui-blog-card__meta">
        <span className="ui-blog-card__category">{post.category}</span>
        <time dateTime={post.publishedAt}>
          {formatAzDate(post.publishedAt)}
        </time>
        <span aria-hidden="true">·</span>
        <span>{readingTimeLabel}</span>
      </div>
      <h2 className="ui-blog-card__title">
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </h2>
      <p className="ui-blog-card__excerpt">{post.excerpt}</p>
      <Link
        className="ui-blog-card__link"
        href={`/blog/${post.slug}`}
        aria-label={`${readMore}: ${post.title}`}
      >
        {readMore}
      </Link>
    </article>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const content = getBlogPageContent(DEFAULT_LOCALE);
  return buildLegalPageMetadata({
    title: content.title,
    description: content.description,
    path: "/blog",
  });
}

export default async function BlogPage() {
  const locale = await getRequestLocale();
  const content = getBlogPageContent(locale);
  const posts = [...content.posts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <div className="ui-container ui-legal-page ui-blog-page">
      <div className="ui-legal-page__card">
        <header className="ui-legal-page__header">
          <div className="ui-legal-page__header-icon" aria-hidden="true">
            <IconDocument width={28} height={28} />
          </div>
          <div className="ui-legal-page__header-body">
            <h1 className="ui-page-title">{content.title}</h1>
            <p className="ui-legal-page__meta">{content.meta}</p>
          </div>
        </header>

        <p className="ui-about-page__lead">{content.lead}</p>

        <div className="ui-blog-list">
          {posts.map((post) => (
            <BlogPostCard
              key={post.slug}
              post={post}
              readingTimeLabel={content.readingTimeLabel(post.readingMinutes)}
              readMore={content.readMore}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
