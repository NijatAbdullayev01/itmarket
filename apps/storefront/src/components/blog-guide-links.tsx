import Image from "next/image";
import Link from "next/link";

import { getBlogPostImagePath } from "@/lib/i18n/blog/blog";
import type { BlogPost } from "@/lib/i18n/blog/blog";

export interface BlogGuideLinksProps {
  title: string;
  posts: BlogPost[];
  readMoreLabel?: string;
  allGuidesLabel?: string;
  readingTimeLabel?: (minutes: number) => string;
}

export function BlogGuideLinks({
  title,
  posts,
  readMoreLabel,
  allGuidesLabel,
  readingTimeLabel,
}: BlogGuideLinksProps) {
  if (posts.length === 0) {
    return null;
  }

  const isSingle = posts.length === 1;

  return (
    <section className="ui-blog-guides" aria-labelledby="blog-guides-heading">
      <div className="ui-blog-guides__header">
        <div className="ui-blog-guides__header-left">
          <span className="ui-blog-guides__header-icon" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
          </span>
          <h2 className="ui-section-heading" id="blog-guides-heading">
            {title}
          </h2>
        </div>
        <Link href="/blog" className="ui-blog-guides__all-link">
          <span>{allGuidesLabel || "Bütün bələdçilər"}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div
        className={`ui-blog-guides__grid ${
          isSingle ? "ui-blog-guides__grid--single" : ""
        }`}
      >
        {posts.map((post) => {
          const coverImagePath =
            getBlogPostImagePath(post.slug) || post.imagePath;
          const readingTime = readingTimeLabel
            ? readingTimeLabel(post.readingMinutes)
            : `${post.readingMinutes} dəq oxuma`;

          return (
            <article
              key={post.slug}
              className={`ui-blog-guides__card ${
                isSingle ? "ui-blog-guides__card--single" : ""
              }`}
            >
              {coverImagePath ? (
                <Link
                  href={`/blog/${post.slug}`}
                  className="ui-blog-guides__cover"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Image
                    className="ui-blog-guides__cover-img"
                    src={coverImagePath}
                    alt=""
                    width={isSingle ? 640 : 480}
                    height={isSingle ? 360 : 270}
                    sizes={
                      isSingle
                        ? "(max-width: 768px) 100vw, 420px"
                        : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                    }
                  />
                  {post.category ? (
                    <span className="ui-blog-guides__badge">
                      {post.category}
                    </span>
                  ) : null}
                </Link>
              ) : null}

              <div className="ui-blog-guides__body">
                <div className="ui-blog-guides__meta">
                  {!coverImagePath && post.category ? (
                    <span className="ui-blog-guides__badge">
                      {post.category}
                    </span>
                  ) : null}
                  {post.readingMinutes ? (
                    <span className="ui-blog-guides__reading-time">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {readingTime}
                    </span>
                  ) : null}
                </div>

                <h3 className="ui-blog-guides__title">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>

                {post.excerpt ? (
                  <p className="ui-blog-guides__excerpt">{post.excerpt}</p>
                ) : null}

                <div className="ui-blog-guides__footer">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="ui-blog-guides__cta"
                  >
                    <span>{readMoreLabel || "Bələdçini oxu"}</span>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
