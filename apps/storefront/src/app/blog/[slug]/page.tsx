import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconDocument, formatAzDate } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import {
  getAllBlogSlugs,
  getBlogPageContent,
  getBlogPostBySlug,
  getBlogPostImagePath,
  getRelatedBlogPosts,
  type BlogBlock,
  type BlogPost,
} from "@/lib/i18n/blog/blog";
import {
  buildBlogPostingJsonLd,
  buildBreadcrumbListJsonLd,
  buildLegalPageMetadata,
  toJsonLd,
} from "@/lib/seo";

function BlogBlockView({ block }: { block: BlogBlock }) {
  if (block.type === "p") {
    return <p>{block.text}</p>;
  }

  if (block.type === "h2") {
    return <h2>{block.text}</h2>;
  }

  if (block.type === "callout") {
    return <aside className="ui-blog-callout">{block.text}</aside>;
  }

  if (block.type === "ol") {
    return (
      <ol>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }

  return (
    <ul>
      {block.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function RelatedPostLink({ post }: { post: BlogPost }) {
  const coverImagePath = getBlogPostImagePath(post.slug);

  return (
    <li className="ui-blog-related__item">
      {coverImagePath ? (
        <Link
          className="ui-blog-related__thumb"
          href={`/blog/${post.slug}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image
            className="ui-blog-related__thumb-image"
            src={coverImagePath}
            alt=""
            width={160}
            height={90}
            sizes="160px"
          />
        </Link>
      ) : null}
      <div className="ui-blog-related__copy">
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        <span className="ui-blog-related__date">
          {formatAzDate(post.publishedAt)}
        </span>
      </div>
    </li>
  );
}

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(DEFAULT_LOCALE, slug);
  if (!post) {
    return buildLegalPageMetadata({
      title: "Bloq",
      description: "IT Market bloq yazısı.",
      path: `/blog/${slug}`,
    });
  }

  return buildLegalPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    openGraphType: "article",
    imagePath: getBlogPostImagePath(post.slug),
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt?.trim() || post.publishedAt,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const content = getBlogPageContent(locale);
  const post = getBlogPostBySlug(locale, slug);

  if (!post) {
    notFound();
  }

  const related = getRelatedBlogPosts(locale, post.slug);
  const azPost = getBlogPostBySlug(DEFAULT_LOCALE, post.slug) ?? post;
  const azBlogContent = getBlogPageContent(DEFAULT_LOCALE);
  const coverImagePath = getBlogPostImagePath(azPost.slug);

  return (
    <div className="ui-container ui-legal-page ui-blog-page ui-blog-post-page">
      <div className="ui-legal-page__card">
        <header className="ui-legal-page__header">
          <div className="ui-legal-page__header-icon" aria-hidden="true">
            <IconDocument width={28} height={28} />
          </div>
          <div className="ui-legal-page__header-body">
            <p className="ui-blog-post__eyebrow">
              <Link href="/blog">{content.title}</Link>
              <span aria-hidden="true"> / </span>
              <span>{post.category}</span>
            </p>
            <h1 className="ui-page-title">{post.title}</h1>
            <p className="ui-legal-page__meta">
              <time dateTime={post.publishedAt}>
                {formatAzDate(post.publishedAt)}
              </time>
              <span aria-hidden="true"> · </span>
              <span>{content.readingTimeLabel(post.readingMinutes)}</span>
            </p>
          </div>
        </header>

        {coverImagePath ? (
          <figure className="ui-blog-cover">
            <Image
              className="ui-blog-cover__image"
              src={coverImagePath}
              alt={post.title}
              width={1200}
              height={630}
              sizes="(max-width: 768px) 100vw, 720px"
              priority
            />
          </figure>
        ) : null}

        <article className="ui-legal-content ui-blog-article">
          {post.blocks.map((block, index) => (
            <BlogBlockView key={`${post.slug}-${index}`} block={block} />
          ))}

          {post.cta ? (
            <p className="ui-blog-article__cta">
              <Link className="ui-blog-cta" href={post.cta.href}>
                {post.cta.label}
              </Link>
            </p>
          ) : null}
        </article>

        {related.length > 0 ? (
          <section className="ui-blog-related" aria-labelledby="blog-related">
            <h2 id="blog-related">{content.relatedTitle}</h2>
            <ul>
              {related.map((item) => (
                <RelatedPostLink key={item.slug} post={item} />
              ))}
            </ul>
          </section>
        ) : null}

        <p className="ui-blog-back">
          <Link href="/blog">{content.backToBlog}</Link>
        </p>
      </div>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            buildBlogPostingJsonLd({
              slug: azPost.slug,
              title: azPost.title,
              description: azPost.description,
              publishedAt: azPost.publishedAt,
              updatedAt: azPost.updatedAt,
              tags: azPost.tags,
              imagePath: getBlogPostImagePath(azPost.slug),
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
              { name: azPost.title, path: `/blog/${azPost.slug}` },
            ]),
          ),
        }}
      />
    </div>
  );
}
