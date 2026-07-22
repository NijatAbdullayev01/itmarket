"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { getInventoryLocationLabel, pickDefaultInventoryLocationId } from "../../lib/inventory-location-label";
import {
  buildReceiptRequestBody,
  buildReceiptIntakeVariantSku,
  filterReceiptCatalogBrands,
  filterReceiptCatalogModels,
  findExistingProductForReceiptIntake,
  findReceiptCatalogMatchByBarcode,
  findReceiptVariantForCatalogInput,
  findVariantIdByBarcode,
  hasReceiptVariantCatalogSearch,
  receiptVariantMatchesCatalogSearch,
  receiptIntakeProductHasRequiredSpecs,
  shouldCollectReceiptIntakeRequiredSpecs,
  validateReceiptIntakeFields,
  validateReceiptIntakeRequiredSpecs,
  validateReceiptSourceDescription,
  type ReceiptCatalogProduct,
} from "../../lib/inventory-receipt-intake";
import { getBackofficeProductDisplayTitle } from "../../lib/product-display-title";
import {
  parseProductRequiredSpecs,
  requiredSpecEntriesToRows,
} from "../../lib/product-existing-catalog";
import {
  createEmptyRequiredSpecRow,
  isColorSpecLabel,
  METER_SPEC_LABEL,
  TEMPORARY_MEMORY_SPEC_LABEL,
  type ProductRequiredSpecRow,
} from "../../lib/product-required-specs";

import { CatalogColorSpecSelect } from "./catalog-color-spec-select";

import type {
  InventoryLocation,
  InventoryMovementRow,
} from "./inventory-balance-panel";

type CatalogProduct = ReceiptCatalogProduct & {
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    attributes?: unknown;
  }[];
};

type BrandOption = { id: string; name: string };

type VariantOption = {
  id: string;
  sku: string;
  barcode: string | null;
  label: string;
  brandName: string;
  modelName: string;
};

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

const MOVEMENTS_LIMIT = 20;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("az-AZ");
}

function defaultReceiptDocumentId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `GRN-${stamp}-001`;
}

type ReceiptCatalogComboboxProps<T> = {
  inputId: string;
  value: string;
  placeholder: string;
  required?: boolean;
  listAriaLabel: string;
  suggestions: T[];
  getKey: (item: T) => string;
  getPrimaryLabel: (item: T) => string;
  getMetaLabel?: (item: T) => string | null | undefined;
  onValueChange: (next: string) => void;
  onSelect: (item: T) => void;
};

