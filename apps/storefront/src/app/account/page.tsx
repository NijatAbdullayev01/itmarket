import { AccountView } from "@/app/account/account-view";
import {
  fetchCustomerAddresses,
  fetchCustomerOrders,
  fetchCustomerProfile,
} from "@/lib/customer-account";
import {
  getCustomerProfile,
  getCustomerSessionToken,
} from "@/lib/customer-session";

export const metadata = {
  title: "Hesab",
  description:
    "IT Market hesabınızda şəxsi məlumatlarınızı, sifarişlərinizi və ünvanlarınızı idarə edin.",
};

export default async function AccountPage() {
  const customer = await getCustomerProfile();
  const sessionToken = await getCustomerSessionToken();

  if (customer === null || sessionToken === undefined) {
    return (
      <div className="ui-auth-shell">
        <div className="ui-auth-shell__inner">
          <AccountView
            customer={null}
            profile={null}
            orders={[]}
            addresses={[]}
          />
        </div>
      </div>
    );
  }

  const [profileResult, ordersResult, addressesResult] = await Promise.all([
    fetchCustomerProfile(sessionToken),
    fetchCustomerOrders(sessionToken),
    fetchCustomerAddresses(sessionToken),
  ]);

  const profile = profileResult.ok
    ? profileResult.data
    : {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName ?? null,
        lastName: customer.lastName ?? null,
        phone: customer.phone ?? null,
      };

  return (
    <div className="ui-account-shell">
      <div className="ui-container ui-account-shell__inner">
        <AccountView
          customer={customer}
          profile={profile}
          orders={ordersResult.ok ? ordersResult.data : []}
          addresses={addressesResult.ok ? addressesResult.data : []}
        />
      </div>
    </div>
  );
}
