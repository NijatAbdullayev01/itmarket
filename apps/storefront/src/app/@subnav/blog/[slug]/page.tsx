import { StaticPageBreadcrumb } from "@/components/static-page-breadcrumb";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { getBlogPostBySlug } from "@/lib/i18n/blog/blog";

export default async function BlogPostSubnav({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const post = getBlogPostBySlug(locale, slug);

  if (!post) {
    return <StaticPageBreadcrumb current={messages.footer.blog} />;
  }

  return (
    <StaticPageBreadcrumb
      parents={[{ label: messages.footer.blog, href: "/blog" }]}
      current={post.title}
    />
  );
}
