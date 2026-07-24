"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useConfirmDialog } from "@itmarket/ui";
import { uploadCatalogBannerImageFile } from "../../lib/upload-catalog-banner-image";

export type StorefrontBannerPlacement = "HOME_HERO" | "CATALOG_SEARCH";

export type StorefrontBanner = {
  id: string;
  placement?: StorefrontBannerPlacement;
  altText: string;
  href: string;
  imageObjectKey: string;
  imageMimeType: string;
  imageByteSize: number;
  sortOrder: number;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

export type BannerImagePayload = {
  imageObjectKey: string;
  imageMimeType: string;
  imageByteSize: number;
};

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

type CatalogBannersPanelProps = {
  banners: StorefrontBanner[];
  canCatalog: boolean;
  canCatalogRead: boolean;
  onCreateBanner: (
    form: FormData,
    image: BannerImagePayload,
  ) => Promise<unknown>;
  onUpdateBanner: (
    banner: StorefrontBanner,
    patch: {
      altText: string;
      href: string;
      status: "DRAFT" | "ACTIVE";
      placement?: StorefrontBannerPlacement;
      image?: BannerImagePayload;
    },
  ) => Promise<unknown>;
  onDeleteBanner: (bannerId: string) => Promise<unknown>;
  onReorderBanners: (orderedIds: string[]) => Promise<unknown>;
  run: RunFn;
};

type BannerFieldKey = "altText" | "href" | "image";
type BannerFieldErrors = Partial<Record<BannerFieldKey, string>>;

const BANNER_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const BANNER_IMAGE_MAX_BYTES = 5_000_000;
const HREF_PATTERN = /^(\/.*|https?:\/\/\S+)$/;

const BANNER_PLACEMENTS: ReadonlyArray<{
  id: StorefrontBannerPlacement;
  title: string;
  pageLabel: string;
  description: string;
}> = [
  {
    id: "HOME_HERO",
    title: "Ana səhifə — Hero slayder",
    pageLabel: "Ana səhifə",
    description:
      "Storefront ana səhifəsinin yuxarı hissəsindəki böyük banner slayderi.",
  },
  {
    id: "CATALOG_SEARCH",
    title: "Axtarış nəticələri — Üst banner",
    pageLabel: "Axtarış / filtrlər",
    description:
      "Axtarış və ya kateqoriya/brend filteri aktiv olanda məhsul siyahısının üstündə görünən banner.",
  },
];

function placementMeta(placement: StorefrontBannerPlacement) {
  return (
    BANNER_PLACEMENTS.find((entry) => entry.id === placement) ??
    BANNER_PLACEMENTS[0]
  );
}

function isBannerActive(banner: StorefrontBanner) {
  return banner.status !== "DRAFT" && banner.status !== "ARCHIVED";
}

function readBannerField(formData: FormData, key: BannerFieldKey) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateBannerImageFile(file: File): string | null {
  if (!BANNER_IMAGE_MIME.has(file.type) || file.size > BANNER_IMAGE_MAX_BYTES) {
    return "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur";
  }
  return null;
}

function validateBannerForm(
  formData: FormData,
  requireImage: boolean,
): BannerFieldErrors {
  const errors: BannerFieldErrors = {};
  const altText = readBannerField(formData, "altText");
  const href = readBannerField(formData, "href");

  if (altText === "") {
    errors.altText = "Alt mətn tələb olunur";
  }
  if (href === "") {
    errors.href = "Keçid linki tələb olunur";
  } else if (!HREF_PATTERN.test(href)) {
    errors.href = "Link / və ya http(s):// ilə başlamalıdır";
  }
  if (requireImage) {
    const image = formData.get("image");
    if (!(image instanceof File) || image.size < 1) {
      errors.image = "Banner şəkli tələb olunur";
    } else {
      const imageError = validateBannerImageFile(image);
      if (imageError !== null) {
        errors.image = imageError;
      }
    }
  }
  return errors;
}

function BannerPlacementCreateForm({
  placementId,
  initialFile,
  onCreateBanner,
  onCancel,
  run,
}: {
  placementId: StorefrontBannerPlacement;
  initialFile: File;
  onCreateBanner: CatalogBannersPanelProps["onCreateBanner"];
  onCancel: () => void;
  run: RunFn;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File>(initialFile);
  const [altText, setAltText] = useState("");
  const [href, setHref] = useState("/?sort=newest");
  const [previewSrc, setPreviewSrc] = useState(() =>
    URL.createObjectURL(initialFile),
  );
  const [fieldErrors, setFieldErrors] = useState<BannerFieldErrors>({});
  const [pending, setPending] = useState(false);
  const placement = placementMeta(placementId);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
    form.querySelector<HTMLInputElement>('input[name="altText"]')?.focus({
      preventScroll: true,
    });
  }, []);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.image;
      return next;
    });
    if (!file) {
      return;
    }
    const error = validateBannerImageFile(file);
    if (error !== null) {
      setFieldErrors((current) => ({ ...current, image: error }));
      event.target.value = "";
      return;
    }
    selectedFileRef.current = file;
    setPreviewSrc(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("placement", placementId);
    formData.set("image", selectedFileRef.current);

    const errors = validateBannerForm(formData, true);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const file = selectedFileRef.current;
    setPending(true);
    try {
      const uploaded = await uploadCatalogBannerImageFile(file);
      const image: BannerImagePayload = {
        imageObjectKey: uploaded.objectKey,
        imageMimeType: uploaded.mimeType,
        imageByteSize: uploaded.byteSize,
      };
      await run(() => onCreateBanner(formData, image), "Banner yaradıldı", {
        refresh: true,
        onSuccess: () => onCancel(),
      });
    } catch (error) {
      setFieldErrors({
        image:
          error instanceof Error ? error.message : "Banner şəkli yüklənmədi",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      className="catalog-subcategories-form catalog-banners-placement__create"
      noValidate
      onSubmit={handleSubmit}
    >
      <header className="catalog-subcategories-form__head">
        <div>
          <h2>Yeni banner</h2>
          <p>
            {placement.title} üçün alt mətn və keçid linkini tamamlayın.
          </p>
        </div>
      </header>

      <input type="hidden" name="placement" value={placementId} />

      <div className="catalog-subcategories-form__grid">
        <label
          className={
            fieldErrors.altText !== undefined
              ? "catalog-subcategories-form__field catalog-subcategories-form__field--error"
              : "catalog-subcategories-form__field"
          }
        >
          <span>Alt mətn</span>
          <input
            name="altText"
            required
            maxLength={200}
            placeholder="Məs: TCL 50 UHD 4K televizor"
            value={altText}
            aria-invalid={fieldErrors.altText !== undefined}
            aria-describedby={
              fieldErrors.altText !== undefined
                ? `${formId}-alt-error`
                : undefined
            }
            onChange={(event) => setAltText(event.target.value)}
          />
          {fieldErrors.altText !== undefined ? (
            <p
              id={`${formId}-alt-error`}
              className="catalog-subcategories-form__field-error"
              role="alert"
            >
              {fieldErrors.altText}
            </p>
          ) : null}
        </label>

        <label
          className={
            fieldErrors.href !== undefined
              ? "catalog-subcategories-form__field catalog-subcategories-form__field--error"
              : "catalog-subcategories-form__field"
          }
        >
          <span>Keçid linki</span>
          <input
            name="href"
            required
            maxLength={500}
            placeholder="/?sort=newest"
            value={href}
            aria-invalid={fieldErrors.href !== undefined}
            aria-describedby={
              fieldErrors.href !== undefined
                ? `${formId}-href-error`
                : undefined
            }
            onChange={(event) => setHref(event.target.value)}
          />
          {fieldErrors.href !== undefined ? (
            <p
              id={`${formId}-href-error`}
              className="catalog-subcategories-form__field-error"
              role="alert"
            >
              {fieldErrors.href}
            </p>
          ) : null}
        </label>

        <div
          className={
            fieldErrors.image !== undefined
              ? "catalog-subcategories-form__field catalog-subcategories-form__field--wide catalog-subcategories-form__field--error"
              : "catalog-subcategories-form__field catalog-subcategories-form__field--wide"
          }
        >
          <span>Banner şəkli</span>
          <div className="catalog-banners-preview" aria-hidden="true">
            <img src={previewSrc} alt="" />
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="catalog-banners-item__file"
            aria-label="Banner şəklini dəyiş"
            aria-invalid={fieldErrors.image !== undefined}
            aria-describedby={
              fieldErrors.image !== undefined
                ? `${formId}-image-error`
                : undefined
            }
            onChange={handleImageChange}
          />
          <button
            type="button"
            className="catalog-subcategories-form__cancel"
            disabled={pending}
            onClick={() => imageInputRef.current?.click()}
          >
            Şəkli dəyiş
          </button>
          {fieldErrors.image !== undefined ? (
            <p
              id={`${formId}-image-error`}
              className="catalog-subcategories-form__field-error"
              role="alert"
            >
              {fieldErrors.image}
            </p>
          ) : (
            <p className="card-note">JPEG, PNG və ya WebP — maks. 5 MB.</p>
          )}
        </div>
      </div>

      <footer className="catalog-subcategories-form__actions">
        <button
          type="button"
          className="catalog-subcategories-form__cancel"
          disabled={pending}
          onClick={onCancel}
        >
          Ləğv et
        </button>
        <button
          type="submit"
          className="catalog-subcategories-form__submit"
          disabled={pending}
        >
          {pending ? "Yaradılır…" : "Banner yarat"}
        </button>
      </footer>
    </form>
  );
}

function BannerListView({
  banners,
  canCatalog,
  onCreateBanner,
  onUpdateBanner,
  onDeleteBanner,
  onReorderBanners,
  run,
}: {
  banners: StorefrontBanner[];
  canCatalog: boolean;
  onCreateBanner: CatalogBannersPanelProps["onCreateBanner"];
  onUpdateBanner: CatalogBannersPanelProps["onUpdateBanner"];
  onDeleteBanner: CatalogBannersPanelProps["onDeleteBanner"];
  onReorderBanners: CatalogBannersPanelProps["onReorderBanners"];
  run: RunFn;
}) {
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editHref, setEditHref] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creatingPlacement, setCreatingPlacement] =
    useState<StorefrontBannerPlacement | null>(null);
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [addImageErrorByPlacement, setAddImageErrorByPlacement] = useState<
    Partial<Record<StorefrontBannerPlacement, string>>
  >({});
  const addImageInputRefs = useRef<
    Partial<Record<StorefrontBannerPlacement, HTMLInputElement | null>>
  >({});

  const sortedBanners = useMemo(
    () =>
      [...banners].sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.altText.localeCompare(right.altText, "az"),
      ),
    [banners],
  );

  const bannersByPlacement = useMemo(() => {
    const map = new Map<StorefrontBannerPlacement, StorefrontBanner[]>();
    for (const placement of BANNER_PLACEMENTS) {
      map.set(placement.id, []);
    }
    for (const banner of sortedBanners) {
      const key = banner.placement ?? "HOME_HERO";
      const list = map.get(key) ?? [];
      list.push(banner);
      map.set(key, list);
    }
    return map;
  }, [sortedBanners]);

  function cancelCreate() {
    setCreatingPlacement(null);
    setCreateFile(null);
  }

  function handleAddImageSelect(
    placementId: StorefrontBannerPlacement,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const validationError = validateBannerImageFile(file);
    if (validationError !== null) {
      setAddImageErrorByPlacement((current) => ({
        ...current,
        [placementId]: validationError,
      }));
      return;
    }
    setAddImageErrorByPlacement((current) => {
      const next = { ...current };
      delete next[placementId];
      return next;
    });
    setEditingId(null);
    setCreatingPlacement(placementId);
    setCreateFile(file);
  }

  function startEdit(banner: StorefrontBanner) {
    cancelCreate();
    setEditingId(banner.id);
    setEditAlt(banner.altText);
    setEditHref(banner.href);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function saveEdit(banner: StorefrontBanner) {
    const altText = editAlt.trim();
    const href = editHref.trim();
    if (altText === "") {
      setEditError("Alt mətn tələb olunur");
      return;
    }
    if (!HREF_PATTERN.test(href)) {
      setEditError("Link / və ya http(s):// ilə başlamalıdır");
      return;
    }

    setBusyId(banner.id);
    try {
      await run(
        () =>
          onUpdateBanner(banner, {
            altText,
            href,
            status: banner.status === "DRAFT" ? "DRAFT" : "ACTIVE",
            placement: banner.placement ?? "HOME_HERO",
          }),
        "Banner yeniləndi",
        { refresh: true, onSuccess: () => cancelEdit() },
      );
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Banner yenilənmədi",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function moveBanner(
    placementId: StorefrontBannerPlacement,
    bannerId: string,
    direction: -1 | 1,
  ) {
    const placementBanners = bannersByPlacement.get(placementId) ?? [];
    const ids = placementBanners.map((banner) => banner.id);
    const index = ids.indexOf(bannerId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) {
      return;
    }
    const next = [...ids];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    setBusyId(bannerId);
    try {
      await run(() => onReorderBanners(next), "Banner sırası yeniləndi", {
        refresh: true,
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {confirmDialog}

      <div className="catalog-banners-placements">
        {BANNER_PLACEMENTS.map((placement) => {
          const placementBanners = bannersByPlacement.get(placement.id) ?? [];
          const isCreating =
            creatingPlacement === placement.id && createFile !== null;
          const addImageError = addImageErrorByPlacement[placement.id];

          return (
            <section
              key={placement.id}
              className="catalog-banners-placement"
              aria-labelledby={`banner-placement-${placement.id}`}
            >
              <header className="catalog-banners-placement__head">
                <div>
                  <p className="catalog-banners-placement__page">
                    {placement.pageLabel}
                  </p>
                  <h2 id={`banner-placement-${placement.id}`}>
                    {placement.title}
                  </h2>
                  <p className="catalog-banners-placement__desc">
                    {placement.description}
                  </p>
                </div>
                {canCatalog ? (
                  <>
                    <input
                      ref={(node) => {
                        addImageInputRefs.current[placement.id] = node;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="catalog-banners-item__file"
                      aria-label={`${placement.pageLabel} üçün şəkil əlavə et`}
                      onChange={(event) =>
                        handleAddImageSelect(placement.id, event)
                      }
                    />
                    <button
                      type="button"
                      className="catalog-subcategories-form__submit catalog-banners-placement__add"
                      onClick={() =>
                        addImageInputRefs.current[placement.id]?.click()
                      }
                    >
                      Şəkil əlavə et
                    </button>
                  </>
                ) : null}
              </header>

              {addImageError !== undefined ? (
                <p
                  className="catalog-subcategories-form__field-error"
                  role="alert"
                >
                  {addImageError}
                </p>
              ) : null}

              {isCreating && createFile !== null ? (
                <BannerPlacementCreateForm
                  key={`${placement.id}-${createFile.name}-${createFile.lastModified}`}
                  placementId={placement.id}
                  initialFile={createFile}
                  onCreateBanner={onCreateBanner}
                  onCancel={cancelCreate}
                  run={run}
                />
              ) : null}

              {placementBanners.length === 0 && !isCreating ? (
                <div className="catalog-subcategories-empty">
                  <strong>Bu yerləşmədə banner yoxdur</strong>
                  <p>
                    «Şəkil əlavə et» düyməsi ilə {placement.pageLabel} üçün
                    şəkil əlavə edin.
                  </p>
                </div>
              ) : placementBanners.length > 0 ? (
                <ul className="catalog-banners-list">
                  {placementBanners.map((banner, placementIndex) => {
                    const isEditing = editingId === banner.id;
                    const busy = busyId === banner.id;
                    const bannerIsActive = isBannerActive(banner);
                    const locationTitle = placement.title.includes("—")
                      ? placement.title.split("—")[1]?.trim() ?? placement.title
                      : placement.title;

                    return (
                      <li
                        key={banner.id}
                        className={[
                          "catalog-banners-item",
                          !bannerIsActive
                            ? "catalog-banners-item--inactive"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="catalog-banners-item__preview">
                          <img src={banner.imageObjectKey} alt="" />
                        </div>

                        <div className="catalog-banners-item__body">
                          <div className="catalog-banners-item__location">
                            <span className="catalog-banners-item__location-label">
                              Yerləşmə
                            </span>
                            <strong>
                              {placement.pageLabel}
                              <span aria-hidden="true"> · </span>
                              {locationTitle}
                            </strong>
                          </div>

                          {isEditing ? (
                            <div className="catalog-banners-item__edit">
                              <label>
                                <span>Alt mətn</span>
                                <input
                                  value={editAlt}
                                  maxLength={200}
                                  onChange={(event) =>
                                    setEditAlt(event.target.value)
                                  }
                                />
                              </label>
                              <label>
                                <span>Keçid linki</span>
                                <input
                                  value={editHref}
                                  maxLength={500}
                                  onChange={(event) =>
                                    setEditHref(event.target.value)
                                  }
                                />
                              </label>
                              {editError !== null ? (
                                <p
                                  className="catalog-subcategories-form__field-error"
                                  role="alert"
                                >
                                  {editError}
                                </p>
                              ) : null}
                              <div className="catalog-banners-item__edit-actions">
                                <button
                                  type="button"
                                  className="catalog-subcategories-form__cancel"
                                  disabled={busy}
                                  onClick={cancelEdit}
                                >
                                  Ləğv et
                                </button>
                                <button
                                  type="button"
                                  className="catalog-subcategories-form__submit"
                                  disabled={busy}
                                  onClick={() => void saveEdit(banner)}
                                >
                                  {busy ? "Saxlanılır…" : "Yadda saxla"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="catalog-banners-item__meta">
                                <strong>{banner.altText}</strong>
                                <span className="pos-meta">{banner.href}</span>
                                <span className="pos-meta">
                                  {bannerIsActive ? "Aktiv" : "Gizli"}
                                </span>
                              </div>
                              {canCatalog ? (
                                <div className="catalog-banners-item__actions">
                                  <button
                                    type="button"
                                    className="catalog-subcategories-form__cancel"
                                    disabled={busy || placementIndex <= 0}
                                    onClick={() =>
                                      void moveBanner(
                                        placement.id,
                                        banner.id,
                                        -1,
                                      )
                                    }
                                    aria-label="Yuxarı daşı"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="catalog-subcategories-form__cancel"
                                    disabled={
                                      busy ||
                                      placementIndex >=
                                        placementBanners.length - 1
                                    }
                                    onClick={() =>
                                      void moveBanner(
                                        placement.id,
                                        banner.id,
                                        1,
                                      )
                                    }
                                    aria-label="Aşağı daşı"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="catalog-subcategories-form__cancel"
                                    disabled={busy}
                                    onClick={() => startEdit(banner)}
                                  >
                                    Redaktə
                                  </button>
                                  <button
                                    type="button"
                                    className="catalog-subcategories-form__cancel"
                                    disabled={busy}
                                    onClick={() =>
                                      void run(
                                        () =>
                                          onUpdateBanner(banner, {
                                            altText: banner.altText,
                                            href: banner.href,
                                            status: bannerIsActive
                                              ? "DRAFT"
                                              : "ACTIVE",
                                            placement:
                                              banner.placement ?? "HOME_HERO",
                                          }),
                                        bannerIsActive
                                          ? "Banner gizlədildi"
                                          : "Banner aktivləşdirildi",
                                        { refresh: true },
                                      )
                                    }
                                  >
                                    {bannerIsActive ? "Gizlət" : "Aktiv et"}
                                  </button>
                                  <button
                                    type="button"
                                    className="catalog-subcategories-form__cancel"
                                    disabled={busy}
                                    onClick={() =>
                                      requestConfirm({
                                        title: "Banneri sil",
                                        message: `"${banner.altText}" bannerini silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
                                        confirmLabel: "Sil",
                                        onConfirm: async () => {
                                          await run(
                                            () => onDeleteBanner(banner.id),
                                            "Banner silindi",
                                            { refresh: true },
                                          );
                                        },
                                      })
                                    }
                                  >
                                    Sil
                                  </button>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function CatalogBannersPanel({
  banners,
  canCatalog,
  canCatalogRead,
  onCreateBanner,
  onUpdateBanner,
  onDeleteBanner,
  onReorderBanners,
  run,
}: CatalogBannersPanelProps) {
  if (!canCatalog && !canCatalogRead) {
    return (
      <section className="catalog-section" aria-label="Bannerlər">
        <article className="operation-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Bu səhifəyə yalnız <code>catalog.read</code> icazəsi olan əməkdaşlar
            daxil ola bilər.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="catalog-subcategories-page" aria-label="Bannerlər">
      <BannerListView
        banners={banners}
        canCatalog={canCatalog}
        onCreateBanner={onCreateBanner}
        onUpdateBanner={onUpdateBanner}
        onDeleteBanner={onDeleteBanner}
        onReorderBanners={onReorderBanners}
        run={run}
      />
    </section>
  );
}
