import Link from "next/link";

type CartCompleteBarProps = {
  visible: boolean;
  onDismiss: () => void;
  href?: string;
};

export function CartCompleteBar({
  visible,
  onDismiss,
  href = "/cart",
}: CartCompleteBarProps) {
  if (!visible) return null;

  return (
    <div className="ui-cart-complete-bar" role="status" aria-live="polite">
      <p className="ui-cart-complete-bar__message">Məhsul səbətə əlavə edildi</p>
      <div className="ui-cart-complete-bar__actions">
        <Link
          className="ui-btn ui-btn--primary ui-cart-complete-bar__cta"
          href={href}
          onClick={onDismiss}
        >
          Sifarişi tamamla
        </Link>
        <button
          type="button"
          className="ui-cart-complete-bar__dismiss"
          onClick={onDismiss}
          aria-label="Bağla"
        >
          ×
        </button>
      </div>
    </div>
  );
}
