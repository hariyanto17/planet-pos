import React, { forwardRef, useEffect, useState } from "react";
import { formatPrice } from "@/utils/formatters";

interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: number;
  onChange?: (val: number) => void;
}

export const PriceInput = forwardRef<HTMLInputElement, PriceInputProps>(
  ({ label, error, helperText, value, onChange, className = "", ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
      if (value === undefined || value === null) {
        setDisplayValue("");
      } else {
        setDisplayValue(formatPrice(value));
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawText = e.target.value;
      const digits = rawText.replace(/\D/g, "");
      if (digits === "") {
        setDisplayValue("");
        if (onChange) onChange(0);
        return;
      }
      const numValue = Number(digits);
      setDisplayValue(formatPrice(numValue));
      if (onChange) onChange(numValue);
    };

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label ? (
          <div className="flex flex-col gap-0.5">
            <label className="text-sm font-medium text-text-secondary">
              {label}
            </label>
            {helperText ? <p className="text-xs text-text-muted">{helperText}</p> : null}
          </div>
        ) : null}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-sm font-medium text-text-muted">Rp</span>
          <input
            ref={ref}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            className={`w-full pl-9 pr-3 py-2 bg-surface border ${
              error ? "border-error focus:border-error focus:ring-error/20" : "border-border focus:border-primary focus:ring-primary/20"
            } rounded-lg text-text-primary placeholder-text-muted outline-none focus:ring-4 transition duration-200 disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
            {...props}
          />
        </div>
        {error ? <p className="text-xs text-error mt-0.5">{error}</p> : null}
      </div>
    );
  }
);

PriceInput.displayName = "PriceInput";
