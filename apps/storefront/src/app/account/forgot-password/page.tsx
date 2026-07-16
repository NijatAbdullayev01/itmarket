import { ForgotPasswordView } from "@/app/account/forgot-password/forgot-password-view";

export const metadata = {
  title: "Şifrəni bərpa et",
  description: "IT Market hesabınız üçün şifrə bərpası təlimatı alın.",
};

export default function ForgotPasswordPage() {
  return (
    <main id="esas-mezmun" className="ui-auth-shell">
      <div className="ui-auth-shell__inner">
        <ForgotPasswordView />
      </div>
    </main>
  );
}