function ReceiptCatalogCombobox<T>({
  inputId,
  value,
  placeholder,
  required,
  listAriaLabel,
  suggestions,
  getKey,
  getPrimaryLabel,
  getMetaLabel,
  onValueChange,
  onSelect,
}: ReceiptCatalogComboboxProps<T>) {
  const listId = useId();
  const blurCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    return () => {
      if (blurCloseTimeoutRef.current !== null) {
        clearTimeout(blurCloseTimeoutRef.current);
      }
    };
  }, []);

  function clearBlurCloseTimeout() {
    if (blurCloseTimeoutRef.current !== null) {
      clearTimeout(blurCloseTimeoutRef.current);
      blurCloseTimeoutRef.current = null;
    }
  }

  function openList() {
    setIsOpen(true);
    setActiveIndex(-1);
  }

  function closeList() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function selectSuggestion(item: T) {
    clearBlurCloseTimeout();
    closeList();
    onSelect(item);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(event.target.value);
    openList();
  }

  function handleInputFocus() {
    clearBlurCloseTimeout();
    openList();
  }

  function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget instanceof Node &&
      event.currentTarget
        .closest(".catalog-product-name-combobox")
        ?.contains(relatedTarget)
    ) {
      return;
    }

    clearBlurCloseTimeout();
    blurCloseTimeoutRef.current = setTimeout(() => {
      closeList();
    }, 120);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const selected = suggestions[activeIndex];
      if (selected !== undefined) {
        selectSuggestion(selected);
      }
    }
  }

  const showSuggestions =
    isOpen && value.trim() !== "" && suggestions.length > 0;
  const activeDescendantId =
    activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;

  return (
    <div className="catalog-product-name-combobox">
      <input
        id={inputId}
        type="search"
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls={showSuggestions ? listId : undefined}
        aria-activedescendant={activeDescendantId}
        aria-autocomplete="list"
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
      />
      {showSuggestions ? (
        <ul
          id={listId}
          className="catalog-product-name-combobox__list"
          role="listbox"
          aria-label={listAriaLabel}
        >
          {suggestions.map((item, index) => {
            const isActive = index === activeIndex;
            const meta = getMetaLabel?.(item);
            return (
              <li key={getKey(item)} role="presentation">
                <button
                  id={`${listId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={
                    isActive
                      ? "catalog-product-name-combobox__option is-active"
                      : "catalog-product-name-combobox__option"
                  }
                  onPointerDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectSuggestion(item);
                  }}
                >
                  <span className="catalog-product-name-combobox__option-name">
                    {getPrimaryLabel(item)}
                  </span>
                  {meta ? (
                    <span className="catalog-product-name-combobox__option-meta">
                      {meta}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

type InventoryReceiptPanelProps = {
  products: CatalogProduct[];
  brands: BrandOption[];
  locations: InventoryLocation[];
  canReceipt: boolean;
  canInventoryRead: boolean;
  refreshKey: number;
  run: RunFn;
  fetchMovements: (limit: number) => Promise<InventoryMovementRow[]>;
  onReceipt: (payload: Record<string, unknown>) => Promise<unknown>;
};

export function InventoryReceiptPanel({
  products,
  brands,
  locations,
  canReceipt,
  canInventoryRead,
  refreshKey,
  run,
  fetchMovements,
  onReceipt,
}: InventoryReceiptPanelProps) {
  const variantSelectId = useId();
  const barcodeFieldId = useId();
  const intakeBrandId = useId();
  const intakeModelId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const variantOptions = useMemo<VariantOption[]>(
    () =>
      products.flatMap((product) =>
        product.variants.map((variant) => {
          const title = getBackofficeProductDisplayTitle(product, variant);
          const label = `${title} · ${variant.sku}`;
          return {
            id: variant.id,
            sku: variant.sku,
            barcode: variant.barcode,
            label,
            brandName: product.brand?.name ?? "",
            modelName: product.name,
          };
        }),
      ),
    [products],
  );

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeHint, setBarcodeHint] = useState("");
  const [intakeMode, setIntakeMode] = useState(false);
  const [intakeBrandName, setIntakeBrandName] = useState("");
  const [intakeModelName, setIntakeModelName] = useState("");
  const [intakeError, setIntakeError] = useState("");
  const [requiredSpecRows, setRequiredSpecRows] = useState<ProductRequiredSpecRow[]>(
    [],
  );
  const [requiredSpecErrors, setRequiredSpecErrors] = useState<string[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRow[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [receiptDetailsKey, setReceiptDetailsKey] = useState(0);

  const catalogVariantMatch = useMemo(
    () =>
      findReceiptVariantForCatalogInput(products, {
        brandName: intakeBrandName,
        modelName: intakeModelName,
        barcode: barcodeInput,
      }),
    [products, intakeBrandName, intakeModelName, barcodeInput],
  );

  const resolvedVariantOption = useMemo(
    () =>
      catalogVariantMatch === undefined
        ? undefined
        : variantOptions.find(
            (option) => option.id === catalogVariantMatch.variantId,
          ),
    [catalogVariantMatch, variantOptions],
  );

  const variantCatalogSearch = useMemo(
    () => ({
      brandName: intakeBrandName,
      modelName: intakeModelName,
      barcode: barcodeInput,
    }),
    [intakeBrandName, intakeModelName, barcodeInput],
  );

  const filteredVariants = useMemo(() => {
    if (!hasReceiptVariantCatalogSearch(variantCatalogSearch)) {
      return [];
    }

    if (catalogVariantMatch !== undefined) {
      const matched = variantOptions.find(
        (option) => option.id === catalogVariantMatch.variantId,
      );
      return matched !== undefined ? [matched] : [];
    }

    const brand = intakeBrandName.trim();
    const model = intakeModelName.trim();
    const barcode = barcodeInput.trim();

    if (brand === "" && model === "" && barcode.length >= 3) {
      if (selectedVariantId === "") {
        return [];
      }
      const selected = variantOptions.find(
        (option) => option.id === selectedVariantId,
      );
      return selected !== undefined ? [selected] : [];
    }

    const base = variantOptions.filter((option) =>
      receiptVariantMatchesCatalogSearch(
        {
          name: option.modelName,
          brand: option.brandName ? { name: option.brandName } : null,
        },
        {
          brandName: intakeBrandName,
          modelName: intakeModelName,
        },
      ),
    );
    const selected = variantOptions.find(
      (option) => option.id === selectedVariantId,
    );
    if (
      selected !== undefined &&
      !base.some((option) => option.id === selected.id)
    ) {
      return [selected, ...base];
    }
    return base;
  }, [
    variantOptions,
    selectedVariantId,
    intakeBrandName,
    intakeModelName,
    barcodeInput,
    catalogVariantMatch,
    variantCatalogSearch,
  ]);

  const hasBrandAndModelForVariant =
    intakeBrandName.trim() !== "" && intakeModelName.trim() !== "";

  const showVariantPicker =
    !intakeMode &&
    filteredVariants.length > 0 &&
    (hasBrandAndModelForVariant ||
      (selectedVariantId !== "" && resolvedVariantOption !== undefined));

  const catalogBrandSuggestions = useMemo(
    () => filterReceiptCatalogBrands(brands, intakeBrandName),
    [brands, intakeBrandName],
  );

  const catalogModelSuggestions = useMemo(
    () =>
      filterReceiptCatalogModels(products, {
        brandName: intakeBrandName,
        modelQuery: intakeModelName,
      }),
    [products, intakeBrandName, intakeModelName],
  );

  const receiptMovements = useMemo(
    () => movements.filter((movement) => movement.type === "RECEIPT"),
    [movements],
  );

  const matchedExistingProduct = useMemo(() => {
    if (!intakeMode) {
      return undefined;
    }
    return findExistingProductForReceiptIntake(products, {
      brandName: intakeBrandName,
      modelName: intakeModelName,
    });
  }, [intakeMode, intakeBrandName, intakeModelName, products]);

  const showReceiptRequiredSpecs = shouldCollectReceiptIntakeRequiredSpecs({
    intakeMode,
  });

  const intakeProductHasSpecTemplate = receiptIntakeProductHasRequiredSpecs(
    matchedExistingProduct,
  );

  const defaultLocationId = useMemo(
    () => pickDefaultInventoryLocationId(locations),
    [locations],
  );

  const loadMovements = useCallback(async () => {
    if (!canInventoryRead) {
      setMovements([]);
      return;
    }
    setMovementsLoading(true);
    try {
      setMovements(await fetchMovements(MOVEMENTS_LIMIT));
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }, [canInventoryRead, fetchMovements]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements, refreshKey]);

  useEffect(() => {
    if (!intakeMode) {
      setRequiredSpecRows([]);
      setRequiredSpecErrors([]);
      return;
    }
    if (intakeProductHasSpecTemplate && matchedExistingProduct !== undefined) {
      setRequiredSpecRows(
        requiredSpecEntriesToRows(
          parseProductRequiredSpecs(matchedExistingProduct.requiredSpecs),
        ),
      );
    } else {
      setRequiredSpecRows([createEmptyRequiredSpecRow()]);
    }
    setRequiredSpecErrors([]);
  }, [
    intakeMode,
    intakeProductHasSpecTemplate,
    matchedExistingProduct,
    intakeBrandName,
    intakeModelName,
  ]);

  useEffect(() => {
    if (hasReceiptVariantCatalogSearch(variantCatalogSearch)) {
      return;
    }
    setSelectedVariantId("");
    setBarcodeHint("");
  }, [variantCatalogSearch]);

  useEffect(() => {
    const brand = intakeBrandName.trim();
    const model = intakeModelName.trim();
    const barcode = barcodeInput.trim();

    if (brand !== "" && model !== "") {
      if (catalogVariantMatch !== undefined) {
        setIntakeMode(false);
        setIntakeError("");
        setSelectedVariantId(catalogVariantMatch.variantId);
        setBarcodeHint("");
        return;
      }

      const byBarcode =
        barcode.length >= 3
          ? findVariantIdByBarcode(products, barcodeInput)
          : undefined;
      if (byBarcode === undefined) {
        setIntakeMode(true);
        setSelectedVariantId("");
        setIntakeError("");
        setBarcodeHint(
          barcode.length >= 3
            ? "Bu barkod məhsul siyahısında yoxdur. Yuxarıda brend və model daxil edib yeni məhsul qəbul edin."
            : "Barkod boşdur — qəbul zamanı avtomatik 13 rəqəmli barkod yaradılacaq.",
        );
      } else {
        setIntakeMode(false);
        setSelectedVariantId("");
        setIntakeError("");
        setBarcodeHint(
          "Barkod məhsul siyahısında var, amma daxil etdiyiniz brend/model ilə uyğun gəlmir.",
        );
      }
      return;
    }

    if (barcode.length < 3) {
      return;
    }

    const match = findReceiptCatalogMatchByBarcode(products, barcodeInput);
    if (match === undefined) {
      setIntakeMode(true);
      setSelectedVariantId("");
      setIntakeError("");
      setBarcodeHint(
        "Bu barkod məhsul siyahısında yoxdur. Brend və model daxil edib yeni məhsul qəbul edin.",
      );
      return;
    }

    setIntakeMode(false);
    setIntakeError("");
    setSelectedVariantId(match.variantId);
    setIntakeBrandName(match.brandName);
    setIntakeModelName(match.modelName);
    setBarcodeHint(
      match.brandName !== ""
        ? `Tapıldı: ${match.brandName} · ${match.modelName}`
        : `Tapıldı: ${match.modelName}`,
    );
  }, [
    barcodeInput,
    catalogVariantMatch,
    intakeBrandName,
    intakeModelName,
    products,
  ]);

  function clearCatalogSearch() {
    setSelectedVariantId("");
    setBarcodeInput("");
    setBarcodeHint("");
    setIntakeMode(false);
    setIntakeBrandName("");
    setIntakeModelName("");
    setIntakeError("");
    setRequiredSpecRows([]);
    setRequiredSpecErrors([]);
  }

  function addRequiredSpecRow() {
    setRequiredSpecRows((current) => [...current, createEmptyRequiredSpecRow()]);
    setRequiredSpecErrors([]);
  }

  function updateRequiredSpecRow(
    rowId: string,
    patch: Partial<Pick<ProductRequiredSpecRow, "label" | "value" | "colorHex">>,
  ) {
    setRequiredSpecRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    );
    setRequiredSpecErrors([]);
  }

  function removeRequiredSpecRow(rowId: string) {
    setRequiredSpecRows((current) => current.filter((row) => row.id !== rowId));
    setRequiredSpecErrors([]);
  }

  function clearReceiptDetails() {
    setReceiptDetailsKey((key) => key + 1);
  }

  function resetFormFields() {
    formRef.current?.reset();
    clearCatalogSearch();
    clearReceiptDetails();
  }

  if (!canReceipt && !canInventoryRead) {
    return (
      <div className="inventory-receipt-page">
        <p className="pos-empty">
          Məhsul qəbulu üçün «inventory.receipt» icazəsi tələb olunur.
        </p>
      </div>
    );
  }

  return (
    <div className="inventory-receipt-page">
      <div className="inventory-receipt-layout">
        {canReceipt ? (
          <form
            ref={formRef}
            className="operation-card operation-card--no-hover inventory-receipt-form"
            aria-label="Məhsul qəbulu forması"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setIntakeError("");

              if (intakeMode) {
                const validationError = validateReceiptIntakeFields({
                  brandName: intakeBrandName,
                  modelName: intakeModelName,
                  barcode: barcodeInput,
                });
                if (validationError !== null) {
                  setIntakeError(validationError);
                  return;
                }

                if (showReceiptRequiredSpecs) {
                  const specValidation = validateReceiptIntakeRequiredSpecs({
                    rows: requiredSpecRows,
                    productHasTemplate: intakeProductHasSpecTemplate,
                  });
                  if (specValidation.errors.length > 0) {
                    setRequiredSpecErrors(specValidation.errors);
                  }
                  if (specValidation.intakeError !== null) {
                    setIntakeError(specValidation.intakeError);
                    return;
                  }
                  if (intakeProductHasSpecTemplate) {
                    const intakeVariantSku = buildReceiptIntakeVariantSku({
                      brandName: intakeBrandName,
                      modelName: intakeModelName,
                      requiredSpecEntries: specValidation.entries,
                    });
                    if (intakeVariantSku === "") {
                      setIntakeError(
                        "SKU yaratmaq üçün tələb olunan xüsusiyyət dəyərlərini daxil edin.",
                      );
                      return;
                    }
                  }
                }
              } else if (selectedVariantId === "") {
                setIntakeError(
                  hasReceiptVariantCatalogSearch(variantCatalogSearch)
                    ? "Variant seçin və ya yeni məhsul məlumatını daxil edin."
                    : "Məhsul tapmaq üçün brend, model və ya barkod daxil edin.",
                );
                return;
              }

              const sourceType = String(form.get("sourceType") ?? "");
              const sourceError = validateReceiptSourceDescription(sourceType);
              if (sourceError !== null) {
                setIntakeError(sourceError);
                return;
              }

              const normalizedIntakeSpecs =
                showReceiptRequiredSpecs
                  ? validateReceiptIntakeRequiredSpecs({
                      rows: requiredSpecRows,
                      productHasTemplate: intakeProductHasSpecTemplate,
                    })
                  : { entries: [], errors: [], intakeError: null };

              const intakeVariantSku =
                normalizedIntakeSpecs.entries.length > 0
                  ? buildReceiptIntakeVariantSku({
                      brandName: intakeBrandName,
                      modelName: intakeModelName,
                      requiredSpecEntries: normalizedIntakeSpecs.entries,
                    })
                  : "";

              const payload = buildReceiptRequestBody({
                variantId: selectedVariantId,
                intakeMode,
                brandName: intakeBrandName,
                modelName: intakeModelName,
                barcode: barcodeInput,
                locationId: String(form.get("locationId") ?? ""),
                quantity: Number(form.get("quantity")),
                sourceType,
                sourceDocumentId: String(form.get("sourceDocumentId") ?? ""),
                reason: String(form.get("reason") ?? ""),
                ...(normalizedIntakeSpecs.entries.length > 0
                  ? {
                      intakeRequiredSpecs: normalizedIntakeSpecs.entries,
                      ...(intakeVariantSku !== ""
                        ? { intakeVariantSku }
                        : {}),
                    }
                  : {}),
              });

              void run(
                () => onReceipt(payload),
                intakeMode
                  ? "Məhsul qeydə alındı və qəbul ledger-ə yazıldı"
                  : "Məhsul qəbulu ledger-ə yazıldı",
                {
                  refresh: true,
                  onSuccess: () => {
                    resetFormFields();
                  },
                },
              );
            }}
          >
            <header className="inventory-receipt-form__header">
              <h2>Məhsul məlumatları</h2>
              <p className="pos-meta">
                Brend, model və barkod ilə qəbul ediləcək variantı seçin; kataloqda
                olmayan məhsulu brend və model ilə qeydə ala bilərsiniz.
              </p>
            </header>

            <fieldset className="inventory-receipt-fieldset">
              <legend>Məhsul</legend>
              <div className="inventory-receipt-catalog-search">
                <label htmlFor={intakeBrandId}>
                  Brend
                  <ReceiptCatalogCombobox
                    inputId={intakeBrandId}
                    value={intakeBrandName}
                    placeholder="Məhsul brendini axtarın"
                    required={intakeMode}
                    listAriaLabel="Brend təklifləri"
                    suggestions={catalogBrandSuggestions}
                    getKey={(brand) => brand.id}
                    getPrimaryLabel={(brand) => brand.name}
                    onValueChange={(next) => {
                      setIntakeBrandName(next);
                      setIntakeError("");
                      if (!intakeMode) {
                        setSelectedVariantId("");
                      }
                    }}
                    onSelect={(brand) => {
                      setIntakeBrandName(brand.name);
                      setIntakeError("");
                      if (!intakeMode) {
                        setSelectedVariantId("");
                      }
                    }}
                  />
                </label>
                <label htmlFor={intakeModelId}>
                  Model
                  <ReceiptCatalogCombobox
                    inputId={intakeModelId}
                    value={intakeModelName}
                    placeholder="Məhsul modelini axtarın"
                    required={intakeMode}
                    listAriaLabel="Model təklifləri"
                    suggestions={catalogModelSuggestions}
                    getKey={(product) => product.id}
                    getPrimaryLabel={(product) => product.name}
                    getMetaLabel={(product) => {
                      const brand = product.brand?.name?.trim();
                      if (!brand) {
                        return null;
                      }
                      const filter = intakeBrandName.trim();
                      if (filter === "") {
                        return brand;
                      }
                      const brandNorm = brand.toLocaleLowerCase("az");
                      const filterNorm = filter.toLocaleLowerCase("az");
                      if (brandNorm.includes(filterNorm)) {
                        return null;
                      }
                      return brand;
                    }}
                    onValueChange={(next) => {
                      setIntakeModelName(next);
                      setIntakeError("");
                      if (!intakeMode) {
                        setSelectedVariantId("");
                      }
                    }}
                    onSelect={(product) => {
                      setIntakeModelName(product.name);
                      if (product.brand?.name) {
                        setIntakeBrandName(product.brand.name);
                      }
                      setIntakeError("");
                      if (!intakeMode) {
                        setSelectedVariantId("");
                      }
                    }}
                  />
                </label>
              </div>
              <label htmlFor={barcodeFieldId}>
                Barkod
                <input
                  id={barcodeFieldId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={barcodeInput}
                  placeholder="Skaner, əl ilə və ya boş buraxın"
                  onChange={(event) => {
                    setBarcodeInput(event.target.value);
                    setBarcodeHint("");
                    setIntakeError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                />
              </label>
              {barcodeHint ? (
                <p
                  className={
                    barcodeHint.includes("tapılmadı")
                      ? "form-error inventory-receipt-hint"
                      : "inventory-receipt-hint is-success"
                  }
                  role="status"
                >
                  {barcodeHint}
                </p>
              ) : null}

              {showReceiptRequiredSpecs ? (
                <div
                  className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-required-specs inventory-receipt-required-specs"
                  aria-live="polite"
                >
                  <span className="catalog-product-required-specs__heading">
                    Tələb olunan xüsusiyyətlər
                  </span>
                  <p className="catalog-product-required-specs__intro">
                    Hər sətirdə başlıq və dəyər daxil edin. Mağaza kartında və SKU
                    variantında istifadə olunacaq.
                  </p>
                  {requiredSpecRows.length > 0 ? (
                    <ul className="catalog-product-required-specs__list">
                      {requiredSpecRows.map((row, index) => (
                        <li
                          key={row.id}
                          className="catalog-product-required-specs__item catalog-product-required-specs__item--editable"
                        >
                          <label className="catalog-product-required-specs__field">
                            <span>Başlıq</span>
                            <input
                              value={row.label}
                              maxLength={120}
                              placeholder={`Məs: ${TEMPORARY_MEMORY_SPEC_LABEL}, Rəng və ya ${METER_SPEC_LABEL}`}
                              aria-label={`Xüsusiyyət ${index + 1} — başlıq`}
                              onChange={(event) =>
                                updateRequiredSpecRow(row.id, {
                                  label: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="catalog-product-required-specs__field">
                            <span>Dəyər</span>
                            {isColorSpecLabel(row.label) ? (
                              <CatalogColorSpecSelect
                                value={row.value}
                                colorHex={row.colorHex}
                                ariaLabel={`Xüsusiyyət ${index + 1} — dəyər`}
                                onChange={(nextValue, details) =>
                                  updateRequiredSpecRow(row.id, {
                                    value: nextValue,
                                    ...(details !== undefined
                                      ? { colorHex: details.colorHex }
                                      : {}),
                                  })
                                }
                              />
                            ) : (
                              <input
                                value={row.value}
                                maxLength={500}
                                placeholder="Məs: 16 GB"
                                aria-label={`Xüsusiyyət ${index + 1} — dəyər`}
                                onChange={(event) =>
                                  updateRequiredSpecRow(row.id, {
                                    value: event.target.value,
                                  })
                                }
                              />
                            )}
                          </label>
                          <button
                            type="button"
                            className="catalog-product-required-specs__remove"
                            onClick={() => removeRequiredSpecRow(row.id)}
                          >
                            Sil
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="catalog-product-required-specs__placeholder">
                      Hələ xüsusiyyət sətri yoxdur.
                    </p>
                  )}
                  <button
                    type="button"
                    className="catalog-product-required-specs__add"
                    onClick={addRequiredSpecRow}
                  >
                    Xüsusiyyət əlavə et
                  </button>
                  {requiredSpecErrors.length > 0 ? (
                    <div
                      className="catalog-product-required-specs__errors"
                      role="alert"
                    >
                      {requiredSpecErrors.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {intakeMode ? (
                <div className="inventory-receipt-intake">
                  <p className="pos-meta">
                    Məlumat bazasında tapılmayan məhsul — brend və model
                    kifayətdir. Məhsulda barkod yoxdursa, qəbul zamanı avtomatik
                    13 rəqəmli barkod yaradılır. Məhsulun tam məlumatlarını
                    məhsul yaradıcısı sonra özü tamamlayacaq.
                  </p>
                  {matchedExistingProduct !== undefined ? (
                    <p className="inventory-receipt-hint is-success" role="status">
                      Mövcud məhsul tapıldı: {matchedExistingProduct.name}. Yeni
                      variant bu barkodla əlavə olunacaq.
                    </p>
                  ) : null}
                  {intakeError ? (
                    <p className="form-error inventory-receipt-hint" role="alert">
                      {intakeError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {showVariantPicker ? (
                <div className="inventory-receipt-variant-field">
                  <label htmlFor={variantSelectId}>
                    Variant
                    <select
                      id={variantSelectId}
                      name="variantId"
                      required
                      value={selectedVariantId}
                      onChange={(event) => {
                        setIntakeMode(false);
                        setIntakeError("");
                        setSelectedVariantId(event.target.value);
                        const match = variantOptions.find(
                          (option) => option.id === event.target.value,
                        );
                        if (match?.barcode) {
                          setBarcodeInput(match.barcode);
                        }
                      }}
                    >
                      <option value="" disabled>
                        {filteredVariants.length === 0
                          ? "Uyğun variant yoxdur"
                          : resolvedVariantOption
                            ? resolvedVariantOption.label
                            : "Seçin"}
                      </option>
                      {filteredVariants.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <button
                type="button"
                className="catalog-subcategories-form__cancel inventory-receipt-variant-clear"
                onClick={clearCatalogSearch}
              >
                Təmizlə
              </button>
            </fieldset>

            <fieldset
              key={receiptDetailsKey}
              className="inventory-receipt-fieldset"
            >
              <legend>Qəbul detalları</legend>
              <label>
                Məntəqə
                <select
                  name="locationId"
                  required
                  defaultValue={defaultLocationId}
                  key={defaultLocationId}
                >
                  {locations.length === 0 ? (
                    <option value="" disabled>
                      Əvvəlcə stok məntəqəsi yaradın
                    </option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Seçin
                      </option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {getInventoryLocationLabel(location)}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>
              <label>
                Miqdar
                <input name="quantity" type="number" min={1} required />
              </label>
              <label>
                Mənbə
                <input
                  name="sourceType"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="organization"
                  placeholder="Məs: ABC LLC (Azərbaycan), idxal — Çin / Türkiyə"
                />
              </label>
              <label>
                Sənəd nömrəsi
                <input
                  name="sourceDocumentId"
                  required
                  defaultValue={defaultReceiptDocumentId()}
                  autoComplete="off"
                />
              </label>
              <label>
                Qeyd
                <textarea
                  name="reason"
                  minLength={3}
                  required
                  placeholder="Məsələn: PO üzrə ilkin qəbul"
                />
              </label>
              <button
                type="button"
                className="catalog-subcategories-form__cancel inventory-receipt-variant-clear"
                onClick={clearReceiptDetails}
              >
                Təmizlə
              </button>
            </fieldset>

            <footer className="inventory-receipt-form__actions">
              {intakeError && !intakeMode ? (
                <p className="form-error" role="alert">
                  {intakeError}
                </p>
              ) : null}
              <div className="inventory-receipt-form__actions-buttons">
                <button type="submit" disabled={locations.length === 0}>
                  Qəbul et
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <article className="operation-card">
            <h2>Qəbul forması</h2>
            <p className="pos-empty">
              Qəbul əməliyyatı üçün «inventory.receipt» icazəsi lazımdır.
            </p>
          </article>
        )}

        {canInventoryRead ? (
          <aside
            className="operation-card operation-card--no-hover inventory-receipt-history"
            aria-label="Son qəbul hərəkətləri"
          >
            <h2>Son qəbul hərəkətləri</h2>
            {movementsLoading && receiptMovements.length === 0 ? (
              <p className="pos-empty">Yüklənir…</p>
            ) : receiptMovements.length === 0 ? (
              <p className="pos-empty">Hələ qəbul qeydi yoxdur.</p>
            ) : (
              <div className="data-list inventory-receipt-history__list">
                {receiptMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="data-row inventory-receipt-history__row"
                  >
                    <div className="inventory-receipt-history__details">
                      <div className="inventory-receipt-history__field">
                        <span className="inventory-receipt-history__label">
                          Miqdar
                        </span>
                        <strong className="inventory-receipt-history__value">
                          +{movement.quantityDelta}
                        </strong>
                      </div>
                      <div className="inventory-receipt-history__field">
                        <span className="inventory-receipt-history__label">
                          Sənəd nömrəsi
                        </span>
                        <strong className="inventory-receipt-history__value">
                          {movement.sourceDocumentId}
                        </strong>
                      </div>
                      <div className="inventory-receipt-history__field">
                        <span className="inventory-receipt-history__label">
                          Mənbə
                        </span>
                        <span className="inventory-receipt-history__value">
                          {movement.sourceType}
                        </span>
                      </div>
                      <div className="inventory-receipt-history__field">
                        <span className="inventory-receipt-history__label">
                          Qeyd
                        </span>
                        <span className="inventory-receipt-history__value">
                          {movement.reason}
                        </span>
                      </div>
                      <div className="inventory-receipt-history__field">
                        <span className="inventory-receipt-history__label">
                          Qəbul edən
                        </span>
                        <span className="inventory-receipt-history__value">
                          {movement.actorStaff !== null ? (
                            <>
                              <strong>{movement.actorStaff.displayName}</strong>
                              <span className="inventory-receipt-history__meta">
                                {movement.actorStaff.email}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="inventory-receipt-history__field inventory-receipt-history__field--date">
                      <span className="inventory-receipt-history__label">
                        Tarix
                      </span>
                      <small>{formatDateTime(movement.createdAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
