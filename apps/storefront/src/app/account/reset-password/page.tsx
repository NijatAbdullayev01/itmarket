import Link from "next/link";

import { ResetPasswordView } from "@/app/account/reset-password/reset-password-view";

export const metadata = {
  title: "Yeni şifrə",
  description: "IT Market hesabınız üçün yeni şifrə təyin edin.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (token === undefined || token.trim() === "") {
    return (
      <main id="esas-mezmun" className="ui-auth-shell">
        <div className="ui-auth-shell__inner">
          <section className="ui-account-auth">
            <header className="ui-account-auth__header">
              <h2 className="ui-account-auth__title">Bərpa linki tapılmadı</h2>
              <p className="ui-account-auth__lead">
                Şifrəni yeniləmək üçün etibarlı bərpa linkinə ehtiyac var.
              </p>
            </header>
            <Link className="ui-account-auth__back-link" href="/account/forgot-password">
              Yeni bərpa linki istə
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main id="esas-mezmun" className="ui-auth-shell">
      <div className="ui-auth-shell__inner">
        <ResetPasswordView token={token} />
      </div>
    </main>
  );
}
