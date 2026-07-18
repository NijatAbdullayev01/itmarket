import { CheckoutStatusPanel } from "@/components/checkout-status-panel";
import { getOrderStatus } from "@/lib/api";
import { EmptyStateLink } from "@itmarket/ui";

export const metadata = {
  title: "Ödəniş statusu",
};

export default async function CheckoutStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;

  if (orderNumber === undefined) {
    return (
      <div className="ui-container">
        <div className="ui-status-panel">
          <h1 className="ui-page-title">Sifariş nömrəsi verilməyib</h1>
          <EmptyStateLink href="/" label="Məhsullara bax" />
        </div>
      </div>
    );
  }

  const status = await getOrderStatus(orderNumber);

  return (
    <div className="ui-container">
      <CheckoutStatusPanel initial={status} />
    </div>
  );
}
