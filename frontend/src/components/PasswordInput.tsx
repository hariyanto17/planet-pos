import React, { forwardRef, useState } from "react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label ? <label className="text-sm font-medium text-text-secondary">{label}</label> : null}
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={`w-full pl-3 pr-10 py-2 bg-surface border ${
              error ? "border-error focus:border-error focus:ring-error/20" : "border-border focus:border-primary focus:ring-primary/20"
            } rounded-lg text-text-primary placeholder-text-muted outline-none focus:ring-4 transition duration-200 disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary transition duration-200"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {error ? <p className="text-xs text-error mt-0.5">{error}</p> : null}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
