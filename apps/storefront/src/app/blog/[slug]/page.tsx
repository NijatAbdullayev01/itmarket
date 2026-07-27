import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconDocument, formatAzDate } from "@itmarket/ui";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import {
  getAllBlogSlugs,
  getBlogPageContent,
  getBlogPostBySlug,
  getRelatedBlogPosts,
  type BlogBlock,
  type BlogPost,
} from "@/lib/i18n/blog/blog";
import { buildLegalPageMetadata } from "@/lib/seo";

function BlogBlockView({ block }: { block: BlogBlock }) {
  if (block.type === "p") {
    return <p>{block.text}</p>;
  }

  if (block.type === "h3") {
    return <h3>{block.text}</h3>;
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
  return (
    <li>
      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      <span className="ui-blog-related__date">
        {formatAzDate(post.publishedAt)}
      </span>
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
    </div>
  );
}
