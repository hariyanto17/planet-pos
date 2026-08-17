import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchableSelectProps {
  label?: string;
  error?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  isLoading?: boolean;
  customSearch?: (option: SelectOption, query: string) => boolean;
}

export function SearchableSelect({
  label,
  error,
  value,
  onValueChange,
  options,
  placeholder = "Pilih opsi...",
  searchPlaceholder = "Cari...",
  disabled = false,
  clearable = true,
  isLoading = false,
  customSearch,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    if (!searchQuery) return true;
    if (customSearch) return customSearch(opt, searchQuery);
    const query = searchQuery.toLowerCase();
    const labelMatch = opt.label.toLowerCase().includes(query);
    const textMatch = opt.searchText?.toLowerCase().includes(query);
    return labelMatch || textMatch;
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setActiveIndex(-1);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    if (onValueChange) {
      onValueChange(val);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onValueChange) {
      onValueChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelect(filteredOptions[activeIndex].value);
        } else if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0].value);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-text-secondary select-none">
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={disabled}
          className={`w-full flex items-center justify-between px-3 py-2 bg-surface border text-sm text-left ${
            error
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-border focus:border-primary focus:ring-primary/20"
          } rounded-lg text-text-primary placeholder-text-muted outline-none focus:ring-4 transition duration-200 disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed`}
        >
          <span className={selectedOption ? "text-text-primary" : "text-text-muted"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className="flex items-center gap-1.5">
            {clearable && selectedOption && !disabled && (
              <span
                onClick={handleClear}
                className="p-0.5 hover:bg-zinc-800 rounded text-text-muted hover:text-text-primary transition"
                role="button"
                aria-label="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-text-muted transition duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1 w-full rounded-xl bg-surface border border-border/80 shadow-2xl z-[100] py-1.5 focus:outline-none animate-in fade-in slide-in-from-top-1 duration-100">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent border-none text-sm text-text-primary outline-none placeholder-text-muted focus:ring-0 p-0"
              />
            </div>

            <ul
              role="listbox"
              className="max-h-60 overflow-y-auto py-1"
            >
              {isLoading ? (
                <li className="px-3 py-2 text-sm text-text-muted italic select-none">
                  Loading...
                </li>
              ) : options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted italic select-none">
                  No options available
                </li>
              ) : filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted italic select-none">
                  No match found
                </li>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = opt.value === value;
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={`px-3 py-2 text-sm cursor-pointer select-none transition ${
                        isSelected
                          ? "bg-primary/20 text-primary font-medium"
                          : isActive
                          ? "bg-zinc-800 text-text-primary"
                          : "text-text-primary hover:bg-zinc-800/50"
                      }`}
                    >
                      {opt.label}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-error mt-0.5">{error}</p>}
    </div>
  );
}
