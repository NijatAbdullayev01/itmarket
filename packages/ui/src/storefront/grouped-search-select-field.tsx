"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { IconChevronDown, IconClose } from "./icons";

type SearchSelectOption = {
  label: string;
  value: string;
};

type SearchSelectGroup = {
  label: string;
  areas: readonly SearchSelectOption[];
};

type FlatSearchSelectOption = SearchSelectOption & {
  groupLabel: string;
};

type GroupedSearchSelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  groups: readonly SearchSelectGroup[];
  placeholder?: string;
  emptyOptionLabel?: string;
  listAriaLabel?: string;
  required?: boolean;
  requiredErrorMessage?: string;
  clearAriaLabel?: string;
};

function normalizeForSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s");
}

function flattenGroups(groups: readonly SearchSelectGroup[]) {
  return groups.flatMap((group) =>
    group.areas.map((area) => ({
      ...area,
      groupLabel: group.label,
    })),
  );
}

function findOptionByValue(
  options: readonly FlatSearchSelectOption[],
  value: string,
) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "") return undefined;

  return options.find((option) => option.value === normalized);
}

function findOptionByLabel(
  options: readonly FlatSearchSelectOption[],
  label: string,
) {
  const normalizedQuery = normalizeForSearch(label);
  if (normalizedQuery === "") return undefined;

  return options.find(
    (option) => normalizeForSearch(option.label) === normalizedQuery,
  );
}

