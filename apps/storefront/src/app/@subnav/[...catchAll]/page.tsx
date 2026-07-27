import { StaticPageBreadcrumb } from "@/components/static-page-breadcrumb";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { getBlogPostBySlug } from "@/lib/i18n/blog/blog";

const FOOTER_BREADCRUMB_KEYS = {
  about: "about",
  blog: "blog",
  corporate: "corporate",
  "delivery-payment": "deliveryPayment",
  returns: "returns",
  installment: "installment",
  faq: "faq",
  terms: "terms",
  privacy: "privacy",
  warranty: "warranty",
} as const;

type FooterBreadcrumbKey =
  (typeof FOOTER_BREADCRUMB_KEYS)[keyof typeof FOOTER_BREADCRUMB_KEYS];

export default async function SubnavCatchAll({
  params,
}: {
  params: Promise<{ catchAll: string[] }>;
}) {
  const { catchAll } = await params;
  const [segment, slug] = catchAll;
  if (!segment) {
    return null;
  }

  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  if (segment === "blog" && slug) {
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

  if (catchAll.length !== 1) {
    return null;
  }

  const footerKey = FOOTER_BREADCRUMB_KEYS[
    segment as keyof typeof FOOTER_BREADCRUMB_KEYS
  ] as FooterBreadcrumbKey | undefined;

  if (!footerKey) {
    return null;
  }

  return <StaticPageBreadcrumb current={messages.footer[footerKey]} />;
}
