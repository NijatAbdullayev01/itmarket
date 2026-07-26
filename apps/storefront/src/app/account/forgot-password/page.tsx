import type { Metadata } from "next";

import { ForgotPasswordView } from "@/app/account/forgot-password/forgot-password-view";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.pageMeta.forgotPasswordTitle,
    description: messages.pageMeta.forgotPasswordDescription,
    robots: noIndexRobots,
  };
}

export default function ForgotPasswordPage() {
  return (
    <div className="ui-auth-shell">
      <div className="ui-auth-shell__inner">
        <ForgotPasswordView />
      </div>
    </div>
  );
}
