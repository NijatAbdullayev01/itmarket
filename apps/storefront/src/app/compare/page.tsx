import type { Metadata } from "next";

import { CompareView } from "@/app/compare/compare-view";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.pageMeta.compareTitle,
    description: messages.pageMeta.compareDescription,
    robots: noIndexRobots,
  };
}

export default async function ComparePage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return (
    <div className="ui-container">
      <h1 className="ui-page-title ui-page-title--panel">{messages.compare.title}</h1>
      <CompareView />
    </div>
  );
}
