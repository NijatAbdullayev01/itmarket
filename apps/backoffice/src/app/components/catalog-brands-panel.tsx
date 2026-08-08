"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { brandLogoFitStyle, useConfirmDialog } from "@itmarket/ui";
import type {
  CatalogSeoSuggestRequestContract,
  CatalogSeoSuggestResponseContract,
} from "@itmarket/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { slugify } from "../../lib/slugify";
import { uploadCatalogBrandLogoFile } from "../../lib/upload-catalog-brand-logo";
import { CatalogSeoSuggestFields } from "./catalog-seo-suggest-fields";

type Brand = {
  id: string;
  name: string;
  slug?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  logoObjectKey?: string | null;
  logoMimeType?: string | null;
  logoByteSize?: number | null;
  logoScalePercent?: number | null;
  logoOffsetX?: number | null;
  logoOffsetY?: number | null;
};

export type BrandLogoPayload = {
  logoObjectKey?: string | null;
  logoMimeType?: string | null;
  logoByteSize?: number | null;
  logoScalePercent?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
};

type BrandLogoFitValues = {
  logoScalePercent: number;
  logoOffsetX: number;
  logoOffsetY: number;
};

const LOGO_SCALE_MIN = 40;
const LOGO_SCALE_MAX = 200;
const LOGO_OFFSET_MIN = -50;
const LOGO_OFFSET_MAX = 50;
const DEFAULT_LOGO_FIT: BrandLogoFitValues = {
  logoScalePercent: 100,
  logoOffsetX: 0,
  logoOffsetY: 0,
};

function isBrandActive(brand: Brand) {
  return brand.status !== "DRAFT" && brand.status !== "ARCHIVED";
}

function resolveBrandLogoPreview(logoObjectKey?: string | null) {
  if (
    typeof logoObjectKey === "string" &&
    (logoObjectKey.startsWith("/") ||
      logoObjectKey.startsWith("http://") ||
      logoObjectKey.startsWith("https://"))
  ) {
    return logoObjectKey;
  }
  return null;
}

function readBrandLogoFit(brand: Pick<Brand, keyof BrandLogoFitValues>): BrandLogoFitValues {
  return {
    logoScalePercent: brand.logoScalePercent ?? DEFAULT_LOGO_FIT.logoScalePercent,
    logoOffsetX: brand.logoOffsetX ?? DEFAULT_LOGO_FIT.logoOffsetX,
    logoOffsetY: brand.logoOffsetY ?? DEFAULT_LOGO_FIT.logoOffsetY,
  };
}

