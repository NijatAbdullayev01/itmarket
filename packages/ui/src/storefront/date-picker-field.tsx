"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { IconChevronLeft, IconChevronRight } from "./icons";

type DatePickerFieldProps = {
  id: string;
  label: ReactNode;
  value: string;
  min: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const WEEKDAY_LABELS = ["B.e", "Ç.a", "Ç.", "C.a", "C.", "Ş.", "B."] as const;

const MONTH_LABELS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "İyun",
  "İyul",
  "Avqust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
] as const;

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

function parseIsoDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function compareIsoDates(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(formatIsoDate(new Date(year, month, day)));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function resolveVisibleMonth(value: string, min: string) {
  const selectedDate = parseIsoDate(value);
  if (selectedDate) {
    return {
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth(),
    };
  }

  const minDate = parseIsoDate(min);
  if (minDate) {
    return {
      year: minDate.getFullYear(),
      month: minDate.getMonth(),
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    year: today.getFullYear(),
    month: today.getMonth(),
  };
}

export function DatePickerField({
  id,
  label,
  value,
  min,
  onChange,
  placeholder = "Tarix seçin",
}: DatePickerFieldProps) {
  const calendarId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    resolveVisibleMonth(value, min),
  );
  const todayIso = useMemo(() => formatIsoDate(new Date()), []);
  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth.year, visibleMonth.month),
    [visibleMonth.month, visibleMonth.year],
  );
  const monthLabel = `${MONTH_LABELS[visibleMonth.month]} ${visibleMonth.year}`;
  const minMonth = useMemo(() => {
    const minDate = parseIsoDate(min);
    if (!minDate) {
      const today = new Date();
      return {
        year: today.getFullYear(),
        month: today.getMonth(),
      };
    }

    return {
      year: minDate.getFullYear(),
      month: minDate.getMonth(),
    };
  }, [min]);
  const canGoToPreviousMonth =
    visibleMonth.year > minMonth.year ||
    (visibleMonth.year === minMonth.year &&
      visibleMonth.month > minMonth.month);

  useEffect(() => {
    if (!isOpen) return;

    setVisibleMonth(resolveVisibleMonth(value, min));
  }, [isOpen, min, value]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function openCalendar() {
    setVisibleMonth(resolveVisibleMonth(value, min));
    setIsOpen(true);
  }

  function goToPreviousMonth() {
    if (!canGoToPreviousMonth) return;

    setVisibleMonth((current) => {
      if (current.month === 0) {
        return { year: current.year - 1, month: 11 };
      }

      return { year: current.year, month: current.month - 1 };
    });
  }

  function goToNextMonth() {
    setVisibleMonth((current) => {
      if (current.month === 11) {
        return { year: current.year + 1, month: 0 };
      }

      return { year: current.year, month: current.month + 1 };
    });
  }

  function selectDate(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`ui-field ui-date-picker${isOpen ? " ui-date-picker--open" : ""}`}
    >
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className="ui-date-picker__trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={calendarId}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          openCalendar();
        }}
      >
        <span
          className={
            value.trim() === ""
              ? "ui-date-picker__value ui-date-picker__value--placeholder"
              : "ui-date-picker__value"
          }
        >
          {value.trim() === "" ? placeholder : formatDisplayDate(value)}
        </span>
        <span className="ui-date-picker__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3v3" />
            <path d="M16 3v3" />
            <path d="M4.5 9h15" />
            <path d="M6 5.5h12a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div
          id={calendarId}
          className="ui-date-picker__popover"
          role="dialog"
          aria-label="Tarix seçimi"
        >
          <div className="ui-date-picker__header">
            <button
              type="button"
              className="ui-date-picker__nav"
              aria-label="Əvvəlki ay"
              disabled={!canGoToPreviousMonth}
              onClick={goToPreviousMonth}
            >
              <IconChevronLeft width={18} height={18} />
            </button>
            <strong className="ui-date-picker__month">{monthLabel}</strong>
            <button
              type="button"
              className="ui-date-picker__nav"
              aria-label="Növbəti ay"
              onClick={goToNextMonth}
            >
              <IconChevronRight width={18} height={18} />
            </button>
          </div>

          <div className="ui-date-picker__weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday} className="ui-date-picker__weekday">
                {weekday}
              </span>
            ))}
          </div>

          <div className="ui-date-picker__grid" role="grid" aria-label={monthLabel}>
            {monthGrid.map((isoDate, index) => {
              if (isoDate === null) {
                return (
                  <span
                    key={`empty-${index}`}
                    className="ui-date-picker__day ui-date-picker__day--empty"
                    aria-hidden="true"
                  />
                );
              }

              const dayNumber = parseIsoDate(isoDate)?.getDate() ?? 0;
              const isDisabled = compareIsoDates(isoDate, min) < 0;
              const isSelected = value === isoDate;
              const isToday = isoDate === todayIso;

              return (
                <button
                  key={isoDate}
                  type="button"
                  role="gridcell"
                  className={[
                    "ui-date-picker__day",
                    isSelected ? "ui-date-picker__day--selected" : "",
                    isToday ? "ui-date-picker__day--today" : "",
                    isDisabled ? "ui-date-picker__day--disabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={formatDisplayDate(isoDate)}
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                  disabled={isDisabled}
                  onClick={() => selectDate(isoDate)}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
