import { IconDelivery, IconDoorPayment, IconReturn, IconWarranty } from "./icons";

const PURCHASE_BENEFITS = [
  {
    icon: IconDelivery,
    title: "Çatdırılma",
    text: "99 AZN-dən yuxarı sifarişlərə Bakı üzrə pulsuz çatdırılma.",
  },
  {
    icon: IconWarranty,
    title: "Zəmanət",
    text: "Rəsmi zəmanət və əlavə zəmanət seçimi mövcuddur.",
  },
  {
    icon: IconDoorPayment,
    title: "Təhlükəsizlik",
    text: "Ödənişləriniz tam təhlükəsiz həyata keçirilir.",
  },
  {
    icon: IconReturn,
    title: "Qaytarma",
    text: "14 gün ərzində qaytarma.",
  },
] as const;

export function ProductPurchaseBenefits() {
  return (
    <div className="ui-product-purchase-benefits" aria-label="Çatdırılma və zəmanət">
      <ul
        className="ui-product-purchase-benefit ui-product-purchase__trust ui-product-purchase__trust--under-benefit"
        aria-label="Alış üstünlükləri"
      >
        {PURCHASE_BENEFITS.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.title} className="ui-product-purchase__trust-item">
              <span className="ui-product-purchase-benefit__icon" aria-hidden="true">
                <Icon width={20} height={20} />
              </span>
              <div className="ui-product-purchase-benefit__body">
                <h3 className="ui-product-purchase-benefit__title">{item.title}</h3>
                <p className="ui-product-purchase-benefit__text">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
