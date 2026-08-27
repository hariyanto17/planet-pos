"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DatePickerProps {
  mode?: "date" | "time" | "datetime";
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
  size?: "sm" | "md";
  className?: string;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const WEEK_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export const DatePicker: React.FC<DatePickerProps> = ({
  mode = "date",
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  size = "md",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Position coordinates state
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  // Calendar view states
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  // Internal values
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHours, setSelectedHours] = useState(12);
  const [selectedMinutes, setSelectedMinutes] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      if (mode === "time") {
        const [h, m] = value.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          setSelectedHours(h);
          setSelectedMinutes(m);
        }
      } else if (mode === "date") {
        const parts = value.split("-").map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          setSelectedDate(d);
          setCurrentYear(d.getFullYear());
          setCurrentMonth(d.getMonth());
        } else {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            setSelectedDate(d);
            setCurrentYear(d.getFullYear());
            setCurrentMonth(d.getMonth());
          }
        }
      } else {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setSelectedHours(d.getHours());
          setSelectedMinutes(d.getMinutes());
          setCurrentYear(d.getFullYear());
          setCurrentMonth(d.getMonth());
        }
      }
    } else {
      setSelectedDate(null);
      setSelectedHours(12);
      setSelectedMinutes(0);
    }
  }, [value, mode, isOpen]);

  // Position calculation logic
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = mode === "datetime" ? 440 : 310;
      const popoverHeight = mode === "datetime" ? 360 : 320;

      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      }

      let top = rect.bottom + window.scrollY + 6;
      if (rect.bottom + popoverHeight > window.innerHeight && rect.top > popoverHeight) {
        top = rect.top + window.scrollY - popoverHeight - 6;
      }

      setCoords({ top, left, width: rect.width });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideInteraction = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideInteraction);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(currentYear, currentMonth, day);
    setSelectedDate(selected);

    if (mode === "date") {
      const yStr = selected.getFullYear();
      const mStr = String(selected.getMonth() + 1).padStart(2, "0");
      const dStr = String(selected.getDate()).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());

    if (mode === "date") {
      const yStr = today.getFullYear();
      const mStr = String(today.getMonth() + 1).padStart(2, "0");
      const dStr = String(today.getDate()).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
    }
  };

  const handleSetYesterday = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    setSelectedDate(yest);
    setCurrentYear(yest.getFullYear());
    setCurrentMonth(yest.getMonth());

    if (mode === "date") {
      const yStr = yest.getFullYear();
      const mStr = String(yest.getMonth() + 1).padStart(2, "0");
      const dStr = String(yest.getDate()).padStart(2, "0");
      onChange(`${yStr}-${mStr}-${dStr}`);
      setIsOpen(false);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange("");
    setSelectedDate(null);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder || (mode === "time" ? "Pilih waktu" : mode === "date" ? "Pilih tanggal" : "Pilih tanggal & waktu");

    if (mode === "time") return value;

    if (mode === "date") {
      const parts = value.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      }
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }

    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()} ${hours}:${minutes}`;
  };

  const isDaySelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  const isDateDisabled = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day);
    if (minDate) {
      const checkMin = typeof minDate === "string" ? new Date(minDate) : minDate;
      checkMin.setHours(0, 0, 0, 0);
      if (dateToCheck < checkMin) return true;
    }
    if (maxDate) {
      const checkMax = typeof maxDate === "string" ? new Date(maxDate) : maxDate;
      checkMax.setHours(23, 59, 59, 999);
      if (dateToCheck > checkMax) return true;
    }
    return false;
  };

  const renderPopover = () => {
    if (!isOpen || !mounted) return null;

    const popoverWidthClass = mode === "datetime" ? "w-[440px]" : "w-[300px]";

    return createPortal(
      <div
        ref={popoverRef}
        style={{
          position: "absolute",
          top: `${coords.top}px`,
          left: `${coords.left}px`,
        }}
        className={`z-[9999] p-3.5 bg-surface border border-border shadow-2xl rounded-xl select-none text-text-primary backdrop-blur-md transition-all ${popoverWidthClass}`}
      >
        <div className="space-y-3">
          {/* Header: Month Year + Quick controls */}
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="font-bold text-xs text-text-primary tracking-wide">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Bulan sebelumnya"
                className="p-1 rounded-md hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Bulan berikutnya"
                className="p-1 rounded-md hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick shortcuts */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-surface-secondary hover:bg-primary/10 text-text-secondary hover:text-primary transition cursor-pointer border border-border/50"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleSetYesterday}
              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-surface-secondary hover:bg-primary/10 text-text-secondary hover:text-primary transition cursor-pointer border border-border/50"
            >
              Kemarin
            </button>
            {value && (
              <button
                type="button"
                onClick={() => handleClear()}
                className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded bg-error/10 text-error hover:bg-error/20 transition cursor-pointer border border-error/20"
              >
                Reset
              </button>
            )}
          </div>

          {/* Day name headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="py-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const isSel = isDaySelected(day);
              const isTod = isToday(day);
              const isDis = isDateDisabled(day);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isDis}
                  onClick={() => handleDateSelect(day)}
                  className={`h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    isSel
                      ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
                      : isTod
                      ? "bg-surface-secondary text-primary font-bold border border-primary/40 hover:bg-primary/10"
                      : "text-text-primary hover:bg-surface-secondary"
                  } disabled:opacity-25 disabled:cursor-not-allowed`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const sizeClasses = size === "sm" ? "px-2.5 py-1.5 text-xs h-8" : "px-3 py-2 text-xs md:text-sm h-9.5";

  return (
    <div className={`flex flex-col gap-1 text-left ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-text-secondary flex items-center gap-1">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 bg-surface border rounded-lg text-left transition duration-150 cursor-pointer ${sizeClasses} ${
            error
              ? "border-error focus:ring-error/20"
              : isOpen
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-border-strong focus:border-primary"
          } ${
            value ? "text-text-primary font-medium" : "text-text-muted"
          } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            {mode === "time" ? (
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            ) : (
              <CalendarIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
            <span className="truncate">{getDisplayValue()}</span>
          </div>

          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear()}
              aria-label="Hapus tanggal"
              className="p-0.5 rounded hover:bg-surface-secondary text-text-muted hover:text-text-primary transition shrink-0 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>

      {error && <span className="text-xs text-error mt-0.5">{error}</span>}

      {renderPopover()}
    </div>
  );
};
