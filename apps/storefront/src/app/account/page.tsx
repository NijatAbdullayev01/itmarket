import type { Metadata } from "next";

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
import { getRequestLocale } from "@/lib/i18n/get-locale";
import {
  getMessages,
  toAccountAuthFormCopy,
  toAccountDashboardCopy,
  toOrderStatusLabelMaps,
} from "@/lib/i18n";
import { noIndexRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    title: messages.pageMeta.accountTitle,
    description: messages.pageMeta.accountDescription,
    robots: noIndexRobots,
  };
}

export default async function AccountPage() {
  const [customer, sessionToken, locale] = await Promise.all([
    getCustomerProfile(),
    getCustomerSessionToken(),
    getRequestLocale(),
  ]);
  const messages = getMessages(locale);
  const authFormCopy = toAccountAuthFormCopy(messages);
  const dashboardCopy = toAccountDashboardCopy(messages);
  const statusLabelMaps = toOrderStatusLabelMaps(messages);

  if (customer === null || sessionToken === undefined) {
    return (
      <div className="ui-auth-shell">
        <div className="ui-auth-shell__inner">
          <AccountView
            customer={null}
            profile={null}
            orders={[]}
            addresses={[]}
            authFormCopy={authFormCopy}
            dashboardCopy={dashboardCopy}
            statusLabelMaps={statusLabelMaps}
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
          authFormCopy={authFormCopy}
          dashboardCopy={dashboardCopy}
          statusLabelMaps={statusLabelMaps}
        />
      </div>
    </div>
  );
}
