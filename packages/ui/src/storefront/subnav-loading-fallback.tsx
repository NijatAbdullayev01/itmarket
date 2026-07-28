/** Fixed-height breadcrumb placeholder — calm bar, no chip theater. */
export function SubnavLoadingFallback({ label = "Yüklənir…" }: { label?: string }) {
  return (
    <div
      className="ui-product-breadcrumb-bar ui-subnav-loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="ui-container">
        <span className="sr-only">{label}</span>
        <div className="ui-subnav-loading__bar" aria-hidden="true" />
      </div>
    </div>
  );
}
