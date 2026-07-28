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
            <label htmlFor={props.id} className="text-sm font-medium text-zinc-300">
              {label}
            </label>
            {helperText ? <p className="text-xs text-zinc-400">{helperText}</p> : null}
          </div>
        ) : null}
        <input
          ref={ref}
          id={props.id}
          className={`w-full px-3 py-2 bg-zinc-900 border ${
            error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : "border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
          } rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:ring-4 transition duration-200 ${className}`}
          {...props}
        />
        {error ? <p className="text-xs text-rose-500 mt-0.5">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
