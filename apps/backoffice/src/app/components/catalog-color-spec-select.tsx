"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  catalogColorLabelEquals,
  isProductCatalogColorListed,
  mergeProductCatalogColorOptions,
  resolveProductCatalogColorHex,
} from "../../lib/product-catalog-colors";
import {
  customCatalogColorsToSessionState,
  loadCustomCatalogColors,
  removeCustomCatalogColor,
  upsertCustomCatalogColor,
} from "../../lib/product-catalog-custom-colors";

const DEFAULT_CUSTOM_COLOR_HEX = "#2563eb";

function catalogColorSwatchStyle(
  hex: string | null,
  label: string,
): CSSProperties {
  if (hex) {
    return { backgroundColor: hex };
  }

  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = label.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${(hue + 40) % 360} 70% 42%))`,
  };
}

function normalizeDraftHex(value: string): string | null {
  const trimmed = value.trim();
  if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(trimmed)) {
    return trimmed;
  }

  const bare = trimmed.replace(/^#/, "");
  if (/^[0-9A-Fa-f]{6}$/.test(bare)) {
    return `#${bare}`;
  }

  return null;
}

type CatalogColorSpecSelectProps = {
  value: string;
  colorHex?: string | null;
  onChange: (value: string, details?: { colorHex: string | null }) => void;
  ariaLabel: string;
};

type ListPosition = {
  top: number;
  left: number;
  width: number;
};

function colorOptionMatchesQuery(option: string, query: string): boolean {
  const trimmedQuery = query.trim();
  if (trimmedQuery === "") {
    return true;
  }

  const normalizedQuery = trimmedQuery.toLocaleLowerCase("az");
  return option.toLocaleLowerCase("az").includes(normalizedQuery);
}

