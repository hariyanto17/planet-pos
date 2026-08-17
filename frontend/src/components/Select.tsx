import React, { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = "", children, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label ? (
          <div className="flex flex-col gap-0.5">
            <label htmlFor={props.id} className="text-sm font-medium text-text-secondary">
              {label}
            </label>
            {helperText ? <p className="text-xs text-text-muted">{helperText}</p> : null}
          </div>
        ) : null}
        <select
          ref={ref}
          id={props.id}
          className={`w-full px-3 py-2 bg-surface border ${
            error ? "border-error focus:border-error focus:ring-error/20" : "border-border focus:border-primary focus:ring-primary/20"
          } rounded-lg text-text-primary outline-none focus:ring-4 transition duration-200 disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed text-sm ${className}`}
          {...props}
        >
          {children ? children : options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? <p className="text-xs text-error mt-0.5">{error}</p> : null}
      </div>
    );
  }
);

Select.displayName = "Select";