export function GroupedSearchSelectField({
  id,
  label,
  value,
  onChange,
  groups,
  placeholder = "Seçin",
  emptyOptionLabel,
  listAriaLabel,
  required = false,
  requiredErrorMessage = "Bu sahə mütləqdir",
  clearAriaLabel = "Seçimi ləğv et",
}: GroupedSearchSelectFieldProps) {
  const labelId = `${id}-label`;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const openedOnFocusRef = useRef(false);
  const allOptions = useMemo(() => flattenGroups(groups), [groups]);
  const selectedOption = useMemo(
    () => findOptionByValue(allOptions, value),
    [allOptions, value],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showRequiredError, setShowRequiredError] = useState(false);
  const allowEmptyOption = !required && emptyOptionLabel !== undefined;

  const filteredGroups = useMemo(() => {
    const normalizedQuery = normalizeForSearch(query);
    if (normalizedQuery === "") return groups;

    return groups
      .map((group) => ({
        ...group,
        areas: group.areas.filter((area) =>
          normalizeForSearch(area.label).includes(normalizedQuery),
        ),
      }))
      .filter((group) => group.areas.length > 0);
  }, [groups, query]);

  const filteredOptions = useMemo(
    () => flattenGroups(filteredGroups),
    [filteredGroups],
  );
  const selectableOptions = useMemo(() => {
    if (!allowEmptyOption || !emptyOptionLabel) return filteredOptions;

    return [
      { label: emptyOptionLabel, value: "", groupLabel: "" },
      ...filteredOptions,
    ];
  }, [allowEmptyOption, emptyOptionLabel, filteredOptions]);

  const inputValue = isOpen ? query : (selectedOption?.label ?? "");
  const showList = isOpen;
  const showEmptyState = query.trim() !== "" && filteredOptions.length === 0;
  const activeDescendantId =
    activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined;
  const hasRequiredError = required && value.trim() === "" && showRequiredError;
  const errorMessageId = `${id}-error`;
  const showClearButton =
    value.trim() !== "" || (isOpen && query.trim() !== "");

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label ?? "");
      setActiveIndex(-1);
    }
  }, [isOpen, selectedOption?.label]);

  useEffect(
    () => () => {
      if (blurCloseTimeoutRef.current !== null) {
        clearTimeout(blurCloseTimeoutRef.current);
      }
    },
    [],
  );

  function clearBlurCloseTimeout() {
    if (blurCloseTimeoutRef.current !== null) {
      clearTimeout(blurCloseTimeoutRef.current);
      blurCloseTimeoutRef.current = null;
    }
  }

  function openList() {
    setIsOpen(true);
    setQuery(selectedOption?.label ?? "");
    if (selectedOption) {
      const selectedIndex = selectableOptions.findIndex(
        (option) => option.value === selectedOption.value,
      );
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setActiveIndex(selectableOptions.length > 0 ? 0 : -1);
  }

  function closeList() {
    setIsOpen(false);
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setShowRequiredError(required);
    closeList();
    inputRef.current?.focus();
  }

  function selectOption(option: FlatSearchSelectOption) {
    onChange(option.value);
    setQuery(option.label);
    setShowRequiredError(false);
    closeList();
  }

  function commitQuery(nextQuery: string) {
    const matchedOption = findOptionByLabel(allOptions, nextQuery);
    if (matchedOption) {
      onChange(matchedOption.value);
      setQuery(matchedOption.label);
      setShowRequiredError(false);
      return;
    }

    if (selectedOption) {
      setQuery(selectedOption.label);
      return;
    }

    setQuery("");
    if (!required) {
      onChange("");
    }
    if (required) {
      setShowRequiredError(true);
    }
  }

  function handleInputFocus() {
    clearBlurCloseTimeout();
    if (!isOpen) {
      openedOnFocusRef.current = true;
      openList();
    }
  }

  function handleInputClick() {
    if (openedOnFocusRef.current) {
      openedOnFocusRef.current = false;
      return;
    }

    if (isOpen) {
      commitQuery(inputRef.current?.value ?? query);
      closeList();
      return;
    }

    openList();
  }

  function toggleList() {
    if (isOpen) {
      commitQuery(inputRef.current?.value ?? query);
      closeList();
      return;
    }

    inputRef.current?.focus();
    openList();
  }

  function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
    const relatedTarget = event.relatedTarget;
    if (
      relatedTarget instanceof Node &&
      rootRef.current?.contains(relatedTarget)
    ) {
      return;
    }

    openedOnFocusRef.current = false;
    const queryToCommit = inputRef.current?.value ?? query;
    clearBlurCloseTimeout();
    blurCloseTimeoutRef.current = setTimeout(() => {
      commitQuery(queryToCommit);
      closeList();
    }, 120);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      commitQuery(selectedOption?.label ?? "");
      closeList();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openList();
        setActiveIndex(selectableOptions.length > 0 ? 0 : -1);
        return;
      }

      if (selectableOptions.length === 0) return;

      setActiveIndex((current) =>
        current >= selectableOptions.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen || selectableOptions.length === 0) return;

      setActiveIndex((current) =>
        current <= 0 ? selectableOptions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      if (!isOpen || selectableOptions.length === 0) return;

      event.preventDefault();
      const option =
        activeIndex >= 0
          ? selectableOptions[activeIndex]
          : selectableOptions[0];
      if (option) {
        if (option.value === "") {
          if (!required) {
            onChange("");
            setQuery("");
            setShowRequiredError(false);
          }
          closeList();
          return;
        }

        selectOption(option);
      }
    }
  }

  return (
    <div className={hasRequiredError ? "ui-field ui-field--error" : "ui-field"}>
      <label id={labelId} htmlFor={id}>
        {label}{" "}
        {required ? (
          <span className="ui-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <div
        ref={rootRef}
        className={[
          "ui-grouped-search-select",
          showClearButton ? "ui-grouped-search-select--has-clear" : "",
          showList ? "ui-grouped-search-select--open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          ref={inputRef}
          id={id}
          className="ui-grouped-search-select__input"
          value={inputValue}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-labelledby={labelId}
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-activedescendant={activeDescendantId}
          aria-autocomplete="list"
          aria-required={required || undefined}
          aria-invalid={hasRequiredError || undefined}
          aria-describedby={hasRequiredError ? errorMessageId : undefined}
          required={required}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            if (!isOpen) {
              setIsOpen(true);
            }
            setActiveIndex(0);
          }}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
        {showClearButton ? (
          <button
            type="button"
            className="ui-grouped-search-select__clear"
            aria-label={clearAriaLabel}
            onPointerDown={(event) => {
              event.preventDefault();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              clearSelection();
            }}
          >
            <IconClose width={16} height={16} />
          </button>
        ) : null}
        <button
          type="button"
          className="ui-grouped-search-select__chevron"
          aria-label={showList ? "Siyahını bağla" : "Siyahını aç"}
          tabIndex={-1}
          aria-expanded={showList}
          onPointerDown={(event) => {
            event.preventDefault();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleList();
          }}
        >
          <IconChevronDown />
        </button>
        {showList ? (
          <div
            id={listId}
            className="ui-grouped-search-select__list"
            role="listbox"
            aria-label={listAriaLabel ?? label}
          >
            {allowEmptyOption && emptyOptionLabel ? (
              <div role="presentation">
                <button
                  id={`${listId}-option-0`}
                  type="button"
                  role="option"
                  aria-label={emptyOptionLabel}
                  aria-selected={value.trim() === ""}
                  className={
                    activeIndex === 0
                      ? "ui-grouped-search-select__option is-active"
                      : "ui-grouped-search-select__option"
                  }
                  onPointerDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onChange("");
                    setQuery("");
                    setShowRequiredError(false);
                    closeList();
                  }}
                >
                  {emptyOptionLabel}
                </button>
              </div>
            ) : null}
            {showEmptyState ? (
              <p className="ui-grouped-search-select__empty" role="status">
                Nəticə tapılmadı
              </p>
            ) : null}
            {filteredGroups.map((group) => (
              <div
                key={group.label || "default-group"}
                className="ui-grouped-search-select__group-block"
              >
                {group.label ? (
                  <div
                    className="ui-grouped-search-select__group-label"
                    role="presentation"
                  >
                    {group.label}
                  </div>
                ) : null}
                {group.areas.map((area) => {
                  const currentIndex =
                    selectableOptions.findIndex(
                      (option) => option.value === area.value,
                    );
                  const isActive = currentIndex === activeIndex;

                  return (
                    <div key={area.value} role="presentation">
                      <button
                        id={
                          currentIndex >= 0
                            ? `${listId}-option-${currentIndex}`
                            : undefined
                        }
                        type="button"
                        role="option"
                        aria-label={area.label}
                        aria-selected={area.value === value || isActive}
                        className={
                          isActive
                            ? "ui-grouped-search-select__option is-active"
                            : "ui-grouped-search-select__option"
                        }
                        onPointerDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          selectOption({
                            ...area,
                            groupLabel: group.label,
                          });
                        }}
                      >
                        <span className="ui-grouped-search-select__option-label">
                          {area.label}
                        </span>
                        {group.label ? (
                          <span className="ui-grouped-search-select__option-meta">
                            {group.label}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {hasRequiredError ? (
        <p className="ui-field__error" id={errorMessageId} role="alert">
          {requiredErrorMessage}
        </p>
      ) : null}
    </div>
  );
}
