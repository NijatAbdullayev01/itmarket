import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordView } from "@/app/account/reset-password/reset-password-view";
import { getRequestLocale } from "@/lib/i18n/get-locale";
import { getMessages } from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.pageMeta.resetPasswordTitle,
    description: messages.pageMeta.resetPasswordDescription,
    robots: noIndexRobots,
  };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ token }, locale] = await Promise.all([
    searchParams,
    getRequestLocale(),
  ]);
  const messages = getMessages(locale);

  if (token === undefined || token.trim() === "") {
    return (
      <div className="ui-auth-shell">
        <div className="ui-auth-shell__inner">
          <section className="ui-account-auth">
            <header className="ui-account-auth__header">
              <h2 className="ui-account-auth__title">
                {messages.account.resetMissingTitle}
              </h2>
              <p className="ui-account-auth__lead">
                {messages.account.resetMissingLead}
              </p>
            </header>
            <Link
              className="ui-account-auth__back-link"
              href="/account/forgot-password"
              replace
            >
              {messages.account.resetMissingRequestLink}
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-auth-shell">
      <div className="ui-auth-shell__inner">
        <ResetPasswordView token={token} />
      </div>
    </div>
  );
}
