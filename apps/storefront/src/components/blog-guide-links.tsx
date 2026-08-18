import Link from "next/link";

import type { BlogPost } from "@/lib/i18n/blog/blog";

export function BlogGuideLinks({
  title,
  posts,
}: {
  title: string;
  posts: BlogPost[];
}) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="ui-blog-guides" aria-labelledby="blog-guides-heading">
      <h2 className="ui-section-heading" id="blog-guides-heading">
        {title}
      </h2>
      <ul className="ui-blog-guides__list">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            <p>{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
