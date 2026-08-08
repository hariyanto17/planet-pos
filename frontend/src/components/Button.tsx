import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  isLoading,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyle =
    "px-4 py-2 rounded-lg font-medium transition duration-250 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold shadow-md shadow-primary/10",
    secondary: "bg-surface-secondary hover:bg-surface border border-border text-text-primary hover:text-text-primary",
    danger: "bg-error hover:bg-error/90 active:bg-error/85 text-white shadow-md shadow-error/10",
    ghost: "bg-transparent hover:bg-surface-secondary text-text-secondary hover:text-text-primary",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-current mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
};