export function CatalogColorSpecSelect({
  value,
  colorHex,
  onChange,
  ariaLabel,
}: CatalogColorSpecSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [listPosition, setListPosition] = useState<ListPosition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newColorName, setNewColorName] = useState("");
  const [sessionColors, setSessionColors] = useState<string[]>([]);
  const [sessionColorHexByLabel, setSessionColorHexByLabel] = useState<
    Record<string, string>
  >({});
  const [hiddenCustomColorLabels, setHiddenCustomColorLabels] = useState<
    string[]
  >([]);
  const [draftColorHex, setDraftColorHex] = useState(DEFAULT_CUSTOM_COLOR_HEX);
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const createPanelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const newColorNameRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const searchId = useId();
  const newColorNameId = useId();
  const colorPickerId = useId();
  const options = useMemo(
    () =>
      mergeProductCatalogColorOptions(
        value,
        sessionColors,
        hiddenCustomColorLabels,
      ),
    [hiddenCustomColorLabels, sessionColors, value],
  );
  const trimmedSearchQuery = searchQuery.trim();
  const trimmedNewColorName = newColorName.trim();
  const filteredOptions = useMemo(
    () => options.filter((color) => colorOptionMatchesQuery(color, searchQuery)),
    [options, searchQuery],
  );
  const canAddCustomColor =
    trimmedNewColorName !== "" &&
    !options.some((option) =>
      catalogColorLabelEquals(option, trimmedNewColorName),
    );

  function hexForColorLabel(label: string): string | null {
    const trimmed = label.trim();
    if (trimmed === "") {
      return null;
    }

    const sessionHex = sessionColorHexByLabel[trimmed];
    if (sessionHex) {
      return sessionHex;
    }

    if (
      catalogColorLabelEquals(trimmed, value) &&
      colorHex !== undefined &&
      colorHex !== null &&
      colorHex.trim() !== ""
    ) {
      return colorHex.trim();
    }

    return resolveProductCatalogColorHex(trimmed);
  }

  const selectedHex =
    value.trim() !== "" ? hexForColorLabel(value) : null;
  const placeholder = "Rəng seçin";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const stored = loadCustomCatalogColors();
    if (stored.length === 0) {
      return;
    }

    const { labels, hexByLabel } = customCatalogColorsToSessionState(stored);
    setSessionColors(labels);
    setSessionColorHexByLabel(hexByLabel);
  }, []);

  function updateListPosition() {
    const trigger = triggerRef.current;
    if (trigger === null) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setListPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updateListPosition();

    function onViewportChange() {
      updateListPosition();
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    searchRef.current?.focus();
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !createSectionOpen) {
      return;
    }

    newColorNameRef.current?.focus();
  }, [createSectionOpen, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (
        rootRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    const frame = window.requestAnimationFrame(() => {
      document.addEventListener("pointerdown", onPointerDown);
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectColor(nextValue: string) {
    const trimmed = nextValue.trim();
    if (trimmed === "") {
      onChange("", { colorHex: null });
      setSearchQuery("");
      setNewColorName("");
      setOpen(false);
      return;
    }

    const sessionHex = sessionColorHexByLabel[trimmed];
    if (sessionHex) {
      onChange(trimmed, { colorHex: sessionHex });
    } else if (isProductCatalogColorListed(trimmed)) {
      onChange(trimmed, { colorHex: null });
    } else if (
      catalogColorLabelEquals(trimmed, value) &&
      colorHex !== undefined &&
      colorHex !== null &&
      colorHex.trim() !== ""
    ) {
      onChange(trimmed, { colorHex: colorHex.trim() });
    } else {
      onChange(trimmed, { colorHex: null });
    }

    setSearchQuery("");
    setNewColorName("");
    setOpen(false);
  }

  function addCustomColor(label: string, hex: string) {
    const trimmed = label.trim();
    const normalizedHex = normalizeDraftHex(hex);
    if (trimmed === "" || normalizedHex === null) {
      return;
    }

    if (
      !options.some((option) => catalogColorLabelEquals(option, trimmed))
    ) {
      setSessionColors((current) => [...current, trimmed]);
    }

    setSessionColorHexByLabel((current) => ({
      ...current,
      [trimmed]: normalizedHex,
    }));
    setHiddenCustomColorLabels((current) =>
      current.filter((label) => !catalogColorLabelEquals(label, trimmed)),
    );
    upsertCustomCatalogColor(trimmed, normalizedHex);
    onChange(trimmed, { colorHex: normalizedHex });
    setSearchQuery("");
    setNewColorName("");
    setOpen(false);
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
  }

  function removeCustomColor(label: string) {
    const trimmed = label.trim();
    if (trimmed === "" || isProductCatalogColorListed(trimmed)) {
      return;
    }

    setHiddenCustomColorLabels((current) => {
      if (current.some((entry) => catalogColorLabelEquals(entry, trimmed))) {
        return current;
      }
      return [...current, trimmed];
    });
    setSessionColors((current) =>
      current.filter((entry) => !catalogColorLabelEquals(entry, trimmed)),
    );
    setSessionColorHexByLabel((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (catalogColorLabelEquals(key, trimmed)) {
          delete next[key];
        }
      }
      return next;
    });

    if (catalogColorLabelEquals(value, trimmed)) {
      onChange("", { colorHex: null });
    }

    removeCustomCatalogColor(trimmed);
  }

  const popover =
    open && listPosition !== null ? (
      <div
        ref={popoverRef}
        className="catalog-product-color-spec-select__popover catalog-product-color-spec-select__popover--portal"
        style={{
          position: "fixed",
          top: listPosition.top,
          left: listPosition.left,
          width: listPosition.width,
        }}
      >
        <div className="catalog-product-color-spec-select__search">
          <form onSubmit={onSearchSubmit}>
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              role="searchbox"
              value={searchQuery}
              className="catalog-product-color-spec-select__search-input"
              placeholder="Mövcud rəngləri axtar"
              aria-label={`${ariaLabel} — axtarış`}
              autoComplete="off"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  const firstOption = listRef.current?.querySelector<HTMLElement>(
                    '[role="option"]',
                  );
                  firstOption?.focus();
                }
              }}
            />
          </form>
        </div>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="catalog-product-color-spec-select__list"
          aria-label={ariaLabel}
        >
        {trimmedSearchQuery === "" ? (
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              className="catalog-product-color-spec-select__option"
              onClick={() => selectColor("")}
            >
              <span
                className="catalog-product-color-spec-select__swatch catalog-product-color-spec-select__swatch--empty"
                aria-hidden="true"
              />
              <span>{placeholder}</span>
            </button>
          </li>
        ) : null}
        {filteredOptions.map((color) => {
          const hex = hexForColorLabel(color);
          const isCustomColor = !isProductCatalogColorListed(color);
          const isSelected = catalogColorLabelEquals(value, color);
          return (
            <li
              key={color}
              role="presentation"
              className={
                isCustomColor
                  ? "catalog-product-color-spec-select__option-row"
                  : undefined
              }
            >
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={
                  isSelected
                    ? "catalog-product-color-spec-select__option catalog-product-color-spec-select__option--selected"
                    : "catalog-product-color-spec-select__option"
                }
                onClick={() => selectColor(color)}
              >
                <span
                  className="catalog-product-color-spec-select__swatch"
                  style={catalogColorSwatchStyle(hex, color)}
                  aria-hidden="true"
                />
                <span>{color}</span>
              </button>
              {isCustomColor ? (
                <button
                  type="button"
                  className="catalog-product-color-spec-select__option-remove"
                  aria-label={`«${color}» rəngini sil`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeCustomColor(color);
                  }}
                >
                  Sil
                </button>
              ) : null}
            </li>
          );
        })}
          <li
            role="presentation"
            className="catalog-product-color-spec-select__section"
          >
            <button
              type="button"
              className={
                createSectionOpen
                  ? "catalog-product-color-spec-select__section-toggle catalog-product-color-spec-select__section-toggle--open"
                  : "catalog-product-color-spec-select__section-toggle"
              }
              aria-expanded={createSectionOpen}
              aria-controls={createPanelId}
              onClick={() => setCreateSectionOpen((current) => !current)}
            >
              <span>Yeni rəng yarat</span>
              <span
                className="catalog-product-color-spec-select__section-chevron"
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            {createSectionOpen ? (
            <div
              id={createPanelId}
              className="catalog-product-color-spec-select__create"
            >
              <label className="catalog-product-color-spec-select__create-name">
                <span className="sr-only">Yeni rəngin adı</span>
                <input
                  ref={newColorNameRef}
                  id={newColorNameId}
                  type="text"
                  className="catalog-product-color-spec-select__name-input"
                  value={newColorName}
                  placeholder="Rəng adı"
                  aria-label={`${ariaLabel} — yeni rəng adı`}
                  autoComplete="off"
                  onChange={(event) => setNewColorName(event.target.value)}
                />
              </label>
              <div className="catalog-product-color-spec-select__create-row">
              <label
                className="catalog-product-color-spec-select__create-picker"
                htmlFor={colorPickerId}
              >
                <span
                  className="catalog-product-color-spec-select__swatch catalog-product-color-spec-select__swatch--picker"
                  style={catalogColorSwatchStyle(
                    draftColorHex,
                    trimmedNewColorName || "rəng",
                  )}
                  aria-hidden="true"
                />
                <input
                  id={colorPickerId}
                  type="color"
                  className="catalog-product-color-spec-select__color-input"
                  value={draftColorHex}
                  aria-label={`${ariaLabel} — rəng tonu`}
                  onChange={(event) => {
                    const next = normalizeDraftHex(event.target.value);
                    if (next !== null) {
                      setDraftColorHex(next);
                    }
                  }}
                />
                <span className="catalog-product-color-spec-select__create-hint">
                  Rəng tonu
                </span>
              </label>
              <label className="catalog-product-color-spec-select__create-hex">
                <span className="sr-only">Hex kod</span>
                <input
                  type="text"
                  className="catalog-product-color-spec-select__hex-input"
                  value={draftColorHex}
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`${ariaLabel} — hex kod`}
                  onChange={(event) => {
                    const next = normalizeDraftHex(event.target.value);
                    if (next !== null) {
                      setDraftColorHex(next);
                    }
                  }}
                  onBlur={(event) => {
                    const next = normalizeDraftHex(event.target.value);
                    if (next !== null) {
                      setDraftColorHex(next);
                    } else {
                      setDraftColorHex(DEFAULT_CUSTOM_COLOR_HEX);
                    }
                  }}
                />
              </label>
              </div>
              <button
                type="button"
                className="catalog-product-color-spec-select__create-submit"
                disabled={!canAddCustomColor}
                onClick={() =>
                  addCustomColor(trimmedNewColorName, draftColorHex)
                }
              >
                {canAddCustomColor
                  ? `«${trimmedNewColorName}» əlavə et`
                  : "Yeni rəngi əlavə et"}
              </button>
            </div>
            ) : null}
          </li>
        </ul>
      </div>
    ) : null;

  return (
    <div className="catalog-product-color-spec-select" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="catalog-product-color-spec-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => {
          setOpen((current) => {
            const next = !current;
            if (next) {
              updateListPosition();
              setSearchQuery("");
              setNewColorName("");
              setCreateSectionOpen(false);
              const existingHex = value.trim() !== "" ? hexForColorLabel(value) : null;
              if (existingHex !== null) {
                setDraftColorHex(existingHex);
              } else {
                setDraftColorHex(DEFAULT_CUSTOM_COLOR_HEX);
              }
            } else {
              setSearchQuery("");
              setNewColorName("");
              setCreateSectionOpen(false);
            }
            return next;
          });
        }}
      >
        <span
          className={
            value.trim() === ""
              ? "catalog-product-color-spec-select__swatch catalog-product-color-spec-select__swatch--empty"
              : "catalog-product-color-spec-select__swatch"
          }
          style={
            value.trim() === ""
              ? undefined
              : catalogColorSwatchStyle(selectedHex, value)
          }
          aria-hidden="true"
        />
        <span className="catalog-product-color-spec-select__label">
          {value.trim() === "" ? placeholder : value}
        </span>
        <span
          className="catalog-product-color-spec-select__chevron"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {mounted && popover !== null ? createPortal(popover, document.body) : null}
    </div>
  );
}
