import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", ...props }, ref) => {
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
        <input
          ref={ref}
          id={props.id}
          className={`w-full px-3 py-2 bg-surface border ${
            error ? "border-error focus:border-error focus:ring-error/20" : "border-border focus:border-primary focus:ring-primary/20"
          } rounded-lg text-text-primary placeholder-text-muted outline-none focus:ring-4 transition duration-200 disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error ? <p className="text-xs text-error mt-0.5">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
