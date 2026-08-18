import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IconDocument, formatAzDate } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import {
  getBlogPageContent,
  getBlogPostImagePath,
  sortBlogPostsByDate,
  type BlogPost,
} from "@/lib/i18n/blog/blog";
import {
  buildBlogJsonLd,
  buildBreadcrumbListJsonLd,
  buildLegalPageMetadata,
  toJsonLd,
} from "@/lib/seo";

function BlogPostCard({
  post,
  readingTimeLabel,
  readMore,
  featured = false,
  featuredLabel,
  priority = false,
}: {
  post: BlogPost;
  readingTimeLabel: string;
  readMore: string;
  featured?: boolean;
  featuredLabel?: string;
  priority?: boolean;
}) {
  const coverImagePath = getBlogPostImagePath(post.slug);

  return (
    <article
      className={
        featured ? "ui-blog-card ui-blog-card--featured" : "ui-blog-card"
      }
    >
      {coverImagePath ? (
        <Link
          className="ui-blog-card__cover"
          href={`/blog/${post.slug}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            className="ui-blog-card__cover-image"
            src={coverImagePath}
            alt=""
            width={featured ? 1200 : 640}
            height={featured ? 630 : 360}
            sizes={
              featured
                ? "(max-width: 768px) 100vw, 720px"
                : "(max-width: 768px) 100vw, 360px"
            }
            priority={priority}
          />
        </Link>
      ) : null}
      <div className="ui-blog-card__body">
        <div className="ui-blog-card__meta">
          {featured && featuredLabel ? (
            <span className="ui-blog-card__featured-label">{featuredLabel}</span>
          ) : null}
          {post.categoryHref ? (
            <Link className="ui-blog-card__category" href={post.categoryHref}>
              {post.category}
            </Link>
          ) : (
            <span className="ui-blog-card__category">{post.category}</span>
          )}
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
      </div>
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
  const azBlogContent = getBlogPageContent(DEFAULT_LOCALE);
  const posts = sortBlogPostsByDate(content.posts);
  const [featured, ...rest] = posts;

  return (
    <div className="ui-container ui-legal-page ui-blog-page">
      <div className="ui-legal-page__card">
        <header className="ui-legal-page__header">
          <div className="ui-legal-page__header-icon" aria-hidden="true">
            <IconDocument width={28} height={28} />
          </div>
          <div className="ui-legal-page__header-body">
            <h1 className="ui-page-title">{content.heading ?? content.title}</h1>
            <p className="ui-legal-page__meta">{content.meta}</p>
          </div>
        </header>

        <p className="ui-about-page__lead">{content.lead}</p>

        {featured ? (
          <div className="ui-blog-featured">
            <BlogPostCard
              post={featured}
              readingTimeLabel={content.readingTimeLabel(
                featured.readingMinutes,
              )}
              readMore={content.readMore}
              featured
              featuredLabel={content.featuredLabel}
              priority
            />
          </div>
        ) : null}

        {rest.length > 0 ? (
          <div className="ui-blog-list">
            {rest.map((post) => (
              <BlogPostCard
                key={post.slug}
                post={post}
                readingTimeLabel={content.readingTimeLabel(post.readingMinutes)}
                readMore={content.readMore}
              />
            ))}
          </div>
        ) : null}
      </div>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            buildBlogJsonLd({
              name: azBlogContent.heading ?? azBlogContent.title,
              description: azBlogContent.description,
              posts: sortBlogPostsByDate(azBlogContent.posts).map((post) => ({
                slug: post.slug,
                title: post.title,
                publishedAt: post.publishedAt,
              })),
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            buildBreadcrumbListJsonLd([
              { name: azBlogContent.title, path: "/blog" },
            ]),
          ),
        }}
      />
    </div>
  );
}
