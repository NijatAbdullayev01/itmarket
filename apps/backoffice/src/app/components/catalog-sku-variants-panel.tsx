"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  brand: { id: string; name: string } | null;
  variants: { id: string; sku: string; barcode: string | null }[];
};

type CatalogSkuVariantsPanelProps = {
  products: Product[];
  canCatalog: boolean;
  canCatalogRead: boolean;
  canPrice: boolean;
  onCreateVariant: (form: FormData) => Promise<unknown>;
  run: <T>(
    action: () => Promise<T>,
    success: string,
    options?: { refresh?: boolean; onSuccess?: (result: T) => void },
  ) => Promise<T | null>;
};

export function CatalogSkuVariantsPanel({
  products,
  canCatalog,
  canCatalogRead,
  canPrice,
  onCreateVariant,
  run,
}: CatalogSkuVariantsPanelProps) {
  const [showVariants, setShowVariants] = useState(true);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [focusVariantForm, setFocusVariantForm] = useState(false);

  const sortedProducts = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name, "az")),
    [products],
  );

  const variants = useMemo(
    () =>
      products
        .flatMap((product) =>
          product.variants.map((variant) => ({
            ...variant,
            productId: product.id,
            productName: product.name,
            brandName: product.brand?.name ?? null,
          })),
        )
        .sort((left, right) => left.sku.localeCompare(right.sku, "az")),
    [products],
  );

  useEffect(() => {
    if (!focusVariantForm || !showVariantForm) {
      return;
    }

    const form = document.getElementById("catalog-sku-variant-form");
    if (!form) {
      return;
    }

    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    form.querySelector<HTMLSelectElement>('select[name="productId"]')?.focus({
      preventScroll: true,
    });
    setFocusVariantForm(false);
  }, [focusVariantForm, showVariantForm]);

  function openVariantForm() {
    setShowVariants(true);
    setShowVariantForm(true);
    setFocusVariantForm(true);
  }

  if (!canCatalog && !canCatalogRead) {
    return null;
  }

  const canCreateVariant = canCatalog && canPrice;

  return (
    <section className="catalog-section" aria-label="SKU variantları">
      <div
        className="catalog-metrics catalog-metrics--single"
        aria-label="SKU statistikası"
      >
        <button
          type="button"
          className={`catalog-metric catalog-metric--interactive${showVariants ? " is-active" : ""}`}
          aria-expanded={showVariants}
          aria-controls="catalog-sku-variants-list"
          onClick={() => setShowVariants((current) => !current)}
        >
          <span className="catalog-metric__label">SKU / variant</span>
          <strong className="catalog-metric__value">{variants.length}</strong>
        </button>
      </div>

      <section
        id="catalog-sku-variants-list"
        className={`catalog-entity-list${showVariants ? " is-expanded" : ""}`}
        aria-label="SKU variant siyahısı"
      >
        <header className="catalog-entity-list__head">
          <button
            type="button"
            className="catalog-entity-list__toggle"
            aria-expanded={showVariants}
            aria-controls="catalog-sku-variants-list-body"
            onClick={() => setShowVariants((current) => !current)}
          >
            <span className="catalog-entity-list__chevron" aria-hidden="true" />
            <h2>SKU variantları</h2>
            <span className="catalog-entity-list__count">{variants.length}</span>
          </button>
          {canCreateVariant && (
            <button
              type="button"
              className="catalog-entity-list__create"
              onClick={openVariantForm}
            >
              Sku variant əlavə et
            </button>
          )}
        </header>

        {canCreateVariant && showVariantForm && (
          <form
            id="catalog-sku-variant-form"
            className="catalog-entity-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(
                () => onCreateVariant(form),
                "SKU və barkod yaradıldı",
                {
                  onSuccess: () => {
                    setShowVariantForm(false);
                  },
                },
              );
            }}
          >
            <header className="catalog-entity-form__head">
              <div className="catalog-entity-form__intro">
                <h3>Yeni SKU variant</h3>
                <p>SKU, barkod və satış qiymətini eyni addımda təyin edin.</p>
              </div>
              <button
                type="button"
                className="catalog-entity-form__close"
                aria-label="Formu bağla"
                onClick={() => setShowVariantForm(false)}
              >
                ×
              </button>
            </header>

            <div className="catalog-entity-form__fields">
              <label className="catalog-entity-form__field catalog-entity-form__field--full">
                <span>Məhsul</span>
                <select name="productId" required defaultValue="">
                  <option value="">Seçin</option>
                  {sortedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="catalog-entity-form__row">
                <label className="catalog-entity-form__field">
                  <span>Variant adı</span>
                  <input
                    name="name"
                    required
                    placeholder="Məs: 256GB / Qara"
                  />
                </label>
                <label className="catalog-entity-form__field">
                  <span>SKU</span>
                  <input
                    name="sku"
                    pattern="[A-Z0-9][A-Z0-9._-]{1,63}"
                    required
                    placeholder="NB-256-BLK"
                  />
                </label>
              </div>

              <div className="catalog-entity-form__row">
                <label className="catalog-entity-form__field">
                  <span>Barkod</span>
                  <input
                    name="barcode"
                    pattern="[0-9A-Za-z-]{4,64}"
                    placeholder="8690000000000"
                  />
                </label>
                <label className="catalog-entity-form__field">
                  <span>Qiymət (AZN)</span>
                  <input
                    name="price"
                    inputMode="decimal"
                    pattern="(0|[1-9][0-9]*)(\.[0-9]{1,2})?"
                    required
                    placeholder="0.00"
                  />
                </label>
              </div>
            </div>

            <footer className="catalog-entity-form__actions">
              <button
                type="button"
                className="catalog-entity-form__cancel"
                onClick={() => setShowVariantForm(false)}
              >
                Ləğv et
              </button>
              <button type="submit" className="catalog-entity-form__submit">
                SKU yarat
              </button>
            </footer>
          </form>
        )}

        <div
          id="catalog-sku-variants-list-body"
          className="catalog-entity-list__body"
          aria-hidden={!showVariants}
        >
          <div className="catalog-entity-list__body-inner">
            {variants.length === 0 ? (
              <p className="pos-empty">Hələ SKU variant yoxdur.</p>
            ) : (
              <div className="data-list">
                {variants.map((variant) => (
                  <div key={variant.id} className="data-row">
                    <div>
                      <strong>{variant.sku}</strong>
                      <span className="data-row__meta">
                        {variant.productName}
                        {variant.brandName ? ` · ${variant.brandName}` : ""}
                        {variant.barcode ? ` · ${variant.barcode}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