function clampLogoFitValue(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

type CatalogBrandsPanelProps = {
  brands: Brand[];
  canCatalog: boolean;
  canCatalogRead: boolean;
  onCreateBrand: (form: FormData, logo: BrandLogoPayload | null) => Promise<unknown>;
  onUpdateBrand: (brand: Brand, form: FormData) => Promise<unknown>;
  onDeleteBrand: (brandId: string) => Promise<unknown>;
  onUpdateBrandStatus: (brand: Brand) => Promise<unknown>;
  onUpdateBrandLogo: (brand: Brand, logo: BrandLogoPayload) => Promise<unknown>;
  suggestSeo: (
    input: CatalogSeoSuggestRequestContract,
  ) => Promise<CatalogSeoSuggestResponseContract>;
  run: RunFn;
};

type BrandFieldKey = "name" | "slug" | "logo";

type BrandFieldErrors = Partial<Record<BrandFieldKey, string>>;

const BRAND_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BRAND_LOGO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const BRAND_LOGO_MAX_BYTES = 5_000_000;

function readBrandField(formData: FormData, key: BrandFieldKey) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveBrandSlug(name: string, slug: string) {
  const trimmedSlug = slug.trim();
  if (trimmedSlug !== "") {
    return trimmedSlug;
  }

  return slugify(name);
}

function validateBrandForm(formData: FormData): BrandFieldErrors {
  const errors: BrandFieldErrors = {};
  const name = readBrandField(formData, "name");
  const slug = resolveBrandSlug(name, readBrandField(formData, "slug"));

  if (name === "") {
    errors.name = "Ad tələb olunur";
  }

  if (slug === "") {
    errors.slug = "Slug tələb olunur";
  } else if (!BRAND_SLUG_PATTERN.test(slug)) {
    errors.slug = "Slug kiçik hərflər, rəqəmlər və tire ilə yazılmalıdır";
  }

  return errors;
}

function normalizeBrandLogoClientMime(type: string): string {
  const normalized = type.trim().toLowerCase();
  if (normalized === "image/jpg" || normalized === "image/pjpeg") {
    return "image/jpeg";
  }
  return normalized;
}

function validateBrandLogoFile(file: File): string | null {
  const mime = normalizeBrandLogoClientMime(file.type);
  // Empty type: let the server sniff magic bytes (some OS/file pickers omit MIME).
  if (mime !== "" && !BRAND_LOGO_MIME.has(mime)) {
    return "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur";
  }
  if (file.size < 1 || file.size > BRAND_LOGO_MAX_BYTES) {
    return "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur";
  }
  return null;
}

function BrandLogoFitControls({
  previewSrc,
  fit,
  onChange,
  idPrefix,
  showPreview = true,
}: {
  previewSrc: string;
  fit: BrandLogoFitValues;
  onChange: (next: BrandLogoFitValues) => void;
  idPrefix: string;
  showPreview?: boolean;
}) {
  const previewStyle = brandLogoFitStyle(fit) as CSSProperties | undefined;

  return (
    <div className="catalog-brands-logo-fit">
      {showPreview ? (
        <div className="catalog-brands-logo-fit__preview" aria-hidden="true">
          <div className="catalog-brands-logo-fit__frame">
            <img src={previewSrc} alt="" style={previewStyle} />
          </div>
          <span className="catalog-brands-logo-fit__preview-label">
            Brend zolağı önizləməsi
          </span>
        </div>
      ) : null}

      <div className="catalog-brands-logo-fit__controls">
        <label className="catalog-brands-logo-fit__field" htmlFor={`${idPrefix}-scale`}>
          <span className="catalog-brands-logo-fit__field-label">
            Ölçü <strong>{fit.logoScalePercent}%</strong>
          </span>
          <input
            id={`${idPrefix}-scale`}
            type="range"
            min={LOGO_SCALE_MIN}
            max={LOGO_SCALE_MAX}
            step={1}
            value={fit.logoScalePercent}
            onChange={(event) =>
              onChange({
                ...fit,
                logoScalePercent: clampLogoFitValue(
                  Number(event.target.value),
                  LOGO_SCALE_MIN,
                  LOGO_SCALE_MAX,
                ),
              })
            }
          />
        </label>

        <label className="catalog-brands-logo-fit__field" htmlFor={`${idPrefix}-offset-x`}>
          <span className="catalog-brands-logo-fit__field-label">
            Üfüqi yerləşmə <strong>{fit.logoOffsetX}</strong>
          </span>
          <input
            id={`${idPrefix}-offset-x`}
            type="range"
            min={LOGO_OFFSET_MIN}
            max={LOGO_OFFSET_MAX}
            step={1}
            value={fit.logoOffsetX}
            onChange={(event) =>
              onChange({
                ...fit,
                logoOffsetX: clampLogoFitValue(
                  Number(event.target.value),
                  LOGO_OFFSET_MIN,
                  LOGO_OFFSET_MAX,
                ),
              })
            }
          />
        </label>

        <label className="catalog-brands-logo-fit__field" htmlFor={`${idPrefix}-offset-y`}>
          <span className="catalog-brands-logo-fit__field-label">
            Şaquli yerləşmə <strong>{fit.logoOffsetY}</strong>
          </span>
          <input
            id={`${idPrefix}-offset-y`}
            type="range"
            min={LOGO_OFFSET_MIN}
            max={LOGO_OFFSET_MAX}
            step={1}
            value={fit.logoOffsetY}
            onChange={(event) =>
              onChange({
                ...fit,
                logoOffsetY: clampLogoFitValue(
                  Number(event.target.value),
                  LOGO_OFFSET_MIN,
                  LOGO_OFFSET_MAX,
                ),
              })
            }
          />
        </label>

        <button
          type="button"
          className="catalog-brands-logo-fit__reset"
          onClick={() => onChange({ ...DEFAULT_LOGO_FIT })}
        >
          Sıfırla
        </button>
      </div>
    </div>
  );
}

function BrandLogoManageDialog({
  brandName,
  previewSrc,
  fit,
  pending,
  fitOpen,
  onChangeFit,
  onToggleFit,
  onPickFile,
  onRemoveLogo,
  onCancel,
  onSaveFit,
}: {
  brandName: string;
  previewSrc: string | null;
  fit: BrandLogoFitValues;
  pending: boolean;
  fitOpen: boolean;
  onChangeFit: (next: BrandLogoFitValues) => void;
  onToggleFit: () => void;
  onPickFile: () => void;
  onRemoveLogo: () => void;
  onCancel: () => void;
  onSaveFit: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const hasLogo = previewSrc !== null;
  const previewStyle = hasLogo
    ? (brandLogoFitStyle(fit) as CSSProperties | undefined)
    : undefined;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pending, onCancel]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="ui-modal" role="presentation">
      <button
        type="button"
        className="ui-modal__backdrop"
        aria-label="Bağla"
        disabled={pending}
        onClick={() => {
          if (!pending) {
            onCancel();
          }
        }}
      />
      <div
        className="ui-modal__dialog catalog-brands-logo-manage-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="catalog-brands-logo-manage__header">
          <h2 className="catalog-brands-logo-manage__title" id={titleId}>
            <span className="catalog-brands-logo-manage__brand">{brandName}</span>
            <span className="catalog-brands-logo-manage__title-sep" aria-hidden="true">
              —
            </span>
            <span className="catalog-brands-logo-manage__title-suffix">loqo</span>
          </h2>
          <p className="catalog-brands-logo-manage__message" id={descriptionId}>
            {hasLogo
              ? "Loqonu dəyişin, ölçüsünü tənzimləyin və ya silin."
              : "Brend zolağı üçün loqo əlavə edin."}
          </p>
        </header>

        <div className="catalog-brands-logo-manage__body">
          <div className="catalog-brands-logo-manage__stage" aria-hidden="true">
            <div
              className={[
                "catalog-brands-logo-manage__frame",
                hasLogo ? "" : "catalog-brands-logo-manage__frame--empty",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {hasLogo ? (
                <img src={previewSrc} alt="" style={previewStyle} />
              ) : (
                <span className="catalog-brands-logo-manage__empty-label">
                  Logo yoxdur
                </span>
              )}
            </div>
          </div>

          <div
            className={[
              "catalog-brands-logo-manage__toolbar",
              hasLogo
                ? "catalog-brands-logo-manage__toolbar--triple"
                : "catalog-brands-logo-manage__toolbar--single",
            ].join(" ")}
            role="group"
            aria-label="Loqo əməliyyatları"
          >
            <button
              type="button"
              className="catalog-brands-logo-manage__tool catalog-brands-logo-manage__tool--primary"
              disabled={pending}
              onClick={onPickFile}
            >
              {pending
                ? "Yüklənir…"
                : hasLogo
                  ? "Logo dəyiş"
                  : "Logo əlavə et"}
            </button>
            {hasLogo ? (
              <>
                <button
                  type="button"
                  className={[
                    "catalog-brands-logo-manage__tool",
                    "catalog-brands-logo-manage__tool--secondary",
                    fitOpen ? "catalog-brands-logo-manage__tool--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={pending}
                  aria-pressed={fitOpen}
                  onClick={onToggleFit}
                >
                  Ölçü
                </button>
                <button
                  type="button"
                  className="catalog-brands-logo-manage__tool catalog-brands-logo-manage__tool--danger"
                  disabled={pending}
                  onClick={onRemoveLogo}
                >
                  Logo sil
                </button>
              </>
            ) : null}
          </div>

          {hasLogo && fitOpen ? (
            <div className="catalog-brands-logo-manage__fit">
              <BrandLogoFitControls
                idPrefix="brand-logo-manage-fit"
                previewSrc={previewSrc}
                fit={fit}
                onChange={onChangeFit}
                showPreview={false}
              />
            </div>
          ) : null}
        </div>

        <footer className="catalog-brands-logo-manage__footer">
          {hasLogo && fitOpen ? (
            <>
              <button
                type="button"
                className="catalog-subcategories-form__cancel"
                disabled={pending}
                onClick={onCancel}
              >
                Ləğv et
              </button>
              <button
                type="button"
                className="catalog-subcategories-form__submit"
                disabled={pending}
                onClick={onSaveFit}
              >
                {pending ? "Saxlanılır…" : "Yadda saxla"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="catalog-subcategories-form__cancel"
              disabled={pending}
              onClick={onCancel}
            >
              Bağla
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function BrandListView({
  brands,
  canCatalog,
  onEditBrand,
  onDeleteBrand,
  onUpdateBrandStatus,
  onUpdateBrandLogo,
  run,
}: {
  brands: Brand[];
  canCatalog: boolean;
  onEditBrand: (brandId: string) => void;
  onDeleteBrand: (brandId: string) => Promise<unknown>;
  onUpdateBrandStatus: (brand: Brand) => Promise<unknown>;
  onUpdateBrandLogo: (brand: Brand, logo: BrandLogoPayload) => Promise<unknown>;
  run: RunFn;
}) {
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const [searchQuery, setSearchQuery] = useState("");
  const [logoEditorBrand, setLogoEditorBrand] = useState<Brand | null>(null);
  const [fitDraft, setFitDraft] = useState<BrandLogoFitValues>(DEFAULT_LOGO_FIT);
  const [fitPanelOpen, setFitPanelOpen] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const sortedBrands = useMemo(
    () => [...brands].sort((left, right) => left.name.localeCompare(right.name, "az")),
    [brands],
  );

  const filteredBrands = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("az");

    if (normalizedQuery === "") {
      return sortedBrands;
    }

    return sortedBrands.filter(
      (brand) =>
        brand.name.toLocaleLowerCase("az").includes(normalizedQuery) ||
        (brand.slug ?? "").toLocaleLowerCase("az").includes(normalizedQuery),
    );
  }, [searchQuery, sortedBrands]);

  const isFiltering = searchQuery.trim() !== "";
  const activeLogoBrand = useMemo(() => {
    if (logoEditorBrand === null) {
      return null;
    }

    const fromList = brands.find((entry) => entry.id === logoEditorBrand.id);
    if (fromList === undefined) {
      return logoEditorBrand;
    }

    // Keep dialog logo fields from the editor draft so a successful upload is
    // visible immediately even before (or if) the brands list refresh lands.
    return {
      ...fromList,
      logoObjectKey: logoEditorBrand.logoObjectKey,
      logoMimeType: logoEditorBrand.logoMimeType,
      logoByteSize: logoEditorBrand.logoByteSize,
      logoScalePercent: logoEditorBrand.logoScalePercent,
      logoOffsetX: logoEditorBrand.logoOffsetX,
      logoOffsetY: logoEditorBrand.logoOffsetY,
    };
  }, [brands, logoEditorBrand]);
  const logoEditorPreview =
    activeLogoBrand === null
      ? null
      : resolveBrandLogoPreview(activeLogoBrand.logoObjectKey);

  function openLogoEditor(brand: Brand) {
    setLogoEditorBrand(brand);
    setFitDraft(readBrandLogoFit(brand));
    setFitPanelOpen(false);
  }

  function closeLogoEditor() {
    if (logoBusy) {
      return;
    }
    setLogoEditorBrand(null);
    setFitPanelOpen(false);
  }

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const brand = activeLogoBrand;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (brand === null || file === undefined) {
      return;
    }

    const validationError = validateBrandLogoFile(file);
    if (validationError !== null) {
      void run(async () => {
        throw new Error(validationError);
      }, "");
      return;
    }

    setLogoBusy(true);
    void run(
      async () => {
        const uploaded = await uploadCatalogBrandLogoFile(file);
        const payload: BrandLogoPayload = {
          logoObjectKey: uploaded.objectKey,
          logoMimeType: uploaded.mimeType,
          logoByteSize: uploaded.byteSize,
          ...DEFAULT_LOGO_FIT,
        };
        await onUpdateBrandLogo(brand, payload);
        return payload;
      },
      "Brend loqosu yeniləndi",
      {
        onSuccess: (payload) => {
          setLogoEditorBrand({
            ...brand,
            logoObjectKey: payload.logoObjectKey,
            logoMimeType: payload.logoMimeType,
            logoByteSize: payload.logoByteSize,
            ...DEFAULT_LOGO_FIT,
          });
          setFitDraft({ ...DEFAULT_LOGO_FIT });
          setFitPanelOpen(true);
        },
      },
    ).finally(() => {
      setLogoBusy(false);
    });
  }

  function handleRemoveLogo() {
    if (activeLogoBrand === null) {
      return;
    }

    const brand = activeLogoBrand;
    setLogoBusy(true);
    void run(
      () =>
        onUpdateBrandLogo(brand, {
          logoObjectKey: null,
          logoMimeType: null,
          logoByteSize: null,
          ...DEFAULT_LOGO_FIT,
        }),
      "Brend loqosu silindi",
      {
        onSuccess: () => {
          setLogoEditorBrand({
            ...brand,
            logoObjectKey: null,
            logoMimeType: null,
            logoByteSize: null,
            ...DEFAULT_LOGO_FIT,
          });
          setFitDraft({ ...DEFAULT_LOGO_FIT });
          setFitPanelOpen(false);
        },
      },
    ).finally(() => {
      setLogoBusy(false);
    });
  }

  function handleSaveFit() {
    if (activeLogoBrand === null || logoEditorPreview === null) {
      return;
    }

    const brand = activeLogoBrand;
    setLogoBusy(true);
    void run(
      () => onUpdateBrandLogo(brand, { ...fitDraft }),
      "Loqo ölçüsü yeniləndi",
      {
        onSuccess: () => {
          setLogoEditorBrand({
            ...brand,
            ...fitDraft,
          });
          setFitPanelOpen(false);
        },
      },
    ).finally(() => {
      setLogoBusy(false);
    });
  }

  return (
    <>
      <div
        className="catalog-metrics catalog-metrics--single"
        aria-label="Brend statistikası"
      >
        <div className="catalog-metric">
          <span className="catalog-metric__label catalog-metric__label--title">
            Brendlərin sayı
          </span>
          <strong className="catalog-metric__value catalog-metric__value--compact">
            {brands.length}
          </strong>
        </div>
      </div>
      {isFiltering ? (
        <div className="catalog-metrics catalog-metrics--single">
          <div className="catalog-metric catalog-metric--accent">
            <span className="catalog-metric__label catalog-metric__label--title">
              Nəticə
            </span>
            <strong className="catalog-metric__value catalog-metric__value--compact">
              {filteredBrands.length}
            </strong>
          </div>
        </div>
      ) : null}

      <div className="catalog-subcategories-board">
        <header className="catalog-subcategories-toolbar">
          <div className="catalog-subcategories-toolbar__filters">
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Axtarış</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ad və ya slug"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        <div className="catalog-subcategories-table-wrap">
          {brands.length === 0 ? (
            <div className="catalog-subcategories-empty">
              <strong>Brend tapılmadı</strong>
              <p>İlk brendi yaratmaq üçün sol menyudan «Yeni brend» seçin.</p>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="catalog-subcategories-empty">
              <strong>Filtrə uyğun nəticə tapılmadı</strong>
              <p>Axtarış sorğusunu dəyişdirin.</p>
            </div>
          ) : (
            <ul className="catalog-subcategories-group__list">
              {filteredBrands.map((brand) => {
                const brandIsActive = isBrandActive(brand);
                const logoPreview = resolveBrandLogoPreview(brand.logoObjectKey);
                const logoStyle =
                  logoPreview === null
                    ? undefined
                    : (brandLogoFitStyle(readBrandLogoFit(brand)) as
                        | CSSProperties
                        | undefined);

                return (
                  <li
                    key={brand.id}
                    className={[
                      "catalog-subcategories-item",
                      !brandIsActive ? "catalog-subcategories-item--inactive" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="catalog-subcategories-item__main">
                      {canCatalog ? (
                        <button
                          type="button"
                          className={[
                            "catalog-brands-item__logo",
                            "catalog-brands-item__logo--button",
                            logoPreview === null
                              ? "catalog-brands-item__logo--empty"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-label={
                            logoPreview !== null
                              ? `${brand.name} loqosunu idarə et`
                              : `${brand.name} loqosu əlavə et`
                          }
                          onClick={() => openLogoEditor(brand)}
                        >
                          {logoPreview !== null ? (
                            <img src={logoPreview} alt="" style={logoStyle} />
                          ) : (
                            <span>Logo</span>
                          )}
                        </button>
                      ) : (
                        <div
                          className={[
                            "catalog-brands-item__logo",
                            logoPreview === null
                              ? "catalog-brands-item__logo--empty"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-hidden={logoPreview === null}
                        >
                          {logoPreview !== null ? (
                            <img src={logoPreview} alt="" style={logoStyle} />
                          ) : (
                            <span>Logo</span>
                          )}
                        </div>
                      )}
                      <strong className="catalog-subcategories-item__name">
                        {brand.name}
                      </strong>
                    </div>
                    <div className="catalog-subcategories-item__actions">
                      {canCatalog ? (
                        <>
                          <button
                            type="button"
                            className="catalog-subcategories-toggle"
                            aria-label={`${brand.name} brendini redaktə et`}
                            onClick={() => onEditBrand(brand.id)}
                          >
                            Redaktə et
                          </button>
                          <button
                            type="button"
                            className={
                              brandIsActive
                                ? "catalog-subcategories-toggle catalog-subcategories-toggle--deactivate"
                                : "catalog-subcategories-toggle catalog-subcategories-toggle--activate"
                            }
                            aria-label={
                              brandIsActive
                                ? `${brand.name} brendini deaktiv et`
                                : `${brand.name} brendini aktiv et`
                            }
                            onClick={() => {
                              void run(
                                () => onUpdateBrandStatus(brand),
                                brandIsActive
                                  ? "Brend deaktiv edildi"
                                  : "Brend aktiv edildi",
                              );
                            }}
                          >
                            {brandIsActive ? "Deaktiv et" : "Aktiv et"}
                          </button>
                          <button
                            type="button"
                            className="catalog-subcategories-delete"
                            aria-label={`${brand.name} brendini sil`}
                            onClick={() =>
                              requestConfirm({
                                title: "Brendi sil",
                                message: `"${brand.name}" brendini silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
                                onConfirm: async () => {
                                  await run(
                                    () => onDeleteBrand(brand.id),
                                    "Brend silindi",
                                  );
                                },
                              })
                            }
                          >
                            Sil
                          </button>
                        </>
                      ) : (
                        <span className="catalog-subcategories-readonly">
                          Yalnız oxuma
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <input
        ref={logoFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="catalog-brands-item__logo-input"
        aria-hidden="true"
        tabIndex={-1}
        disabled={logoBusy || logoEditorBrand === null}
        onChange={handleLogoFileChange}
      />
      {activeLogoBrand !== null ? (
        <BrandLogoManageDialog
          brandName={activeLogoBrand.name}
          previewSrc={logoEditorPreview}
          fit={fitDraft}
          pending={logoBusy}
          fitOpen={fitPanelOpen}
          onChangeFit={setFitDraft}
          onToggleFit={() => setFitPanelOpen((open) => !open)}
          onPickFile={() => logoFileInputRef.current?.click()}
          onRemoveLogo={handleRemoveLogo}
          onCancel={closeLogoEditor}
          onSaveFit={handleSaveFit}
        />
      ) : null}
      {confirmDialog}
    </>
  );
}

function BrandCreateView({
  initialBrand,
  onCreateBrand,
  onUpdateBrand,
  onCancel,
  suggestSeo,
  run,
}: {
  initialBrand?: Brand;
  onCreateBrand: (form: FormData, logo: BrandLogoPayload | null) => Promise<unknown>;
  onUpdateBrand?: (brand: Brand, form: FormData) => Promise<unknown>;
  onCancel: () => void;
  suggestSeo: (
    input: CatalogSeoSuggestRequestContract,
  ) => Promise<CatalogSeoSuggestResponseContract>;
  run: RunFn;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const slugManuallyEdited = useRef(Boolean(initialBrand));
  const isEditing = initialBrand !== undefined;
  const [name, setName] = useState(initialBrand?.name ?? "");
  const [slug, setSlug] = useState(initialBrand?.slug ?? "");
  const [seoTitle, setSeoTitle] = useState(initialBrand?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initialBrand?.seoDescription ?? "",
  );
  const [description, setDescription] = useState(initialBrand?.description ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoFit, setLogoFit] = useState<BrandLogoFitValues>(DEFAULT_LOGO_FIT);
  const [fieldErrors, setFieldErrors] = useState<BrandFieldErrors>({});

  useEffect(() => {
    if (logoFile === null) {
      setLogoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [logoFile]);

  function clearFieldError(field: BrandFieldKey) {
    setFieldErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function applyNameChange(nextName: string) {
    setName(nextName);
    clearFieldError("name");

    if (!slugManuallyEdited.current) {
      setSlug(slugify(nextName));
      clearFieldError("slug");
    }
  }

  function handleSlugChange(event: ChangeEvent<HTMLInputElement>) {
    slugManuallyEdited.current = true;
    setSlug(event.target.value.toLowerCase());
    clearFieldError("slug");
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) {
      setLogoFile(null);
      setLogoFit({ ...DEFAULT_LOGO_FIT });
      return;
    }

    const validationError = validateBrandLogoFile(file);
    if (validationError !== null) {
      setLogoFile(null);
      setLogoFit({ ...DEFAULT_LOGO_FIT });
      setFieldErrors((current) => ({
        ...current,
        logo: validationError,
      }));
      event.target.value = "";
      return;
    }

    setLogoFile(file);
    setLogoFit({ ...DEFAULT_LOGO_FIT });
    clearFieldError("logo");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const resolvedSlug = resolveBrandSlug(
      readBrandField(formData, "name"),
      readBrandField(formData, "slug"),
    ).toLowerCase();

    if (resolvedSlug !== readBrandField(formData, "slug")) {
      formData.set("slug", resolvedSlug);
    }

    const nextFieldErrors = validateBrandForm(formData);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);

      const firstInvalidField = (["name", "slug"] as const).find(
        (field) => nextFieldErrors[field] !== undefined,
      );

      if (firstInvalidField !== undefined) {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)
          ?.focus({ preventScroll: true });
      }

      return;
    }

    setFieldErrors({});
    if (isEditing && initialBrand && onUpdateBrand) {
      void run(
        () => onUpdateBrand(initialBrand, formData),
        "Brend yeniləndi",
        {
          onSuccess: () => {
            onCancel();
          },
        },
      );
      return;
    }
    void run(
      async () => {
        let logo: BrandLogoPayload | null = null;
        if (logoFile !== null) {
          const uploaded = await uploadCatalogBrandLogoFile(logoFile);
          logo = {
            logoObjectKey: uploaded.objectKey,
            logoMimeType: uploaded.mimeType,
            logoByteSize: uploaded.byteSize,
            ...logoFit,
          };
        }
        return onCreateBrand(formData, logo);
      },
      "Brend yaradıldı",
      {
        onSuccess: () => {
          onCancel();
        },
      },
    );
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    form.querySelector<HTMLInputElement>('input[name="name"]')?.focus({
      preventScroll: true,
    });
  }, []);

  return (
    <div className="catalog-subcategories-board">
      <form
        ref={formRef}
        id="catalog-brand-form"
        className="catalog-subcategories-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <header className="catalog-subcategories-form__head">
          <div>
            <h2>{isEditing ? "Brendi redaktə et" : "Yeni brend"}</h2>
            <p>
              {isEditing
                ? "Ad, slug, SEO və səhifə mətnini yeniləyin. Loqo siyahıdan idarə olunur."
                : "Ad daxil edin; slug avtomatik yaranır. Storefront brend zolağında görünəcək loqonu da buradan əlavə edə bilərsiniz."}
            </p>
          </div>
        </header>

        <div className="catalog-subcategories-form__grid">
          <label
            className={
              fieldErrors.name !== undefined
                ? "catalog-subcategories-form__field catalog-subcategories-form__field--error"
                : "catalog-subcategories-form__field"
            }
          >
            <span>Ad</span>
            <input
              name="name"
              required
              maxLength={120}
              placeholder="Məs: Lenovo"
              value={name}
              aria-invalid={fieldErrors.name !== undefined}
              aria-describedby={
                fieldErrors.name !== undefined ? `${formId}-name-error` : undefined
              }
              onChange={(event) => applyNameChange(event.target.value)}
            />
            {fieldErrors.name !== undefined ? (
              <p
                id={`${formId}-name-error`}
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.name}
              </p>
            ) : null}
          </label>

          <label
            className={
              fieldErrors.slug !== undefined
                ? "catalog-subcategories-form__field catalog-subcategories-form__field--error"
                : "catalog-subcategories-form__field"
            }
          >
            <span>Slug</span>
            <input
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              placeholder="lenovo"
              value={slug}
              aria-invalid={fieldErrors.slug !== undefined}
              aria-describedby={
                fieldErrors.slug !== undefined ? `${formId}-slug-error` : undefined
              }
              onChange={handleSlugChange}
            />
            {fieldErrors.slug !== undefined ? (
              <p
                id={`${formId}-slug-error`}
                className="catalog-subcategories-form__field-error"
                role="alert"
              >
                {fieldErrors.slug}
              </p>
            ) : null}
          </label>

          <CatalogSeoSuggestFields
            seoTitle={seoTitle}
            seoDescription={seoDescription}
            onSeoTitleChange={setSeoTitle}
            onSeoDescriptionChange={setSeoDescription}
            pageDescription={description}
            onPageDescriptionChange={setDescription}
            pageDescriptionLabel="Səhifə mətni"
            pageDescriptionPlaceholder="Brend landinqində göstəriləcək intro mətn"
            pageDescriptionMaxLength={5000}
            pageDescriptionRows={6}
            canSuggest
            suggestSeo={suggestSeo}
            buildRequest={() => {
              const trimmedName = name.trim();
              if (trimmedName.length === 0) {
                return null;
              }
              return {
                entityType: "brand",
                name: trimmedName,
                description,
              };
            }}
            titlePlaceholder="Boş buraxılsa brend adı istifadə olunur"
            descriptionPlaceholder="Brend səhifəsi üçün meta təsvir"
          />

          {isEditing ? null : (
          <div className="catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-product-variant-fields">
            <div className="catalog-product-variant-fields__media-block">
              <span className="catalog-product-variant-fields__media-label">
                Brend loqosu
              </span>
              <div className="catalog-product-variant-fields__media-preview catalog-brands-form__logo-preview">
                <img
                  src={logoPreviewUrl ?? "/images/product-placeholder.svg"}
                  alt={
                    logoPreviewUrl === null
                      ? "Logo seçilməyib"
                      : "Seçilmiş brend loqosu"
                  }
                  style={
                    logoPreviewUrl === null
                      ? undefined
                      : (brandLogoFitStyle(logoFit) as CSSProperties | undefined)
                  }
                />
              </div>
              <label className="catalog-product-variant-fields__media-upload">
                <span className="catalog-product-variant-fields__media-label">
                  Fayl seçin
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  aria-invalid={fieldErrors.logo !== undefined}
                />
              </label>
              {fieldErrors.logo !== undefined ? (
                <p
                  className="catalog-subcategories-form__field-error"
                  role="alert"
                >
                  {fieldErrors.logo}
                </p>
              ) : (
                <p className="catalog-product-variant-fields__media-hint">
                  Ana səhifə brend zolağında göstərilir. JPEG, PNG və ya WebP
                  (maks. 5 MB).
                </p>
              )}
              {logoPreviewUrl !== null ? (
                <BrandLogoFitControls
                  idPrefix={`${formId}-create-logo-fit`}
                  previewSrc={logoPreviewUrl}
                  fit={logoFit}
                  onChange={setLogoFit}
                />
              ) : null}
            </div>
          </div>
          )}
        </div>

        <footer className="catalog-subcategories-form__actions">
          <button
            type="button"
            className="catalog-subcategories-form__cancel"
            onClick={onCancel}
          >
            Ləğv et
          </button>
          <button type="submit" className="catalog-subcategories-form__submit">
            {isEditing ? "Yadda saxla" : "Yarat"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function CatalogBrandsPanel({
  brands,
  canCatalog,
  canCatalogRead,
  onCreateBrand,
  onUpdateBrand,
  onDeleteBrand,
  onUpdateBrandStatus,
  onUpdateBrandLogo,
  suggestSeo,
  run,
}: CatalogBrandsPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isCreateMode = canCatalog && searchParams.get("create") === "brand";
  const editId = canCatalog ? searchParams.get("edit") : null;
  const editingBrand =
    editId === null
      ? undefined
      : brands.find((brand) => brand.id === editId);

  const leaveFormMode = () => {
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (!canCatalog && (searchParams.get("create") === "brand" || searchParams.get("edit"))) {
      router.replace(pathname, { scroll: false });
      return;
    }
    if (editId !== null && editingBrand === undefined) {
      router.replace(pathname, { scroll: false });
    }
  }, [canCatalog, editId, editingBrand, pathname, router, searchParams]);

  if (!canCatalog && !canCatalogRead) {
    return null;
  }

  const formMode = isCreateMode || editingBrand !== undefined;

  return (
    <section
      className="catalog-subcategories-page"
      aria-label={
        editingBrand ? "Brendi redaktə et" : isCreateMode ? "Yeni brend" : "Brendlər"
      }
    >
      {formMode ? (
        <BrandCreateView
          key={editingBrand?.id ?? "brand-create"}
          initialBrand={editingBrand}
          onCreateBrand={onCreateBrand}
          onUpdateBrand={onUpdateBrand}
          onCancel={leaveFormMode}
          suggestSeo={suggestSeo}
          run={run}
        />
      ) : (
        <BrandListView
          key="brand-list"
          brands={brands}
          canCatalog={canCatalog}
          onEditBrand={(brandId) => {
            router.replace(`${pathname}?edit=${encodeURIComponent(brandId)}`, {
              scroll: false,
            });
          }}
          onDeleteBrand={onDeleteBrand}
          onUpdateBrandStatus={onUpdateBrandStatus}
          onUpdateBrandLogo={onUpdateBrandLogo}
          run={run}
        />
      )}
    </section>
  );
}
