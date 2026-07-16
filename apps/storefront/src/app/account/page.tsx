import { AccountView } from "@/app/account/account-view";
import { getCustomerProfile } from "@/lib/customer-session";

export const metadata = {
  title: "Daxil ol",
  description: "IT Market hesabınıza daxil olun və ya yeni hesab yaradın.",
};

export default async function AccountPage() {
  const customer = await getCustomerProfile();

  return (
    <main id="esas-mezmun" className="ui-auth-shell">
      <div className="ui-auth-shell__inner">
        <AccountView customer={customer} />
      </div>
    </main>
  );
}
