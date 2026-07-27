import { StaticPageBreadcrumb } from "@/components/static-page-breadcrumb";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";

export default async function BlogSubnav() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return <StaticPageBreadcrumb current={messages.footer.blog} />;
}
