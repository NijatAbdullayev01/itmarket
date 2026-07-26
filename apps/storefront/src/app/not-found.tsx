import type { Metadata } from "next";
import { EmptyState, EmptyStateLink } from "@itmarket/ui";

import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.pageMeta.notFoundTitle,
    description: messages.notFound.description,
    robots: noIndexRobots,
  };
}

export default async function NotFound() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <div className="ui-container">
      <EmptyState
        title={messages.notFound.title}
        titleAs="h1"
        description={messages.notFound.description}
        action={<EmptyStateLink href="/" label={messages.notFound.cta} />}
      />
    </div>
  );
}
